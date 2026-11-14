export type PriceStatus = "captured" | "not_published" | "not_captured";
export type HistoryScope = "national" | "san_mateo";

export interface HistoryRecord {
  studio: string;
  offer: string;
  priceCents: number | null;
  classes: string;
  snapshotDate: string;
  waybackUrl: string;
  notes: string;
  sourceStatus: string;
  scope: HistoryScope;
  priceStatus: PriceStatus;
  isFreeOffer: boolean;
  freeEvidence: string;
  conflict: boolean;
}

export interface HistoryParseError {
  line: number;
  reason: "non_numeric_price" | "zero_not_free" | "missing_column" | "bad_free_flag" | "bad_price_status";
  rawPrice: string;
}

const REQUIRED = [
  "studio",
  "offer",
  "price",
  "price_status",
  "is_free_offer",
  "free_evidence",
  "classes",
  "snapshot_date",
  "source_status",
  "scope",
  "conflict_flag",
  "wayback_url",
  "notes",
] as const;

function splitCsv(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current);
  return cells;
}

function parsePrice(
  raw: string,
  isFree: boolean,
  priceStatus: string,
): { cents: number | null } | { error: HistoryParseError["reason"] } {
  const price = raw.trim();
  if (price === "") {
    if (priceStatus === "not_published" || priceStatus === "not_captured") return { cents: null };
    return { error: "non_numeric_price" };
  }
  if (!/^\d+(?:\.\d{1,2})?$/.test(price)) return { error: "non_numeric_price" };
  const [whole, frac = ""] = price.split(".");
  const cents = Number(whole) * 100 + Number(frac.padEnd(2, "0").slice(0, 2));
  if (cents === 0 && !isFree) return { error: "zero_not_free" };
  if (cents === 0 && isFree) return { cents: 0 };
  if (priceStatus !== "captured") return { error: "bad_price_status" };
  return { cents };
}

export function parseHistoryCsv(text: string): { rows: HistoryRecord[]; errors: HistoryParseError[] } {
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim() !== "");
  const header = splitCsv(lines[0] ?? "");
  const missing = REQUIRED.filter((column) => !header.includes(column));
  if (missing.length) {
    return {
      rows: [],
      errors: missing.map((column) => ({ line: 1, reason: "missing_column", rawPrice: column })),
    };
  }
  const index = Object.fromEntries(header.map((name, position) => [name, position]));
  const rows: HistoryRecord[] = [];
  const errors: HistoryParseError[] = [];
  for (let lineNumber = 1; lineNumber < lines.length; lineNumber += 1) {
    const cells = splitCsv(lines[lineNumber]);
    const cell = (name: string) => (cells[index[name]] ?? "").trim();
    const freeFlag = cell("is_free_offer").toLowerCase();
    if (freeFlag !== "true" && freeFlag !== "false") {
      errors.push({ line: lineNumber + 1, reason: "bad_free_flag", rawPrice: cell("price") });
      continue;
    }
    const isFreeOffer = freeFlag === "true";
    const priceStatusRaw = cell("price_status");
    if (priceStatusRaw !== "captured" && priceStatusRaw !== "not_published" && priceStatusRaw !== "not_captured") {
      errors.push({ line: lineNumber + 1, reason: "bad_price_status", rawPrice: cell("price") });
      continue;
    }
    const parsed = parsePrice(cell("price"), isFreeOffer, priceStatusRaw);
    if ("error" in parsed) {
      errors.push({ line: lineNumber + 1, reason: parsed.error, rawPrice: cell("price") });
      continue;
    }
    if (isFreeOffer && !cell("free_evidence")) {
      errors.push({ line: lineNumber + 1, reason: "zero_not_free", rawPrice: cell("price") });
      continue;
    }
    const scope = cell("scope") === "national" ? "national" : "san_mateo";
    rows.push({
      studio: cell("studio"),
      offer: cell("offer"),
      priceCents: parsed.cents,
      classes: cell("classes"),
      snapshotDate: cell("snapshot_date"),
      waybackUrl: cell("wayback_url"),
      notes: cell("notes"),
      sourceStatus: cell("source_status"),
      scope,
      priceStatus: priceStatusRaw,
      isFreeOffer,
      freeEvidence: cell("free_evidence"),
      conflict: cell("conflict_flag").toLowerCase() === "true",
    });
  }
  return { rows, errors };
}

/** Longer than the archive's usual month-apart captures. The Dec 2025 to Mar 15 2026 hole is a gap; shorter holes are not. */
const CONTINUITY_DAYS = 60;

function dayNumber(iso: string): number {
  return Date.parse(`${iso}T00:00:00.000Z`) / 86_400_000;
}

/** Same-price run. A hole longer than the continuity window does not extend "held since". */
export function priceHeldSince(rows: HistoryRecord[], offer: string, priceCents: number): string | null {
  const points = rows
    .filter((row) => row.offer === offer && row.priceCents === priceCents && !row.conflict)
    .map((row) => row.snapshotDate)
    .sort();
  if (!points.length) return null;
  let since = points[points.length - 1];
  for (let index = points.length - 1; index > 0; index -= 1) {
    if (dayNumber(points[index]) - dayNumber(points[index - 1]) > CONTINUITY_DAYS) break;
    since = points[index - 1];
  }
  return since;
}

/** Gaps between actual rows, including not_published. The end date is the next row. */
export function coverageGaps(rows: HistoryRecord[], studio: string): { from: string; to: string }[] {
  const dates = [...new Set(rows.filter((row) => row.studio === studio).map((row) => row.snapshotDate))].sort();
  const gaps: { from: string; to: string }[] = [];
  for (let index = 1; index < dates.length; index += 1) {
    if (dayNumber(dates[index]) - dayNumber(dates[index - 1]) > CONTINUITY_DAYS) {
      gaps.push({ from: dates[index - 1], to: dates[index] });
    }
  }
  return gaps;
}

/** San Mateo priced rows only. National archive prices stay in history and do not set the low or best month. */
export function sanMateoBaseline(rows: HistoryRecord[]): {
  lowestCents: number | null;
  bestMonth: string | null;
} {
  const local = rows.filter(
    (row) =>
      row.scope === "san_mateo" &&
      row.priceStatus === "captured" &&
      row.priceCents !== null &&
      row.priceCents > 0 &&
      !row.conflict,
  );
  if (!local.length) return { lowestCents: null, bestMonth: null };
  let lowest = local[0];
  for (const row of local) {
    if ((row.priceCents ?? Infinity) < (lowest.priceCents ?? Infinity)) lowest = row;
  }
  return {
    lowestCents: lowest.priceCents,
    bestMonth: lowest.snapshotDate.slice(0, 7),
  };
}
