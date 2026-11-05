import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { ArrowRight, Check, Lock, ShieldCheck, Sparkles, Layers, Bot, Wallet, ShoppingCart, LayoutGrid, Megaphone, BadgeCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/Logo";
import { ImageSlot } from "@/components/ImageSlot";
import { landingQuery, formatPrice } from "@/lib/course";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GGMAX Seller Academy — Aprenda a revender contas de jogos" },
      { name: "description", content: "Treinamento passo a passo para vender contas de jogos na GGMAX: carteira digital, compra com critério, gestão de estoque e anúncios profissionais." },
      { property: "og:title", content: "GGMAX Seller Academy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Do cadastro na GGMAX ao seu primeiro anúncio profissional de contas de jogos." },
    ],
  }),
  component: Index,
});

const journey = [
  { label: "Conta de vendedor", icon: Store },
  { label: "Carteira digital", icon: Wallet },
  { label: "Fornecimento", icon: ShoppingCart },
  { label: "Seleção de contas", icon: BadgeCheck },
  { label: "Gestão de estoque", icon: LayoutGrid },
  { label: "Anúncios", icon: Megaphone },
  { label: "Venda", icon: Sparkles },
];

const learn = [
  "Criar e verificar sua conta de vendedor",
  "Configurar sua carteira de criptomoedas e pagamentos",
  "Encontrar boas contas para revenda e avaliar cada uma",
  "Organizar seu estoque de contas",
  "Usar templates e inteligência artificial para criar anúncios",
  "Montar títulos, descrições, preço e estoque do anúncio",
];

const moduleNames: Record<number, { title: string; desc: string }> = {
  1: { title: "Sua conta de vendedor", desc: "Cadastro, verificação e segurança da conta." },
  2: { title: "Configuração de criptomoedas", desc: "Carteira digital e pagamentos do jeito certo." },
  3: { title: "Comprando contas para revenda", desc: "Como escolher contas com critério e segurança." },
  4: { title: "Gestão do estoque", desc: "Organize cada conta comprada sem perder nada." },
  5: { title: "Templates de anúncio", desc: "Modelos prontos para acelerar suas publicações." },
  6: { title: "Anúncio profissional", desc: "Título, descrição, preço e publicação passo a passo." },
  7: { title: "Assistente de IA", desc: "Use inteligência artificial a seu favor nos anúncios." },
};

const benefits = [
  { icon: Layers, title: "Passo a passo real", desc: "Cada etapa em ordem, do cadastro à publicação." },
  { icon: Bot, title: "Prompts prontos", desc: "Biblioteca de comandos de IA para títulos, descrições e atendimento." },
  { icon: ShieldCheck, title: "Foco em segurança", desc: "Avisos sobre documentos, códigos e transferências." },
  { icon: LayoutGrid, title: "Templates de anúncio", desc: "Modelos de referência organizados por jogo." },
];

