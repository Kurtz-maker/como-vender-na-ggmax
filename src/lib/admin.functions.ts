import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PAYMENT_STATUSES } from "./finance";

type Ctx = { supabase: any; userId: string; claims: Record<string, unknown> };

// Every admin action re-checks the role on the server; the panel's screen guard is only for display.
async function requireAdmin(context: Ctx) {
  const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (!data) throw new Error("Acesso negado.");
}

async function logAudit(context: Ctx, action: string, entity: string, entityId: string | null, details: Record<string, unknown> = {}) {
  await context.supabase.from("audit_log").insert({ actor_id: context.userId, action, entity, entity_id: entityId, details });
}

export const setPaymentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ paymentId: z.string().uuid(), status: z.enum(PAYMENT_STATUSES), reason: z.string().trim().min(3).max(500) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const { data: payment } = await context.supabase.from("payments").select("*").eq("id", data.paymentId).maybeSingle();
    if (!payment) throw new Error("Pagamento não encontrado.");
    if (payment.status === data.status) return { ok: true, access: "none" };
    const patch: { status: string; updated_at: string; paid_at?: string } = { status: data.status, updated_at: new Date().toISOString() };
    if (data.status === "approved" && !payment.paid_at) patch.paid_at = new Date().toISOString();
    await context.supabase.from("payments").update(patch).eq("id", data.paymentId);
    const { applyAccessChange } = await import("./payments.server");
    const access = await applyAccessChange(payment, payment.status, data.status, `Alteração manual: ${data.reason}`);
    await context.supabase.from("payment_events").insert({
      payment_id: data.paymentId,
      event: `status:${data.status}`,
      payload: { from: payment.status, reason: data.reason, by: context.userId, manual: true, access },
    });
    await logAudit(context as Ctx, "payment_status", "payment", data.paymentId, { from: payment.status, to: data.status, reason: data.reason });
    return { ok: true, access };
  });

const pick = (p: Record<string, unknown>, keys: string[]) => Object.fromEntries(keys.filter((k) => k in p).map((k) => [k, p[k]]));
const MODULE_KEYS = ["title", "description", "image_url", "required_plan", "published", "sort_order"];
const LESSON_KEYS = ["module_id", "title", "summary", "content", "published", "sort_order", "is_free", "image_url"];

export const publishDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const sb = context.supabase;
    const { data: drafts } = await sb.from("content_drafts").select("*").order("created_at");
    const list = (drafts ?? []) as { entity: string; entity_id: string | null; action: string; payload: Record<string, unknown> }[];
    // Modules first so new lessons can reference new modules; deletions last.
    const rank = (d: (typeof list)[number]) => (d.action === "delete" ? 3 : d.entity === "module" ? 0 : d.entity === "lesson" ? 1 : 2);
    list.sort((a, b) => rank(a) - rank(b));
    const errors: string[] = [];
    for (const d of list) {
      const p = d.payload ?? {};
      let res: { error: { message: string } | null } = { error: null };
      if (d.entity === "module" || d.entity === "lesson") {
        const table = d.entity === "module" ? "modules" : "lessons";
        if (!d.entity_id) continue;
        if (d.action === "delete") res = await sb.from(table).delete().eq("id", d.entity_id);
        else res = await sb.from(table).upsert({ id: d.entity_id, ...pick(p, d.entity === "module" ? MODULE_KEYS : LESSON_KEYS) } as never, { onConflict: "id" });
      } else if (d.entity.startsWith("site_setting:")) {
        const key = d.entity.slice("site_setting:".length);
        res = await sb.from("site_settings").upsert({ key, value: (p["value"] ?? {}) as never, updated_at: new Date().toISOString() }, { onConflict: "key" });
      }
      if (res.error) errors.push(`${d.entity}: ${res.error.message}`);
    }
    if (errors.length) throw new Error(`Algumas alterações não foram publicadas: ${errors.join("; ")}`);
    await sb.from("content_drafts").delete().not("id", "is", null);
    await logAudit(context as Ctx, "publish", "content", null, { count: list.length });
    return { ok: true, applied: list.length };
  });

export const discardDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    await context.supabase.from("content_drafts").delete().not("id", "is", null);
    await logAudit(context as Ctx, "discard", "content", null, {});
    return { ok: true };
  });

/** Credential status for each gateway: only whether keys exist and their last digits, never the keys. */
export const getGatewayStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.from("payment_gateway_secrets").select("gateway_id, access_token, webhook_secret, updated_at");
    return Object.fromEntries(
      (data ?? []).map((s) => [
        s.gateway_id,
        {
          hasAccessToken: !!s.access_token,
          tokenHint: s.access_token ? s.access_token.slice(-4) : null,
          sandbox: !!s.access_token?.startsWith("TEST-"),
          hasWebhookSecret: !!s.webhook_secret,
          updatedAt: s.updated_at,
        },
      ]),
    ) as Record<string, { hasAccessToken: boolean; tokenHint: string | null; sandbox: boolean; hasWebhookSecret: boolean; updatedAt: string }>;
  });

export const saveGatewayCredentials = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        gatewayId: z.string().uuid(),
        accessToken: z.string().trim().min(20).max(300).optional(),
        webhookSecret: z.string().trim().min(8).max(300).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const { data: gw } = await context.supabase.from("payment_gateways").select("id").eq("id", data.gatewayId).maybeSingle();
    if (!gw) throw new Error("Gateway não encontrado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current } = await supabaseAdmin.from("payment_gateway_secrets").select("*").eq("gateway_id", data.gatewayId).maybeSingle();
    const row = {
      gateway_id: data.gatewayId,
      access_token: data.accessToken ?? current?.access_token ?? null,
      webhook_secret: data.webhookSecret ?? current?.webhook_secret ?? null,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabaseAdmin.from("payment_gateway_secrets").upsert(row, { onConflict: "gateway_id" });
    if (error) throw new Error("Não foi possível salvar as credenciais.");
    await logAudit(context as Ctx, "gateway_credentials", "payment_gateway", data.gatewayId, {
      access_token: data.accessToken ? "alterado" : "mantido",
      webhook_secret: data.webhookSecret ? "alterado" : "mantido",
    });
    return { ok: true };
  });

export const testGateway = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ gatewayId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await requireAdmin(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin.from("payment_gateway_secrets").select("access_token").eq("gateway_id", data.gatewayId).maybeSingle();
    if (!s?.access_token) return { ok: false as const, error: "Cadastre a chave de acesso (Access Token) antes de testar." };
    const res = await fetch("https://api.mercadopago.com/users/me", { headers: { Authorization: `Bearer ${s.access_token}` } });
    if (!res.ok) return { ok: false as const, error: `O Mercado Pago recusou a chave (erro ${res.status}). Confira se copiou o Access Token correto.` };
    const me = (await res.json()) as { email?: string; nickname?: string };
    await logAudit(context as Ctx, "gateway_test", "payment_gateway", data.gatewayId, { ok: true });
    return { ok: true as const, account: me.email ?? me.nickname ?? "conta conectada" };
  });
