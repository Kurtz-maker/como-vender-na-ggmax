import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Editable ordered list with add, remove and move up/down. */
export function ListEditor<T>({
  items,
  onChange,
  create,
  render,
  addLabel,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  create: () => T;
  render: (item: T, update: (v: T) => void, index: number) => ReactNode;
  addLabel: string;
}) {
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    const a = next[i]!, b = next[j]!;
  next[i] = b;
  next[j] = a;
    onChange(next);
  };
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-2">
          <div className="min-w-0 flex-1">{render(item, (v) => onChange(items.map((x, k) => (k === i ? v : x))), i)}</div>
          <div className="flex shrink-0 flex-col">
            <Button type="button" size="icon" variant="ghost" className="size-7" aria-label="Subir" onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp /></Button>
            <Button type="button" size="icon" variant="ghost" className="size-7" aria-label="Descer" onClick={() => move(i, 1)} disabled={i === items.length - 1}><ArrowDown /></Button>
            <Button type="button" size="icon" variant="ghost" className="size-7 text-destructive" aria-label="Remover" onClick={() => onChange(items.filter((_, k) => k !== i))}><Trash2 /></Button>
          </div>
        </div>
      ))}
      <Button type="button" size="sm" variant="glass" onClick={() => onChange([...items, create()])}><Plus /> {addLabel}</Button>
    </div>
  );
}
