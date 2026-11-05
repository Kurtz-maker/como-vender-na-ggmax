import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database, Json } from "@/integrations/supabase/types";

type PaymentUpdate = Database["public"]["Tables"]["payments"]["Update"];
type EnrollmentStatus = Database["public"]["Enums"]["enrollment_status"];

type Ctx = { supabase: any; userId: string; claims: Record<string, unknown> };

async function requireAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Forbidden");
}

async function logAudit(context: Ctx, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await context.supabase.from("audit_log").insert({ actor_id: context.userId, action, entity, entity_id: entityId, details });
}

async function syncEnrollment(supabase: any, payment: any, status: string) {
  if (!payment.user_id) return;
  if (status === "approved") {
    const { data: existing } = await supabase
      .from("enrollments")
      .select("id")
      .eq("user_id", payment.user_id)
      .eq("plan", payment.plan)
      .maybeSingle();
    const row = {
      status: "active" as const,
      source: payment.gateway,
      amount_cents: payment.final_cents,
      granted_at: new Date().toISOString(),
    };
    if (existing) await supabase.from("enrollments").update(row).eq("id", existing.id);
    else
      await supabase.from("enrollments").insert({
        user_id: payment.user_id,
        plan: payment.plan,
        purchased_at: payment.created_at,
        ...row,
      });
  } else if (["refunded", "canceled", "rejected", "charged_back"].includes(status)) {
    const mapped = status === "charged_back" ? "blocked" : status === "rejected" ? "canceled" : status;
    await supabase.from("enrollments").update({ status: mapped }).eq("user_id", payment.user_id).eq("plan", payment.plan);
  }
}

export const setPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { paymentId: string; status: string; reason?: string }) => input)
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const { data: payment } = await context.supabase.from("payments").select("*").eq("id", data.paymentId).maybeSingle();
    if (!payment) throw new Error("Pagamento não encontrado");
    const patch: PaymentUpdate = { status: data.status, updated_at: new Date().toISOString() };
    if (data.status === "approved" && !payment.paid_at) patch.paid_at = new Date().toISOString();
    await context.supabase.from("payments").update(patch).eq("id", data.paymentId);
    await context.supabase.from("payment_events").insert({
      payment_id: data.paymentId,
      event: `status:${data.status}`,
      payload: { from: payment.status, reason: data.reason ?? null, by: context.userId },
    });
    await syncEnrollment(context.supabase, payment, data.status);
    await logAudit(context as Ctx, "payment_status", "payment", data.paymentId, { status: data.status, reason: data.reason ?? null });
    return { ok: true };
  });

export const publishDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const { data: drafts } = await context.supabase.from("content_drafts").select("*");
    let applied = 0;
    for (const d of drafts ?? []) {
      const p = (d.payload ?? {}) as Record<string, unknown>;
      if (d.entity === "module") {
        if (d.action === "delete" && d.entity_id) {
          await context.supabase.from("modules").delete().eq("id", d.entity_id);
        } else {
          const row = {
            title: p.title as string,
            description: (p.description as string) ?? null,
            image_url: (p.image_url as string) ?? null,
            required_plan: p.required_plan as "basic" | "pro",
            published: p.published as boolean,
            sort_order: p.sort_order as number,
          };
          if (d.entity_id) await context.supabase.from("modules").update(row).eq("id", d.entity_id);
          else await context.supabase.from("modules").insert({ ...row, id: p.id as string });
        }
      } else if (d.entity === "lesson") {
        if (d.action === "delete" && d.entity_id) {
          await context.supabase.from("lessons").delete().eq("id", d.entity_id);
        } else {
          const row = {
            module_id: p.module_id as string,
            title: p.title as string,
            summary: (p.summary as string) ?? null,
            content: (p.content as unknown) ?? [],
            published: p.published as boolean,
            sort_order: p.sort_order as number,
          };
          if (d.entity_id) await context.supabase.from("lessons").update(row).eq("id", d.entity_id);
          else await context.supabase.from("lessons").insert({ ...row, id: p.id as string });
        }
      } else if (d.entity.startsWith("site_setting:")) {
        const key = d.entity.slice("site_setting:".length);
        await context.supabase.from("site_settings").upsert({ key, value: p.value, updated_at: new Date().toISOString() }, { onConflict: "key" });
      }
      applied++;
    }
    await context.supabase.from("content_drafts").delete().not("id", "is", null);
    await logAudit(context as Ctx, "publish", "content", null, { count: applied });
    return { ok: true, applied };
  });

