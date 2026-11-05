import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, ImagePlus, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ALLOWED_IMAGE_TYPES, BUCKET, MAX_IMAGE_MB, audit, checkImage, uploadCourseImage } from "@/lib/admin";
import { imageLibraryQuery } from "../ImagePicker";

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** Gallery of uploaded images: upload, replace in place, copy link, delete. */
export function ImagesManager() {
  const qc = useQueryClient();
  const { data: images, isLoading } = useQuery(imageLibraryQuery);
  const upload = useRef<HTMLInputElement>(null);
  const replace = useRef<HTMLInputElement>(null);
  const [replacing, setReplacing] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => qc.invalidateQueries({ queryKey: ["image-library"] });

  async function onUpload(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true);
    let ok = 0;
    for (const f of Array.from(files)) {
      try { await uploadCourseImage(f); ok++; } catch (e) { toast.error(`${f.name}: ${(e as Error).message}`); }
    }
    setBusy(false);
    if (upload.current) upload.current.value = "";
    if (ok) toast.success(`${ok} imagem(ns) enviada(s).`);
    refresh();
  }

  async function onReplace(file: File | undefined) {
    if (!file || !replacing) return;
    try {
      checkImage(file);
      setBusy(true);
      const { error } = await supabase.storage.from(BUCKET).upload(replacing, file, { upsert: true, contentType: file.type });
      if (error) throw error;
      await audit("image_replace", "image", replacing);
      toast.success("Imagem substituída. Todos os lugares que a usam mostram a nova versão em instantes.");
      setVersion((v) => v + 1);
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
      setReplacing(null);
      if (replace.current) replace.current.value = "";
    }
  }

  async function remove(path: string) {
    if (!confirm("Excluir esta imagem? Se ela estiver em uso no curso, o lugar ficará vazio.")) return;
    const { error } = await supabase.storage.from(BUCKET).remove([path]);
    if (error) return toast.error("Não foi possível excluir.");
    await audit("image_delete", "image", path);
    refresh();
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">PNG, JPG, WEBP, GIF ou SVG de até {MAX_IMAGE_MB} MB. Substituir troca a imagem em todos os lugares onde ela aparece, sem precisar publicar.</p>
        <Button onClick={() => upload.current?.click()} disabled={busy}>{busy ? <Loader2 className="animate-spin" /> : <ImagePlus />} Enviar imagens</Button>
        <input ref={upload} type="file" multiple accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => onUpload(e.target.files)} />
        <input ref={replace} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => onReplace(e.target.files?.[0])} />
      </div>
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-muted-foreground" /></div>
      ) : !images?.length ? (
        <p className="card-surface p-10 text-center text-sm text-muted-foreground">Nenhuma imagem enviada ainda.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {images.map((img) => (
            <figure key={img.path} className="card-surface overflow-hidden">
              <div className="aspect-video bg-muted/40"><img src={`${img.url}?v=${version}`} alt={img.name} className="h-full w-full object-cover" loading="lazy" /></div>
              <figcaption className="space-y-2 p-3">
                <p className="truncate font-mono text-xs text-muted-foreground">{img.name} · {kb(img.size)}</p>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(window.location.origin + img.url); toast.success("Link copiado"); }}><Copy /> Link</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setReplacing(img.path); replace.current?.click(); }}><RefreshCw /> Substituir</Button>
                  <Button size="icon" variant="ghost" className="ml-auto size-8 text-destructive" aria-label="Excluir imagem" onClick={() => remove(img.path)}><Trash2 /></Button>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  );
}
