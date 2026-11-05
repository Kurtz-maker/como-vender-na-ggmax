// Server-only payment helpers. Never import from browser code.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { accessChange } from "./finance";
import { quote, type CouponUsage, type PricingCoupon } from "./pricing";

type Plan = "basic" | "pro";

/** Mercado Pago credentials saved by the owner in the admin panel (active gateway first). */
export async function getMercadoPagoCredentials(opts: { includeInactive?: boolean } = {}) {
  let q = supabaseAdmin.from("payment_gateways").select("id, active").eq("provider", "mercadopago");
  if (!opts.includeInactive) q = q.eq("active", true);
  const { data: gateways } = await q.order("active", { ascending: false }).order("created_at");
  for (const g of gateways ?? []) {
    const { data: s } = await supabaseAdmin
      .from("payment_gateway_secrets")
      .select("access_token, webhook_secret")
      .eq("gateway_id", g.id)
      .maybeSingle();
    if (s?.access_token) return { gatewayId: g.id, accessToken: s.access_token, webhookSecret: s.webhook_secret };
  }
  return null;
}

const COUNTED = ["approved", "pending", "in_review"];

/** Server-side price quote, reading plans, coupons and usage from the database. */
export async function resolveQuote(planSlug: Plan, code: string | null, userId: string | null, now = new Date()) {
  const { data: plan } = await supabaseAdmin.from("plans").select("*").eq("slug", planSlug).eq("active", true).maybeSingle();
  if (!plan) return null;
  let cq = supabaseAdmin.from("coupons").select("*").eq("active", true);
  cq = code?.trim() ? cq.or(`automatic.eq.true,code.ilike.${code.trim().replace(/[,()*%]/g, "")}`) : cq.eq("automatic", true);
  const { data: coupons } = await cq;
  const usage: Record<string, CouponUsage> = {};
  for (const c of coupons ?? []) {
    const { count: total } = await supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).eq("coupon_id", c.id).in("status", COUNTED);
    let customer: number | null = null;
    if (userId) {
      const { count } = await supabaseAdmin
        .from("payments").select("id", { count: "exact", head: true })
        .eq("coupon_id", c.id).eq("user_id", userId).in("status", COUNTED);
      customer = count ?? 0;
    }
    usage[c.id] = { total: total ?? 0, customer };
  }
  const q = quote({ plan, now, code, coupons: (coupons ?? []) as PricingCoupon[], usage });
  return q ? { plan, quote: q } : null;
}

type PaymentRow = { id: string; user_id: string | null; plan: Plan; final_cents: number; created_at: string; gateway: string };

/**
 * Grants, revokes or blocks the buyer's access after a payment status change.
 * Only a previously approved payment can take access away, so a failed retry never removes a paid plan.
 */
export async function applyAccessChange(payment: PaymentRow, previous: string | null, next: string, reason: string) {
  if (!payment.user_id) return "none" as const;
  const change = accessChange(previous, next);
  const note = `Pagamento ${payment.id}: ${reason}`;
  if (change === "grant") {
    const { data: existing } = await supabaseAdmin.from("enrollments").select("id").eq("user_id", payment.user_id).eq("plan", payment.plan).maybeSingle();
    const row = { status: "active" as const, source: payment.gateway, amount_cents: payment.final_cents, granted_at: new Date().toISOString(), notes: note };
    if (existing) await supabaseAdmin.from("enrollments").update(row).eq("id", existing.id);
    else await supabaseAdmin.from("enrollments").insert({ user_id: payment.user_id, plan: payment.plan, purchased_at: payment.created_at, ...row });
  } else if (change === "revoke" || change === "block") {
    const status = change === "block" ? "blocked" : next === "refunded" ? "refunded" : "canceled";
    await supabaseAdmin.from("enrollments").update({ status, notes: note }).eq("user_id", payment.user_id).eq("plan", payment.plan);
  }
  return change;
}
