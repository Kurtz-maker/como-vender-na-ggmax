import type { Database } from "@/integrations/supabase/types";
import type { Faq, Hero, Support } from "./course";

export type PlanRow = Database["public"]["Tables"]["plans"]["Row"];
export type ModuleRow = Database["public"]["Tables"]["modules"]["Row"];
export type OutlineRow = { id: string; module_id: string; sort_order: number; title: string };

export type Benefit = { title: string; desc: string };
export type LandingTexts = {
  hero_cta_primary: string;
  hero_cta_secondary: string;
  journey_title: string;
  journey: string[];
  learn_eyebrow: string;
  learn_title: string;
  learn_intro: string;
  learn_items: string[];
  presentation_image: string | null;
  modules_title: string;
  benefits_title: string;
  benefits: Benefit[];
  plans_title: string;
  faq_title: string;
  cta_title: string;
  cta_text: string;
  cta_button: string;
  footer: string;
};
export type Banner = { active: boolean; text: string; link_label?: string; link_url?: string };
export const ACCENTS = ["green", "blue", "violet", "orange", "pink"] as const;
export type Accent = (typeof ACCENTS)[number];
export type Theme = { accent: Accent };

export const DEFAULT_TEXTS: LandingTexts = {
  hero_cta_primary: "QUERO COMEÇAR AGORA",
  hero_cta_secondary: "CONHECER O CONTEÚDO",
  journey_title: "A jornada do aluno",
  journey: ["Conta de vendedor", "Carteira digital", "Fornecimento", "Seleção de contas", "Gestão de estoque", "Anúncios", "Venda"],
  learn_eyebrow: "Apresentação",
  learn_title: "O que você vai aprender",
  learn_intro:
    "Um método organizado em etapas: você configura as ferramentas, compra com critério, organiza o estoque e publica anúncios claros e honestos.",
  learn_items: [
    "Criar e verificar sua conta de vendedor",
    "Configurar sua carteira de criptomoedas e pagamentos",
    "Encontrar boas contas para revenda e avaliar cada uma",
    "Organizar seu estoque de contas",
    "Usar templates e inteligência artificial para criar anúncios",
    "Montar títulos, descrições, preço e estoque do anúncio",
  ],
  presentation_image: null,
  modules_title: "Módulos do treinamento",
  benefits_title: "Benefícios do treinamento",
  benefits: [
    { title: "Passo a passo real", desc: "Cada etapa em ordem, do cadastro à publicação." },
    { title: "Prompts prontos", desc: "Biblioteca de comandos de IA para títulos, descrições e atendimento." },
    { title: "Foco em segurança", desc: "Avisos sobre documentos, códigos e transferências." },
    { title: "Templates de anúncio", desc: "Modelos de referência organizados por jogo." },
  ],
  plans_title: "Escolha seu plano",
  faq_title: "Perguntas frequentes",
  cta_title: "Pronto para começar?",
  cta_text: "Acesse o treinamento completo e siga o passo a passo no seu ritmo.",
  cta_button: "QUERO COMEÇAR AGORA",
  footer: "GGMAX Seller Academy · Curso independente, sem vínculo oficial com a GGMAX.",
};

export const DEFAULT_HERO: Hero = {
  badge: "GGMAX Seller Academy",
  title: "Do zero ao seu primeiro anúncio de contas de jogos na GGMAX",
  subtitle: "",
  image_url: null,
};

export type LandingData = {
  hero: Hero;
  faq: Faq;
  support: Support | null;
  texts: LandingTexts;
  banner: Banner | null;
  theme: Theme;
  plans: PlanRow[];
  modules: ModuleRow[];
  outline: OutlineRow[];
};

/** Turn site_settings rows into landing content, filling anything missing with defaults. */
export function buildLanding(
  settings: Record<string, unknown>,
  rest: { plans: PlanRow[]; modules: ModuleRow[]; outline: OutlineRow[] },
): LandingData {
  const hero = { ...DEFAULT_HERO, ...((settings["hero"] as Partial<Hero>) ?? {}) };
  const texts = { ...DEFAULT_TEXTS, ...((settings["texts"] as Partial<LandingTexts>) ?? {}) };
  const theme = (settings["theme"] as Theme | undefined) ?? { accent: "green" };
  return {
    hero,
    faq: (settings["faq"] as Faq | undefined) ?? [],
    support: (settings["support"] as Support | undefined) ?? null,
    texts,
    banner: (settings["banner"] as Banner | undefined) ?? null,
    theme: ACCENTS.includes(theme.accent) ? theme : { accent: "green" },
    ...rest,
  };
}

export type PublicPrice = { original: number; final: number; discount: number; promoActive: boolean; promoName: string | null };
