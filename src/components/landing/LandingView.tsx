import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Lock, ShieldCheck, Sparkles, Layers, Bot, Wallet, ShoppingCart, LayoutGrid, Megaphone, BadgeCheck, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Logo } from "@/components/Logo";
import { ImageSlot } from "@/components/ImageSlot";
import { formatPrice } from "@/lib/course";
import type { LandingData, PlanRow, PublicPrice } from "@/lib/landing-content";
import { cn } from "@/lib/utils";

const journeyIcons = [Store, Wallet, ShoppingCart, BadgeCheck, LayoutGrid, Megaphone, Sparkles];
const benefitIcons = [Layers, Bot, ShieldCheck, LayoutGrid, Sparkles, BadgeCheck];

/** The public course page. Used by the real home page and by the admin preview (with unpublished drafts). */
export function LandingView({
  data,
  prices,
  signed,
  onBuy,
  preview = false,
}: {
  data: LandingData;
  prices?: Record<string, PublicPrice> | undefined;
  signed: boolean;
  onBuy?: ((plan: PlanRow) => void) | undefined;
  preview?: boolean | undefined;
}) {
  const { hero, texts, outline, banner } = data;

  return (
    <div data-accent={data.theme.accent} className="min-h-screen overflow-x-hidden bg-background text-foreground">
      {banner?.active && banner.text && (
        <div className="bg-primary px-5 py-2 text-center text-sm font-medium text-primary-foreground">
          {banner.text}
          {banner.link_url && (
            <a href={banner.link_url} className="ml-2 underline underline-offset-4">{banner.link_label || "Saiba mais"}</a>
          )}
        </div>
      )}
      <header className={cn("top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl", preview ? "relative" : "sticky")}>
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
            {hero.badge && (
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-accent/60 px-3 py-1 font-mono text-xs text-accent-foreground">
                <span className="size-1.5 animate-pulse rounded-full bg-primary" /> {hero.badge}
              </span>
            )}
            <h1 className="mt-6 text-4xl font-bold leading-[1.05] md:text-6xl">
              <span className="text-gradient">{hero.title}</span>
            </h1>
            {hero.subtitle && <p className="mt-6 max-w-xl text-lg text-muted-foreground">{hero.subtitle}</p>}
            <div className="mt-9 flex flex-wrap gap-3">
              <Button variant="hero" size="xl" asChild><a href="#planos">{texts.hero_cta_primary} <ArrowRight /></a></Button>
              <Button variant="glass" size="xl" asChild><a href="#conteudo">{texts.hero_cta_secondary}</a></Button>
            </div>
          </div>
          <div className="relative aspect-[4/3] rounded-2xl border border-border bg-card/50 p-2 shadow-glow">
            <ImageSlot src={hero.image_url} label="Banner principal do curso — adicione pelo painel administrativo" />
          </div>
        </div>
      </section>

      {/* JOURNEY */}
      {texts.journey.length > 0 && (
        <section className="border-y border-border/60 bg-card/30">
          <div className="mx-auto max-w-6xl px-5 py-14">
            <p className="mb-8 text-center font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">{texts.journey_title}</p>
            <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {texts.journey.map((label, i) => {
                const Icon = journeyIcons[i % journeyIcons.length]!;
                return (
                  <li key={i} className="flex flex-col items-center gap-2 rounded-xl border border-border bg-background p-4 text-center text-sm transition hover:border-primary/60">
                    <span className="font-mono text-[10px] text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                    <Icon className="size-5 text-primary" />
                    <span className="leading-tight">{label}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>
      )}

      {/* LEARN */}
      <section className="mx-auto max-w-6xl px-5 py-24">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-primary">{texts.learn_eyebrow}</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">{texts.learn_title}</h2>
            <p className="mt-4 text-muted-foreground">{texts.learn_intro}</p>
            <div className="mt-8 aspect-video"><ImageSlot src={texts.presentation_image} label="Imagem de apresentação" /></div>
          </div>
          <ul className="space-y-3 self-center">
            {texts.learn_items.map((l, i) => (
              <li key={i} className="card-surface flex items-start gap-3 p-4">
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
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">{texts.modules_title}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.modules.map((m, idx) => {
              const lessons = outline.filter((o) => o.module_id === m.id);
              return (
                <article key={m.id} className="card-surface group flex flex-col overflow-hidden hover:-translate-y-1">
                  <div className="aspect-video p-2"><ImageSlot src={m.image_url} label="Imagem do módulo" /></div>
                  <div className="flex flex-1 flex-col p-5">
                    <div className="flex items-center justify-between font-mono text-xs text-muted-foreground">
                      <span>MÓDULO {String(idx + 1).padStart(2, "0")}</span>
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
      {texts.benefits.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-24">
          <h2 className="text-3xl font-bold md:text-4xl">{texts.benefits_title}</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {texts.benefits.map((b, i) => {
              const Icon = benefitIcons[i % benefitIcons.length]!;
              return (
                <div key={i} className="card-surface p-6">
                  <Icon className="size-6 text-primary" />
                  <p className="mt-4 font-semibold">{b.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{b.desc}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* PLANS */}
      <section id="planos" className="relative border-t border-border/60">
        <div className="pointer-events-none absolute inset-0 bg-glow" />
        <div className="relative mx-auto max-w-4xl px-5 py-24">
          <h2 className="text-center text-3xl font-bold md:text-4xl">{texts.plans_title}</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            {data.plans.map((p) => {
              const featured = p.featured;
              const price = prices?.[p.slug];
              const shownFinal = price?.final ?? p.price_cents;
              const reduced = price && price.final < price.original;
              const features = (p.features as string[]) ?? [];
              return (
                <div key={p.slug} className={cn("card-surface relative flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1", featured && "border-primary/60 shadow-glow")}>
                  {p.badge && <span className="absolute right-6 top-3 z-10 rounded-full bg-primary px-3 py-1 font-mono text-[10px] font-bold tracking-widest text-primary-foreground">{p.badge}</span>}
                  {p.image_url && <img src={p.image_url} alt={`Plano ${p.name}`} className="aspect-[16/7] w-full object-cover" />}
                  <div className="flex flex-1 flex-col p-7">
                    <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">Plano {p.name}</p>
                    {reduced && <p className="mt-3 text-sm text-muted-foreground line-through">{formatPrice(price.original)}</p>}
                    <p className={cn("font-display text-4xl font-bold", reduced ? "mt-1" : "mt-3")}>
                      {formatPrice(shownFinal) ?? <span className="text-2xl text-muted-foreground">Em breve</span>}
                    </p>
                    {reduced && (
                      <p className="mt-1 text-xs font-medium text-primary">
                        {price.promoName ? `${price.promoName} · ` : ""}Economize {formatPrice(price.original - price.final)}
                      </p>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
                    <ul className="mt-6 flex-1 space-y-2 text-sm">
                      {features.map((f, i) => <li key={i} className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-primary" /> <span>{f}</span></li>)}
                    </ul>
                    {p.access_info && <p className="mt-5 text-xs text-muted-foreground">Acesso: {p.access_info}</p>}
                    <Button variant={featured ? "hero" : "glass"} size="xl" className="mt-7 w-full whitespace-normal" onClick={() => onBuy?.(p)} disabled={!shownFinal}>
                      {p.cta_label ?? "QUERO COMEÇAR AGORA"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      {data.faq.length > 0 && (
        <section id="faq" className="mx-auto max-w-3xl px-5 py-24">
          <h2 className="text-3xl font-bold md:text-4xl">{texts.faq_title}</h2>
          <Accordion type="single" collapsible className="mt-8">
            {data.faq.map((f, i) => (
              <AccordionItem key={i} value={String(i)}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {f.a}
                  {f.support && data.support?.url && (
                    <> <a href={data.support.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{data.support.label ?? "Falar com o suporte"}</a></>
                  )}
                  {f.access && data.plans.some((p) => p.access_info) && (
                    <ul className="mt-2">{data.plans.filter((p) => p.access_info).map((p) => <li key={p.slug}>Plano {p.name}: {p.access_info}</li>)}</ul>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* FINAL CTA */}
      <section className="px-5 pb-24">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-primary/40 bg-card p-10 text-center shadow-glow md:p-16">
          <div className="pointer-events-none absolute inset-0 bg-glow" />
          <h2 className="relative text-3xl font-bold md:text-5xl">{texts.cta_title}</h2>
          <p className="relative mx-auto mt-4 max-w-xl text-muted-foreground">{texts.cta_text}</p>
          <Button variant="hero" size="xl" className="relative mt-8" asChild><a href="#planos">{texts.cta_button} <ArrowRight /></a></Button>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">{texts.footer}</footer>
    </div>
  );
}
