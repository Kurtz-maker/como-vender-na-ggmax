import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — GGMAX Seller Academy" },
      { name: "description", content: "Acesse sua área de aluno da GGMAX Seller Academy." },
      { property: "og:title", content: "Entrar — GGMAX Seller Academy" },
      { property: "og:description", content: "Acesse sua área de aluno." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setLoading(true);
    if (mode === "up") {
      const { error } = await supabase.auth.signUp({
        email, password,
        options: { emailRedirectTo: window.location.origin + "/aluno", data: { full_name: name } },
      });
      setLoading(false);
      if (error) { toast.error(error.message); return; }
      toast.success("Conta criada! Confira seu e-mail para confirmar o cadastro.");
      setMode("in");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (error) { toast.error("E-mail ou senha inválidos."); return; }
      navigate({ to: "/aluno" });
    }
  }

  async function google(): Promise<void> {
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/auth" });
    if (r.error) { toast.error("Não foi possível entrar com Google."); return; }
    if (r.redirected) return;
    navigate({ to: "/aluno" });
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center px-5">
      <div className="pointer-events-none absolute inset-0 bg-glow" />
      <div className="pointer-events-none absolute inset-0 grid-lines" />
      <div className="card-surface relative w-full max-w-md p-8">
        <Logo />
        <h1 className="mt-8 text-2xl font-bold">{mode === "in" ? "Entrar na sua conta" : "Criar sua conta"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "in" ? "Acesse suas aulas e seu progresso." : "Cadastre-se para acessar a área do aluno."}
        </p>
        <Button variant="glass" size="xl" className="mt-6 w-full" onClick={google}>Continuar com Google</Button>
        <div className="my-6 flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border" />ou<span className="h-px flex-1 bg-border" /></div>
        <form onSubmit={submit} className="space-y-4">
          {mode === "up" && (
            <div className="space-y-2"><Label htmlFor="name">Nome</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          )}
          <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" variant="hero" size="xl" className="w-full" disabled={loading}>
            {loading ? "Aguarde..." : mode === "in" ? "Entrar" : "Criar conta"}
          </Button>
        </form>
        <button type="button" className="mt-6 w-full text-center text-sm text-muted-foreground hover:text-primary" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </div>
  );
}
