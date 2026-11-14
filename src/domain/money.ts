
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
  /** Planning horizon. The budget view uses 12. */
  months?: number;
}

/**
 * Annual cost includes one-time fees and, when the offer renews, the intro
 * price for the first month plus the auto-renew price for every later month.
 */
export function annualCost(input: AnnualCostInput): number {
  const months = input.months ?? 12;
  assertCents(input.effectivePriceCents, "effective price");
  assertCents(input.feeCents, "fees");
  if (!Number.isInteger(months) || months < 1) {
    throw new Error("months must be a positive integer");
  }
  if (input.autoRenewPriceCents === null) {
    return input.effectivePriceCents + input.feeCents;
  }
  assertCents(input.autoRenewPriceCents, "auto-renew price");
  return (
    input.effectivePriceCents +
    input.autoRenewPriceCents * (months - 1) +
    input.feeCents
  );
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
