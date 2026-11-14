export type ClassType = "yoga" | "reformer_pilates";

export type OfferType =
  | "free_week"
  | "intro_month"
  | "class_pack"
  | "first_month_membership"
  | "promo_code";

/** Raw evidence returned by capture(). Parsing does not fetch. */
export interface RawEvidence {
  sourceUrl: string;
  capturedAt: Date;
  html: string;
  screenshot: Uint8Array;
  /** False when the studio page was fetched before a San Mateo location was selected. */
  locationSelected: boolean;
}

/**
 * Candidate offers from parse(). Prices may be null when the page did not
 * yield a number. The pipeline, not the adapter, decides scraper_error.
 */
export interface CandidateOffer {
  studioId: string;
  locationId: string;
  classType: ClassType;
  offerType: OfferType;
  listPriceCents: number | null;
  effectivePriceCents: number | null;
  autoRenewPriceCents: number | null;
  classesIncluded: number | "unlimited" | null;
  duration: string | null;
  restrictions: string | null;
  expiry: string | null;
  promoCode: string | null;
  feesCents: number | null;
  offerKind: "intro" | "regular";
  priceScope: "location" | "national";
  cancelTermsPublished: boolean;
  durationDays: number | null;
  /** True only when the captured page explicitly calls the offer free. */
  isFreeOffer?: boolean;
  /** Wording saved as evidence for a free offer. Required when the price is $0. */
  freeOfferWording?: string | null;
}

export interface StudioAdapter {
  studioId: string;
  /** Fetch the public page and return HTML plus a screenshot. No parsing. */
  capture(sourceUrl: string): Promise<RawEvidence>;
  /** Read candidate offers from evidence already captured. */
  parse(evidence: RawEvidence): Promise<CandidateOffer[]>;
}

export function notImplemented(): never {
  throw new Error("not implemented");
}
