import { AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ImageSlot } from "@/components/ImageSlot";
import type { Block } from "@/lib/course";

function embed(url: string) {
  const yt = url.match(/(?:youtu\.be\/|v=)([\w-]{11})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  return url;
}

export function LessonBlocks({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return <h3 key={i} className="pt-4 text-xl font-semibold">{b.text}</h3>;
          case "text":
            return <p key={i} className="leading-relaxed text-muted-foreground">{b.body}</p>;
          case "list":
            return (
              <ol key={i} className="space-y-2">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs text-accent-foreground">{j + 1}</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ol>
            );
          case "warning":
            return (
              <div key={i} className="flex gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
                <AlertTriangle className="size-5 shrink-0 text-warning" />
                <span>{b.text}</span>
              </div>
            );
          case "button":
            return (
              <Button key={i} variant="hero" size="xl" asChild>
                <a href={b.url} target="_blank" rel="noopener noreferrer">{b.label} <ExternalLink /></a>
              </Button>
            );
          case "link":
            return (
              <a key={i} href={b.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-electric hover:underline">
                {b.label} <ExternalLink className="size-4" />
              </a>
            );
          case "image":
            return (
              <figure key={i} className="space-y-2">
                <div className="aspect-video"><ImageSlot src={b.url} label={b.caption ?? "Imagem"} /></div>
                {b.url && b.caption && <figcaption className="text-xs text-muted-foreground">{b.caption}</figcaption>}
              </figure>
            );
          case "video":
            return (
              <div key={i} className="aspect-video overflow-hidden rounded-xl border border-border">
                <iframe src={embed(b.url)} className="h-full w-full" allowFullScreen title="Vídeo da aula" />
              </div>
            );
          case "code":
            return (
              <div key={i} className="relative">
                <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl border border-border bg-background p-4 pr-12 font-mono text-sm">{b.text}</pre>
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-2 top-2"
                  aria-label="Copiar"
                  onClick={() => { navigator.clipboard.writeText(b.text); toast.success("Copiado!"); }}
                >
                  <Copy />
                </Button>
              </div>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}
