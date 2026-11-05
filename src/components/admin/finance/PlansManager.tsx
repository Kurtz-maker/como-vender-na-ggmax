import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Save, Star } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { audit, type Plan } from "@/lib/admin";
import { formatPrice } from "@/lib/course";
import { centsToInput, fromLocalInput, parseMoney, toLocalInput } from "@/lib/finance";
import { ImagePicker } from "../ImagePicker";

const TIERS = [
  { slug: "basic" as const, label: "Básico", hint: "Libera os módulos do plano Básico." },
  { slug: "pro" as const, label: "Pro", hint: "Libera todos os módulos (Básico + Pro)." },
];

type Form = {
  name: string; description: string; price: string; promo: string; promoStart: string; promoEnd: string;
  features: string; active: boolean; featured: boolean; badge: string; cta: string; access: string; image: string | null;
};

const toForm = (p: Plan): Form => ({
  name: p.name, description: p.description ?? "", price: centsToInput(p.price_cents), promo: centsToInput(p.promo_price_cents),
  promoStart: toLocalInput(p.promo_starts_at), promoEnd: toLocalInput(p.promo_ends_at),
  features: ((p.features as string[]) ?? []).join("\n"), active: p.active, featured: p.featured, badge: p.badge ?? "",
  cta: p.cta_label ?? "", access: p.access_info ?? "", image: p.image_url,
});

