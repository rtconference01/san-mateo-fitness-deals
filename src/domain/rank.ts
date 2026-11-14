export type VerificationLabel =
  | "verified"
  | "studio_posted_unconfirmed"
  | "influencer_unconfirmed"
  | "archived"
  | "not_published";

export interface RankableOffer {
  id: string;
  verification: VerificationLabel;
  /** Total cost for the requested period, including renewals and fees, in cents. */
  periodCostCents: number;
  costPerClassCents: number;
  /** Current verified price. Null when this row is not a verified current price. */
  currentPriceCents: number | null;
  /** Lowest verified price. Null when there is no verified low. */
  verifiedLowCents: number | null;
  expired: boolean;
}

export interface RankResult {
  /** Best verified offer that fits, or null when none fit. */
  best: RankableOffer | null;
  /** Verified offers that fit, best first. */
  rankedVerified: RankableOffer[];
  /** Unverified, archived, and not-published rows. Never ranked as best. */
  unverified: RankableOffer[];
  /** Verified offers that do not fit the budget or are expired. */
  excludedVerified: RankableOffer[];
}

function percentAboveLow(offer: RankableOffer): number {
  if (offer.currentPriceCents === null || offer.verifiedLowCents === null || offer.verifiedLowCents <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  return (offer.currentPriceCents - offer.verifiedLowCents) / offer.verifiedLowCents;
}

function compareOffers(left: RankableOffer, right: RankableOffer): number {
  if (left.periodCostCents !== right.periodCostCents) {
    return left.periodCostCents - right.periodCostCents;
  }
  if (left.costPerClassCents !== right.costPerClassCents) {
    return left.costPerClassCents - right.costPerClassCents;
  }
  return percentAboveLow(left) - percentAboveLow(right);
}

/**
 * Among verified offers that fit the budget (renewals and fees included),
 * rank by lowest period cost, then lower cost per class, then a smaller
 * percentage above the verified low. Unverified offers are returned separately.
 */
export function rankOffers(offers: RankableOffer[], budgetCents: number): RankResult {
  if (!Number.isInteger(budgetCents) || budgetCents < 0) {
    throw new Error("budget must be a non-negative integer number of cents");
  }

  const unverified = offers.filter((offer) => offer.verification !== "verified");
  const verified = offers.filter((offer) => offer.verification === "verified");
  const fitting = verified.filter(
    (offer) => !offer.expired && offer.periodCostCents <= budgetCents,
  );
  const excludedVerified = verified.filter(
    (offer) => offer.expired || offer.periodCostCents > budgetCents,
  );
  const rankedVerified = [...fitting].sort(compareOffers);

  return {
    best: rankedVerified[0] ?? null,
    rankedVerified,
    unverified,
    excludedVerified,
  };
}
