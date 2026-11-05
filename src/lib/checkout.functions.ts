import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const planSchema = z.enum(["basic", "pro"]);

/** Public: current price of every active plan, including promo prices and automatic promotions. */
export const getPublicPricing = createServerFn({ method: "GET" }).handler(async () => {
  const { resolveQuote, getMercadoPagoCredentials } = await import("./payments.server");
  const out: Record<string, { original: number; final: number; discount: number; promoActive: boolean; promoName: string | null }> = {};
  for (const slug of ["basic", "pro"] as const) {
    const r = await resolveQuote(slug, null, null);
    if (r)
      out[slug] = {
        original: r.quote.original,
        final: r.quote.final,
        discount: r.quote.discount,
        promoActive: r.quote.promoActive,
        promoName: r.quote.coupon?.name ?? null,
      };
  }
  const available = !!(await getMercadoPagoCredentials());
  return { prices: out, checkoutAvailable: available };
});

/** Public: preview the price with a typed coupon. Per-customer limits are re-checked at checkout. */
export const quoteCheckout = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ plan: planSchema, coupon: z.string().max(40).optional() }).parse(input))
  .handler(async ({ data }) => {
    const { resolveQuote } = await import("./payments.server");
    const r = await resolveQuote(data.plan, data.coupon ?? null, null);
    if (!r) throw new Error("Plano indisponível no momento.");
    const q = r.quote;
    return {
      original: q.original,
      base: q.base,
      promoActive: q.promoActive,
      discount: q.discount,
      final: q.final,
      coupon: q.coupon ? { code: q.coupon.automatic ? null : q.coupon.code, name: q.coupon.name, automatic: q.coupon.automatic } : null,
      couponError: q.couponError,
    };
  });

/** Signed-in buyer: registers the purchase and opens the Mercado Pago checkout. Prices come only from the database. */
export const createCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        plan: planSchema,
        coupon: z.string().max(40).optional(),
        name: z.string().trim().min(2).max(120),
        phone: z.string().trim().max(30).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { resolveQuote, getMercadoPagoCredentials } = await import("./payments.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Avoid duplicate purchases of a plan the buyer already has (Pro already includes Básico).
    const { data: active } = await supabaseAdmin.from("enrollments").select("plan").eq("user_id", context.userId).eq("status", "active");
    if ((active ?? []).some((e) => e.plan === data.plan || e.plan === "pro")) throw new Error("Você já tem acesso a este plano.");

    const creds = await getMercadoPagoCredentials();
    if (!creds) throw new Error("Pagamento ainda não configurado. Fale com o suporte.");

    const r = await resolveQuote(data.plan, data.coupon ?? null, context.userId);
    if (!r) throw new Error("Plano indisponível no momento.");
    if (data.coupon && r.quote.couponError) throw new Error(r.quote.couponError);
    const q = r.quote;

    const email = (context.claims as { email?: string }).email ?? null;
    const { data: payment, error } = await supabaseAdmin
      .from("payments")
      .insert({
        user_id: context.userId,
        plan: data.plan,
        amount_cents: q.original,
        discount_cents: q.original - q.final,
        final_cents: q.final,
        coupon_id: q.coupon?.id ?? null,
        gateway: "mercadopago",
        status: "pending",
        buyer_name: data.name,
        buyer_email: email,
        buyer_phone: data.phone || null,
        metadata: { promo_price: q.promoActive ? q.base : null, coupon_discount: q.discount, gateway_id: creds.gatewayId },
      })
      .select("id")
      .single();
    if (error || !payment) throw new Error("Não foi possível registrar a compra.");

    const origin = new URL(getRequest().url).origin;
    const res = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { Authorization: `Bearer ${creds.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        items: [{ id: data.plan, title: `GGMAX Seller Academy — Plano ${r.plan.name}`, quantity: 1, unit_price: q.final / 100, currency_id: "BRL" }],
        payer: { name: data.name, email: email ?? undefined },
        external_reference: payment.id,
        notification_url: `${origin}/api/public/webhooks/mercadopago`,
        back_urls: { success: `${origin}/aluno`, failure: `${origin}/`, pending: `${origin}/aluno` },
        auto_return: "approved",
      }),
    });
    if (!res.ok) {
      console.error("Mercado Pago preference error", res.status, await res.text());
      await supabaseAdmin.from("payments").update({ status: "canceled" }).eq("id", payment.id);
      await supabaseAdmin.from("payment_events").insert({ payment_id: payment.id, event: "checkout_failed", payload: { http: res.status } });
      throw new Error("Falha ao iniciar o pagamento. Tente novamente.");
    }
    const pref = (await res.json()) as { id: string; init_point: string };
    await supabaseAdmin.from("payment_events").insert({
      payment_id: payment.id,
      event: "checkout_created",
      payload: { preference: pref.id, original: q.original, discount: q.original - q.final, final: q.final, coupon: q.coupon?.code ?? null },
    });
    return { url: pref.init_point };
  });
