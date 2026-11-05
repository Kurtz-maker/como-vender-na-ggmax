import { useState } from "react";
import { ArrowDown, ArrowUp, ChevronDown, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { Block } from "@/lib/course";
import { ImagePicker } from "../ImagePicker";
import { BlocksEditor } from "./BlocksEditor";
import { useDrafts, type EditableLesson, type EditableModule } from "./DraftStore";

function DraftBadge({ row }: { row: { _draft: boolean; _new: boolean } }) {
  if (!row._draft) return null;
  return <Badge variant="outline" className="border-warning/50 text-warning">{row._new ? "Novo" : "Alterado"}</Badge>;
}

/** Re-number a list after moving item i by d and return the rows whose order changed. */
function reorder<T extends { id: string; sort_order: number }>(list: T[], i: number, d: number) {
  const j = i + d;
  if (j < 0 || j >= list.length) return [];
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next.map((x, k) => ({ id: x.id, sort_order: k + 1, changed: x.sort_order !== k + 1 })).filter((x) => x.changed);
}

function LessonSheet({ lesson, onClose }: { lesson: EditableLesson | null; onClose: () => void }) {
  const { putLesson } = useDrafts();
  if (!lesson) return null;
  const set = (p: Partial<EditableLesson>) => putLesson({ id: lesson.id, ...p });
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Editar aula</SheetTitle>
          <SheetDescription>As alterações ficam como rascunho até você publicar.</SheetDescription>
        </SheetHeader>
        <div className="space-y-5 px-4 pb-8">
          <div className="space-y-1.5"><Label>Título</Label><Input value={lesson.title} onChange={(e) => set({ title: e.target.value })} /></div>
          <div className="space-y-1.5"><Label>Descrição</Label><Textarea rows={2} value={lesson.summary ?? ""} onChange={(e) => set({ summary: e.target.value })} /></div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2"><Switch checked={lesson.published} onCheckedChange={(v) => set({ published: v })} /> Visível</label>
            <label className="flex items-center gap-2"><Switch checked={lesson.is_free} onCheckedChange={(v) => set({ is_free: v })} /> Aula gratuita (qualquer pessoa cadastrada)</label>
          </div>
          <ImagePicker label="Imagem da aula" value={lesson.image_url} onChange={(v) => set({ image_url: v })} />
          <div className="space-y-2">
            <Label>Conteúdo e materiais</Label>
            <BlocksEditor blocks={(lesson.content as Block[]) ?? []} onChange={(content) => set({ content: content as never })} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ModuleCard({ m, index, total, onMove }: { m: EditableModule; index: number; total: number; onMove: (d: number) => void }) {
  const { lessons, putModule, removeModule, putLesson, removeLesson } = useDrafts();
  const [open, setOpen] = useState(index === 0);
  const [editing, setEditing] = useState<string | null>(null);
  const own = lessons.filter((l) => l.module_id === m.id);
  const set = (p: Partial<EditableModule>) => putModule({ id: m.id, ...p });

  function addLesson() {
    const id = crypto.randomUUID();
    putLesson({ id, module_id: m.id, title: "Nova aula", summary: "", content: [] as never, published: false, is_free: false, image_url: null, sort_order: own.length + 1 });
    setEditing(id);
  }
  function moveLesson(i: number, d: number) {
    for (const r of reorder(own, i, d)) putLesson({ id: r.id, sort_order: r.sort_order });
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="card-surface">
      <div className="flex items-center gap-2 p-4">
        <CollapsibleTrigger asChild>
          <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <ChevronDown className={`size-4 shrink-0 transition ${open ? "" : "-rotate-90"}`} />
            <span className="font-mono text-xs text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
            <span className="truncate font-semibold">{m.title || "Sem título"}</span>
            {!m.published && <Badge variant="outline">Oculto</Badge>}
            {m.required_plan === "pro" && <Badge variant="outline" className="border-electric/50 text-electric">PRO</Badge>}
            <DraftBadge row={m} />
          </button>
        </CollapsibleTrigger>
        <Button size="icon" variant="ghost" aria-label="Subir módulo" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp /></Button>
        <Button size="icon" variant="ghost" aria-label="Descer módulo" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown /></Button>
        <Button size="icon" variant="ghost" className="text-destructive" aria-label="Excluir módulo"
          onClick={() => confirm(`Excluir o módulo "${m.title}" e suas ${own.length} aulas? Isso só vale depois de publicar.`) && removeModule(m.id)}><Trash2 /></Button>
      </div>
      <CollapsibleContent className="space-y-5 border-t border-border p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1.5"><Label>Título do módulo</Label><Input value={m.title} onChange={(e) => set({ title: e.target.value })} /></div>
          <div className="space-y-1.5">
            <Label>Plano necessário</Label>
            <Select value={m.required_plan} onValueChange={(v) => set({ required_plan: v as "basic" | "pro" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="basic">Básico (e Pro)</SelectItem><SelectItem value="pro">Somente Pro</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 md:col-span-2"><Label>Descrição</Label><Textarea rows={2} value={m.description ?? ""} onChange={(e) => set({ description: e.target.value })} /></div>
          <ImagePicker label="Imagem de apresentação do módulo" value={m.image_url} onChange={(v) => set({ image_url: v })} />
          <label className="flex items-center gap-2 self-start text-sm"><Switch checked={m.published} onCheckedChange={(v) => set({ published: v })} /> Módulo visível</label>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-semibold">Aulas</p>
          {own.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma aula neste módulo.</p>}
          {own.map((l, i) => (
            <div key={l.id} className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2">
              <span className="font-mono text-xs text-muted-foreground">{i + 1}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{l.title || "Sem título"}</span>
              {l.is_free && <Badge variant="outline" className="border-primary/50 text-primary">Grátis</Badge>}
              {!l.published && <Badge variant="outline">Oculta</Badge>}
              <DraftBadge row={l} />
              <Button size="icon" variant="ghost" className="size-8" aria-label="Subir aula" disabled={i === 0} onClick={() => moveLesson(i, -1)}><ArrowUp /></Button>
              <Button size="icon" variant="ghost" className="size-8" aria-label="Descer aula" disabled={i === own.length - 1} onClick={() => moveLesson(i, 1)}><ArrowDown /></Button>
              <Button size="icon" variant="ghost" className="size-8" aria-label="Editar aula" onClick={() => setEditing(l.id)}><Pencil /></Button>
              <Button size="icon" variant="ghost" className="size-8 text-destructive" aria-label="Excluir aula" onClick={() => confirm(`Excluir a aula "${l.title}"?`) && removeLesson(l.id)}><Trash2 /></Button>
            </div>
          ))}
          <Button size="sm" variant="glass" onClick={addLesson}><Plus /> Nova aula</Button>
        </div>
      </CollapsibleContent>
      <LessonSheet lesson={own.find((l) => l.id === editing) ?? null} onClose={() => setEditing(null)} />
    </Collapsible>
  );
}

export function CourseEditor() {
  const { modules, putModule } = useDrafts();
  function add() {
    putModule({ id: crypto.randomUUID(), title: "Novo módulo", description: "", image_url: null, required_plan: "basic", published: false, sort_order: modules.length + 1 });
  }
  function move(i: number, d: number) {
    for (const r of reorder(modules, i, d)) putModule({ id: r.id, sort_order: r.sort_order });
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">Novos módulos e aulas começam ocultos. Ative "visível" quando estiverem prontos.</p>
        <Button onClick={add}><Plus /> Novo módulo</Button>
      </div>
      {modules.length === 0 && <p className="card-surface p-8 text-center text-sm text-muted-foreground">Nenhum módulo ainda. Crie o primeiro.</p>}
      {modules.map((m, i) => <ModuleCard key={m.id} m={m} index={i} total={modules.length} onMove={(d) => move(i, d)} />)}
    </div>
  );
}
