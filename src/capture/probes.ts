import { isAllowedByRobots, USER_AGENT } from "./robots";
import { captureWithPlaywright } from "./playwright-fetch";
import { parseBodyrok, parseClubPilates, parseCorePower, parseRockSalt, bodyrokCaptureAllowed } from "./parse-studios";
import type { StudioProbe } from "./live-check";
import { studios } from "../../config/sources";

const parsers = {
  corepower_yoga: parseCorePower,
  bodyrok: parseBodyrok,
  club_pilates: parseClubPilates,
  rocksalt_pilates: parseRockSalt,
} as const;

async function readRobots(origin: string): Promise<string> {
  const response = await fetch(`${origin}/robots.txt`, { headers: { "user-agent": USER_AGENT } });
  if (!response.ok) return "";
  return response.text();
}

export function liveProbes(): StudioProbe[] {
  return studios.map((studio) => ({
    id: studio.id,
    capture: async () => {
      const url = new URL(studio.pricingPage.url);
      const robots = await readRobots(url.origin);
      if (!isAllowedByRobots(robots, url.toString())) {
        throw new Error("blocked_by_robots");
      }
      if (studio.id === "bodyrok") {
        const studioPage = await captureWithPlaywright("https://bodyrok.com/studio/sanmateo/");
        if (!bodyrokCaptureAllowed(studioPage.html)) {
          return { html: studioPage.html, sourceUrl: studioPage.finalUrl, locationSelected: false };
        }
        const widget = await captureWithPlaywright(
          "https://go.mindbodyonline.com/book/widgets/pricing/view/2657850e16/pricing",
        );
        return { html: widget.html, sourceUrl: widget.finalUrl, locationSelected: true };
      }
      const page = await captureWithPlaywright(url.toString());
      return { html: page.html, sourceUrl: page.finalUrl, locationSelected: true };
    },
    parse: (html: string) => parsers[studio.id](html),
  }));
}
