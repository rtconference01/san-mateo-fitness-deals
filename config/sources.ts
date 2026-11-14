import type { CheckoutPin } from "../src/domain/classify-source";

export type PageScope = "san_mateo" | "national_brand";
export type Confirmation = "confirmed" | "unconfirmed";
export type SocialPlatform = "instagram" | "facebook";

export interface WebPage {
  url: string;
  scope: PageScope;
  needsLocationCheck: boolean;
  confirmation: Confirmation;
  notes: string;
}

export interface PricingPage extends WebPage {
  /** `national` until a San Mateo price is confirmed on that studio's own checkout. */
  priceScope: "location" | "national";
}

export interface SocialPage extends WebPage {
  platform: SocialPlatform;
  studioId: string;
}

export interface StudioSources {
  id: "corepower_yoga" | "bodyrok" | "club_pilates" | "rocksalt_pilates";
  name: string;
  classTypes: Array<"yoga" | "reformer_pilates">;
  /** Booking hosts linked from the studio's own site. Other third parties stay unverified. */
  /** Pinned checkout pages. A host alone does not verify another studio's page. */
  checkoutDomains: CheckoutPin[];
  location: {
    id: string;
    name: string;
    address: string;
    city: "San Mateo";
    region: "CA";
  };
  pricingPage: PricingPage;
  instagram: SocialPage;
  facebook: SocialPage;
}

/**
 * Registry of official pages. Social URLs are the owner's source list.
 * A page is confirmed only when that URL was found on the studio's own site.
 * Checked 2026-11-14.
 */
