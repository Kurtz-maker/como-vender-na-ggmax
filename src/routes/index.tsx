import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LandingView } from "@/components/landing/LandingView";
import { BuyDialog, BUY_INTENT_KEY } from "@/components/BuyDialog";
import { landingQuery, publicPricingQuery } from "@/lib/course";
import { buildLanding, type PlanRow } from "@/lib/landing-content";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GGMAX Seller Academy — Aprenda a revender contas de jogos" },
      { name: "description", content: "Treinamento passo a passo para vender contas de jogos na GGMAX: carteira digital, compra com critério, gestão de estoque e anúncios profissionais." },
      { property: "og:title", content: "GGMAX Seller Academy" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:description", content: "Do cadastro na GGMAX ao seu primeiro anúncio profissional de contas de jogos." },
    ],
  }),
  component: Index,
});

function useSignedIn() {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSigned(!!data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSigned(!!s));
    return () => data.subscription.unsubscribe();
  }, []);
  return signed;
}

const EMPTY = buildLanding({}, { plans: [], modules: [], outline: [] });

function Index() {
  const { data } = useQuery(landingQuery);
  const { data: pricing } = useQuery(publicPricingQuery);
  const signed = useSignedIn();
  const [buying, setBuying] = useState<PlanRow | null>(null);

  // Resume a purchase started before signing in.
  useEffect(() => {
    if (!signed || !data) return;
    const slug = sessionStorage.getItem(BUY_INTENT_KEY);
    if (!slug) return;
    sessionStorage.removeItem(BUY_INTENT_KEY);
    const p = data.plans.find((x) => x.slug === slug);
    if (p) setBuying(p);
  }, [signed, data]);

  return (
    <>
      <LandingView data={data ?? EMPTY} prices={pricing?.prices} signed={signed} onBuy={setBuying} />
      <BuyDialog plan={buying} signed={signed} onOpenChange={(o) => !o && setBuying(null)} />
    </>
  );
}
