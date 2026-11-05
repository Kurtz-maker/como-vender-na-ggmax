import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Eye, Lock, PlayCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ImageSlot } from "@/components/ImageSlot";
import { LandingView } from "@/components/landing/LandingView";
import { LessonBlocks } from "@/components/LessonBlocks";
import { publicPricingQuery, type Block } from "@/lib/course";
import { useDrafts } from "./DraftStore";

function ContentPreview() {
  const { landing, lessons } = useDrafts();
  const [open, setOpen] = useState<string | null>(null);
  const lesson = lessons.find((l) => l.id === open);

  if (lesson) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Button variant="ghost" size="sm" onClick={() => setOpen(null)}><ArrowLeft /> Voltar aos módulos</Button>
        <h2 className="text-2xl font-bold">{lesson.title}</h2>
        {lesson.summary && <p className="text-muted-foreground">{lesson.summary}</p>}
        {lesson.image_url && <div className="aspect-video"><ImageSlot src={lesson.image_url} label={lesson.title} /></div>}
        <LessonBlocks blocks={(lesson.content as Block[]) ?? []} />
      </div>
    );
  }
  return (
    <div data-accent={landing.theme.accent} className="mx-auto max-w-4xl space-y-5 p-6">
      {landing.modules.length === 0 && <p className="text-center text-sm text-muted-foreground">Nenhum módulo visível.</p>}
      {landing.modules.map((m, i) => (
        <section key={m.id} className="card-surface p-5">
          <h3 className="font-semibold">{String(i + 1).padStart(2, "0")} · {m.title} {m.required_plan === "pro" && <span className="ml-2 rounded bg-electric/15 px-2 py-0.5 font-mono text-xs text-electric">PRO</span>}</h3>
          <ul className="mt-3 space-y-1 text-sm">
            {lessons.filter((l) => l.module_id === m.id && l.published).map((l) => (
              <li key={l.id}>
                <button type="button" className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted" onClick={() => setOpen(l.id)}>
                  {l.is_free ? <PlayCircle className="size-4 text-primary" /> : <Lock className="size-4 text-muted-foreground" />}
                  <span className="flex-1">{l.title}</span>
                  {l.is_free && <span className="text-xs text-primary">Grátis</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** Navigable preview of the course with unpublished drafts applied. */
export function PreviewPane() {
  const { landing } = useDrafts();
  const { data: pricing } = useQuery(publicPricingQuery);
  const [view, setView] = useState("home");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Eye className="size-4" /> Assim o curso vai ficar depois de publicado.</p>
        <ToggleGroup type="single" value={view} onValueChange={(v) => v && setView(v)} variant="outline" size="sm">
          <ToggleGroupItem value="home">Página inicial</ToggleGroupItem>
          <ToggleGroupItem value="content">Módulos e aulas</ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div className="overflow-hidden rounded-2xl border border-border shadow-glow">
        <div className="flex items-center gap-1.5 border-b border-border bg-card px-4 py-2">
          <span className="size-2.5 rounded-full bg-destructive/70" /><span className="size-2.5 rounded-full bg-warning/70" /><span className="size-2.5 rounded-full bg-primary/70" />
          <span className="ml-3 font-mono text-xs text-muted-foreground">prévia — não publicada</span>
        </div>
        <div className="max-h-[75vh] overflow-y-auto bg-background">
          {view === "home" ? (
            <LandingView data={landing} prices={pricing?.prices} signed={false} preview onBuy={() => toast.info("Na prévia o botão de compra fica desativado.")} />
          ) : (
            <ContentPreview />
          )}
        </div>
      </div>
    </div>
  );
}
