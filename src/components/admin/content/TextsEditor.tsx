import type { ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Faq, Hero, Support } from "@/lib/course";
import { ACCENTS, DEFAULT_HERO, DEFAULT_TEXTS, type Accent, type Banner, type Benefit, type LandingTexts } from "@/lib/landing-content";
import { cn } from "@/lib/utils";
import { ImagePicker } from "../ImagePicker";
import { ListEditor } from "./ListEditor";
import { useDrafts } from "./DraftStore";

const ACCENT_LABEL: Record<Accent, string> = { green: "Verde", blue: "Azul", violet: "Violeta", orange: "Laranja", pink: "Rosa" };

function Field({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return <div className={cn("space-y-1.5", className)}><Label>{label}</Label>{children}</div>;
}

export function TextsEditor() {
  const { settings, setSetting } = useDrafts();
  const hero = { ...DEFAULT_HERO, ...((settings["hero"] as Partial<Hero>) ?? {}) };
  const texts = { ...DEFAULT_TEXTS, ...((settings["texts"] as Partial<LandingTexts>) ?? {}) };
  const banner: Banner = { active: false, text: "", ...((settings["banner"] as Partial<Banner>) ?? {}) };
  const faq = (settings["faq"] as Faq | undefined) ?? [];
  const support: Support = { url: null, ...((settings["support"] as Partial<Support>) ?? {}) };
  const accent = ((settings["theme"] as { accent?: Accent } | undefined)?.accent ?? "green") as Accent;

  const setHero = (p: Partial<Hero>) => setSetting("hero", { ...hero, ...p });
  const setTexts = (p: Partial<LandingTexts>) => setSetting("texts", { ...texts, ...p });
  const setBanner = (p: Partial<Banner>) => setSetting("banner", { ...banner, ...p });

  return (
    <Accordion type="multiple" defaultValue={["hero"]} className="space-y-3">
      <AccordionItem value="hero" className="card-surface border-b-0 px-5">
        <AccordionTrigger>Banner principal</AccordionTrigger>
        <AccordionContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Selo acima do título"><Input value={hero.badge ?? ""} onChange={(e) => setHero({ badge: e.target.value })} /></Field>
          <Field label="Título principal" className="sm:col-span-2"><Textarea rows={2} value={hero.title} onChange={(e) => setHero({ title: e.target.value })} /></Field>
          <Field label="Subtítulo" className="sm:col-span-2"><Textarea rows={3} value={hero.subtitle} onChange={(e) => setHero({ subtitle: e.target.value })} /></Field>
          <Field label="Texto do botão principal"><Input value={texts.hero_cta_primary} onChange={(e) => setTexts({ hero_cta_primary: e.target.value })} /></Field>
          <Field label="Texto do botão secundário"><Input value={texts.hero_cta_secondary} onChange={(e) => setTexts({ hero_cta_secondary: e.target.value })} /></Field>
          <ImagePicker className="sm:col-span-2" label="Imagem do banner" value={hero.image_url} onChange={(v) => setHero({ image_url: v })} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="promo" className="card-surface border-b-0 px-5">
        <AccordionTrigger>Chamada promocional (faixa no topo)</AccordionTrigger>
        <AccordionContent className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><Switch checked={banner.active} onCheckedChange={(v) => setBanner({ active: v })} /> Mostrar faixa promocional</label>
          <Field label="Texto" className="sm:col-span-2"><Input value={banner.text} onChange={(e) => setBanner({ text: e.target.value })} placeholder="Black Friday: 30% off no plano Pro até domingo" /></Field>
          <Field label="Texto do link (opcional)"><Input value={banner.link_label ?? ""} onChange={(e) => setBanner({ link_label: e.target.value })} /></Field>
          <Field label="Endereço do link (opcional)"><Input value={banner.link_url ?? ""} onChange={(e) => setBanner({ link_url: e.target.value })} placeholder="#planos" /></Field>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="learn" className="card-surface border-b-0 px-5">
        <AccordionTrigger>Apresentação e jornada</AccordionTrigger>
        <AccordionContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Título da jornada"><Input value={texts.journey_title} onChange={(e) => setTexts({ journey_title: e.target.value })} /></Field>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Etapas da jornada</Label>
            <ListEditor items={texts.journey} onChange={(v) => setTexts({ journey: v })} create={() => "Nova etapa"} addLabel="Adicionar etapa"
              render={(item, update) => <Input value={item} onChange={(e) => update(e.target.value)} />} />
          </div>
          <Field label="Rótulo da seção"><Input value={texts.learn_eyebrow} onChange={(e) => setTexts({ learn_eyebrow: e.target.value })} /></Field>
          <Field label="Título"><Input value={texts.learn_title} onChange={(e) => setTexts({ learn_title: e.target.value })} /></Field>
          <Field label="Texto de apresentação" className="sm:col-span-2"><Textarea rows={3} value={texts.learn_intro} onChange={(e) => setTexts({ learn_intro: e.target.value })} /></Field>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>O que o aluno vai aprender</Label>
            <ListEditor items={texts.learn_items} onChange={(v) => setTexts({ learn_items: v })} create={() => ""} addLabel="Adicionar item"
              render={(item, update) => <Input value={item} onChange={(e) => update(e.target.value)} />} />
          </div>
          <ImagePicker className="sm:col-span-2" label="Imagem de apresentação" value={texts.presentation_image} onChange={(v) => setTexts({ presentation_image: v })} />
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="benefits" className="card-surface border-b-0 px-5">
        <AccordionTrigger>Títulos das seções e benefícios</AccordionTrigger>
        <AccordionContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Título dos módulos"><Input value={texts.modules_title} onChange={(e) => setTexts({ modules_title: e.target.value })} /></Field>
          <Field label="Título dos benefícios"><Input value={texts.benefits_title} onChange={(e) => setTexts({ benefits_title: e.target.value })} /></Field>
          <Field label="Título dos planos"><Input value={texts.plans_title} onChange={(e) => setTexts({ plans_title: e.target.value })} /></Field>
          <Field label="Título das perguntas frequentes"><Input value={texts.faq_title} onChange={(e) => setTexts({ faq_title: e.target.value })} /></Field>
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Benefícios</Label>
            <ListEditor<Benefit> items={texts.benefits} onChange={(v) => setTexts({ benefits: v })} create={() => ({ title: "", desc: "" })} addLabel="Adicionar benefício"
              render={(b, update) => (
                <div className="grid gap-2 sm:grid-cols-[1fr_2fr]">
                  <Input value={b.title} placeholder="Título" onChange={(e) => update({ ...b, title: e.target.value })} />
                  <Input value={b.desc} placeholder="Descrição" onChange={(e) => update({ ...b, desc: e.target.value })} />
                </div>
              )} />
          </div>
          <p className="text-xs text-muted-foreground sm:col-span-2">Os benefícios de cada plano são editados em Finanças → Planos e preços.</p>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="faq" className="card-surface border-b-0 px-5">
        <AccordionTrigger>Perguntas frequentes</AccordionTrigger>
        <AccordionContent className="space-y-4">
          <ListEditor<Faq[number]> items={faq} onChange={(v) => setSetting("faq", v)} create={() => ({ q: "", a: "" })} addLabel="Adicionar pergunta"
            render={(f, update) => (
              <div className="space-y-2">
                <Input value={f.q} placeholder="Pergunta" onChange={(e) => update({ ...f, q: e.target.value })} />
                <Textarea rows={2} value={f.a} placeholder="Resposta" onChange={(e) => update({ ...f, a: e.target.value })} />
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <label className="flex items-center gap-2"><Switch checked={!!f.support} onCheckedChange={(v) => update({ ...f, support: v })} /> Mostrar link do suporte</label>
                  <label className="flex items-center gap-2"><Switch checked={!!f.access} onCheckedChange={(v) => update({ ...f, access: v })} /> Listar o acesso de cada plano</label>
                </div>
              </div>
            )} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Link do suporte"><Input value={support.url ?? ""} onChange={(e) => setSetting("support", { ...support, url: e.target.value || null })} placeholder="https://wa.me/55..." /></Field>
            <Field label="Texto do link do suporte"><Input value={support.label ?? ""} onChange={(e) => setSetting("support", { ...support, label: e.target.value })} placeholder="Falar com o suporte" /></Field>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="cta" className="card-surface border-b-0 px-5">
        <AccordionTrigger>Chamada final e rodapé</AccordionTrigger>
        <AccordionContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Título"><Input value={texts.cta_title} onChange={(e) => setTexts({ cta_title: e.target.value })} /></Field>
          <Field label="Texto do botão"><Input value={texts.cta_button} onChange={(e) => setTexts({ cta_button: e.target.value })} /></Field>
          <Field label="Texto" className="sm:col-span-2"><Textarea rows={2} value={texts.cta_text} onChange={(e) => setTexts({ cta_text: e.target.value })} /></Field>
          <Field label="Rodapé" className="sm:col-span-2"><Input value={texts.footer} onChange={(e) => setTexts({ footer: e.target.value })} /></Field>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="theme" className="card-surface border-b-0 px-5">
        <AccordionTrigger>Cor de destaque</AccordionTrigger>
        <AccordionContent>
          <div className="flex flex-wrap gap-3">
            {ACCENTS.map((a) => (
              <button key={a} type="button" data-accent={a} onClick={() => setSetting("theme", { accent: a })}
                className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition", accent === a ? "border-primary text-primary" : "border-border text-muted-foreground hover:border-primary/60")}>
                <span className="size-4 rounded-full bg-primary" /> {ACCENT_LABEL[a]}
              </button>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
