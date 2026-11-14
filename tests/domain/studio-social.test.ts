import { describe, expect, it } from "vitest";
import { shouldAlert } from "../../src/domain/should-alert";
import { studioPostAlertEligible, type ConfirmingSiteObservation, type StudioPostedDeal } from "../../src/domain/studio-social";
import { termsFingerprint } from "../../src/domain/terms";
import { WEEK_MS, type PricePoint } from "../../src/domain/types";

const SAN_MATEO = "san_mateo";
const FINGERPRINT = termsFingerprint({
  classCount: 8,
  length: "50 min",
  restrictions: "new students",
});

function post(overrides: Partial<StudioPostedDeal> = {}): StudioPostedDeal {
  return {
    sourceType: "studio_social",
    effectivePriceCents: 9_900,
    termsFingerprint: FINGERPRINT,
    pageScope: "san_mateo",
    locationCheckPassed: true,
    expired: false,
    ...overrides,
  };
}

function site(overrides: Partial<ConfirmingSiteObservation> = {}): ConfirmingSiteObservation {
  return {
    sourceType: "official_site",
    verificationStatus: "verified",
    effectivePriceCents: 9_900,
    termsFingerprint: FINGERPRINT,
    locationId: SAN_MATEO,
    expired: false,
    ...overrides,
  };
}

describe("studio social", () => {
  it("a studio-posted deal is not alert-eligible until a matching verified site observation exists", () => {
    const deal = post();
    expect(studioPostAlertEligible(deal, null, SAN_MATEO)).toBe(false);
    expect(
      studioPostAlertEligible(deal, site({ effectivePriceCents: 4_900 }), SAN_MATEO),
    ).toBe(false);
    expect(
      studioPostAlertEligible(deal, site({ termsFingerprint: "classes:10|length:50 min|restrictions:new students" }), SAN_MATEO),
    ).toBe(false);
    expect(studioPostAlertEligible(deal, site(), SAN_MATEO)).toBe(true);

    const socialPoint: PricePoint = {
      effectivePriceCents: 9_900,
      capturedAt: new Date("2026-03-02T00:00:00.000Z"),
      sourceType: "studio_social",
      verificationStatus: "pending_site_check",
      locationId: SAN_MATEO,
      expired: false,
      membersOnly: false,
      parseError: false,
      evidenceObjectKey: "evidence/studio-post",
    };
    const earlier: PricePoint = {
      ...socialPoint,
      capturedAt: new Date(socialPoint.capturedAt.getTime() - 8 * WEEK_MS),
    };
    const alert = shouldAlert({
      candidate: socialPoint,
      history: [earlier],
      sanMateoLocationId: SAN_MATEO,
      annualCostCents: 9_900,
      budgetCents: 100_000,
      alreadyAlerted: false,
      backfillBaseline: null,
    });
    expect(alert.alert).toBe(false);
    expect(alert.reason).toBe("social_not_verified");
  });

  it("a national studio post does not count until the San Mateo location check passes", () => {
    const national = post({ pageScope: "national_brand", locationCheckPassed: false });
    expect(studioPostAlertEligible(national, site(), SAN_MATEO)).toBe(false);
    expect(
      studioPostAlertEligible(
        post({ pageScope: "national_brand", locationCheckPassed: true }),
        site(),
        SAN_MATEO,
      ),
    ).toBe(true);
  });
});