export const discardDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    await context.supabase.from("content_drafts").delete().not("id", "is", null);
    await logAudit(context as Ctx, "discard", "content", null, {});
    return { ok: true };
  });

export const testMercadoPago = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const token = process.env["MERCADO_PAGO_ACCESS_TOKEN"];
    if (!token) return { ok: false, error: "Chave de acesso do Mercado Pago ainda não configurada." };
    const res = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return { ok: false, error: `Mercado Pago respondeu com erro ${res.status}. Verifique a chave.` };
    const me = (await res.json()) as { email?: string; nickname?: string };
    return { ok: true, account: me.email ?? me.nickname ?? "conta conectada" };
  });

export const createCheckoutPreference = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { plan: "basic" | "pro"; coupon?: string }) => input)
  .handler(async ({ data, context }) => {
    const { data: plan } = await context.supabase.from("plans").select("*").eq("slug", data.plan).eq("active", true).maybeSingle();
    if (!plan?.price_cents) throw new Error("Plano indisponível no momento.");

    let discount = 0;
    let couponId: string | null = null;
    if (data.coupon) {
      const { data: c } = await context.supabase.from("coupons").select("*").ilike("code", data.coupon.trim()).eq("active", true).maybeSingle();
      if (c) {
        const now = new Date();
        const inWindow = (!c.starts_at || new Date(c.starts_at) <= now) && (!c.ends_at || new Date(c.ends_at) >= now);
        const planMatch = !c.plan || c.plan === data.plan;
        if (inWindow && planMatch) {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { count: totalUses } = await supabaseAdmin.from("payments").select("id", { count: "exact", head: true }).eq("coupon_id", c.id);
          const { count: userUses } = await supabaseAdmin
            .from("payments")
            .select("id", { count: "exact", head: true })
            .eq("coupon_id", c.id)
            .eq("user_id", context.userId);
          const underTotal = c.max_uses == null || (totalUses ?? 0) < c.max_uses;
          const underUser = c.max_uses_per_customer == null || (userUses ?? 0) < c.max_uses_per_customer;
          if (underTotal && underUser) {
            discount = c.discount_type === "percent" ? Math.round((plan.price_cents * c.discount_value) / 100) : c.discount_value;
            discount = Math.min(Math.max(discount, 0), plan.price_cents);
            couponId = c.id;
          }
        }
      }
    }

    const final = Math.max(0, plan.price_cents - discount);
    const token = process.env["MERCADO_PAGO_ACCESS_TOKEN"];
    if (!token) throw new Error("Pagamento ainda não configurado. Fale com o suporte.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: context.userId,
        plan: data.plan,
        amount_cents: plan.price_cents,
        discount_cents: discount,
        final_cents: final,
        coupon_id: couponId,
        gateway: "mercadopago",
        status: "pending",
        buyer_email: (context.claims as { email?: string }).email ?? null,
      })
      .select("id")
      .single();
    if (error || !payment) throw new Error("Não foi possível registrar a compra.");

    const origin = new URL(getRequest().url).origin;
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [
          {
            title: `GGMAX Seller Academy — Plano ${plan.name}`,
            quantity: 1,
            unit_price: final / 100,
            currency_id: "BRL",
          },
        ],
        external_reference: payment.id,
        notification_url: `${origin}/api/public/webhooks/mercadopago`,
        back_urls: { success: `${origin}/aluno`, failure: `${origin}/`, pending: `${origin}/aluno` },
        auto_return: "approved",
      }),
    });
    if (!res.ok) {
      console.error("Mercado Pago preference error", res.status, await res.text());
      throw new Error("Falha ao iniciar o pagamento. Tente novamente.");
    }
    const pref = (await res.json()) as { id: string; init_point: string };
    await supabaseAdmin.from("payments").update({ gateway_tx_id: pref.id }).eq("id", payment.id);
    await supabaseAdmin.from("payment_events").insert({ payment_id: payment.id, event: "checkout_created", payload: { preference: pref.id } });
    return { url: pref.init_point };
  });
