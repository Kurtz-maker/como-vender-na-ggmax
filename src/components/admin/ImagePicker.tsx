import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Images, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { ALLOWED_IMAGE_TYPES, BUCKET, UPLOAD_FOLDER, assetUrl, uploadCourseImage } from "@/lib/admin";
import { cn } from "@/lib/utils";

export const imageLibraryQuery = {
  queryKey: ["image-library"],
  queryFn: async () => {
    const { data, error } = await supabase.storage.from(BUCKET).list(UPLOAD_FOLDER, { limit: 1000, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw error;
    return (data ?? [])
      .filter((f) => f.id && !f.name.startsWith("."))
      .map((f) => ({
        name: f.name,
        path: `${UPLOAD_FOLDER}/${f.name}`,
        url: assetUrl(`${UPLOAD_FOLDER}/${f.name}`),
        size: (f.metadata as { size?: number } | null)?.size ?? 0,
        createdAt: f.created_at,
      }));
  },
};

/** Choose an image for a piece of content: upload a new one or pick from the gallery. */
export function ImagePicker({ value, onChange, label, className }: { value: string | null | undefined; onChange: (url: string | null) => void; label: string; className?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [gallery, setGallery] = useState(false);
  const { data: images, isLoading } = useQuery({ ...imageLibraryQuery, enabled: gallery });

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadCourseImage(file);
      onChange(url);
      qc.invalidateQueries({ queryKey: ["image-library"] });
      toast.success("Imagem enviada.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-sm font-medium">{label}</p>
      <div className="flex items-center gap-3">
        <div className="flex aspect-video w-36 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-dashed border-border bg-muted/40">
          {value ? <img src={value} alt={label} className="h-full w-full object-cover" /> : <Images className="size-5 text-muted-foreground" />}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="glass" onClick={() => input.current?.click()} disabled={uploading}>
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />} {value ? "Substituir" : "Enviar"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setGallery(true)}><Images /> Galeria</Button>
          {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}><Trash2 /> Remover</Button>}
        </div>
        <input ref={input} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      </div>
      <Dialog open={gallery} onOpenChange={setGallery}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>Escolher imagem enviada</DialogTitle></DialogHeader>
          {isLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin" /></div>
          ) : !images?.length ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Nenhuma imagem enviada ainda.</p>
          ) : (
            <div className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-4">
              {images.map((img) => (
                <button
                  key={img.path}
                  type="button"
                  onClick={() => { onChange(img.url); setGallery(false); }}
                  className={cn("aspect-video overflow-hidden rounded-lg border-2 transition hover:border-primary", value === img.url ? "border-primary" : "border-transparent")}
                >
                  <img src={img.url} alt={img.name} className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
