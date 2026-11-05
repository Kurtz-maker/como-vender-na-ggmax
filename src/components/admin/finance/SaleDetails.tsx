import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { formatPrice } from "@/lib/course";
import { GATEWAY_LABEL, PAYMENT_STATUSES, STATUS_LABEL } from "@/lib/finance";
import { setPaymentStatus } from "@/lib/admin.functions";
import type { Coupon, Payment, PaymentEvent } from "@/lib/admin";
import { StatusBadge } from "./StatusBadge";
import { fmtDate } from "./SalesTable";

const EVENT_LABEL: Record<string, string> = {
  checkout_created: "Checkout iniciado",
  checkout_failed: "Falha ao abrir o checkout",
  amount_mismatch: "Valor recebido diferente do esperado — enviado para análise",
};

function eventLabel(e: PaymentEvent) {
  if (e.event.startsWith("status:")) {
    const p = (e.payload ?? {}) as { manual?: boolean; reason?: string; from?: string };
    const s = STATUS_LABEL[e.event.slice(7)] ?? e.event.slice(7);
    return `${p.manual ? "Alterado manualmente" : "Atualizado pelo gateway"}: ${p.from ? `${STATUS_LABEL[p.from] ?? p.from} → ` : ""}${s}${p.reason ? ` — ${p.reason}` : ""}`;
  }
  return EVENT_LABEL[e.event] ?? e.event;
}

function Row({ label, value, copy }: { label: string; value: string | null | undefined; copy?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 text-sm last:border-0">
      <dt className="shrink-0 text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1 text-right">
        <span className="break-all">{value || "—"}</span>
        {copy && value && (
          <Button size="icon" variant="ghost" className="size-7" aria-label={`Copiar ${label}`} onClick={() => { navigator.clipboard.writeText(value); toast.success(`${label} copiado`); }}>
            <Copy className="size-3.5" />
          </Button>
        )}
      </dd>
    </div>
  );
}

export function SaleDetails({
  payment,
  planName,
  coupon,
  events,
  onOpenChange,
}: {
  payment: Payment | null;
  planName: string;
  coupon: Coupon | null;
  events: PaymentEvent[];
  onOpenChange: (o: boolean) => void;
}) {
  const qc = useQueryClient();
  const setStatus = useServerFn(setPaymentStatus);
  const [next, setNext] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!payment || !next) return;
    if (reason.trim().length < 3) return toast.error("Explique o motivo da alteração.");
    setSaving(true);
    try {
      await setStatus({ data: { paymentId: payment.id, status: next as (typeof PAYMENT_STATUSES)[number], reason: reason.trim() } });
      toast.success("Status atualizado e acesso do aluno ajustado.");
      setNext("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["admin-data"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={!!payment} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {payment && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">Venda {payment.id.slice(0, 8)} <StatusBadge status={payment.status} /></SheetTitle>
              <SheetDescription>Dados pessoais visíveis apenas para administradores. Use-os somente para atender esta compra.</SheetDescription>
            </SheetHeader>

            {(payment.status === "in_review" || payment.status === "charged_back") && (
              <div className="mx-4 flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm">
                <AlertTriangle className="size-5 shrink-0 text-warning" /> Este pagamento precisa de revisão. Confira no Mercado Pago antes de liberar ou revogar o acesso.
              </div>
            )}

            <dl className="px-4">
              <Row label="Nome completo" value={payment.buyer_name} />
              <Row label="E-mail" value={payment.buyer_email} copy />
              <Row label="Telefone" value={payment.buyer_phone} copy />
              <Row label="Plano" value={planName} />
              <Row label="Valor original" value={formatPrice(payment.amount_cents)} />
              <Row label="Cupom" value={coupon ? `${coupon.automatic ? "Promoção automática" : coupon.code} · ${coupon.name}` : null} />
              <Row label="Desconto" value={payment.discount_cents ? formatPrice(payment.discount_cents) : null} />
              <Row label="Valor final pago" value={formatPrice(payment.final_cents)} />
              <Row label="Gateway" value={GATEWAY_LABEL[payment.gateway] ?? payment.gateway} />
              <Row label="ID da transação" value={payment.gateway_tx_id} copy />
              <Row label="Data da compra" value={fmtDate(payment.created_at)} />
              <Row label="Data da confirmação" value={fmtDate(payment.paid_at)} />
              <Row label="Status atual" value={STATUS_LABEL[payment.status] ?? payment.status} />
            </dl>

            <div className="space-y-3 px-4">
              <h3 className="text-sm font-semibold">Histórico do pagamento</h3>
              {events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem alterações registradas.</p>
              ) : (
                <ol className="space-y-3 border-l border-border pl-4">
                  {[...events].reverse().map((e) => (
                    <li key={e.id} className="relative text-sm">
                      <span className="absolute -left-[21px] top-1.5 size-2 rounded-full bg-primary" />
                      <p>{eventLabel(e)}</p>
                      <p className="text-xs text-muted-foreground">{fmtDate(e.created_at)}</p>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            <div className="mx-4 mb-6 space-y-3 rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Revisão manual</h3>
              <p className="text-xs text-muted-foreground">Aprovar libera o plano; reembolsar, cancelar ou marcar como contestado revoga o acesso que este pagamento liberou. Tudo fica registrado.</p>
              <Select value={next} onValueChange={setNext}>
                <SelectTrigger><SelectValue placeholder="Novo status" /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_STATUSES.filter((s) => s !== payment.status).map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="space-y-1.5"><Label htmlFor="reason">Motivo</Label><Textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} placeholder="Ex.: reembolso solicitado pelo cliente" /></div>
              <Button onClick={save} disabled={!next || saving} className="w-full">{saving ? <Loader2 className="animate-spin" /> : "Salvar alteração"}</Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