function useSignedIn() {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSigned(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSigned(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return signed;
}

function Index() {
  const { data } = useQuery(landingQuery);
  const signed = useSignedIn();
  const hero = data?.hero;
  const outline = data?.outline ?? [];

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#conteudo" className="hover:text-foreground">Conteúdo</a>
            <a href="#planos" className="hover:text-foreground">Planos</a>
            <a href="#faq" className="hover:text-foreground">Dúvidas</a>
          </nav>
          <Button variant="glass" size="sm" asChild>
            {signed ? <Link to="/aluno">Minha área</Link> : <Link to="/auth">Entrar</Link>}
          </Button>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="pointer-events-none absolute inset-0 bg-glow" />
        <div className="pointer-events-none absolute inset-0 grid-lines" />
        <div className="relative mx-auto grid max-w-6xl gap-12 px-5 pb-20 pt-16 md:grid-cols-[1.1fr_1fr] md:pt-24">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent/60 px-3 py-1 font-mono text-xs text-accent-foreground">
              <span className="size-1.5 animate-pulse rounded-full bg-primary" /> {hero?.badge ?? "GGMAX Seller Academy"}
            </span>
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] md:text-6xl">
              <span className="text-gradient">{hero?.title ?? "Do zero ao seu primeiro anúncio de contas de jogos na GGMAX"}</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">{hero?.subtitle}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" asChild><a href="#planos">QUERO COMEÇAR AGORA <ArrowRight /></a></Button>
              <Button variant="glass" size="xl" asChild><a href="#conteudo">CONHECER O CONTEÚDO</a></Button>
            </div>
          </div>
          <div className="relative aspect-[4/3] rounded-2xl border border-border bg-card/50 p-2 shadow-glow">
            <ImageSlot src={hero?.image_url} label="Banner principal do curso — adicione pelo painel administrativo" />
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      <section className="border-y border-border/60 bg-card/30">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <p className="mb-8 text-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">A jornada do aluno</p>
          <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {journey.map((j, i) => (
              <li key={j.label} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-4 text-center text-sm transition hover:border-primary/60">
                <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                <j.icon className="size-5 text-primary" />
                <span className="leading-tight">{j.label}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* LEARN */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Apresentação</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">O que você vai aprender</h2>
            <p className="mt-4 text-muted-foreground">
              Um método organizado em etapas: você configura as ferramentas, compra com critério, organiza o estoque e publica anúncios claros e honestos.
            </p>
            <div className="mt-8 aspect-video"><ImageSlot label="Imagem de apresentação" /></div>
          </div>
          <ul className="space-y-3 self-center">
            {learn.map((l) => (
              <li key={l} className="card-surface flex items-start gap-3 p-4">
                <Check className="mt-0.5 size-5 shrink-0 text-primary" /> <span>{l}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* MODULES */}
      <section id="conteudo" className="relative border-t border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-glow opacity-60" />
        <div className="relative mx-auto max-w-6xl px-5 py-24">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">Conteúdo</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">Módulos do treinamento</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {(data?.modules ?? []).map((m) => {
              const lessons = outline.filter((o) => o.module_id === m.id);
              return (
                <article key={m.id} className="card-surface group flex flex-col overflow-hidden hover:-translate-y-1">
                  <div className="aspect-video p-2"><ImageSlot src={m.image_url} label="Imagem do módulo" /></div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                      <span>MÓDULO {String(m.sort_order).padStart(2, "0")}</span>
                      {m.required_plan === "pro" && <span className="rounded bg-electric/15 px-2 py-0.5 text-electric">PRO</span>}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold group-hover:text-primary">{m.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{m.description}</p>
                    <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Lock className="size-3" /> {lessons.length} {lessons.length === 1 ? "aula" : "aulas"}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <h2 className="text-3xl font-bold md:text-4xl">Benefícios do treinamento</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="card-surface p-6">
              <b.icon className="size-6 text-primary" />
              <p className="mt-4 font-semibold">{b.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* PLANS */}
      <section id="planos" className="relative border-t border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-glow" />
        <div className="relative mx-auto max-w-4xl px-5 py-24">
          <h2 className="text-center text-3xl font-bold md:text-4xl">Escolha seu plano</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {(data?.plans ?? []).map((p) => {
              const pro = p.featured;
              const price = formatPrice(p.price_cents);
              const features = (p.features as string[]) ?? [];
              return (
                <div key={p.slug} className={`card-surface relative flex flex-col p-7 transition duration-300 hover:-translate-y-1 ${pro ? "border-primary/60 shadow-glow" : ""}`}>
                  {p.badge && <span className="absolute -top-3 right-6 rounded-full bg-primary px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-primary-foreground">{p.badge}</span>}
                  <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Plano {p.name}</p>
                  <p className="mt-3 font-display text-4xl font-bold">{price ?? <span className="text-2xl text-muted-foreground">Em breve</span>}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                  <ul className="mt-6 flex-1 space-y-2 text-sm">
                    {features.map((f) => <li key={f} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> <span>{f}</span></li>)}
                  </ul>
                  {p.access_info && <p className="mt-5 text-xs text-muted-foreground">Acesso: {p.access_info}</p>}
                  <Button variant={pro ? "hero" : "glass"} size="xl" className="mt-7 w-full whitespace-normal" asChild>
                    {p.checkout_url ? (
                      <a href={p.checkout_url}>{p.cta_label ?? "QUERO COMEÇAR AGORA"}</a>
                    ) : (
                      <Link to="/auth">{p.cta_label ?? "Criar minha conta"}</Link>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
        <h2 className="text-3xl font-bold md:text-4xl">Perguntas frequentes</h2>
        <Accordion type="single" collapsible className="mt-8">
          {(data?.faq ?? []).map((f, i) => (
            <AccordionItem key={i} value={String(i)}>
              <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {f.a}
                {f.support && data?.support?.url && (
                  <> <a href={data.support.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{data.support.label ?? "Falar com o suporte"}</a></>
                )}
                {f.access && (data?.plans ?? []).some((p) => p.access_info) && (
                  <ul className="mt-2">{data!.plans.filter((p) => p.access_info).map((p) => <li key={p.slug}>Plano {p.name}: {p.access_info}</li>)}</ul>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FINAL CTA */}
      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/40 bg-card p-10 text-center shadow-glow md:p-16">
          <div className="pointer-events-none absolute inset-0 bg-glow" />
          <h2 className="relative text-3xl font-bold md:text-5xl">Pronto para começar?</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">Acesse o treinamento completo e siga o passo a passo no seu ritmo.</p>
          <Button variant="hero" size="xl" className="relative mt-8" asChild><a href="#planos">QUERO COMEÇAR AGORA <ArrowRight /></a></Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        GGMAX Seller Academy · Curso independente, sem vínculo oficial com a GGMAX.
      </footer>
    </div>
  );
}
