import type { CandidateOffer } from "./adapter";

export const BODYROK_SAN_MATEO_LOCATION_ID = "loc_11kRPpDZW41G8TMyaP";

export interface ParsedStudio {
  offers: CandidateOffer[];
  locationSelected: boolean;
  /** Set when the page cannot be turned into prices. Not used for an honest not_published row. */
  error: "location_not_selected" | "missing_price" | null;
}

function base(
  partial: Pick<CandidateOffer, "studioId" | "locationId" | "classType" | "offerType" | "offerKind" | "priceScope"> &
    Partial<CandidateOffer>,
): CandidateOffer {
  return {
    listPriceCents: null,
    effectivePriceCents: null,
    autoRenewPriceCents: null,
    classesIncluded: null,
    duration: null,
    restrictions: "",
    expiry: null,
    promoCode: null,
    feesCents: 0,
    cancelTermsPublished: false,
    durationDays: null,
    ...partial,
  };
}

function dollarsToCents(value: string): number {
  const [whole, frac = ""] = value.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
}

export function parseRockSalt(html: string): ParsedStudio {
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ");
  const locationSelected = /san mateo/i.test(text);
  if (!locationSelected) {
    return { offers: [], locationSelected: false, error: "location_not_selected" };
  }
  const offers: CandidateOffer[] = [];
  const add = (offer: CandidateOffer) => offers.push(offer);
  const membership = text.match(/RockStar Ultimate Monthly Membership \$(\d+)/);
  if (membership) {
    const cents = dollarsToCents(membership[1]);
    add(
      base({
        studioId: "rocksalt_pilates",
        locationId: "rocksalt_san_mateo",
        classType: "reformer_pilates",
        offerType: "first_month_membership",
        offerKind: "regular",
        priceScope: "location",
        effectivePriceCents: cents,
        listPriceCents: cents,
        autoRenewPriceCents: cents,
        classesIncluded: "unlimited",
        duration: "1 month",
        durationDays: 30,
        restrictions: "one class per day",
      }),
    );
  }
  for (const match of text.matchAll(/(\d+)X Monthly Membership \$(\d+)/g)) {
    const classes = Number(match[1]);
    const cents = dollarsToCents(match[2]);
    add(
      base({
        studioId: "rocksalt_pilates",
        locationId: "rocksalt_san_mateo",
        classType: "reformer_pilates",
        offerType: "first_month_membership",
        offerKind: "regular",
        priceScope: "location",
        effectivePriceCents: cents,
        listPriceCents: cents,
        autoRenewPriceCents: cents,
        classesIncluded: classes,
        duration: "1 month",
        durationDays: 30,
        restrictions: `${classes} classes per month`,
      }),
    );
  }
  const firstClass = text.match(/First Class \$(\d+)/);
  if (firstClass) {
    const cents = dollarsToCents(firstClass[1]);
    add(
      base({
        studioId: "rocksalt_pilates",
        locationId: "rocksalt_san_mateo",
        classType: "reformer_pilates",
        offerType: "class_pack",
        offerKind: "intro",
        priceScope: "location",
        effectivePriceCents: cents,
        listPriceCents: cents,
        classesIncluded: 1,
        duration: "1 class",
        durationDays: null,
        restrictions: "first class",
      }),
    );
  }
  const firstPack = text.match(/First 5-Pack \$(\d+)/);
  if (firstPack) {
    const cents = dollarsToCents(firstPack[1]);
    add(
      base({
        studioId: "rocksalt_pilates",
        locationId: "rocksalt_san_mateo",
        classType: "reformer_pilates",
        offerType: "class_pack",
        offerKind: "intro",
        priceScope: "location",
        effectivePriceCents: cents,
        listPriceCents: cents,
        classesIncluded: 5,
        duration: "5 classes",
        restrictions: "new clients",
      }),
    );
  }
  const single = text.match(/Single \$(\d+)/);
  if (single) {
    const cents = dollarsToCents(single[1]);
    add(
      base({
        studioId: "rocksalt_pilates",
        locationId: "rocksalt_san_mateo",
        classType: "reformer_pilates",
        offerType: "class_pack",
        offerKind: "regular",
        priceScope: "location",
        effectivePriceCents: cents,
        listPriceCents: cents,
        classesIncluded: 1,
        duration: "1 class",
        restrictions: "drop-in",
      }),
    );
  }
  for (const match of text.matchAll(/(\d+)-Pack \$(\d+)/g)) {
    const classes = Number(match[1]);
    const cents = dollarsToCents(match[2]);
    add(
      base({
        studioId: "rocksalt_pilates",
        locationId: "rocksalt_san_mateo",
        classType: "reformer_pilates",
        offerType: "class_pack",
        offerKind: "regular",
        priceScope: "location",
        effectivePriceCents: cents,
        listPriceCents: cents,
        classesIncluded: classes,
        duration: `${classes} classes`,
        restrictions: "",
      }),
    );
  }
  return { offers, locationSelected: true, error: offers.length ? null : "missing_price" };
}

