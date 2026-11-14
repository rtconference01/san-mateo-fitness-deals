import { termsFingerprint } from "../domain/terms";
import type { CandidateOffer } from "./adapter";

const SIX_HOURS_MS = 6 * 60 * 60 * 1000;

export type Validation =
  | { ok: true; fingerprint: string; offer: CandidateOffer }
  | { ok: false; error: "scraper_error"; reason: string };

export function validateOffer(offer: CandidateOffer, locationSelected: boolean): Validation {
  if (offer.studioId === "bodyrok" && !locationSelected) {
    return { ok: false, error: "scraper_error", reason: "location_not_selected" };
  }
  const price = offer.effectivePriceCents;
  if (price === null || price === undefined) {
    return { ok: false, error: "scraper_error", reason: "missing_price" };
  }
  if (price === 0 && offer.isFreeOffer !== true) {
    return { ok: false, error: "scraper_error", reason: "zero_price" };
  }
  if (price === 0 && !offer.freeOfferWording) {
    return { ok: false, error: "scraper_error", reason: "missing_free_wording" };
  }
  if (price < 0) {
    return { ok: false, error: "scraper_error", reason: "invalid_price" };
  }
  const fingerprint = termsFingerprint({
    classCount: offer.classesIncluded ?? 0,
    length: offer.duration ?? "",
    restrictions: offer.restrictions ?? "",
  });
  return { ok: true, fingerprint, offer };
}

export function assessPriceChange(
  previousCents: number | null,
  nextCents: number,
  now: Date,
): { action: "record" } | { action: "pending_recheck"; dueAt: Date } {
  if (previousCents === null || previousCents === 0) return { action: "record" };
  const delta = Math.abs(nextCents - previousCents) / previousCents;
  if (delta > 0.3) {
    return { action: "pending_recheck", dueAt: new Date(now.getTime() + SIX_HOURS_MS) };
  }
  return { action: "record" };
}
