import { WEEK_MS, type BackfillBaseline, type PricePoint } from "./types";

export interface ShouldAlertInput {
  candidate: PricePoint;
  /** Prior observations for the same offer. Does not include the candidate. */
  history: PricePoint[];
  sanMateoLocationId: string;
  /** Plan total for the year with this offer included, in cents. */
  annualCostCents: number;
  /** Employee budget in cents. Required. There is no default. */
  budgetCents: unknown;
  /** True when this offer and baseline already produced an alert. */
  alreadyAlerted: boolean;
  backfillBaseline: BackfillBaseline | null;
}

export interface ShouldAlertResult {
  alert: boolean;
  path: "A" | "B" | null;
  reason: string;
  evidenceObjectKey: string | null;
}

function no(reason: string): ShouldAlertResult {
  return { alert: false, path: null, reason, evidenceObjectKey: null };
}

function isVerifiedOfficial(point: PricePoint, sanMateoLocationId: string): boolean {
  return (
    !point.parseError &&
    !point.expired &&
    !point.membersOnly &&
    point.locationId === sanMateoLocationId &&
    (point.sourceType === "official_site" || point.sourceType === "checkout") &&
    point.verificationStatus === "verified"
  );
}

/**
 * Inclusive 10% band: price <= low * 1.1.
 * Integer cents: price * 10 <= low * 11, so exactly 10% passes and 11% fails.
 */
export function withinInclusiveTenPercent(priceCents: number, lowCents: number): boolean {
  return priceCents * 10 <= lowCents * 11;
}

/**
 * AC-6. A price alerts only when every gate holds.
 * Social and archive rows never alert on their own. A studio post becomes
 * alert-eligible only through studioPostAlertEligible, and even then AC-6
 * runs on the confirming official-site or checkout observation.
 */
function invalidBudget(budget: unknown): boolean {
  return (
    typeof budget !== "number" ||
    !Number.isFinite(budget) ||
    !Number.isInteger(budget) ||
    budget <= 0
  );
}

/** Eight weekly points, every gap at most 14 days. */
function pathAReady(verified: PricePoint[]): boolean {
  if (verified.length < 8) return false;
  const times = verified.map((point) => point.capturedAt.getTime()).sort((left, right) => left - right);
  const span = times[times.length - 1] - times[0];
  if (span < 8 * WEEK_MS) return false;
  const maxGapMs = 14 * 24 * 60 * 60 * 1000;
  for (let index = 1; index < times.length; index += 1) {
    if (times[index] - times[index - 1] > maxGapMs) return false;
  }
  return true;
}

export function shouldAlert(input: ShouldAlertInput): ShouldAlertResult {
  if (invalidBudget(input.budgetCents)) return no("invalid_budget");
  const budget = input.budgetCents as number;
  const candidate = input.candidate;

  if (candidate.parseError) return no("parse_error");
  if (candidate.membersOnly) return no("members_only");
  if (candidate.locationId !== input.sanMateoLocationId) return no("wrong_location");
  if (candidate.expired) return no("expired");
  if (candidate.sourceType === "studio_social" || candidate.sourceType === "influencer_social") {
    return no("social_not_verified");
  }
  if (candidate.sourceType === "archive_backfill") return no("archive_not_current");
  if (candidate.sourceType !== "official_site" && candidate.sourceType !== "checkout") {
    return no("not_official_source");
  }
  if (candidate.verificationStatus !== "verified") return no("unverified");
  if (!candidate.evidenceObjectKey) return no("missing_evidence");
  if (input.alreadyAlerted) return no("duplicate");
  if (input.annualCostCents > budget) return no("over_budget");

  const verified = [...input.history, candidate].filter((point) =>
    isVerifiedOfficial(point, input.sanMateoLocationId),
  );
  if (verified.length === 0) return no("no_verified_price");

  const times = verified.map((point) => point.capturedAt.getTime());
  const span = Math.max(...times) - Math.min(...times);
  const verifiedLow = Math.min(...verified.map((point) => point.effectivePriceCents));

  const pathA = pathAReady(verified);
  const pathB =
    input.backfillBaseline !== null &&
    input.backfillBaseline.labeled === true &&
    verified.length >= 4 &&
    span >= 2 * WEEK_MS;

  if (!pathA && !pathB) {
    return no(verified.length === 1 ? "first_observation" : "no_baseline");
  }

  const comparisonLow =
    input.backfillBaseline !== null
      ? Math.min(verifiedLow, input.backfillBaseline.priceCents)
      : verifiedLow;

  if (!withinInclusiveTenPercent(candidate.effectivePriceCents, comparisonLow)) {
    return no("above_low_band");
  }

  return {
    alert: true,
    path: pathA ? "A" : "B",
    reason: "qualified",
    evidenceObjectKey: candidate.evidenceObjectKey,
  };
}
