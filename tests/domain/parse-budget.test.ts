import { describe, expect, it } from "vitest";
import { parseBudget } from "../../src/domain/parse-budget";

describe("parseBudget", () => {
  it("accepts plain numbers and the documented yearly forms", () => {
    expect(parseBudget(400)).toEqual({ ok: true, annualCents: 40_000 });
    expect(parseBudget("400")).toEqual({ ok: true, annualCents: 40_000 });
    expect(parseBudget("$400")).toEqual({ ok: true, annualCents: 40_000 });
    expect(parseBudget("400/yr")).toEqual({ ok: true, annualCents: 40_000 });
    expect(parseBudget("400 per year")).toEqual({ ok: true, annualCents: 40_000 });
    expect(parseBudget("$1,200")).toEqual({ ok: true, annualCents: 120_000 });
    expect(parseBudget("$1,200/yr")).toEqual({ ok: true, annualCents: 120_000 });
  });

  it("returns budget_required when the budget is missing", () => {
    expect(parseBudget(undefined)).toEqual({ error: "budget_required" });
    expect(parseBudget(null)).toEqual({ error: "budget_required" });
    expect(parseBudget("")).toEqual({ error: "budget_required" });
    expect(parseBudget("   ")).toEqual({ error: "budget_required" });
  });

  it("rejects zero, negatives, non-numeric, non-finite, absurd, and extra characters", () => {
    expect(parseBudget(0)).toEqual({ error: "invalid_budget", reason: "zero" });
    expect(parseBudget("0")).toEqual({ error: "invalid_budget", reason: "zero" });
    expect(parseBudget(-10)).toEqual({ error: "invalid_budget", reason: "negative" });
    expect(parseBudget("-10")).toEqual({ error: "invalid_budget", reason: "negative" });
    expect(parseBudget("nope")).toEqual({ error: "invalid_budget", reason: "invalid_format" });
    expect(parseBudget(Number.NaN)).toEqual({ error: "invalid_budget", reason: "not_finite" });
    expect(parseBudget(Number.POSITIVE_INFINITY)).toEqual({
      error: "invalid_budget",
      reason: "not_finite",
    });
    expect(parseBudget(100_001)).toEqual({ error: "invalid_budget", reason: "absurd" });
    expect(parseBudget("100001")).toEqual({ error: "invalid_budget", reason: "absurd" });
    expect(parseBudget("350; rm -rf ~")).toEqual({
      error: "invalid_budget",
      reason: "invalid_format",
    });
    expect(parseBudget("$(whoami)")).toEqual({
      error: "invalid_budget",
      reason: "invalid_format",
    });
    expect(parseBudget("`whoami`")).toEqual({
      error: "invalid_budget",
      reason: "invalid_format",
    });
    expect(parseBudget("400`id`")).toEqual({
      error: "invalid_budget",
      reason: "invalid_format",
    });
  });

  it("rejects monthly wording as an ambiguous period", () => {
    expect(parseBudget("400/mo")).toEqual({ error: "invalid_budget", reason: "ambiguous_period" });
    expect(parseBudget("400 per month")).toEqual({
      error: "invalid_budget",
      reason: "ambiguous_period",
    });
  });

  it("accepts the max budget and rejects one dollar over it", () => {
    expect(parseBudget(100_000)).toEqual({ ok: true, annualCents: 10_000_000 });
    expect(parseBudget(100_001)).toEqual({ error: "invalid_budget", reason: "absurd" });
  });
});
