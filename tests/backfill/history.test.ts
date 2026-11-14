import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  coverageGaps,
  parseHistoryCsv,
  priceHeldSince,
  sanMateoBaseline,
} from "../../src/backfill/history";
import { classifySource } from "../../src/domain/classify-source";
import { annualCost } from "../../src/domain/money";
import { validateOffer } from "../../src/capture/validate";
import { studios } from "../../config/sources";

const csv = readFileSync(new URL("../fixtures/price-history/history.csv", import.meta.url), "utf8");
const OFFER = "Discounted First Month All Access Membership (starting at)";

describe("history csv", () => {
  it("QA-99: blank not_published prices are kept and a non-numeric price is an error", () => {
    const parsed = parseHistoryCsv(csv);
    expect(parsed.errors).toEqual([]);
    const unpublished = parsed.rows.filter((row) => row.priceStatus === "not_published");
    expect(unpublished.map((row) => row.snapshotDate)).toEqual(
      expect.arrayContaining(["2026-03-15", "2026-04-26", "2026-06-15"]),
    );
    expect(unpublished.every((row) => row.priceCents === null)).toBe(true);
    const bad = parseHistoryCsv(
      `${csv.trim()}\nCorePower Yoga,Broken,not published,captured,false,,1,2026-01-01,archived,national,false,,notes\n`,
    );
    expect(bad.errors.some((error) => error.reason === "non_numeric_price")).toBe(true);
  });

  it("QA-100: July 10 keeps both prices, and the first coverage gap ends March 15", () => {
    const { rows } = parseHistoryCsv(csv);
    const july = rows.filter((row) => row.snapshotDate === "2026-07-10" && row.offer === OFFER);
    expect(july.map((row) => row.priceCents).sort((left, right) => (left ?? 0) - (right ?? 0))).toEqual([
      9_900,
      10_900,
    ]);
    expect(july.every((row) => row.conflict)).toBe(true);
    const gaps = coverageGaps(rows, "CorePower Yoga");
    expect(gaps[0]).toEqual({ from: "2025-12-11", to: "2026-03-15" });
    expect(priceHeldSince(rows, OFFER, 9_900)).toBe("2026-08-18");
    expect(priceHeldSince(rows, OFFER, 10_900)).toBe("2026-11-13");
  });

  it("QA-101: national prices do not set the San Mateo low, and only an explicit free offer may be $0", () => {
    const { rows } = parseHistoryCsv(csv);
    const baseline = sanMateoBaseline(rows);
    expect(baseline.lowestCents).not.toBe(9_900);
    expect(rows.some((row) => row.scope === "national" && row.priceCents === 9_900)).toBe(true);
    const zero = validateOffer(
      {
        studioId: "corepower_yoga",
        locationId: "corepower_san_mateo",
        classType: "yoga",
        offerType: "class_pack",
        offerKind: "intro",
        priceScope: "national",
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
        isFreeOffer: false,
      },
      true,
    );
    expect(zero).toMatchObject({ ok: false, reason: "zero_price" });
    const renewed = annualCost({
      effectivePriceCents: 0,
      autoRenewPriceCents: 10_900,
      feeCents: 0,
      introLengthDays: 7,
    });
    expect(renewed.ok).toBe(true);
    if (renewed.ok) expect(renewed.annualCents).toBeGreaterThan(0);
  });

  it("only the pinned San Mateo pricing widget is a verified BODYROK checkout", () => {
    const bodyrok = studios.find((studio) => studio.id === "bodyrok");
    expect(bodyrok?.checkoutDomains).toEqual([
      {
        host: "go.mindbodyonline.com",
        widgetId: "2657850e16",
        siteId: "5737699",
        locationId: "loc_11kRPpDZW41G8TMyaP",
      },
    ]);
    expect(
      classifySource({
        pageKind: "checkout",
        onStudioDomain: false,
        pageUrl: "https://www.mindbodyonline.com/explore/locations/bodyrok-peninsula",
        widgetId: "2657850e16",
        siteId: "5737699",
        locationId: "loc_11kRPpDZW41G8TMyaP",
        checkoutPins: bodyrok?.checkoutDomains,
        postDate: null,
      }).verification,
    ).toBe("unverified");
  });
});
