import { describe, expect, it } from "vitest";
import { quote, validateCoupon, type PricingCoupon, type PricingPlan } from "./pricing";
import { accessChange, summarize } from "./finance";

const now = new Date("2026-06-15T12:00:00Z");
const plan: PricingPlan = { slug: "basic", price_cents: 19700, promo_price_cents: null, promo_starts_at: null, promo_ends_at: null };
const coupon = (over: Partial<PricingCoupon> = {}): PricingCoupon => ({
  id: "c1", code: "PROMO20", name: "Campanha", discount_type: "percent", discount_value: 20, plan: null,
  starts_at: null, ends_at: null, max_uses: null, max_uses_per_customer: null, automatic: false, active: true, ...over,
});

describe("pricing", () => {
  it("applies 20% off with a typed coupon", () => {
    const q = quote({ plan, now, code: "promo20", coupons: [coupon()] })!;
    expect(q.discount).toBe(3940);
    expect(q.final).toBe(15760);
  });

  it("applies a fixed R$ 30,00 discount", () => {
    const q = quote({ plan, now, code: "PROMO20", coupons: [coupon({ discount_type: "fixed", discount_value: 3000 })] })!;
    expect(q.final).toBe(16700);
  });

  it("never lets a discount bring the price below R$ 1,00", () => {
    const q = quote({ plan, now, code: "PROMO20", coupons: [coupon({ discount_type: "fixed", discount_value: 999999 })] })!;
    expect(q.final).toBe(100);
  });

  it("uses the promotional price only inside its period", () => {
    const promo = { ...plan, promo_price_cents: 14700, promo_starts_at: "2026-06-01T00:00:00Z", promo_ends_at: "2026-06-30T00:00:00Z" };
    expect(quote({ plan: promo, now, coupons: [] })!.final).toBe(14700);
    expect(quote({ plan: promo, now: new Date("2026-07-02T00:00:00Z"), coupons: [] })!.final).toBe(19700);
  });

  it("applies automatic promotions without a code, only for their plan", () => {
    const auto = coupon({ automatic: true, plan: "pro" });
    expect(quote({ plan, now, coupons: [auto] })!.discount).toBe(0);
    expect(quote({ plan: { ...plan, slug: "pro" }, now, coupons: [auto] })!.discount).toBe(3940);
  });

  it("rejects expired coupons and exhausted per-customer limits", () => {
    expect(quote({ plan, now, code: "PROMO20", coupons: [coupon({ ends_at: "2026-06-01T00:00:00Z" })] })!.discount).toBe(0);
    const q = quote({ plan, now, code: "PROMO20", coupons: [coupon({ max_uses_per_customer: 1 })], usage: { c1: { total: 1, customer: 1 } } })!;
    expect(q.discount).toBe(0);
    expect(q.couponError).not.toBeNull();
  });

  it("refuses percent coupons above 100%", () => {
    const base = { code: "X100", name: "n", discount_type: "percent", discount_value: 120, starts_at: null, ends_at: null, max_uses: null, max_uses_per_customer: null, automatic: false };
    expect(validateCoupon(base)).not.toBeNull();
  });
});

describe("finance", () => {
  it("never counts pending payments as revenue", () => {
    const s = summarize([
      { status: "approved", final_cents: 10000, metadata: { net_received_cents: 9500 } },
      { status: "pending", final_cents: 50000, metadata: {} },
      { status: "refunded", final_cents: 7000, metadata: {} },
    ]);
    expect(s.gross).toBe(10000);
    expect(s.net).toBe(9500);
    expect(s.pending).toBe(1);
    expect(s.canceledOrRefunded).toBe(1);
  });

  it("only revokes access when a previously approved payment is refunded", () => {
    expect(accessChange("pending", "rejected")).toBe("none");
    expect(accessChange("approved", "refunded")).toBe("revoke");
    expect(accessChange("approved", "charged_back")).toBe("block");
    expect(accessChange("pending", "approved")).toBe("grant");
  });
});
