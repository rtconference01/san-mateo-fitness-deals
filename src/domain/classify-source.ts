export type PageKind = "pricing_page" | "checkout" | "blog_post" | "news_post" | "archived_page";

export type SourceVerification = "verified" | "unverified" | "archived";

export interface ClassifiedPage {
  /** Blog, news, and archived pages are never verified. */
  verification: SourceVerification;
  /** Set for archived pages. Pricing and checkout pages do not use it. */
  postDate: string | null;
}

function hostOf(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "");
}

function onCheckoutAllowlist(pageDomain: string | undefined, checkoutDomains: string[]): boolean {
  if (!pageDomain) return false;
  const host = hostOf(pageDomain);
  return checkoutDomains.some((allowed) => hostOf(allowed) === host);
}

/**
 * Verified only on the studio's own domain, or on a checkout domain that
 * config lists for that studio. A blog, news, or archived page stays archived
 * even on the studio's own domain.
 */
export function classifySource(input: {
  pageKind: PageKind;
  onStudioDomain: boolean;
  pageDomain?: string;
  checkoutDomains?: string[];
  postDate: string | null;
}): ClassifiedPage {
  if (
    input.pageKind === "blog_post" ||
    input.pageKind === "news_post" ||
    input.pageKind === "archived_page"
  ) {
    return {
      verification: "archived",
      postDate: input.postDate,
    };
  }

  const allowed =
    input.onStudioDomain ||
    onCheckoutAllowlist(input.pageDomain, input.checkoutDomains ?? []);
  if (!allowed) {
    return { verification: "unverified", postDate: null };
  }
  return { verification: "verified", postDate: null };
}
