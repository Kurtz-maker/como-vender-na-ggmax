import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, TicketPercent } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { createCheckout, quoteCheckout } from "@/lib/checkout.functions";
import { formatPrice } from "@/lib/course";
import type { PlanRow } from "@/lib/landing-content";

type Q = Awaited<ReturnType<typeof quoteCheckout>>;

export const BUY_INTENT_KEY = "buy_plan";

/** Checkout summary: original price, promotion/coupon discount and final price, all computed on the server. */
export function BuyDialog({ plan, signed, onOpenChange }: { plan: PlanRow | null; signed: boolean; onOpenChange: (o: boolean) => void }) {
  const quoteFn = useServerFn(quoteCheckout);
  const checkoutFn = useServerFn(createCheckout);
  const [q, setQ] = useState<Q | null>(null);
  const [coupon, setCoupon] = useState("");
  const [applied, setApplied] = useState<string | undefined>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!plan) return;
    setQ(null);
    setCoupon("");
    setApplied(undefined);
    quoteFn({ data: { plan: plan.slug } }).then(setQ).catch((e: Error) => toast.error(e.message));
    if (signed)
      supabase.auth.getUser().then(async ({ data }) => {
        if (!data.user) return;
        const { data: prof } = await supabase.from("profiles").select("full_name").eq("id", data.user.id).maybeSingle();
        setName((n) => n || prof?.full_name || "");
      });
  }, [plan, signed, quoteFn]);

  async function apply() {
    if (!plan) return;
    setLoading(true);
    try {
      const r = await quoteFn({ data: { plan: plan.slug, coupon: coupon.trim() || undefined } });
      setQ(r);
      if (r.couponError) {
        toast.error(r.couponError);
        setApplied(undefined);
      } else {
        setApplied(coupon.trim() || undefined);
        if (coupon.trim()) toast.success("Cupom aplicado!");
      }
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function pay() {
    if (!plan) return;
    if (name.trim().length < 2) return toast.error("Informe seu nome completo.");
    setPaying(true);
    try {
      const r = await checkoutFn({ data: { plan: plan.slug, coupon: applied, name: name.trim(), phone: phone.trim() || undefined } });
      window.location.href = r.url;
    } catch (e) {
      toast.error((e as Error).message);
      setPaying(false);
    }
  }

  return (
    <Dialog open={!!plan} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Plano {plan?.name}</DialogTitle>
          <DialogDescription>Confira o valor e siga para o pagamento seguro pelo Mercado Pago.</DialogDescription>
        </DialogHeader>

        {!q ? (
          <div className="flex justify-center py-8"><Loader2 className="size-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-5">
            <dl className="space-y-2 rounded-xl border border-border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Preço original</dt><dd>{formatPrice(q.original)}</dd></div>
              {q.promoActive && <div className="flex justify-between"><dt className="text-muted-foreground">Preço promocional</dt><dd>{formatPrice(q.base)}</dd></div>}
              {q.discount > 0 && (
                <div className="flex justify-between text-primary">
                  <dt>Desconto{q.coupon ? ` (${q.coupon.code ?? q.coupon.name})` : ""}</dt>
                  <dd>− {formatPrice(q.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold"><dt>Total</dt><dd>{formatPrice(q.final)}</dd></div>
            </dl>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <TicketPercent className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={coupon} onChange={(e) => setCoupon(e.target.value.toUpperCase())} placeholder="Cupom de desconto" className="pl-9" maxLength={40} />
              </div>
              <Button variant="glass" onClick={apply} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : "Aplicar"}</Button>
            </div>

            {signed ? (
              <>
                <div className="grid gap-3">
                  <div className="space-y-1.5"><Label htmlFor="buy-name">Nome completo</Label><Input id="buy-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} /></div>
                  <div className="space-y-1.5"><Label htmlFor="buy-phone">Telefone (opcional)</Label><Input id="buy-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={30} placeholder="(11) 99999-9999" /></div>
                </div>
                <Button variant="hero" size="xl" className="w-full" onClick={pay} disabled={paying}>
                  {paying ? <Loader2 className="animate-spin" /> : `Pagar ${formatPrice(q.final)}`}
                </Button>
              </>
            ) : (
              <div className="space-y-3 text-center">
                <p className="text-sm text-muted-foreground">Entre ou crie sua conta para concluir a compra. Seu acesso fica vinculado a ela.</p>
                <Button variant="hero" size="xl" className="w-full" asChild>
                  <Link to="/auth" onClick={() => plan && sessionStorage.setItem(BUY_INTENT_KEY, plan.slug)}>Entrar para comprar</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
