import { describe, expect, it } from "vitest";
import { classifySource } from "../../src/domain/classify-source";

describe("classifySource", () => {
  it("archives a blog, news, or archived page even on the studio domain, and keeps the post date", () => {
    for (const pageKind of ["blog_post", "news_post", "archived_page"] as const) {
      const onDomain = classifySource({
        pageKind,
        onStudioDomain: true,
        postDate: "2026-03-01",
      });
      const offDomain = classifySource({
        pageKind,
        onStudioDomain: false,
        postDate: "2026-03-01",
      });
      expect(onDomain).toEqual({ verification: "archived", postDate: "2026-03-01" });
      expect(offDomain.verification).toBe("archived");
      expect(onDomain.verification).not.toBe("verified");
    }
  });

  it("verifies only the pinned San Mateo checkout, not another location, another studio, or a marketplace listing", () => {
    const pin = {
      host: "go.mindbodyonline.com",
      pathPrefix: "/book/widgets/pricing/view/2657850e16",
      widgetId: "2657850e16",
      siteId: "5737699",
      locationId: "loc_11kRPpDZW41G8TMyaP",
    };
    const url = "https://go.mindbodyonline.com/book/widgets/pricing/view/2657850e16/pricing";
    expect(
      classifySource({
        pageKind: "checkout",
        onStudioDomain: false,
        pageUrl: url,
        widgetId: "2657850e16",
        siteId: "5737699",
        locationId: "loc_11kRPpDZW41G8TMyaP",
        checkoutPins: [pin],
        postDate: null,
      }).verification,
    ).toBe("verified");
    expect(
      classifySource({
        pageKind: "checkout",
        onStudioDomain: false,
        pageUrl: url,
        widgetId: "2657850e16",
        siteId: "5737699",
        locationId: "loc_other_bodyrok",
        checkoutPins: [pin],
        postDate: null,
      }).verification,
    ).toBe("unverified");
    expect(
      classifySource({
        pageKind: "checkout",
        onStudioDomain: false,
        pageUrl: "https://clients.mindbodyonline.com/classic/ws?studioid=99999",
        locationId: "99999",
        checkoutPins: [pin],
        postDate: null,
      }).verification,
    ).toBe("unverified");
    expect(
      classifySource({
        pageKind: "checkout",
        onStudioDomain: false,
        pageUrl: "https://www.mindbodyonline.com/explore/locations/bodyrok-peninsula",
        widgetId: "2657850e16",
        siteId: "5737699",
        locationId: "loc_11kRPpDZW41G8TMyaP",
        checkoutPins: [pin],
        postDate: null,
      }).verification,
    ).toBe("unverified");
  });

  it("treats a pricing page and a checkout page on the studio domain as verified", () => {
    expect(
      classifySource({
        pageKind: "pricing_page",
        onStudioDomain: true,
        postDate: "2026-03-01",
      }),
    ).toEqual({ verification: "verified", postDate: null });
    expect(
      classifySource({
        pageKind: "checkout",
        onStudioDomain: true,
        postDate: null,
      }).verification,
    ).toBe("verified");
  });
});
