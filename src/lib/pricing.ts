/** Pure pricing rules shared by the public page, the checkout and the admin panel. */

export const MIN_CHARGE_CENTS = 100; // Mercado Pago cannot charge zero; never discount below R$ 1,00.

export type PricingPlan = {
  slug: string;
  price_cents: number | null;
  promo_price_cents: number | null;
  promo_starts_at: string | null;
  promo_ends_at: string | null;
};

export type PricingCoupon = {
  id: string;
  code: string;
  name: string;
  discount_type: string; // "percent" | "fixed"
  discount_value: number;
  plan: string | null;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  automatic: boolean;
  active: boolean;
};

export type CouponUsage = { total: number; customer: number | null };

export type Quote = {
  original: number;
  base: number;
  promoActive: boolean;
  discount: number;
  final: number;
  coupon: { id: string; code: string; name: string; automatic: boolean } | null;
  couponError: string | null;
};

const inWindow = (start: string | null, end: string | null, now: Date) =>
  (!start || new Date(start) <= now) && (!end || new Date(end) >= now);

/** Price before coupons: promotional price when it is valid right now and lower than the regular one. */
export function basePrice(plan: PricingPlan, now: Date) {
  const original = plan.price_cents;
  if (original == null || original <= 0) return null;
  const promo = plan.promo_price_cents;
  const promoActive = promo != null && promo > 0 && promo < original && inWindow(plan.promo_starts_at, plan.promo_ends_at, now);
  return { original, base: promoActive ? promo! : original, promoActive };
}

/** Why a coupon cannot be used, or null when it can. */
export function couponProblem(c: PricingCoupon, planSlug: string, now: Date, usage?: CouponUsage): string | null {
  if (!c.active) return "Cupom inativo.";
  if (c.plan && c.plan !== planSlug) return "Cupom não vale para este plano.";
  if (c.starts_at && new Date(c.starts_at) > now) return "Cupom ainda não começou a valer.";
  if (c.ends_at && new Date(c.ends_at) < now) return "Cupom expirado.";
  if (usage && c.max_uses != null && usage.total >= c.max_uses) return "Cupom esgotado.";
  if (usage && usage.customer != null && c.max_uses_per_customer != null && usage.customer >= c.max_uses_per_customer)
    return "Você já usou este cupom o máximo de vezes permitido.";
  return null;
}

/** Discount in cents, never leaving less than the minimum charge (or more than the price itself). */
export function couponDiscount(c: PricingCoupon, base: number) {
  const raw =
    c.discount_type === "percent"
      ? Math.round((base * Math.min(Math.max(c.discount_value, 0), 100)) / 100)
      : Math.max(c.discount_value, 0);
  const maxDiscount = Math.max(base - MIN_CHARGE_CENTS, 0);
  return Math.min(raw, maxDiscount);
}

/** Full quote: promo price, then the best of the typed coupon and any automatic promotion (they never stack). */
export function quote(args: {
  plan: PricingPlan;
  now: Date;
  code?: string | null;
  coupons: PricingCoupon[];
  usage?: Record<string, CouponUsage>;
}): Quote | null {
  const b = basePrice(args.plan, args.now);
  if (!b) return null;
  const code = args.code?.trim().toLowerCase() || null;
  let couponError: string | null = null;
  const candidates: PricingCoupon[] = [];

  if (code) {
    const typed = args.coupons.find((c) => !c.automatic && c.code.toLowerCase() === code);
    if (!typed) couponError = "Cupom não encontrado.";
    else {
      couponError = couponProblem(typed, args.plan.slug, args.now, args.usage?.[typed.id]);
      if (!couponError) candidates.push(typed);
    }
  }
  for (const c of args.coupons) {
    if (c.automatic && !couponProblem(c, args.plan.slug, args.now, args.usage?.[c.id])) candidates.push(c);
  }

  let best: PricingCoupon | null = null;
  let discount = 0;
  for (const c of candidates) {
    const d = couponDiscount(c, b.base);
    if (d > discount) {
      discount = d;
      best = c;
    }
  }
  return {
    original: b.original,
    base: b.base,
    promoActive: b.promoActive,
    discount,
    final: b.base - discount,
    coupon: best ? { id: best.id, code: best.code, name: best.name, automatic: best.automatic } : null,
    couponError,
  };
}

/** Admin-side validation for a coupon form. */
export function validateCoupon(c: {
  code: string;
  name: string;
  discount_type: string;
  discount_value: number;
  starts_at: string | null;
  ends_at: string | null;
  max_uses: number | null;
  max_uses_per_customer: number | null;
  automatic: boolean;
}): string | null {
  if (!c.name.trim()) return "Informe o nome interno da campanha.";
  if (!c.automatic && !/^[A-Za-z0-9_-]{3,30}$/.test(c.code.trim())) return "O código deve ter de 3 a 30 letras, números, - ou _.";
  if (!Number.isFinite(c.discount_value) || c.discount_value <= 0) return "O desconto precisa ser maior que zero.";
  if (c.discount_type === "percent" && c.discount_value > 100) return "O desconto percentual não pode passar de 100%.";
  if (c.starts_at && c.ends_at && new Date(c.ends_at) <= new Date(c.starts_at)) return "A data de encerramento deve ser depois do início.";
  if (c.max_uses != null && c.max_uses < 1) return "O limite total precisa ser pelo menos 1.";
  if (c.max_uses_per_customer != null && c.max_uses_per_customer < 1) return "O limite por cliente precisa ser pelo menos 1.";
  return null;
}
