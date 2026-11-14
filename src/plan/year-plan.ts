import { compareOffers, type RankableOffer, type VerificationLabel } from "../domain/rank";

const MONTH_DAYS = 30;

export interface SchedulableOffer {
  id: string;
  studioId: string;
  classType: "yoga" | "reformer_pilates";
  offerKind: "intro" | "regular";
  verification: VerificationLabel;
  effectivePriceCents: number | null;
  autoRenewPriceCents: number | null;
  feesCents: number;
  taxCents: number;
  classesIncluded: number | "unlimited" | null;
  durationDays: number | null;
  cancelTermsPublished: boolean;
  minimumCommitmentMonths?: number | null;
  verifiedLowCents: number | null;
  priceScope: "location" | "national";
  locationCheckPassed: boolean;
  basedOnPastPrices: boolean;
  snapshotDates: string[];
  sourceUrl: string;
  capturedAt: string;
  expired: boolean;
}

export interface PlanStep {
  kind: "offer" | "gap";
  studioId: string | null;
  offerId: string | null;
  offerKind: "intro" | "regular" | null;
  costCents: number;
  startDay: number;
  durationDays: number;
  cancelByDay: number | null;
  cancelTermsUnknown: boolean;
  includesRenewal: boolean;
  sourceUrl: string | null;
  capturedAt: string | null;
  verification: VerificationLabel | null;
  reason: string | null;
}

export interface YearPlan {
  status: "plan" | "follow_up" | "no_plan";
  followUp: string[];
  assumptions: string[];
  budgetCents: number;
  totalCents: number;
  uncoveredDays: number;
  shortfallCents: number | null;
  steps: PlanStep[];
  unverified: SchedulableOffer[];
  pastPrices: SchedulableOffer[];
  notes: string[];
}

export function offerDurationDays(offer: SchedulableOffer, classesPerWeek: number): number {
  if (typeof offer.classesIncluded === "number") {
    return Math.round((offer.classesIncluded / classesPerWeek) * 7);
  }
  if (offer.durationDays !== null) return offer.durationDays;
  return MONTH_DAYS;
}

export function stepPriceCents(offer: SchedulableOffer): {
  cents: number;
  cancelTermsUnknown: boolean;
  includesRenewal: boolean;
} {
  const price = offer.effectivePriceCents ?? 0;
  const extras = offer.feesCents + offer.taxCents;
  const introRenews = offer.offerKind === "intro" && offer.autoRenewPriceCents !== null;
  if (introRenews && offer.cancelTermsPublished) {
    return { cents: price + extras, cancelTermsUnknown: false, includesRenewal: false };
  }
  if (introRenews && !offer.cancelTermsPublished) {
    return {
      cents: price + (offer.autoRenewPriceCents ?? 0) + extras,
      cancelTermsUnknown: true,
      includesRenewal: true,
    };
  }
  return { cents: price + extras, cancelTermsUnknown: false, includesRenewal: false };
}

function toRankable(offer: SchedulableOffer, classesPerWeek: number): RankableOffer {
  const priced = stepPriceCents(offer);
  const perClass =
    offer.classesIncluded === "unlimited"
      ? Math.round((offer.effectivePriceCents ?? 0) / (classesPerWeek * 4))
      : typeof offer.classesIncluded === "number" && offer.classesIncluded > 0
        ? Math.round((offer.effectivePriceCents ?? 0) / offer.classesIncluded)
        : offer.effectivePriceCents ?? 0;
  return {
    id: offer.id,
    verification: "verified",
    periodCostCents: priced.cents,
    costPerClassCents: perClass,
    currentPriceCents: offer.effectivePriceCents,
    verifiedLowCents: offer.verifiedLowCents,
    expired: false,
  };
}

function schedulable(offer: SchedulableOffer): boolean {
  if (offer.expired || offer.effectivePriceCents === null) return false;
  if (offer.verification !== "verified") return false;
  if (offer.priceScope === "national" && !offer.locationCheckPassed) return false;
  if (offer.basedOnPastPrices) return false;
  return true;
}