export function parseCorePower(html: string): ParsedStudio {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const offers: CandidateOffer[] = [];
  if (/free week/i.test(text)) {
    offers.push(
      base({
        studioId: "corepower_yoga",
        locationId: "corepower_san_mateo",
        classType: "yoga",
        offerType: "free_week",
        offerKind: "intro",
        priceScope: "national",
        effectivePriceCents: 0,
        listPriceCents: 0,
        classesIncluded: "unlimited",
        duration: "7 days",
        durationDays: 7,
        restrictions: "new students; national page; San Mateo price not separately confirmed",
        cancelTermsPublished: true,
        isFreeOffer: true,
        freeOfferWording: "free week of unlimited classes",
      }),
    );
  }
  const firstMonth = text.match(/First Month starting at \$(\d+)/i);
  if (firstMonth) {
    const cents = dollarsToCents(firstMonth[1]);
    offers.push(
      base({
        studioId: "corepower_yoga",
        locationId: "corepower_san_mateo",
        classType: "yoga",
        offerType: "first_month_membership",
        offerKind: "intro",
        priceScope: "national",
        effectivePriceCents: cents,
        listPriceCents: cents,
        classesIncluded: "unlimited",
        duration: "1 month",
        durationDays: 30,
        restrictions: "starting at; national; San Mateo checkout price not confirmed",
        cancelTermsPublished: false,
      }),
    );
  }
  if (!/studio class pack prices/i.test(text)) {
    offers.push(
      base({
        studioId: "corepower_yoga",
        locationId: "corepower_san_mateo",
        classType: "yoga",
        offerType: "class_pack",
        offerKind: "regular",
        priceScope: "national",
        effectivePriceCents: null,
        restrictions: "not published until a studio is selected",
      }),
    );
  }
  return { offers, locationSelected: true, error: null };
}

export function parseBodyrok(html: string): ParsedStudio {
  const normalized = html.replace(/\\"/g, '"');
  const selectedHere = normalized.includes(
    `encodedLocationId":"${BODYROK_SAN_MATEO_LOCATION_ID}"`,
  );
  const mentionsSanMateo = /San Mateo/i.test(normalized);
  if (!selectedHere) {
    return { offers: [], locationSelected: false, error: "location_not_selected" };
  }
  if (!mentionsSanMateo) {
    return { offers: [], locationSelected: false, error: "location_not_selected" };
  }
  const offers: CandidateOffer[] = [];
  const pattern =
    /"type":"introOffer","data":\{"id":"[^"]+","title":"([^"]+)","price":"\$\$(\d+(?:\.\d{2})?)","subtitle":"([^"]*)"[^}]*"sessions":(-?\d+)/g;
  for (const match of normalized.matchAll(pattern)) {
    const title = match[1];
    const cents = dollarsToCents(match[2]);
    const subtitle = match[3];
    const sessions = Number(match[4]);
    const unlimited = sessions < 0 || /unlimited/i.test(title);
    const days = /14 days/i.test(subtitle) ? 14 : /30 days|1 month/i.test(subtitle) ? 30 : null;
    offers.push(
      base({
        studioId: "bodyrok",
        locationId: "bodyrok_san_mateo",
        classType: "reformer_pilates",
        offerType: unlimited ? "intro_month" : "class_pack",
        offerKind: "intro",
        priceScope: "location",
        effectivePriceCents: cents,
        listPriceCents: cents,
        classesIncluded: unlimited ? "unlimited" : sessions,
        duration: subtitle,
        durationDays: days,
        restrictions: title,
        cancelTermsPublished: false,
      }),
    );
  }
  if (!offers.length) {
    return { offers: [], locationSelected: true, error: "missing_price" };
  }
  offers.push(
    base({
      studioId: "bodyrok",
      locationId: "bodyrok_san_mateo",
      classType: "reformer_pilates",
      offerType: "first_month_membership",
      offerKind: "regular",
      priceScope: "location",
      effectivePriceCents: null,
      restrictions: "regular membership price not in the public pricing payload",
    }),
  );
  return { offers, locationSelected: true, error: null };
}

export function parseClubPilates(html: string): ParsedStudio {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const locationSelected = /san mateo/i.test(text);
  if (!locationSelected) {
    return { offers: [], locationSelected: false, error: "location_not_selected" };
  }
  const offers: CandidateOffer[] = [];
  if (/free intro|intro class is free|first intro class/i.test(text)) {
    offers.push(
      base({
        studioId: "club_pilates",
        locationId: "club_pilates_san_mateo",
        classType: "reformer_pilates",
        offerType: "free_week",
        offerKind: "intro",
        priceScope: "location",
        effectivePriceCents: 0,
        listPriceCents: 0,
        classesIncluded: 1,
        duration: "intro class",
        durationDays: 1,
        restrictions: "free intro class",
        cancelTermsPublished: true,
        isFreeOffer: true,
        freeOfferWording: "Free Intro Class",
      }),
    );
  }
  const hasMembershipPrice = /\$\s?\d/.test(text) && /membership/i.test(text);
  if (!hasMembershipPrice) {
    offers.push(
      base({
        studioId: "club_pilates",
        locationId: "club_pilates_san_mateo",
        classType: "reformer_pilates",
        offerType: "first_month_membership",
        offerKind: "regular",
        priceScope: "location",
        effectivePriceCents: null,
        restrictions: "not published on the public location page",
      }),
    );
  }
  return { offers, locationSelected: true, error: null };
}

/** Prices are read only after the San Mateo widget id is the selected location. */
export function bodyrokCaptureAllowed(studioPageHtml: string): boolean {
  return /San Mateo/i.test(studioPageHtml);
}
