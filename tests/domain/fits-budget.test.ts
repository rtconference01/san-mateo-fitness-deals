import { describe, expect, it } from "vitest";
import { annualCost, fitsBudget } from "../../src/domain/money";

describe("fitsBudget", () => {
  it("passes at budget-1 and budget, and fails at budget+1, for $100, $150, $350, $600, and $1,000", () => {
    const budgets = [10_000, 15_000, 35_000, 60_000, 100_000];
    for (const budget of budgets) {
      expect(fitsBudget(budget - 100, budget)).toBe(true);
      expect(fitsBudget(budget, budget)).toBe(true);
      expect(fitsBudget(budget + 100, budget)).toBe(false);
    }
  });

  it("a $149 plan fits a $149 budget and a $150 plan does not", () => {
    const plan149 = annualCost({
      effectivePriceCents: 14_900,
      autoRenewPriceCents: null,
      feeCents: 0,
    });
    const plan150 = annualCost({
      effectivePriceCents: 15_000,
      autoRenewPriceCents: null,
      feeCents: 0,
    });
    expect(plan149).toEqual({ ok: true, annualCents: 14_900 });
    expect(plan150).toEqual({ ok: true, annualCents: 15_000 });
    expect(fitsBudget(14_900, 14_900)).toBe(true);
    expect(fitsBudget(15_000, 14_900)).toBe(false);
    expect(fitsBudget(15_000, 15_000)).toBe(true);
  });
});
