import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Block } from "@/lib/course";
import { ImagePicker } from "../ImagePicker";
import { ListEditor } from "./ListEditor";

const NEW: Record<Block["type"], () => Block> = {
  heading: () => ({ type: "heading", text: "" }),
  text: () => ({ type: "text", body: "" }),
  list: () => ({ type: "list", items: [""] }),
  warning: () => ({ type: "warning", text: "" }),
  image: () => ({ type: "image", url: null, caption: "" }),
  video: () => ({ type: "video", url: "" }),
  button: () => ({ type: "button", label: "", url: "" }),
  link: () => ({ type: "link", label: "", url: "" }),
  code: () => ({ type: "code", text: "" }),
};
const LABEL: Record<Block["type"], string> = {
  heading: "Subtítulo", text: "Parágrafo", list: "Lista de passos", warning: "Aviso", image: "Imagem",
  video: "Vídeo (YouTube)", button: "Botão / material", link: "Link", code: "Texto copiável (prompt)",
};

function BlockFields({ b, update }: { b: Block; update: (v: Block) => void }) {
  switch (b.type) {
    case "heading": return <Input value={b.text} placeholder="Subtítulo" onChange={(e) => update({ ...b, text: e.target.value })} />;
    case "text": return <Textarea rows={3} value={b.body} placeholder="Texto" onChange={(e) => update({ ...b, body: e.target.value })} />;
    case "warning": return <Textarea rows={2} value={b.text} placeholder="Aviso importante" onChange={(e) => update({ ...b, text: e.target.value })} />;
    case "code": return <Textarea rows={4} className="font-mono text-xs" value={b.text} onChange={(e) => update({ ...b, text: e.target.value })} />;
    case "list": return <Textarea rows={4} value={b.items.join("\n")} placeholder="Um passo por linha" onChange={(e) => update({ ...b, items: e.target.value.split("\n") })} />;
    case "video": return <Input value={b.url} placeholder="https://youtube.com/watch?v=..." onChange={(e) => update({ ...b, url: e.target.value })} />;
    case "image":
      return (
        <div className="space-y-2">
          <ImagePicker label="Imagem" value={b.url} onChange={(url) => update({ ...b, url })} />
          <Input value={b.caption ?? ""} placeholder="Legenda (opcional)" onChange={(e) => update({ ...b, caption: e.target.value })} />
        </div>
      );
    case "button":
    case "link":
      return (
        <div className="grid gap-2 sm:grid-cols-2">
          <Input value={b.label} placeholder="Texto" onChange={(e) => update({ ...b, label: e.target.value })} />
          <Input value={b.url} placeholder="https://..." onChange={(e) => update({ ...b, url: e.target.value })} />
        </div>
      );
  }
}

/** Ordered editor for the content blocks of a lesson. */
export function BlocksEditor({ blocks, onChange }: { blocks: Block[]; onChange: (b: Block[]) => void }) {
  return (
    <div className="space-y-3">
      <ListEditor
        items={blocks}
        onChange={onChange}
        create={NEW.text}
        addLabel="Adicionar parágrafo"
        render={(b, update) => (
          <div className="space-y-1.5">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{LABEL[b.type]}</p>
            <BlockFields b={b} update={update} />
          </div>
        )}
      />
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button type="button" size="sm" variant="ghost"><Plus /> Outro tipo de bloco</Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          {(Object.keys(NEW) as Block["type"][]).map((t) => (
            <DropdownMenuItem key={t} onClick={() => onChange([...blocks, NEW[t]()])}>{LABEL[t]}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
