import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Rocket, Save, Undo2 } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { contentQuery } from "@/lib/admin";
import { DraftProvider, useDrafts } from "@/components/admin/content/DraftStore";
import { PreviewPane } from "@/components/admin/content/PreviewPane";
import { TextsEditor } from "@/components/admin/content/TextsEditor";
import { CourseEditor } from "@/components/admin/content/CourseEditor";
import { ImagesManager } from "@/components/admin/content/ImagesManager";

export const Route = createFileRoute("/_authenticated/admin/personalizacao")({
  head: () => ({ meta: [{ title: "Personalização — Painel administrativo" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Personalizacao,
});

function Personalizacao() {
  const { data, isLoading, error } = useQuery(contentQuery);
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <p className="text-destructive">Não foi possível carregar o conteúdo do curso.</p>;
  return (
    <DraftProvider data={data}>
      <Editor />
    </DraftProvider>
  );
}

function Editor() {
  const { unsaved, pending, saveAll, publish, discard } = useDrafts();
  const [busy, setBusy] = useState<"" | "save" | "publish" | "discard">("");
  const [confirm, setConfirm] = useState<"" | "publish" | "discard">("");

  async function run(kind: "save" | "publish" | "discard") {
    setBusy(kind);
    setConfirm("");
    try {
      if (kind === "save") { await saveAll(); toast.success("Rascunho salvo. O curso público não mudou."); }
      if (kind === "publish") { const n = await publish(); toast.success(`${n} alteração(ões) publicada(s). O site e a área dos alunos já estão atualizados.`); }
      if (kind === "discard") { await discard(); toast.success("Alterações não publicadas descartadas."); }
    } catch (e) {
      toast.error((e as Error).message || "Algo deu errado.");
    } finally {
      setBusy("");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div>
          <h2 className="text-xl font-bold">Personalização do curso</h2>
          <p className="text-xs text-muted-foreground">
            {unsaved ? `${unsaved} alteração(ões) não salva(s) · ` : ""}
            {pending ? `${pending} alteração(ões) aguardando publicação` : "Tudo publicado"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={() => setConfirm("discard")} disabled={!pending || !!busy}>{busy === "discard" ? <Loader2 className="animate-spin" /> : <Undo2 />} Descartar</Button>
          <Button variant="glass" onClick={() => run("save")} disabled={!unsaved || !!busy}>{busy === "save" ? <Loader2 className="animate-spin" /> : <Save />} SALVAR RASCUNHO</Button>
          <Button variant="hero" onClick={() => setConfirm("publish")} disabled={!pending || !!busy}>{busy === "publish" ? <Loader2 className="animate-spin" /> : <Rocket />} PUBLICAR ALTERAÇÕES</Button>
        </div>
      </div>

      <Tabs defaultValue="preview">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="preview">Prévia</TabsTrigger>
          <TabsTrigger value="texts">Textos e visual</TabsTrigger>
          <TabsTrigger value="course">Módulos e aulas</TabsTrigger>
          <TabsTrigger value="images">Imagens</TabsTrigger>
        </TabsList>
        <TabsContent value="preview" className="mt-6 animate-in fade-in duration-300"><PreviewPane /></TabsContent>
        <TabsContent value="texts" className="mt-6 animate-in fade-in duration-300"><TextsEditor /></TabsContent>
        <TabsContent value="course" className="mt-6 animate-in fade-in duration-300"><CourseEditor /></TabsContent>
        <TabsContent value="images" className="mt-6 animate-in fade-in duration-300"><ImagesManager /></TabsContent>
      </Tabs>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm("")}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm === "publish" ? "Publicar alterações?" : "Descartar alterações?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "publish"
                ? `${pending} alteração(ões) vão para o site público e para a área dos alunos agora.`
                : "Todos os rascunhos e edições não publicadas serão apagados. O curso publicado continua igual."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => run(confirm === "publish" ? "publish" : "discard")}>{confirm === "publish" ? "Publicar" : "Descartar"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