export function buildYearPlan(input: {
  budgetCents: number;
  months: number;
  classType?: "yoga" | "reformer_pilates";
  alreadyClient?: string[] | null;
  eligibilityUnclearStudios?: string[];
  classesPerWeek?: number;
  offers: SchedulableOffer[];
}): YearPlan {
  const classesPerWeek = input.classesPerWeek ?? 2;
  const assumptions = [
    input.classesPerWeek === undefined
      ? "classes_per_week defaulted to 2"
      : `classes_per_week ${classesPerWeek}`,
  ];
  if (input.alreadyClient === undefined || input.alreadyClient === null) {
    return {
      status: "follow_up",
      followUp: ["already_client"],
      assumptions,
      budgetCents: input.budgetCents,
      totalCents: 0,
      uncoveredDays: input.months * MONTH_DAYS,
      shortfallCents: null,
      steps: [],
      unverified: [],
      pastPrices: [],
      notes: ["Studios already used were not provided and were not assumed to be none."],
    };
  }

  const scoped = input.offers.filter(
    (offer) => !input.classType || offer.classType === input.classType,
  );
  const unverified = scoped.filter(
    (offer) =>
      offer.verification === "studio_posted_unconfirmed" ||
      offer.verification === "influencer_unconfirmed",
  );
  const pastPrices = scoped.filter(
    (offer) => offer.basedOnPastPrices || offer.verification === "archived",
  );
  const already = new Set(input.alreadyClient);
  const unclear = new Set(input.eligibilityUnclearStudios ?? []);
  const notes: string[] = [];
  for (const studioId of already) {
    notes.push(`${studioId} intro excluded: already a client. Regular verified prices can still be used.`);
  }
  for (const studioId of unclear) {
    notes.push(
      `${studioId} intro not scheduled: eligibility is the studio's call, not assumed.`,
    );
  }
  if (already.size && input.offers.every((offer) => already.has(offer.studioId))) {
    notes.push("No intros used because every studio was marked already a client.");
  }

  const intros = scoped.filter(
    (offer) =>
      schedulable(offer) &&
      offer.offerKind === "intro" &&
      !already.has(offer.studioId) &&
      !unclear.has(offer.studioId),
  );
  const regulars = scoped.filter((offer) => schedulable(offer) && offer.offerKind === "regular");

  const horizon = input.months * MONTH_DAYS;
  const steps: PlanStep[] = [];
  const usedIntro = new Set<string>();
  let day = 0;
  let spent = 0;

  const sortPool = (pool: SchedulableOffer[]) =>
    [...pool].sort((left, right) =>
      compareOffers(toRankable(left, classesPerWeek), toRankable(right, classesPerWeek)),
    );

  while (day < horizon) {
    const remaining = input.budgetCents - spent;
    const introPick = sortPool(intros).find((offer) => {
      if (usedIntro.has(offer.studioId)) return false;
      return stepPriceCents(offer).cents <= remaining;
    });
    const regularPick = sortPool(regulars).find(
      (offer) => stepPriceCents(offer).cents <= remaining,
    );
    const next = introPick ?? regularPick;
    if (!next) {
      steps.push({
        kind: "gap",
        studioId: null,
        offerId: null,
        offerKind: null,
        costCents: 0,
        startDay: day,
        durationDays: horizon - day,
        cancelByDay: null,
        cancelTermsUnknown: false,
        includesRenewal: false,
        sourceUrl: null,
        capturedAt: null,
        verification: null,
        reason: "no_affordable_verified_option",
      });
      day = horizon;
      break;
    }
    const priced = stepPriceCents(next);
    const duration = offerDurationDays(next, classesPerWeek);
    const usedDays = Math.min(duration, horizon - day);
    steps.push({
      kind: "offer",
      studioId: next.studioId,
      offerId: next.id,
      offerKind: next.offerKind,
      costCents: priced.cents,
      startDay: day,
      durationDays: usedDays,
      cancelByDay:
        next.offerKind === "intro" && next.autoRenewPriceCents !== null
          ? day + usedDays - (priced.includesRenewal ? 1 : 0)
          : null,
      cancelTermsUnknown: priced.cancelTermsUnknown,
      includesRenewal: priced.includesRenewal,
      sourceUrl: next.sourceUrl,
      capturedAt: next.capturedAt,
      verification: next.verification,
      reason: null,
    });
    spent += priced.cents;
    day += usedDays;
    if (next.offerKind === "intro") usedIntro.add(next.studioId);
  }

  const totalCents = steps.reduce((sum, step) => sum + step.costCents, 0);
  const uncoveredDays = steps
    .filter((step) => step.kind === "gap")
    .reduce((sum, step) => sum + step.durationDays, 0);
  const offerSteps = steps.filter((step) => step.kind === "offer");
  if (!offerSteps.length) {
    const cheapestIntro = sortPool(intros)[0];
    const cheapest = cheapestIntro ? stepPriceCents(cheapestIntro).cents : null;
    return {
      status: "no_plan",
      followUp: [],
      assumptions,
      budgetCents: input.budgetCents,
      totalCents: 0,
      uncoveredDays: horizon,
      shortfallCents: cheapest === null ? null : Math.max(0, cheapest - input.budgetCents),
      steps: [],
      unverified,
      pastPrices,
      notes: [
        ...notes,
        "No plan fits this budget. Nothing was scheduled over the budget.",
      ],
    };
  }

  return {
    status: "plan",
    followUp: [],
    assumptions,
    budgetCents: input.budgetCents,
    totalCents,
    uncoveredDays,
    shortfallCents: null,
    steps,
    unverified,
    pastPrices,
    notes,
  };
}
