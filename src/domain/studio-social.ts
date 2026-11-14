import type { PageScope } from "./types";

export interface StudioPostedDeal {
  sourceType: "studio_social";
  effectivePriceCents: number;
  termsFingerprint: string;
  pageScope: PageScope;
  /**
   * San Mateo pages pass this because the page is the location.
   * National and brand pages pass only after a person or a later check
   * confirms the post is offered at the San Mateo studio.
   */
  locationCheckPassed: boolean;
  expired: boolean;
}

export interface ConfirmingSiteObservation {
  sourceType: "official_site" | "checkout";
  verificationStatus: "verified";
  effectivePriceCents: number;
  termsFingerprint: string;
  locationId: string;
  expired: boolean;
}

/**
 * A studio-posted deal is not alert-eligible on its own.
 * It becomes eligible only when a verified official-site or checkout
 * observation matches the same terms and the same effective price at San Mateo.
 * Eligibility still has to pass AC-6 on that site observation before an alert fires.
 */
export function studioPostAlertEligible(
  post: StudioPostedDeal,
  site: ConfirmingSiteObservation | null,
  sanMateoLocationId: string,
): boolean {
  if (post.sourceType !== "studio_social") return false;
  if (post.expired) return false;
  if (!post.locationCheckPassed) return false;
  if (!site) return false;
  if (site.expired) return false;
  if (site.verificationStatus !== "verified") return false;
  if (site.sourceType !== "official_site" && site.sourceType !== "checkout") return false;
  if (site.locationId !== sanMateoLocationId) return false;
  if (site.termsFingerprint !== post.termsFingerprint) return false;
  if (site.effectivePriceCents !== post.effectivePriceCents) return false;
  return true;
}
