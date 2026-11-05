/** Payment status vocabulary and financial summary rules. */

export const PAYMENT_STATUSES = ["pending", "in_review", "approved", "rejected", "canceled", "refunded", "charged_back"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  in_review: "Em análise",
  approved: "Aprovado",
  rejected: "Recusado",
  canceled: "Cancelado",
  refunded: "Reembolsado",
  charged_back: "Contestado",
};

export const GATEWAY_LABEL: Record<string, string> = { mercadopago: "Mercado Pago", manual: "Manual" };

/** Mercado Pago payment status -> our status. Disputes and manual review are flagged for review. */
export const MP_STATUS_MAP: Record<string, PaymentStatus> = {
  approved: "approved",
  pending: "pending",
  in_process: "pending",
  authorized: "pending",
  in_mediation: "in_review",
  rejected: "rejected",
  cancelled: "canceled",
  refunded: "refunded",
  charged_back: "charged_back",
};

type SummaryPayment = { status: string; final_cents: number; metadata: unknown };

const netOf = (p: SummaryPayment) => {
  const m = (p.metadata ?? {}) as { net_received_cents?: number };
  return typeof m.net_received_cents === "number" ? m.net_received_cents : p.final_cents;
};

/** Only approved payments count as revenue; pending ones never do. */
export function summarize(payments: SummaryPayment[]) {
  const approved = payments.filter((p) => p.status === "approved");
  return {
    totalSales: payments.length,
    gross: approved.reduce((s, p) => s + p.final_cents, 0),
    net: approved.reduce((s, p) => s + netOf(p), 0),
    approved: approved.length,
    pending: payments.filter((p) => p.status === "pending" || p.status === "in_review").length,
    canceledOrRefunded: payments.filter((p) => ["canceled", "refunded", "charged_back"].includes(p.status)).length,
  };
}

/** What happens to the buyer's access when a payment moves from one status to another. */
export function accessChange(previous: string | null, next: string): "grant" | "revoke" | "block" | "none" {
  if (next === "approved") return "grant";
  const wasApproved = previous === "approved" || previous === "in_review";
  if (!wasApproved) return "none";
  if (next === "charged_back") return "block";
  if (next === "refunded" || next === "canceled" || next === "rejected") return "revoke";
  return "none";
}

export const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

/** "197,90" or "197.90" or "R$ 1.197,90" -> cents. Returns null for empty/invalid input. */
export function parseMoney(input: string): number | null {
  const s = input.replace(/[^\d,.-]/g, "").trim();
  if (!s) return null;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export const centsToInput = (c: number | null | undefined) => (c == null ? "" : (c / 100).toFixed(2).replace(".", ","));

/** ISO date <-> value of an <input type="datetime-local"> in the browser's timezone. */
export const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fromLocalInput = (v: string) => (v ? new Date(v).toISOString() : null);
