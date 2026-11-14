import { describe, expect, it } from "vitest";
import { rankOffers, type RankableOffer } from "../../src/domain/rank";

function offer(overrides: Partial<RankableOffer> & Pick<RankableOffer, "id">): RankableOffer {
  return {
    verification: "verified",
    periodCostCents: 20_000,
    costPerClassCents: 2_000,
    currentPriceCents: 10_000,
    verifiedLowCents: 10_000,
    expired: false,
    ...overrides,
  };
}

describe("rankOffers", () => {
  it("ranks verified offers that fit by period cost, then cost per class, then percent above the low", () => {
    const priceyPerClass = offer({
      id: "pricey-per-class",
      periodCostCents: 20_000,
      costPerClassCents: 3_000,
      currentPriceCents: 11_000,
      verifiedLowCents: 10_000,
    });
    const cheaperPeriod = offer({
      id: "cheaper-period",
      periodCostCents: 15_000,
      costPerClassCents: 4_000,
    });
    const closerToLow = offer({
      id: "closer-to-low",
      periodCostCents: 20_000,
      costPerClassCents: 3_000,
      currentPriceCents: 10_500,
      verifiedLowCents: 10_000,
    });
    const overBudget = offer({ id: "over", periodCostCents: 50_100 });
    const result = rankOffers([priceyPerClass, overBudget, cheaperPeriod, closerToLow], 50_000);
    expect(result.rankedVerified.map((row) => row.id)).toEqual([
      "cheaper-period",
      "closer-to-low",
      "pricey-per-class",
    ]);
    expect(result.best?.id).toBe("cheaper-period");
    expect(result.excludedVerified.map((row) => row.id)).toEqual(["over"]);
  });

  it("does not rank an unverified offer as best, even when it is cheaper", () => {
    const social = offer({
      id: "social",
      verification: "studio_posted_unconfirmed",
      periodCostCents: 5_000,
    });
    const verified = offer({ id: "verified", periodCostCents: 20_000 });
    const result = rankOffers([social, verified], 40_000);
    expect(result.best?.id).toBe("verified");
    expect(result.unverified.map((row) => row.id)).toEqual(["social"]);
    expect(result.rankedVerified.map((row) => row.id)).toEqual(["verified"]);
  });

  it("does not rank a renewing intro with an unknown length as best", () => {
    const unknown = offer({ id: "unknown-length", periodCostCents: 1_000, unknownIntroLength: true });
    const known = offer({ id: "known", periodCostCents: 5_000 });
    const result = rankOffers([unknown, known], 20_000);
    expect(result.best?.id).toBe("known");
    expect(result.rankedVerified.map((row) => row.id)).toEqual(["known"]);
  });

  it("returns no best offer when every match is unverified", () => {
    const result = rankOffers(
      [
        offer({ id: "a", verification: "influencer_unconfirmed", periodCostCents: 4_000 }),
        offer({ id: "b", verification: "not_published", periodCostCents: 0 }),
      ],
      10_000,
    );
    expect(result.best).toBeNull();
    expect(result.rankedVerified).toEqual([]);
    expect(result.unverified).toHaveLength(2);
  });
});
