import { describe, expect, it } from "vitest";
import { annualCost, fitsBudget } from "../../src/domain/money";

describe("annualCost", () => {
  it("QA-36: a 30-day intro at $49 that auto-renews at $199 includes eleven renewals", () => {
    const total = annualCost({
      effectivePriceCents: 4_900,
      autoRenewPriceCents: 19_900,
      feeCents: 0,
      introLengthDays: 30,
    });
    expect(total).toEqual({ ok: true, annualCents: 4_900 + 19_900 * 11 });
    if (total.ok) expect(fitsBudget(total.annualCents, 35_000)).toBe(false);
  });

  it("QA-37: a sign-up fee is included in annual cost", () => {
    const total = annualCost({
      effectivePriceCents: 10_000,
      autoRenewPriceCents: null,
      feeCents: 2_500,
    });
    expect(total).toEqual({ ok: true, annualCents: 12_500 });
  });

  it("QA-96: a free week and a 2-week intro start renewal when the intro ends", () => {
    const renew = 19_900;
    const freeWeek = annualCost({
      effectivePriceCents: 0,
      autoRenewPriceCents: renew,
      feeCents: 0,
      introLengthDays: 7,
    });
    const twoWeek = annualCost({
      effectivePriceCents: 4_900,
      autoRenewPriceCents: renew,
      feeCents: 0,
      introLengthDays: 14,
    });
    const oneMonth = annualCost({
      effectivePriceCents: 4_900,
      autoRenewPriceCents: renew,
      feeCents: 0,
      introLengthDays: 30,
    });
    expect(freeWeek).toEqual({ ok: true, annualCents: renew * 12 });
    expect(twoWeek).toEqual({ ok: true, annualCents: 4_900 + renew * 12 });
    expect(oneMonth).toEqual({ ok: true, annualCents: 4_900 + renew * 11 });
    expect(annualCost({
      effectivePriceCents: 4_900,
      autoRenewPriceCents: renew,
      feeCents: 0,
    })).toEqual({ ok: false, reason: "unknown_intro_length" });
  });
});