export const studios: StudioSources[] = [
  {
    id: "corepower_yoga",
    name: "CorePower Yoga",
    classTypes: ["yoga"],
    checkoutDomains: [],
    location: {
      id: "corepower_san_mateo",
      name: "CorePower Yoga San Mateo",
      address: "333 South B Street, Suite 100, San Mateo, CA 94401",
      city: "San Mateo",
      region: "CA",
    },
    pricingPage: {
      url: "https://www.corepoweryoga.com/content/new-student-offers",
      scope: "national_brand",
      priceScope: "national",
      needsLocationCheck: true,
      confirmation: "confirmed",
      notes:
        "National new-student intro page (free week), linked from the San Mateo studio page https://www.corepoweryoga.com/yoga-studios/ca/peninsula/san-mateo. Memberships and class packs are on the national page https://www.corepoweryoga.com/content/buy. A national price needs a San Mateo location check before it counts.",
    },
    instagram: {
      platform: "instagram",
      studioId: "corepower_yoga",
      url: "https://www.instagram.com/corepoweryoga/",
      scope: "national_brand",
      needsLocationCheck: true,
      confirmation: "confirmed",
      notes:
        "National, needs location check. Linked from the CorePower homepage footer and from the San Mateo studio record (instagramLink). No separate San Mateo Instagram was published on the studio page.",
    },
    facebook: {
      platform: "facebook",
      studioId: "corepower_yoga",
      url: "https://www.facebook.com/CorePowerYogaSanMateo",
      scope: "san_mateo",
      needsLocationCheck: false,
      confirmation: "confirmed",
      notes:
        "San Mateo. Published in the San Mateo studio page structured data (sameAs). The studio record also publishes https://www.facebook.com/148335915582052 as its facebook link. The national footer page is https://www.facebook.com/CorePowerYoga. San Mateo pages take priority.",
    },
  },
  {
    id: "bodyrok",
    name: "BODYROK",
    classTypes: ["reformer_pilates"],
    checkoutDomains: [
      {
        host: "go.mindbodyonline.com",
        pathPrefix: "/book/widgets/pricing/view/2657850e16",
        widgetId: "2657850e16",
        siteId: "5737699",
        locationId: "loc_11kRPpDZW41G8TMyaP",
      },
    ],
    location: {
      id: "bodyrok_san_mateo",
      name: "BODYROK San Mateo",
      address: "2 East 3rd Avenue, San Mateo, CA 94401",
      city: "San Mateo",
      region: "CA",
    },
    pricingPage: {
      url: "https://bodyrok.com/studio/sanmateo/",
      scope: "san_mateo",
      priceScope: "location",
      needsLocationCheck: false,
      confirmation: "confirmed",
      notes:
        "San Mateo studio page. The title is memberships, classes, and packages. No separate public intro-offer URL was linked from the page. Package prices were not present in the static HTML.",
    },
    instagram: {
      platform: "instagram",
      studioId: "bodyrok",
      url: "https://www.instagram.com/bodyrokstudio/",
      scope: "national_brand",
      needsLocationCheck: true,
      confirmation: "confirmed",
      notes:
        "Brand-wide SF/NYC/Chicago, needs location check. Header social icon and footer link on https://bodyrok.com/studio/sanmateo/.",
    },
    facebook: {
      platform: "facebook",
      studioId: "bodyrok",
      url: "https://www.facebook.com/bodyrokstudios",
      scope: "national_brand",
      needsLocationCheck: true,
      confirmation: "confirmed",
      notes:
        "Was unconfirmed until checked against the studio site. Confirmed 2026-11-14: the header social icon on https://bodyrok.com/studio/sanmateo/ points at https://www.facebook.com/BODYROKSTUDIOS/, the same page. Brand page, not a San Mateo-only page, so posts need a San Mateo location check. Sitewide schema also mentions https://www.facebook.com/BodyROKSF/, which is not the San Mateo page.",
    },
  },
  {
    id: "club_pilates",
    name: "Club Pilates",
    classTypes: ["reformer_pilates"],
    checkoutDomains: [],
    location: {
      id: "club_pilates_san_mateo",
      name: "Club Pilates San Mateo",
      address: "15 North B Street, Suite F, San Mateo, CA 94401",
      city: "San Mateo",
      region: "CA",
    },
    pricingPage: {
      url: "https://www.clubpilates.com/location/sanmateo",
      scope: "san_mateo",
      priceScope: "location",
      needsLocationCheck: false,
      confirmation: "confirmed",
      notes:
        "San Mateo location page. It describes the free intro class and membership shapes. The page links the intro booking form https://lp.clubpilates.com/offers?offer_id=intro-class-promo&location=sanmateo. Dollar prices are set by the local studio and were not in the static HTML.",
    },
    instagram: {
      platform: "instagram",
      studioId: "club_pilates",
      url: "https://www.instagram.com/clubpilates_sanmateo/",
      scope: "san_mateo",
      needsLocationCheck: false,
      confirmation: "confirmed",
      notes:
        "San Mateo. Owner source list. The location page HTML linked the national account https://www.instagram.com/clubpilates rather than this handle; San Mateo pages take priority, so this is the page the daily check uses.",
    },
    facebook: {
      platform: "facebook",
      studioId: "club_pilates",
      url: "https://www.facebook.com/clubpilatessanmateo/",
      scope: "san_mateo",
      needsLocationCheck: false,
      confirmation: "confirmed",
      notes:
        "San Mateo. Owner source list. The location page social link published https://www.facebook.com/106413409089884, and the national footer links https://www.facebook.com/clubpilates/. San Mateo pages take priority, so the daily check uses this page.",
    },
  },
  {
    id: "rocksalt_pilates",
    name: "RockSalt Pilates",
    classTypes: ["reformer_pilates"],
    checkoutDomains: [
      {
        host: "clients.mindbodyonline.com",
        pathPrefix: "/classic/ws",
        locationId: "34355",
      },
    ],
    location: {
      id: "rocksalt_san_mateo",
      name: "RockSalt Pilates San Mateo",
      address: "306 E. 5th Ave, San Mateo, CA 94401",
      city: "San Mateo",
      region: "CA",
    },
    pricingPage: {
      url: "https://rocksaltpilates.com/locations/usa/ca/san-mateo/pricing/",
      scope: "san_mateo",
      priceScope: "location",
      needsLocationCheck: false,
      confirmation: "confirmed",
      notes:
        "San Mateo pricing page, linked from https://rocksaltpilates.com/locations/usa/ca/san-mateo/. Page title: View Pricing in San Mateo, CA.",
    },
    instagram: {
      platform: "instagram",
      studioId: "rocksalt_pilates",
      url: "https://www.instagram.com/rocksaltpilates/",
      scope: "national_brand",
      needsLocationCheck: true,
      confirmation: "confirmed",
      notes:
        "Brand: San Mateo + Redwood City, needs location check. The homepage and the San Mateo location page link http://instagram.com/rocksaltpilates.",
    },
    facebook: {
      platform: "facebook",
      studioId: "rocksalt_pilates",
      url: "https://www.facebook.com/rocksaltpilates",
      scope: "national_brand",
      needsLocationCheck: true,
      confirmation: "confirmed",
      notes:
        "Was unconfirmed until checked against the studio site. Confirmed 2026-11-14: https://rocksaltpilates.com/ and the San Mateo location page both link https://www.facebook.com/RockSaltPilates, the same page. Brand page shared across locations, so posts need a San Mateo location check.",
    },
  },
];

export function officialSocialPages(list: StudioSources[] = studios): SocialPage[] {
  return list.flatMap((studio) => [studio.instagram, studio.facebook]);
}
