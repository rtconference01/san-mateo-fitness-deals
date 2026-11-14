import type { CandidateOffer } from "./adapter";
import { validateOffer } from "./validate";

export const DEFAULT_LIVE_CACHE_TTL_MS = 60 * 60 * 1000;
export const DEFAULT_STUDIO_TIMEOUT_MS = 20_000;

export interface SavedObservation {
  capturedAt: string;
  sourceUrl: string;
  offers: CandidateOffer[];
}

export interface StudioCheckResult {
  studioId: string;
  live: boolean;
  capturedAt: string | null;
  sourceUrl: string | null;
  offers: CandidateOffer[];
  unavailable: boolean;
  error: string | null;
  fromSaved: boolean;
  changeOver30Percent: boolean;
  label: string | null;
}

export interface LiveCheckReport {
  liveCheckFailed: boolean;
  studios: StudioCheckResult[];
}

export interface StudioProbe {
  id: string;
  capture: () => Promise<{ html: string; sourceUrl: string; locationSelected: boolean }>;
  parse: (html: string) => {
    offers: CandidateOffer[];
    locationSelected: boolean;
    error: string | null;
  };
}

interface CacheEntry {
  at: number;
  result: StudioCheckResult;
}

function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

function usableOffers(offers: CandidateOffer[], locationSelected: boolean): CandidateOffer[] {
  return offers.filter((offer) => {
    if (offer.effectivePriceCents === null) return false;
    return validateOffer(offer, locationSelected).ok;
  });
}

function overThirty(previous: number | null, next: number): boolean {
  if (previous === null || previous === 0) return false;
  return Math.abs(next - previous) / previous > 0.3;
}

export async function runLiveCheck(input: {
  studios: StudioProbe[];
  saved: Map<string, SavedObservation>;
  cache: Map<string, CacheEntry>;
  now: number;
  ttlMs?: number;
  timeoutMs?: number;
  onlyStudioId?: string;
}): Promise<LiveCheckReport> {
  const ttlMs = input.ttlMs ?? DEFAULT_LIVE_CACHE_TTL_MS;
  const timeoutMs = input.timeoutMs ?? DEFAULT_STUDIO_TIMEOUT_MS;
  const targets = input.onlyStudioId
    ? input.studios.filter((studio) => studio.id === input.onlyStudioId)
    : input.studios;
  const studios: StudioCheckResult[] = [];
  for (const studio of targets) {
    const cached = input.cache.get(studio.id);
    if (cached && input.now - cached.at < ttlMs) {
      studios.push(cached.result);
      continue;
    }
    const saved = input.saved.get(studio.id) ?? null;
    let result: StudioCheckResult;
    try {
      const captured = await withTimeout(studio.capture(), timeoutMs);
      const parsed = studio.parse(captured.html);
      if (parsed.error === "location_not_selected" || !parsed.locationSelected) {
        result = {
          studioId: studio.id,
          live: false,
          capturedAt: null,
          sourceUrl: captured.sourceUrl,
          offers: [],
          unavailable: !saved,
          error: "location_not_selected",
          fromSaved: Boolean(saved),
          changeOver30Percent: false,
          label: saved ? `saved data, captured ${saved.capturedAt}` : "San Mateo location was not selected",
        };
        if (saved) {
          result.offers = saved.offers;
          result.capturedAt = saved.capturedAt;
          result.unavailable = false;
        }
      } else {
        const offers = usableOffers(parsed.offers, parsed.locationSelected);
        if (!offers.length) {
          throw new Error(parsed.error ?? "missing_price");
        }
        const previous = saved?.offers.find((offer) => offer.effectivePriceCents !== null);
        const current = offers[0];
        const changed = overThirty(
          previous?.effectivePriceCents ?? null,
          current.effectivePriceCents ?? 0,
        );
        result = {
          studioId: studio.id,
          live: true,
          capturedAt: new Date(input.now).toISOString(),
          sourceUrl: captured.sourceUrl,
          offers,
          unavailable: false,
          error: null,
          fromSaved: false,
          changeOver30Percent: changed,
          label: changed ? "live price changed more than 30 percent; recheck before it is history" : null,
        };
      }
    } catch {
      if (saved) {
        result = {
          studioId: studio.id,
          live: false,
          capturedAt: saved.capturedAt,
          sourceUrl: saved.sourceUrl,
          offers: saved.offers,
          unavailable: false,
          error: "live_check_failed",
          fromSaved: true,
          changeOver30Percent: false,
          label: `saved data, captured ${saved.capturedAt}`,
        };
      } else {
        result = {
          studioId: studio.id,
          live: false,
          capturedAt: null,
          sourceUrl: null,
          offers: [],
          unavailable: true,
          error: "unavailable",
          fromSaved: false,
          changeOver30Percent: false,
          label: "price unavailable",
        };
      }
    }
    if (result.live) {
      input.cache.set(studio.id, { at: input.now, result });
    }
    studios.push(result);
  }
  return {
    liveCheckFailed: studios.length > 0 && studios.every((studio) => !studio.live),
    studios,
  };
}
