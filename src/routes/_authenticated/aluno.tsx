import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Logo } from "@/components/Logo";
import { studentQuery } from "@/lib/course";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/aluno")({
  head: () => ({ meta: [{ title: "Área do aluno — GGMAX Seller Academy" }] }),
  component: Aluno,
});

function Aluno() {
  const { data } = useQuery(studentQuery);
  const navigate = useNavigate();
  if (!data) return <div className="p-10 text-muted-foreground">Carregando...</div>;
  const done = new Set(data.progress.filter((p) => p.completed_at).map((p) => p.lesson_id));
  const pct = data.outline.length ? Math.round((done.size / data.outline.length) * 100) : 0;
  const name = data.profile?.full_name ?? data.user.email;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-5">
          <Logo />
          <div className="flex gap-2">
          {data.isAdmin && <Button variant="glass" size="sm" asChild><Link to="/admin">Painel</Link></Button>}
          <Button variant="glass" size="sm" onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth", replace: true }); }}>Sair</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl space-y-8 px-5 py-10">
        <div className="card-surface p-6">
          <h1 className="text-2xl font-bold">Olá, {name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data.plan ? `Plano ${data.plan === "pro" ? "Pro" : "Básico"} ativo` : "Seu acesso ainda não foi liberado. Ele aparece aqui após a confirmação do pagamento."}
          </p>
          <div className="mt-4 flex items-center gap-3"><Progress value={pct} /><span className="font-mono text-sm">{pct}%</span></div>
        </div>
        {data.modules.map((m) => (
          <section key={m.id} className="card-surface p-6">
            <h2 className="text-lg font-semibold">{String(m.sort_order).padStart(2, "0")} · {m.title}</h2>
            <ul className="mt-4 space-y-2 text-sm">
              {data.outline.filter((l) => l.module_id === m.id).map((l) => (
                <li key={l.id} className="flex items-center gap-2">
                  {done.has(l.id) ? <CheckCircle2 className="size-4 text-primary" /> : <Lock className="size-4 text-muted-foreground" />}
                  {data.accessible.has(l.id) ? <span>{l.title}</span> : <span className="text-muted-foreground">{l.title}</span>}
                </li>
              ))}
            </ul>
          </section>
        ))}
        <Link to="/" className="text-sm text-muted-foreground hover:text-primary">← Voltar ao site</Link>
      </main>
    </div>
  );
}
