import { createFileRoute } from "@tanstack/react-router";

const STATUS_MAP: Record<string, string> = {
  approved: "approved",
  pending: "pending",
  in_process: "pending",
  authorized: "pending",
  rejected: "rejected",
  cancelled: "canceled",
  refunded: "refunded",
  charged_back: "charged_back",
};

async function verifySignature(request: Request, paymentId: string, secret: string) {
  const sig = request.headers.get("x-signature") ?? "";
  const reqId = request.headers.get("x-request-id") ?? "";
  const ts = /ts=([^,]+)/.exec(sig)?.[1];
  const v1 = /v1=([^,]+)/.exec(sig)?.[1];
  if (!ts || !v1) return false;
  const manifest = `id:${paymentId};request-id:${reqId};ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const body = (await request.json().catch(() => null)) as { type?: string; data?: { id?: string | number } } | null;
        const type = body?.type ?? url.searchParams.get("topic");
        const paymentId = String(body?.data?.id ?? url.searchParams.get("id") ?? "");
        if (type !== "payment" || !paymentId) return Response.json({ ok: true });

        const token = process.env["MERCADO_PAGO_ACCESS_TOKEN"];
        if (!token) return new Response("not configured", { status: 500 });

        const secret = process.env["MERCADO_PAGO_WEBHOOK_SECRET"];
        if (secret && !(await verifySignature(request, paymentId, secret))) {
          return new Response("invalid signature", { status: 401 });
        }

        const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return new Response("provider error", { status: 502 });
        const mp = (await res.json()) as {
          id: number;
          status: string;
          status_detail?: string;
          external_reference?: string;
          transaction_amount?: number;
        };
        const ref = mp.external_reference;
        if (!ref) return Response.json({ ok: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: payment } = await supabaseAdmin.from("payments").select("*").eq("id", ref).maybeSingle();
        if (!payment) return Response.json({ ok: true });

        const status = STATUS_MAP[mp.status] ?? "pending";
        const paidCents = Math.round((mp.transaction_amount ?? 0) * 100);

        // Never grant access when the paid amount is below the expected final price.
        if (status === "approved" && paidCents < payment.final_cents) {
          await supabaseAdmin.from("payment_events").insert({
            payment_id: payment.id,
            event: "amount_mismatch",
            payload: { expected: payment.final_cents, received: paidCents },
          });
          return Response.json({ ok: true });
        }

        if (payment.status !== status) {
          await supabaseAdmin
            .from("payments")
            .update({
              status,
              gateway_tx_id: String(mp.id),
              paid_at: status === "approved" ? new Date().toISOString() : payment.paid_at,
              updated_at: new Date().toISOString(),
              metadata: { ...(payment.metadata as object), mp_status: mp.status, mp_status_detail: mp.status_detail },
            })
            .eq("id", payment.id);
          await supabaseAdmin.from("payment_events").insert({
            payment_id: payment.id,
            event: `status:${status}`,
            payload: { mp_status: mp.status, detail: mp.status_detail ?? null },
          });

          if (payment.user_id) {
            if (status === "approved") {
              const { data: existing } = await supabaseAdmin
                .from("enrollments")
                .select("id")
                .eq("user_id", payment.user_id)
                .eq("plan", payment.plan)
                .maybeSingle();
              const row = {
                status: "active" as const,
                source: "mercadopago",
                amount_cents: payment.final_cents,
                granted_at: new Date().toISOString(),
              };
              if (existing) await supabaseAdmin.from("enrollments").update(row).eq("id", existing.id);
              else
                await supabaseAdmin.from("enrollments").insert({
                  user_id: payment.user_id,
                  plan: payment.plan,
                  purchased_at: payment.created_at,
                  ...row,
                });
            } else if (["refunded", "canceled", "rejected", "charged_back"].includes(status)) {
              const mapped = status === "charged_back" ? "blocked" : status === "rejected" ? "canceled" : status;
              await supabaseAdmin.from("enrollments").update({ status: mapped }).eq("user_id", payment.user_id).eq("plan", payment.plan);
            }
          }
        }
        return Response.json({ ok: true });
      },
    },
  },
});
