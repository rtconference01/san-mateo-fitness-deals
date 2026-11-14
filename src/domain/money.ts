
export interface CostPerClassResult {
  costPerClassCents: number;
  classesUsed: number;
  assumption: boolean;
  label: string | null;
}

function assertCents(value: number, name: string): void {
  if (!Number.isInteger(value)) {
    throw new Error(`${name} must be an integer number of cents`);
  }
}

/**
 * Cost per class is price divided by classes included.
 * Unlimited offers use a configurable assumption, default 12 classes per month,
 * and the result is labeled as that assumption.
 */
export function costPerClass(
  priceCents: number,
  classesIncluded: number | "unlimited",
  unlimitedClassesPerMonth = 12,
): CostPerClassResult {
  assertCents(priceCents, "price");
  if (priceCents < 0) {
    throw new Error("price must be non-negative");
  }

  if (classesIncluded === "unlimited") {
    if (!Number.isInteger(unlimitedClassesPerMonth) || unlimitedClassesPerMonth <= 0) {
      throw new Error("unlimited class assumption must be a positive integer");
    }
    return {
      costPerClassCents: Math.round(priceCents / unlimitedClassesPerMonth),
      classesUsed: unlimitedClassesPerMonth,
      assumption: true,
      label: `configurable assumption (default ${unlimitedClassesPerMonth} classes/month)`,
    };
  }

  if (!Number.isInteger(classesIncluded) || classesIncluded <= 0) {
    throw new Error("classes included must be a positive integer");
  }

  return {
    costPerClassCents: Math.round(priceCents / classesIncluded),
    classesUsed: classesIncluded,
    assumption: false,
    label: null,
  };
}

export interface AnnualCostInput {
  effectivePriceCents: number;
  /** Null when the offer does not renew. */
  autoRenewPriceCents: number | null;
  feeCents: number;
  /** Planning horizon in 30-day months. The year plan uses 12. */
  months?: number;
  /**
   * How long the intro price lasts, in days. Required when the offer renews.
   * A free week is 7. A two-week intro is 14. Unknown length cannot be priced.
   */
  introLengthDays?: number | null;
  /** Monthly memberships that cannot be cancelled before this many months. */
  minimumCommitmentMonths?: number | null;
}

export type AnnualCostResult =
  | { ok: true; annualCents: number }
  | { ok: false; reason: "unknown_intro_length" };

/**
 * Annual cost includes fees. When the offer renews, the intro price covers
 * introLengthDays and the renewal rate starts the day the intro ends.
 * A 360-day year of 30-day months is the horizon. A shorter intro therefore
 * includes an earlier renewal than a 30-day intro.
 */
export function annualCost(input: AnnualCostInput): AnnualCostResult {
  const months = input.months ?? 12;
  assertCents(input.effectivePriceCents, "effective price");
  assertCents(input.feeCents, "fees");
  if (!Number.isInteger(months) || months < 1) {
    throw new Error("months must be a positive integer");
  }
  if (input.autoRenewPriceCents === null) {
    const commitment = input.minimumCommitmentMonths ?? 1;
    if (!Number.isInteger(commitment) || commitment < 1) {
      throw new Error("minimum commitment must be a positive integer");
    }
    return { ok: true, annualCents: input.effectivePriceCents * commitment + input.feeCents };
  }
  assertCents(input.autoRenewPriceCents, "auto-renew price");
  const introDays = input.introLengthDays;
  if (introDays === null || introDays === undefined || !Number.isInteger(introDays) || introDays <= 0) {
    return { ok: false, reason: "unknown_intro_length" };
  }
  const yearDays = months * 30;
  const remainingDays = Math.max(0, yearDays - introDays);
  const renewalMonths = Math.ceil(remainingDays / 30);
  return {
    ok: true,
    annualCents: input.effectivePriceCents + input.autoRenewPriceCents * renewalMonths + input.feeCents,
  };
}

/**
 * True when the period cost is within the budget the caller passed.
 * There is no default budget. Equal to the budget passes; one cent over fails.
 */
export function fitsBudget(totalAnnualCostCents: number, budgetCents: number): boolean {
  assertCents(totalAnnualCostCents, "total annual cost");
  assertCents(budgetCents, "budget");
  if (budgetCents < 0) {
    throw new Error("budget must be non-negative");
  }
  return totalAnnualCostCents <= budgetCents;
}
