import { describe, expect, it } from "vitest";
import { annualCost, fitsBudget } from "../../src/domain/money";

describe("annualCost", () => {
  it("QA-36: intro month $49 that auto-renews at $199 includes the renewal and fails the budget", () => {
    const total = annualCost({
      effectivePriceCents: 4_900,
      autoRenewPriceCents: 19_900,
      feeCents: 0,
    });
    expect(total).toBe(4_900 + 19_900 * 11);
    expect(fitsBudget(total, 35_000)).toBe(false);
  });

  it("QA-37: a sign-up fee is included in annual cost", () => {
    const total = annualCost({
      effectivePriceCents: 10_000,
      autoRenewPriceCents: null,
      feeCents: 2_500,
    });
    expect(total).toBe(12_500);
    expect(total).toBeGreaterThan(10_000);
  });
});
