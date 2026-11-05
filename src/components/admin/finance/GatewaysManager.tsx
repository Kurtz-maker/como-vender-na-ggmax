import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Copy, KeyRound, Loader2, Plug, Plus, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { audit, type Gateway } from "@/lib/admin";
import { getGatewayStatus, saveGatewayCredentials, testGateway } from "@/lib/admin.functions";
import { fmtDate } from "@/lib/finance";

type Status = Awaited<ReturnType<typeof getGatewayStatus>>[string];

function GatewayCard({ gateway, status, others }: { gateway: Gateway; status: Status | undefined; others: Gateway[] }) {
  const qc = useQueryClient();
  const saveCreds = useServerFn(saveGatewayCredentials);
  const test = useServerFn(testGateway);
  const [label, setLabel] = useState(gateway.label);
  const [token, setToken] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState<"" | "creds" | "test" | "label">("");
  const [testResult, setTestResult] = useState<{ ok: boolean; text: string } | null>(null);
  const webhookUrl = typeof window !== "undefined" ? `${window.location.origin}/api/public/webhooks/mercadopago` : "";
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["admin-data"] });
    qc.invalidateQueries({ queryKey: ["gateway-status"] });
    qc.invalidateQueries({ queryKey: ["public-pricing"] });
  };

  async function setActive(active: boolean) {
    if (active && !status?.hasAccessToken) { toast.error("Cadastre a chave de acesso antes de ativar."); return; }
    const { error } = await supabase.from("payment_gateways").update({ active, updated_at: new Date().toISOString() }).eq("id", gateway.id);
    if (error) { toast.error("Não foi possível alterar o gateway."); return; }
    if (active) {
      const ids = others.filter((o) => o.provider === gateway.provider && o.active).map((o) => o.id);
      if (ids.length) await supabase.from("payment_gateways").update({ active: false }).in("id", ids);
    }
    await audit("gateway_toggle", "payment_gateway", gateway.id, { active });
    toast.success(active ? "Gateway ativado. O checkout passa a usar esta conta." : "Gateway desativado.");
    refresh();
  }

  async function saveLabel() {
    setBusy("label");
    const { error } = await supabase.from("payment_gateways").update({ label: label.trim() || gateway.label, updated_at: new Date().toISOString() }).eq("id", gateway.id);
    setBusy("");
    if (error) { toast.error("Não foi possível salvar."); return; }
    await audit("gateway_update", "payment_gateway", gateway.id, { label });
    toast.success("Nome salvo.");
    refresh();
  }

  async function saveCredentials() {
    if (!token.trim() && !secret.trim()) { toast.error("Preencha pelo menos um campo."); return; }
    setBusy("creds");
    try {
      await saveCreds({ data: { gatewayId: gateway.id, accessToken: token.trim() || undefined, webhookSecret: secret.trim() || undefined } });
      setToken("");
      setSecret("");
      toast.success("Credenciais salvas com segurança.");
      refresh();
    } catch (e) {
      toast.error((e as Error).message.includes("too_small") ? "A chave parece curta demais. Confira se copiou inteira." : (e as Error).message);
    } finally {
      setBusy("");
    }
  }

  async function runTest() {
    setBusy("test");
    setTestResult(null);
    try {
      const r = await test({ data: { gatewayId: gateway.id } });
      setTestResult(r.ok ? { ok: true, text: `Conexão OK — conta ${r.account}` } : { ok: false, text: r.error });
    } catch (e) {
      setTestResult({ ok: false, text: (e as Error).message });
    } finally {
      setBusy("");
    }
  }

  async function remove() {
    if (!confirm(`Excluir o gateway "${gateway.label}" e as credenciais salvas?`)) return;
    const { error } = await supabase.from("payment_gateways").delete().eq("id", gateway.id);
    if (error) { toast.error("Não foi possível excluir."); return; }
    await audit("gateway_delete", "payment_gateway", gateway.id, { label: gateway.label });
    refresh();
  }

  const ready = !!status?.hasAccessToken;
  return (
    <div className="card-surface space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Plug className="size-5" /></span>
          <div>
            <p className="font-semibold">{gateway.label}</p>
            <p className="text-xs text-muted-foreground">Mercado Pago · Checkout Pro (Pix, cartão e boleto)</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs ${gateway.active && ready ? "border-primary/40 text-primary" : "border-border text-muted-foreground"}`}>
            {gateway.active && ready ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
            {gateway.active && ready ? "Ativo e configurado" : ready ? "Configurado, inativo" : "Sem credenciais"}
          </span>
          <label className="flex items-center gap-2 text-sm"><Switch checked={gateway.active} onCheckedChange={setActive} /> Ativo</label>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nome de exibição</Label>
            <div className="flex gap-2"><Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} /><Button variant="glass" onClick={saveLabel} disabled={busy === "label"}>Salvar</Button></div>
          </div>
          <div className="space-y-3 rounded-xl border border-border p-4">
            <p className="flex items-center gap-2 text-sm font-semibold"><KeyRound className="size-4" /> Credenciais</p>
            <p className="text-xs text-muted-foreground">
              {ready ? `Access Token salvo (termina em ••••${status!.tokenHint})${status!.sandbox ? " · modo de testes" : ""}. ` : "Nenhuma chave salva. "}
              {status?.hasWebhookSecret ? "Assinatura do webhook salva." : "Assinatura do webhook não cadastrada."}
              {status?.updatedAt ? ` Atualizado em ${fmtDate(status.updatedAt)}.` : ""}
            </p>
            <div className="space-y-1.5"><Label htmlFor={`tk-${gateway.id}`}>Access Token {ready && "(deixe vazio para manter)"}</Label><Input id={`tk-${gateway.id}`} type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="APP_USR-..." /></div>
            <div className="space-y-1.5"><Label htmlFor={`ws-${gateway.id}`}>Assinatura secreta do webhook {status?.hasWebhookSecret && "(deixe vazio para manter)"}</Label><Input id={`ws-${gateway.id}`} type="password" autoComplete="off" value={secret} onChange={(e) => setSecret(e.target.value)} /></div>
            <p className="text-xs text-muted-foreground">As chaves ficam guardadas só no servidor e nunca voltam para o navegador.</p>
            <Button onClick={saveCredentials} disabled={busy === "creds"}>{busy === "creds" && <Loader2 className="animate-spin" />} Salvar credenciais</Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-2 rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">Webhook de confirmação</p>
            <p className="text-xs text-muted-foreground">No Mercado Pago, vá em Suas integrações → sua aplicação → Webhooks, cole este endereço, marque o evento "Pagamentos" e copie a assinatura secreta para o campo ao lado. Copie o endereço com o painel aberto no site publicado, não na prévia.</p>
            <div className="flex gap-2">
              <Input readOnly value={webhookUrl} className="font-mono text-xs" />
              <Button size="icon" variant="glass" aria-label="Copiar endereço" onClick={() => { navigator.clipboard.writeText(webhookUrl); toast.success("Endereço copiado"); }}><Copy /></Button>
            </div>
          </div>
          <div className="space-y-2 rounded-xl border border-border p-4">
            <p className="text-sm font-semibold">Status da integração</p>
            <Button variant="glass" onClick={runTest} disabled={busy === "test"}>{busy === "test" ? <Loader2 className="animate-spin" /> : <Plug />} Testar conexão</Button>
            {testResult && <p className={`text-sm ${testResult.ok ? "text-primary" : "text-destructive"}`}>{testResult.text}</p>}
          </div>
          <Button variant="ghost" className="text-destructive" onClick={remove}><Trash2 /> Excluir gateway</Button>
        </div>
      </div>
    </div>
  );
}

export function GatewaysManager({ gateways }: { gateways: Gateway[] }) {
  const qc = useQueryClient();
  const statusFn = useServerFn(getGatewayStatus);
  const { data: status } = useQuery({ queryKey: ["gateway-status"], queryFn: () => statusFn() });
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("Mercado Pago");

  async function add() {
    const { data, error } = await supabase.from("payment_gateways").insert({ provider: "mercadopago", label: label.trim() || "Mercado Pago", active: false }).select("id").single();
    if (error) { toast.error("Não foi possível adicionar o gateway."); return; }
    await audit("gateway_create", "payment_gateway", data.id, { provider: "mercadopago" });
    setAdding(false);
    toast.success("Gateway adicionado. Agora cadastre as credenciais.");
    qc.invalidateQueries({ queryKey: ["admin-data"] });
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Gateways de pagamento</h2>
          <p className="text-sm text-muted-foreground">O checkout usa o gateway ativo. Só há integrações reais disponíveis — hoje, o Mercado Pago.</p>
        </div>
        <Button onClick={() => setAdding(true)}><Plus /> Adicionar gateway</Button>
      </div>
      {gateways.length === 0 && (
        <p className="card-surface p-8 text-center text-sm text-muted-foreground">Nenhum gateway cadastrado. Adicione o Mercado Pago para começar a vender.</p>
      )}
      {gateways.map((g) => <GatewayCard key={g.id} gateway={g} status={status?.[g.id]} others={gateways.filter((o) => o.id !== g.id)} />)}

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar gateway</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><Label>Provedor</Label><Input value="Mercado Pago" readOnly /></div>
            <div className="space-y-1.5"><Label>Nome de exibição</Label><Input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} /></div>
          </div>
          <DialogFooter><Button variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button><Button onClick={add}>Adicionar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
