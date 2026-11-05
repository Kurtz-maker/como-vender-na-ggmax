import { createFileRoute } from "@tanstack/react-router";
import { MP_STATUS_MAP } from "@/lib/finance";

async function verifySignature(request: Request, dataId: string, secret: string) {
  const sig = request.headers.get("x-signature") ?? "";
  const reqId = request.headers.get("x-request-id") ?? "";
  const ts = /ts=([^,]+)/.exec(sig)?.[1];
  const v1 = /v1=([^,]+)/.exec(sig)?.[1];
  if (!ts || !v1) return false;
  const manifest = `id:${dataId.toLowerCase()};request-id:${reqId};ts:${ts};`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v1;
}

// Payment confirmations from Mercado Pago. The notification itself is never trusted:
// its signature is checked and the payment is re-read from Mercado Pago with our own key.
export const Route = createFileRoute("/api/public/webhooks/mercadopago")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const url = new URL(request.url);
        const body = (await request.json().catch(() => null)) as { type?: string; data?: { id?: string | number } } | null;
        const type = body?.type ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
        const paymentId = String(body?.data?.id ?? url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? "");
        if (type !== "payment" || !paymentId) return Response.json({ ok: true });

        const { getMercadoPagoCredentials, applyAccessChange } = await import("@/lib/payments.server");
        const creds = await getMercadoPagoCredentials({ includeInactive: true });
        if (!creds) return new Response("not configured", { status: 503 });
        if (creds.webhookSecret && !(await verifySignature(request, url.searchParams.get("data.id") ?? paymentId, creds.webhookSecret))) {
          return new Response("invalid signature", { status: 401 });
        }

        const res = await fetch(`https://api.mercadopago.com/v1/payments/${encodeURIComponent(paymentId)}`, {
          headers: { Authorization: `Bearer ${creds.accessToken}` },
        });
        if (!res.ok) return new Response("provider error", { status: 502 });
        const mp = (await res.json()) as {
          id: number;
          status: string;
          status_detail?: string;
          external_reference?: string;
          transaction_amount?: number;
          currency_id?: string;
          transaction_details?: { net_received_amount?: number };
        };
        const ref = mp.external_reference;
        if (!ref) return Response.json({ ok: true });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: payment } = await supabaseAdmin.from("payments").select("*").eq("id", ref).maybeSingle();
        if (!payment) return Response.json({ ok: true });

        let status: string = MP_STATUS_MAP[mp.status] ?? "pending";
        const paidCents = Math.round((mp.transaction_amount ?? 0) * 100);

        // Never grant access when the amount or currency does not match: flag for manual review instead.
        if (status === "approved" && (paidCents < payment.final_cents || (mp.currency_id && mp.currency_id !== "BRL"))) {
          await supabaseAdmin.from("payment_events").insert({
            payment_id: payment.id,
            event: "amount_mismatch",
            payload: { expected: payment.final_cents, received: paidCents, currency: mp.currency_id ?? null },
          });
          status = "in_review";
        }

        if (payment.status === status) return Response.json({ ok: true });

        const net = mp.transaction_details?.net_received_amount;
        await supabaseAdmin
          .from("payments")
          .update({
            status,
            gateway_tx_id: String(mp.id),
            paid_at: status === "approved" ? payment.paid_at ?? new Date().toISOString() : payment.paid_at,
            updated_at: new Date().toISOString(),
            metadata: {
              ...(payment.metadata as object),
              mp_status: mp.status,
              mp_status_detail: mp.status_detail ?? null,
              ...(typeof net === "number" ? { net_received_cents: Math.round(net * 100) } : {}),
            },
          })
          .eq("id", payment.id);
        const change = await applyAccessChange(payment, payment.status, status, `Mercado Pago: ${mp.status}${mp.status_detail ? ` (${mp.status_detail})` : ""}`);
        await supabaseAdmin.from("payment_events").insert({
          payment_id: payment.id,
          event: `status:${status}`,
          payload: { from: payment.status, mp_status: mp.status, detail: mp.status_detail ?? null, mp_payment_id: mp.id, access: change },
        });
        return Response.json({ ok: true });
      },
    },
  },
});
