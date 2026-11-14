export type PageKind = "pricing_page" | "checkout" | "blog_post" | "news_post" | "archived_page";

export interface ClassifiedPage {
  /** Never `verified` for a blog, news, or archived page. */
  verification: "verified" | "archived";
  /** Set for archived pages. Pricing and checkout pages do not use it. */
  postDate: string | null;
}

/**
 * A price from a blog post, news post, or archived page is archived, even when
 * the page is on the studio's own domain. It is never a verified current price.
 */
export function classifySource(input: {
  pageKind: PageKind;
  onStudioDomain: boolean;
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

  return {
    verification: "verified",
    postDate: null,
  };
}
