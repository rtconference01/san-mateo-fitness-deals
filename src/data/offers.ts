import { annualCost, costPerClass, shouldAlert } from "../domain";
import type { PricePoint } from "../domain";
import type { SchedulableOffer } from "../plan/year-plan";

export interface OfferRow {
  id: string;
  studio: string;
  location: string;
  class_type: SchedulableOffer["classType"];
  offer_type: string;
  offer_kind: SchedulableOffer["offerKind"];
  terms: string;
  current_price_cents: number | null;
  verification: SchedulableOffer["verification"];
  price_scope: SchedulableOffer["priceScope"];
  lowest_verified_price_cents: number | null;
  lowest_verified_at: string | null;
  best_month: string | null;
  best_month_reason: "insufficient history" | null;
  cost_per_class_cents: number | null;
  cost_per_class_assumption: string | null;
  annual_cost_cents: number | null;
  alert_eligibility: { eligible: boolean; reason: string };
  expiry: string | null;
  source_url: string;
  captured_at: string;
  evidence_screenshot_url: string | null;
  generated_at: string;
  live: boolean;
  stale: boolean;
  based_on_past_prices: boolean;
  snapshot_dates: string[];
}

export interface OffersFile {
  generated_at: string;
  offers: OfferRow[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function queryOffers(
  offers: SchedulableOffer[],
  filter: { studioId?: string; classType?: SchedulableOffer["classType"]; locationId?: string },
): SchedulableOffer[] {
  return offers.filter((offer) => {
    if (filter.studioId && offer.studioId !== filter.studioId) return false;
    if (filter.classType && offer.classType !== filter.classType) return false;
    if (filter.locationId && !offer.id.includes(filter.locationId) && filter.locationId !== offer.studioId) {
      return offer.studioId === filter.locationId;
    }
    return true;
  });
}

export function toOffersFile(
  offers: SchedulableOffer[],
  generatedAt: string,
  classesPerWeek = 2,
): OffersFile {
  return {
    generated_at: generatedAt,
    offers: offers.map((offer) => toRow(offer, generatedAt, classesPerWeek, generatedAt)),
  };
}

export function flagStale(file: OffersFile, now: Date): OffersFile {
  const generated = new Date(file.generated_at).getTime();
  const stale = now.getTime() - generated > DAY_MS;
  return {
    ...file,
    offers: file.offers.map((offer) => ({ ...offer, stale })),
  };
}

function toRow(
  offer: SchedulableOffer,
  generatedAt: string,
  classesPerWeek: number,
  capturedAt: string,
): OfferRow {
  const price = offer.effectivePriceCents;
  const perClass =
    price === null
      ? null
      : costPerClass(
          price,
          offer.classesIncluded ?? "unlimited",
          offer.classesIncluded === "unlimited" ? classesPerWeek * 4 : 12,
        );
  const annual =
    price === null
      ? null
      : annualCost({
          effectivePriceCents: price,
          autoRenewPriceCents: offer.autoRenewPriceCents,
          feeCents: offer.feesCents + offer.taxCents,
        });
  const point: PricePoint = {
    effectivePriceCents: price ?? 0,
    capturedAt: new Date(offer.capturedAt),
    sourceType: offer.verification === "verified" ? "official_site" : "studio_social",
    verificationStatus: offer.verification === "verified" ? "verified" : "unverified",
    locationId: "san_mateo",
    expired: offer.expired,
    membersOnly: false,
    parseError: false,
    evidenceObjectKey: offer.sourceUrl,
  };
  const alert =
    price === null
      ? { alert: false, reason: "not_published" }
      : shouldAlert({
          candidate: point,
          history: [],
          sanMateoLocationId: "san_mateo",
          annualCostCents: annual ?? price,
          budgetCents: Number.MAX_SAFE_INTEGER,
          alreadyAlerted: false,
          backfillBaseline: offer.basedOnPastPrices
            ? { priceCents: offer.verifiedLowCents ?? price, labeled: true }
            : null,
        });
  return {
    id: offer.id,
    studio: offer.studioId,
    location: "San Mateo",
    class_type: offer.classType,
    offer_type: offer.offerKind,
    offer_kind: offer.offerKind,
    terms: offer.id,
    current_price_cents: price,
    verification: offer.verification,
    price_scope: offer.priceScope,
    lowest_verified_price_cents: offer.verifiedLowCents,
    lowest_verified_at: offer.verifiedLowCents === null ? null : capturedAt,
    best_month: null,
    best_month_reason: "insufficient history",
    cost_per_class_cents: perClass?.costPerClassCents ?? null,
    cost_per_class_assumption: perClass?.label ?? null,
    annual_cost_cents: annual,
    alert_eligibility: { eligible: alert.alert, reason: alert.reason },
    expiry: null,
    source_url: offer.sourceUrl,
    captured_at: offer.capturedAt,
    evidence_screenshot_url: null,
    generated_at: generatedAt,
    live: false,
    stale: false,
    based_on_past_prices: offer.basedOnPastPrices,
    snapshot_dates: offer.snapshotDates,
  };
}
