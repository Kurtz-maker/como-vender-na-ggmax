import { useMemo, useState } from "react";
import { Eye, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatPrice } from "@/lib/course";
import { GATEWAY_LABEL, PAYMENT_STATUSES, STATUS_LABEL } from "@/lib/finance";
import type { Coupon, Payment, PaymentEvent, Plan } from "@/lib/admin";
import { StatusBadge } from "./StatusBadge";
import { SaleDetails } from "./SaleDetails";

const ALL = "all";
export const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

export function SalesTable({ payments, events, coupons, plans }: { payments: Payment[]; events: PaymentEvent[]; coupons: Coupon[]; plans: Plan[] }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [plan, setPlan] = useState(ALL);
  const [gateway, setGateway] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [openId, setOpenId] = useState<string | null>(null);

  const planName = (slug: string) => plans.find((p) => p.slug === slug)?.name ?? (slug === "pro" ? "Pro" : "Básico");
  const gateways = [...new Set(payments.map((p) => p.gateway))];

  const rows = useMemo(() => {
    const f = from ? new Date(`${from}T00:00:00`) : null;
    const t = to ? new Date(`${to}T23:59:59`) : null;
    return payments.filter((p) => {
      const d = new Date(p.created_at);
      if (f && d < f) return false;
      if (t && d > t) return false;
      if (name && !(p.buyer_name ?? "").toLowerCase().includes(name.toLowerCase())) return false;
      if (email && !(p.buyer_email ?? "").toLowerCase().includes(email.toLowerCase())) return false;
      if (plan !== ALL && p.plan !== plan) return false;
      if (gateway !== ALL && p.gateway !== gateway) return false;
      if (status !== ALL && p.status !== status) return false;
      return true;
    });
  }, [payments, from, to, name, email, plan, gateway, status]);

  const filtered = from || to || name || email || plan !== ALL || gateway !== ALL || status !== ALL;
  const clear = () => { setFrom(""); setTo(""); setName(""); setEmail(""); setPlan(ALL); setGateway(ALL); setStatus(ALL); };
  const open = payments.find((p) => p.id === openId) ?? null;

  return (
    <section className="space-y-4">
      <div className="card-surface grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex gap-2">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="Data inicial" />
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="Data final" />
        </div>
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="Nome do comprador" value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os planos</SelectItem>
            <SelectItem value="basic">{planName("basic")}</SelectItem>
            <SelectItem value="pro">{planName("pro")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gateway} onValueChange={setGateway}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os gateways</SelectItem>
            {gateways.map((g) => <SelectItem key={g} value={g}>{GATEWAY_LABEL[g] ?? g}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Todos os status</SelectItem>
            {PAYMENT_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center justify-between gap-2 sm:col-span-2 lg:col-span-2">
          <p className="text-sm text-muted-foreground">{rows.length} de {payments.length} vendas</p>
          {filtered && <Button variant="ghost" size="sm" onClick={clear}><X /> Limpar filtros</Button>}
        </div>
      </div>

      <div className="card-surface overflow-hidden">
        {payments.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">Nenhuma venda registrada ainda. As compras aparecem aqui assim que os clientes iniciarem o pagamento.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Comprador</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead className="text-right">Original</TableHead>
                  <TableHead className="text-right">Desconto</TableHead>
                  <TableHead className="text-right">Pago</TableHead>
                  <TableHead>Gateway</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.id.slice(0, 8)}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{fmtDate(p.created_at)}</TableCell>
                    <TableCell className="max-w-40 truncate">{p.buyer_name ?? "—"}</TableCell>
                    <TableCell className="max-w-48 truncate text-xs">{p.buyer_email ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">{p.buyer_phone ?? "—"}</TableCell>
                    <TableCell>{planName(p.plan)}</TableCell>
                    <TableCell className="text-right">{formatPrice(p.amount_cents)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{p.discount_cents ? `− ${formatPrice(p.discount_cents)}` : "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{formatPrice(p.final_cents)}</TableCell>
                    <TableCell className="whitespace-nowrap">{GATEWAY_LABEL[p.gateway] ?? p.gateway}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell><Button size="sm" variant="glass" onClick={() => setOpenId(p.id)}><Eye /> Detalhes</Button></TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow><TableCell colSpan={12} className="py-10 text-center text-muted-foreground">Nenhuma venda com esses filtros.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <SaleDetails
        payment={open}
        planName={open ? planName(open.plan) : ""}
        coupon={open?.coupon_id ? coupons.find((c) => c.id === open.coupon_id) ?? null : null}
        events={open ? events.filter((e) => e.payment_id === open.id) : []}
        onOpenChange={(o) => !o && setOpenId(null)}
      />
    </section>
  );
}
