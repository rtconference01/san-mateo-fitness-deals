export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Dollars above this are rejected by parseBudget. Not a default budget. */
export const MAX_BUDGET_DOLLARS = 100_000;

export type SourceType =
  | "official_site"
  | "checkout"
  | "studio_social"
  | "influencer_social"
  | "archive_backfill";

export type VerificationStatus =
  | "verified"
  | "unverified"
  | "pending_site_check"
  | "pending_recheck";

export type PageScope = "san_mateo" | "national_brand";

export interface PricePoint {
  effectivePriceCents: number;
  capturedAt: Date;
  sourceType: SourceType;
  verificationStatus: VerificationStatus;
  locationId: string;
  expired: boolean;
  membersOnly: boolean;
  parseError: boolean;
  evidenceObjectKey: string | null;
}

export interface BackfillBaseline {
  priceCents: number;
  labeled: true;
}
