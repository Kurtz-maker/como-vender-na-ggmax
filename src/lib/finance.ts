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
