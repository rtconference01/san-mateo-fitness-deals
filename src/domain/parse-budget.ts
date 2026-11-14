import { MAX_BUDGET_DOLLARS } from "./types";

export type ParseBudgetResult =
  | { ok: true; annualCents: number }
  | { error: "budget_required" }
  | { error: "invalid_budget"; reason: string };

function fromDollars(dollars: number, cents: number): ParseBudgetResult {
  if (!Number.isFinite(dollars) || !Number.isFinite(cents)) {
    return { error: "invalid_budget", reason: "not_finite" };
  }
  if (dollars < 0 || cents < 0) {
    return { error: "invalid_budget", reason: "negative" };
  }
  if (dollars === 0 && cents === 0) {
    return { error: "invalid_budget", reason: "zero" };
  }
  if (dollars > MAX_BUDGET_DOLLARS) {
    return { error: "invalid_budget", reason: "absurd" };
  }
  const annualCents = dollars * 100 + cents;
  if (!Number.isInteger(annualCents)) {
    return { error: "invalid_budget", reason: "not_finite" };
  }
  return { ok: true, annualCents };
}

/**
 * Parse an employee budget into annual cents.
 * Missing input is budget_required. Monthly periods are ambiguous and rejected.
 * There is no default budget.
 */
export function parseBudget(input: unknown): ParseBudgetResult {
  if (input === undefined || input === null) {
    return { error: "budget_required" };
  }
  if (typeof input === "number") {
    if (!Number.isFinite(input)) {
      return { error: "invalid_budget", reason: "not_finite" };
    }
    if (input < 0) return { error: "invalid_budget", reason: "negative" };
    if (input === 0) return { error: "invalid_budget", reason: "zero" };
    if (input > MAX_BUDGET_DOLLARS) return { error: "invalid_budget", reason: "absurd" };
    const dollars = Math.trunc(input);
    const cents = Math.round((input - dollars) * 100);
    if (Math.abs(input * 100 - (dollars * 100 + cents)) > 1e-6) {
      return { error: "invalid_budget", reason: "invalid_format" };
    }
    return fromDollars(dollars, cents);
  }
  if (typeof input !== "string") {
    return { error: "invalid_budget", reason: "invalid_format" };
  }

  const trimmed = input.trim();
  if (trimmed === "") return { error: "budget_required" };
  if (/\/mo\b|per\s+month/i.test(trimmed)) {
    return { error: "invalid_budget", reason: "ambiguous_period" };
  }
  if (trimmed.startsWith("-")) {
    return { error: "invalid_budget", reason: "negative" };
  }

  let body = trimmed;
  const yearly = body.match(/^(.*?)(?:\s*\/\s*yr|\s+per\s+year)\s*$/i);
  if (yearly) body = yearly[1].trim();

  const match = body.match(/^\$?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?$/);
  if (!match) {
    return { error: "invalid_budget", reason: "invalid_format" };
  }
  const dollars = Number(match[1].replace(/,/g, ""));
  const cents = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  return fromDollars(dollars, cents);
}
