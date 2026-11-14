import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAllowedByRobots } from "../../src/capture/robots";
import {
  bodyrokCaptureAllowed,
  parseBodyrok,
  parseClubPilates,
  parseCorePower,
  parseRockSalt,
} from "../../src/capture/parse-studios";
import { assessPriceChange, validateOffer } from "../../src/capture/validate";

const html = (path: string) => readFileSync(new URL(`../fixtures/${path}`, import.meta.url), "utf8");

const robots = `User-agent: *
Disallow: /content/discounted-first-month
Allow: /content/new-student-offers
`;

describe("parsers and capture rules", () => {
  it("parses RockSalt San Mateo memberships, intros, and packs", () => {
    const parsed = parseRockSalt(html("rocksalt/pricing.html"));
    expect(parsed.locationSelected).toBe(true);
    const byPrice = parsed.offers.map((offer) => offer.effectivePriceCents);
    expect(byPrice).toContain(35_800);
    expect(byPrice).toContain(2_000);
    expect(byPrice).toContain(9_900);
    expect(parsed.offers.some((offer) => offer.offerKind === "regular")).toBe(true);
    expect(parsed.offers.some((offer) => offer.offerKind === "intro")).toBe(true);
  });

  it("tags CorePower's first month as national and keeps the free week at $0", () => {
    const parsed = parseCorePower(html("corepower/pricing.html"));
    const freeWeek = parsed.offers.find((offer) => offer.offerType === "free_week");
    const firstMonth = parsed.offers.find((offer) => offer.offerType === "first_month_membership");
    expect(freeWeek?.effectivePriceCents).toBe(0);
    expect(validateOffer(freeWeek!, true).ok).toBe(true);
    expect(firstMonth?.priceScope).toBe("national");
    expect(firstMonth?.effectivePriceCents).toBe(10_900);
    expect(parsed.offers.some((offer) => offer.offerKind === "regular" && offer.effectivePriceCents === null)).toBe(
      true,
    );
  });

  it("QA-67 and QA-76: BODYROK prices come from the San Mateo selection, otherwise scraper_error", () => {
    const selected = parseBodyrok(html("bodyrok/san-mateo-pricing.html"));
    expect(selected.locationSelected).toBe(true);
    expect(selected.error).toBeNull();
    expect(selected.offers.map((offer) => offer.effectivePriceCents)).toEqual(
      expect.arrayContaining([2_000, 7_900, 9_900, 14_900]),
    );
    expect(selected.offers.some((offer) => offer.offerKind === "regular" && offer.effectivePriceCents === null)).toBe(
      true,
    );
    const other = parseBodyrok(html("bodyrok/other-location.html"));
    expect(other.locationSelected).toBe(false);
    expect(other.error).toBe("location_not_selected");
    expect(other.offers).toEqual([]);
    expect(validateOffer(
      {
        studioId: "bodyrok",
        locationId: "bodyrok_san_mateo",
        classType: "reformer_pilates",
        offerType: "class_pack",
        offerKind: "intro",
        priceScope: "location",
        effectivePriceCents: 1_000,
        listPriceCents: 1_000,
        autoRenewPriceCents: null,
        classesIncluded: 1,
        duration: "1",
        restrictions: "",
        expiry: null,
        promoCode: null,
        feesCents: 0,
        cancelTermsPublished: true,
        durationDays: 1,
      },
      false,
    )).toEqual({ ok: false, error: "scraper_error", reason: "location_not_selected" });
    expect(bodyrokCaptureAllowed("Welcome to our national page")).toBe(false);
    expect(bodyrokCaptureAllowed("San Mateo studio")).toBe(true);
  });

  it("records Club Pilates regular prices as not published and the free intro as $0", () => {
    const parsed = parseClubPilates(html("club-pilates/san-mateo.html"));
    const intro = parsed.offers.find((offer) => offer.offerKind === "intro");
    const regular = parsed.offers.find((offer) => offer.offerKind === "regular");
    expect(intro?.effectivePriceCents).toBe(0);
    expect(regular?.effectivePriceCents).toBeNull();
  });

  it("treats a non-free $0 or missing price as a scraper error and holds a >30% move for recheck", () => {
    const zero = validateOffer(
      {
        studioId: "rocksalt_pilates",
        locationId: "rocksalt_san_mateo",
        classType: "reformer_pilates",
        offerType: "class_pack",
        offerKind: "regular",
        priceScope: "location",
        effectivePriceCents: 0,
        listPriceCents: 0,
        autoRenewPriceCents: null,
        classesIncluded: 1,
        duration: "1",
        restrictions: "",
        expiry: null,
        promoCode: null,
        feesCents: 0,
        cancelTermsPublished: false,
        durationDays: 1,
      },
      true,
    );
    expect(zero).toMatchObject({ ok: false, reason: "zero_price" });
    const now = new Date("2026-11-14T00:00:00.000Z");
    const held = assessPriceChange(10_000, 5_000, now);
    expect(held.action).toBe("pending_recheck");
    if (held.action === "pending_recheck") {
      expect(held.dueAt.getTime() - now.getTime()).toBeLessThanOrEqual(6 * 60 * 60 * 1000);
    }
    expect(assessPriceChange(10_000, 9_000, now).action).toBe("record");
  });

  it("skips a path robots.txt disallows", () => {
    expect(
      isAllowedByRobots(robots, "https://www.corepoweryoga.com/content/discounted-first-month"),
    ).toBe(false);
    expect(
      isAllowedByRobots(robots, "https://www.corepoweryoga.com/content/new-student-offers"),
    ).toBe(true);
  });
});
