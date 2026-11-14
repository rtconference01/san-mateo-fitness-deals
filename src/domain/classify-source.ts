export type PageKind = "pricing_page" | "checkout" | "blog_post" | "news_post" | "archived_page";

export type SourceVerification = "verified" | "unverified" | "archived";

export interface CheckoutPin {
  host: string;
  pathPrefix?: string;
  siteId?: string;
  widgetId?: string;
  locationId?: string;
}

export interface ClassifiedPage {
  /** Blog, news, and archived pages are never verified. */
  verification: SourceVerification;
  /** Set for archived pages. Pricing and checkout pages do not use it. */
  postDate: string | null;
}

function hostOf(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "");
}

/**
 * Every field set on the pin must match. A bare host, a different location,
 * or a different widget does not verify.
 */
export function checkoutPinMatches(
  observed: {
    url: string;
    siteId?: string;
    widgetId?: string;
    locationId?: string;
  },
  pins: CheckoutPin[],
): boolean {
  let parsed: URL;
  try {
    parsed = new URL(observed.url);
  } catch {
    return false;
  }
  const host = hostOf(parsed.hostname);
  const pathAndQuery = `${parsed.pathname}${parsed.search}`;
  return pins.some((pin) => {
    if (hostOf(pin.host) !== host) return false;
    if (pin.pathPrefix && !pathAndQuery.startsWith(pin.pathPrefix)) return false;
    if (pin.widgetId && (!pathAndQuery.includes(pin.widgetId) || observed.widgetId !== pin.widgetId)) {
      return false;
    }
    if (pin.siteId && observed.siteId !== pin.siteId) return false;
    if (pin.locationId && observed.locationId !== pin.locationId) return false;
    const studioParam = parsed.searchParams.get("studioid");
    if (studioParam && pin.locationId && studioParam !== pin.locationId) return false;
    return true;
  });
}

/**
 * Verified only on the studio's own domain, or on an exact checkout pin.
 * A blog, news, or archived page stays archived even on the studio's domain.
 */
export function classifySource(input: {
  pageKind: PageKind;
  onStudioDomain: boolean;
  pageUrl?: string;
  siteId?: string;
  widgetId?: string;
  locationId?: string;
  checkoutPins?: CheckoutPin[];
  postDate: string | null;
}): ClassifiedPage {
  if (
    input.pageKind === "blog_post" ||
    input.pageKind === "news_post" ||
    input.pageKind === "archived_page"
  ) {
    return { verification: "archived", postDate: input.postDate };
  }

  const pinned =
    input.pageUrl !== undefined &&
    checkoutPinMatches(
      {
        url: input.pageUrl,
        siteId: input.siteId,
        widgetId: input.widgetId,
        locationId: input.locationId,
      },
      input.checkoutPins ?? [],
    );
  if (!input.onStudioDomain && !pinned) {
    return { verification: "unverified", postDate: null };
  }
  return { verification: "verified", postDate: null };
}
