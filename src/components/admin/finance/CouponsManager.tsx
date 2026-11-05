import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Pencil, Plus, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { audit, type Coupon, type Payment, type Plan } from "@/lib/admin";
import { formatPrice } from "@/lib/course";
import { centsToInput, fmtDate, fromLocalInput, parseMoney, toLocalInput } from "@/lib/finance";
import { validateCoupon } from "@/lib/pricing";

type Form = {
  id: string | null; code: string; name: string; type: "percent" | "fixed"; value: string; plan: string;
  start: string; end: string; maxUses: string; maxPerCustomer: string; automatic: boolean; active: boolean;
};
const EMPTY: Form = { id: null, code: "", name: "", type: "percent", value: "", plan: "all", start: "", end: "", maxUses: "", maxPerCustomer: "", automatic: false, active: true };
const toForm = (c: Coupon): Form => ({
  id: c.id, code: c.automatic ? "" : c.code, name: c.name, type: c.discount_type === "fixed" ? "fixed" : "percent",
  value: c.discount_type === "fixed" ? centsToInput(c.discount_value) : String(c.discount_value), plan: c.plan ?? "all",
  start: toLocalInput(c.starts_at), end: toLocalInput(c.ends_at), maxUses: c.max_uses?.toString() ?? "",
  maxPerCustomer: c.max_uses_per_customer?.toString() ?? "", automatic: c.automatic, active: c.active,
});
const intOrNull = (s: string) => (s.trim() ? Math.floor(Number(s)) : null);

