import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { adminDataQuery } from "@/lib/admin";
import { FinanceSummary } from "@/components/admin/finance/FinanceSummary";
import { SalesTable } from "@/components/admin/finance/SalesTable";
import { PlansManager } from "@/components/admin/finance/PlansManager";
import { CouponsManager } from "@/components/admin/finance/CouponsManager";
import { GatewaysManager } from "@/components/admin/finance/GatewaysManager";

export const Route = createFileRoute("/_authenticated/admin/financas")({
  head: () => ({ meta: [{ title: "Finanças — Painel administrativo" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: Financas,
});

function Financas() {
  const { data, isLoading, error } = useQuery(adminDataQuery);
  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  if (error || !data) return <p className="text-destructive">Não foi possível carregar os dados financeiros.</p>;

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <FinanceSummary payments={data.payments} />
      <Tabs defaultValue="vendas">
        <TabsList className="flex h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="vendas">Vendas</TabsTrigger>
          <TabsTrigger value="planos">Planos e preços</TabsTrigger>
          <TabsTrigger value="cupons">Cupons e promoções</TabsTrigger>
          <TabsTrigger value="gateways">Gateways de pagamento</TabsTrigger>
        </TabsList>
        <TabsContent value="vendas" className="mt-6 animate-in fade-in duration-300">
          <SalesTable payments={data.payments} events={data.events} coupons={data.coupons} plans={data.plans} />
        </TabsContent>
        <TabsContent value="planos" className="mt-6 animate-in fade-in duration-300">
          <PlansManager plans={data.plans} />
        </TabsContent>
        <TabsContent value="cupons" className="mt-6 animate-in fade-in duration-300">
          <CouponsManager coupons={data.coupons} payments={data.payments} plans={data.plans} />
        </TabsContent>
        <TabsContent value="gateways" className="mt-6 animate-in fade-in duration-300">
          <GatewaysManager gateways={data.gateways} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
