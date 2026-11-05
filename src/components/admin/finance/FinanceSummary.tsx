import { BadgeCheck, Ban, Clock, Receipt, TrendingUp, Wallet } from "lucide-react";
import { formatPrice } from "@/lib/course";
import { summarize } from "@/lib/finance";
import type { Payment } from "@/lib/admin";

export function FinanceSummary({ payments }: { payments: Payment[] }) {
  const s = summarize(payments);
  const cards = [
    { label: "Total de vendas", value: String(s.totalSales), hint: "transações registradas", icon: Receipt },
    { label: "Faturamento bruto", value: formatPrice(s.gross) ?? "R$ 0,00", hint: "pago pelos clientes (aprovados)", icon: TrendingUp },
    { label: "Valor líquido recebido", value: formatPrice(s.net) ?? "R$ 0,00", hint: "após taxas do gateway", icon: Wallet },
    { label: "Compras aprovadas", value: String(s.approved), hint: "acesso liberado", icon: BadgeCheck },
    { label: "Pagamentos pendentes", value: String(s.pending), hint: "aguardando ou em análise", icon: Clock },
    { label: "Cancelados ou reembolsados", value: String(s.canceledOrRefunded), hint: "inclui contestações", icon: Ban },
  ];
  return (
    <section>
      <h2 className="mb-4 text-2xl font-bold">Resumo financeiro</h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <div key={c.label} className="card-surface flex items-start gap-4 p-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground"><c.icon className="size-5" /></span>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">{c.label}</p>
              <p className="mt-1 truncate font-display text-2xl font-bold">{c.value}</p>
              <p className="text-xs text-muted-foreground">{c.hint}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