export function CouponsManager({ coupons, payments, plans }: { coupons: Coupon[]; payments: Payment[]; plans: Plan[] }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((s) => (s ? { ...s, [k]: v } : s));
  const uses = (id: string) => payments.filter((p) => p.coupon_id === id && p.status === "approved").length;
  const planName = (slug: string | null) => (slug ? plans.find((p) => p.slug === slug)?.name ?? slug : "Todos");
  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-data"] }); qc.invalidateQueries({ queryKey: ["public-pricing"] }); };

  async function save() {
    if (!form) return;
    const value = form.type === "fixed" ? parseMoney(form.value) ?? 0 : Number(form.value.replace(",", "."));
    const row = {
      code: form.automatic ? form.code.trim() || `AUTO-${crypto.randomUUID().slice(0, 8).toUpperCase()}` : form.code.trim().toUpperCase(),
      name: form.name.trim(), discount_type: form.type, discount_value: Math.round(value),
      plan: form.plan === "all" ? null : (form.plan as "basic" | "pro"), starts_at: fromLocalInput(form.start), ends_at: fromLocalInput(form.end),
      max_uses: intOrNull(form.maxUses), max_uses_per_customer: intOrNull(form.maxPerCustomer), automatic: form.automatic, active: form.active,
      updated_at: new Date().toISOString(),
    };
    const problem = validateCoupon(row);
    if (problem) { toast.error(problem); return; }
    setSaving(true);
    const res = form.id ? await supabase.from("coupons").update(row).eq("id", form.id).select("id").single() : await supabase.from("coupons").insert(row).select("id").single();
    setSaving(false);
    if (res.error) { toast.error(res.error.code === "23505" ? "Já existe um cupom com esse código." : "Não foi possível salvar o cupom."); return; }
    await audit(form.id ? "coupon_update" : "coupon_create", "coupon", res.data.id, { ...row });
    toast.success("Cupom salvo.");
    setForm(null);
    refresh();
  }

  async function toggle(c: Coupon, active: boolean) {
    const { error } = await supabase.from("coupons").update({ active, updated_at: new Date().toISOString() }).eq("id", c.id);
    if (error) { toast.error("Não foi possível alterar o cupom."); return; }
    await audit("coupon_toggle", "coupon", c.id, { active });
    refresh();
  }

  async function remove(c: Coupon) {
    if (payments.some((p) => p.coupon_id === c.id)) { toast.error("Este cupom já foi usado em vendas. Desative-o em vez de excluir, para manter o histórico."); return; }
    if (!confirm(`Excluir o cupom ${c.automatic ? c.name : c.code}?`)) return;
    const { error } = await supabase.from("coupons").delete().eq("id", c.id);
    if (error) { toast.error("Não foi possível excluir o cupom."); return; }
    await audit("coupon_delete", "coupon", c.id, { code: c.code });
    refresh();
  }

  const describe = (c: Coupon) => (c.discount_type === "fixed" ? formatPrice(c.discount_value) : `${c.discount_value}%`);

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Cupons e promoções</h2>
          <p className="text-sm text-muted-foreground">Cupons exigem um código no checkout. Promoções automáticas valem sem código. O cliente sempre recebe o maior desconto, sem acumular.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="glass" onClick={() => setForm({ ...EMPTY, automatic: true })}><Sparkles /> Nova promoção automática</Button>
          <Button onClick={() => setForm(EMPTY)}><Plus /> Novo cupom</Button>
        </div>
      </div>

      <div className="card-surface overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Código</TableHead><TableHead>Campanha</TableHead><TableHead>Desconto</TableHead><TableHead>Plano</TableHead>
              <TableHead>Período</TableHead><TableHead>Usos</TableHead><TableHead>Ativo</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {coupons.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-xs">{c.automatic ? <span className="inline-flex items-center gap-1 text-primary"><Sparkles className="size-3" /> Automática</span> : c.code}</TableCell>
                <TableCell>{c.name}</TableCell>
                <TableCell>{describe(c)}</TableCell>
                <TableCell>{planName(c.plan)}</TableCell>
                <TableCell className="whitespace-nowrap text-xs">{c.starts_at || c.ends_at ? `${fmtDate(c.starts_at)} → ${fmtDate(c.ends_at)}` : "Sem prazo"}</TableCell>
                <TableCell className="text-xs">{uses(c.id)}{c.max_uses ? ` / ${c.max_uses}` : ""}{c.max_uses_per_customer ? ` · ${c.max_uses_per_customer} por cliente` : ""}</TableCell>
                <TableCell><Switch checked={c.active} onCheckedChange={(v) => toggle(c, v)} aria-label="Ativar cupom" /></TableCell>
                <TableCell className="whitespace-nowrap">
                  <Button size="icon" variant="ghost" aria-label="Editar" onClick={() => setForm(toForm(c))}><Pencil /></Button>
                  <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => remove(c)}><Trash2 /></Button>
                </TableCell>
              </TableRow>
            ))}
            {coupons.length === 0 && <TableRow><TableCell colSpan={8} className="py-10 text-center text-muted-foreground">Nenhum cupom ou promoção criado.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
          <DialogHeader><DialogTitle>{form?.automatic ? "Promoção automática" : "Cupom"}{form?.id ? " — editar" : " — novo"}</DialogTitle></DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              {!form.automatic && <div className="space-y-1.5"><Label>Código</Label><Input value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} placeholder="BLACK20" maxLength={30} /></div>}
              <div className={`space-y-1.5 ${form.automatic ? "sm:col-span-2" : ""}`}><Label>Nome interno da campanha</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Black Friday" maxLength={80} /></div>
              <div className="space-y-1.5">
                <Label>Tipo de desconto</Label>
                <Select value={form.type} onValueChange={(v) => set("type", v as Form["type"])}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="percent">Percentual (%)</SelectItem><SelectItem value="fixed">Valor fixo (R$)</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>{form.type === "percent" ? "Desconto (%)" : "Desconto (R$)"}</Label><Input inputMode="decimal" value={form.value} onChange={(e) => set("value", e.target.value)} placeholder={form.type === "percent" ? "20" : "30,00"} /></div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Plano</Label>
                <Select value={form.plan} onValueChange={(v) => set("plan", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os planos</SelectItem>
                    <SelectItem value="basic">{planName("basic")}</SelectItem>
                    <SelectItem value="pro">{planName("pro")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Início (opcional)</Label><Input type="datetime-local" value={form.start} onChange={(e) => set("start", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Encerramento (opcional)</Label><Input type="datetime-local" value={form.end} onChange={(e) => set("end", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Limite total de usos</Label><Input type="number" min={1} value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="Sem limite" /></div>
              <div className="space-y-1.5"><Label>Limite por cliente</Label><Input type="number" min={1} value={form.maxPerCustomer} onChange={(e) => set("maxPerCustomer", e.target.value)} placeholder="Sem limite" /></div>
              <label className="flex items-center gap-2 text-sm"><Switch checked={form.active} onCheckedChange={(v) => set("active", v)} /> Ativo</label>
              <p className="text-xs text-muted-foreground sm:col-span-2">O desconto nunca deixa o valor abaixo de R$ 1,00.</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setForm(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving}>{saving && <Loader2 className="animate-spin" />} Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
