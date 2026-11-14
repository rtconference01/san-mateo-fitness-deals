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

  it("QA-95: a third-party pricing or checkout page is unverified unless it is an allowlisted checkout", () => {
    expect(
      classifySource({
        pageKind: "pricing_page",
        onStudioDomain: false,
        pageDomain: "go.mindbodyonline.com",
        postDate: null,
      }).verification,
    ).toBe("unverified");
    expect(
      classifySource({
        pageKind: "checkout",
        onStudioDomain: false,
        pageDomain: "go.mindbodyonline.com",
        checkoutDomains: [],
        postDate: null,
      }).verification,
    ).toBe("unverified");
    expect(
      classifySource({
        pageKind: "checkout",
        onStudioDomain: false,
        pageDomain: "go.mindbodyonline.com",
        checkoutDomains: ["go.mindbodyonline.com", "widgets.mindbodyonline.com"],
        postDate: null,
      }).verification,
    ).toBe("verified");
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