function PlanCard({ plan, others }: { plan: Plan; others: Plan[] }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(() => toForm(plan));
  const [saving, setSaving] = useState(false);
  useEffect(() => setF(toForm(plan)), [plan]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((s) => ({ ...s, [k]: v }));
  const tier = TIERS.find((t) => t.slug === plan.slug)!;

  async function save() {
    const price = parseMoney(f.price);
    const promo = parseMoney(f.promo);
    if (!f.name.trim()) return toast.error("Informe o nome do plano.");
    if (price == null || price < 100) return toast.error("Informe um preço de pelo menos R$ 1,00.");
    if (promo != null && (promo < 100 || promo >= price)) return toast.error("O preço promocional deve ser menor que o preço normal e de pelo menos R$ 1,00.");
    if (f.promoStart && f.promoEnd && new Date(f.promoEnd) <= new Date(f.promoStart)) return toast.error("O fim da promoção deve ser depois do início.");
    setSaving(true);
    const row = {
      name: f.name.trim(), description: f.description.trim() || null, price_cents: price, promo_price_cents: promo,
      promo_starts_at: promo != null ? fromLocalInput(f.promoStart) : null, promo_ends_at: promo != null ? fromLocalInput(f.promoEnd) : null,
      features: f.features.split("\n").map((s) => s.trim()).filter(Boolean), active: f.active, featured: f.featured,
      badge: f.badge.trim() || null, cta_label: f.cta.trim() || null, access_info: f.access.trim() || null, image_url: f.image,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("plans").update(row).eq("slug", plan.slug);
    if (!error && f.featured) await supabase.from("plans").update({ featured: false }).neq("slug", plan.slug);
    setSaving(false);
    if (error) return toast.error("Não foi possível salvar o plano.");
    await audit("plan_update", "plan", plan.slug, {
      price: { from: plan.price_cents, to: price }, promo: { from: plan.promo_price_cents, to: promo }, active: f.active, featured: f.featured,
    });
    toast.success(`Plano ${row.name} atualizado. A página pública já mostra os novos valores.`);
    qc.invalidateQueries({ queryKey: ["admin-data"] });
    qc.invalidateQueries({ queryKey: ["landing"] });
    qc.invalidateQueries({ queryKey: ["public-pricing"] });
  }

  return (
    <div className={`card-surface space-y-5 p-6 ${f.featured ? "border-primary/60 shadow-glow" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Nível de acesso: {tier.label}</p>
          <p className="text-xs text-muted-foreground">{tier.hint}</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => set("active", v)} /> Ativo</label>
          <label className="flex items-center gap-2"><Switch checked={f.featured} onCheckedChange={(v) => set("featured", v)} /> <Star className="size-4" /> Destaque</label>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>Nome</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} maxLength={60} /></div>
        <div className="space-y-1.5"><Label>Selo (opcional)</Label><Input value={f.badge} onChange={(e) => set("badge", e.target.value)} placeholder="MAIS ESCOLHIDO" maxLength={30} /></div>
        <div className="space-y-1.5"><Label>Preço (R$)</Label><Input inputMode="decimal" value={f.price} onChange={(e) => set("price", e.target.value)} placeholder="197,00" /></div>
        <div className="space-y-1.5"><Label>Preço promocional (R$, opcional)</Label><Input inputMode="decimal" value={f.promo} onChange={(e) => set("promo", e.target.value)} placeholder="147,00" /></div>
        {f.promo && (
          <>
            <div className="space-y-1.5"><Label>Promoção começa</Label><Input type="datetime-local" value={f.promoStart} onChange={(e) => set("promoStart", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Promoção termina</Label><Input type="datetime-local" value={f.promoEnd} onChange={(e) => set("promoEnd", e.target.value)} /></div>
          </>
        )}
        <div className="space-y-1.5 sm:col-span-2"><Label>Descrição</Label><Textarea value={f.description} onChange={(e) => set("description", e.target.value)} maxLength={400} /></div>
        <div className="space-y-1.5 sm:col-span-2"><Label>Benefícios (um por linha)</Label><Textarea rows={5} value={f.features} onChange={(e) => set("features", e.target.value)} /></div>
        <div className="space-y-1.5"><Label>Texto do botão</Label><Input value={f.cta} onChange={(e) => set("cta", e.target.value)} placeholder="QUERO COMEÇAR AGORA" maxLength={40} /></div>
        <div className="space-y-1.5"><Label>Informação de acesso</Label><Input value={f.access} onChange={(e) => set("access", e.target.value)} placeholder="Acesso por 12 meses" maxLength={120} /></div>
        <ImagePicker className="sm:col-span-2" label="Imagem de divulgação do plano" value={f.image} onChange={(v) => set("image", v)} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Hoje na página: {formatPrice(plan.price_cents) ?? "sem preço"}
          {plan.promo_price_cents ? ` · promoção ${formatPrice(plan.promo_price_cents)}` : ""}
          {others.length ? "" : ""}
        </p>
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />} Salvar plano</Button>
      </div>
    </div>
  );
}

export function PlansManager({ plans }: { plans: Plan[] }) {
  const qc = useQueryClient();
  const missing = TIERS.filter((t) => !plans.some((p) => p.slug === t.slug));

  async function create(slug: "basic" | "pro") {
    const label = TIERS.find((t) => t.slug === slug)!.label;
    const { error } = await supabase.from("plans").insert({ slug, name: label, active: false, features: [] });
    if (error) return toast.error("Não foi possível criar o plano.");
    await audit("plan_create", "plan", slug, {});
    toast.success(`Plano ${label} criado (inativo). Defina o preço e ative quando quiser.`);
    qc.invalidateQueries({ queryKey: ["admin-data"] });
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Planos e preços</h2>
          <p className="text-sm text-muted-foreground">Os valores salvos aqui aparecem na hora na página pública e são usados no checkout.</p>
        </div>
        {missing.map((t) => (
          <Button key={t.slug} variant="glass" onClick={() => create(t.slug)}><Plus /> Criar plano {t.label}</Button>
        ))}
      </div>
      {plans.length === 0 && <p className="card-surface p-8 text-center text-sm text-muted-foreground">Nenhum plano criado ainda.</p>}
      <div className="grid gap-5 xl:grid-cols-2">
        {plans.map((p) => <PlanCard key={p.slug} plan={p} others={plans.filter((o) => o.slug !== p.slug)} />)}
      </div>
    </section>
  );
}
