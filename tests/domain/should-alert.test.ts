import { describe, expect, it } from "vitest";
import { shouldAlert, type ShouldAlertInput } from "../../src/domain/should-alert";
import { WEEK_MS, type BackfillBaseline, type PricePoint } from "../../src/domain/types";

const SAN_MATEO = "san_mateo";
const T0 = new Date("2026-01-05T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function at(offsetMs: number): Date {
  return new Date(T0.getTime() + offsetMs);
}

function point(overrides: Partial<PricePoint> = {}): PricePoint {
  return {
    effectivePriceCents: 10_000,
    capturedAt: T0,
    sourceType: "official_site",
    verificationStatus: "verified",
    locationId: SAN_MATEO,
    expired: false,
    membersOnly: false,
    parseError: false,
    evidenceObjectKey: "evidence/snap-1",
    ...overrides,
  };
}

function evaluate(
  overrides: Partial<ShouldAlertInput> & Pick<ShouldAlertInput, "candidate">,
) {
  return shouldAlert({
    history: [],
    sanMateoLocationId: SAN_MATEO,
    annualCostCents: 20_000,
    budgetCents: 100_000,
    alreadyAlerted: false,
    backfillBaseline: null,
    ...overrides,
  });
}

const labeledBackfill: BackfillBaseline = { priceCents: 10_000, labeled: true };

describe("shouldAlert", () => {
  it("QA-13: the first observation of an offer does not alert", () => {
    const result = evaluate({ candidate: point() });
    expect(result.alert).toBe(false);
    expect(result.reason).toBe("first_observation");
  });

  it("QA-14: 7 weeks of verified history and no backfill does not alert", () => {
    const result = evaluate({
      history: [point({ capturedAt: T0 })],
      candidate: point({ capturedAt: at(7 * WEEK_MS), evidenceObjectKey: "evidence/week-7" }),
    });
    expect(result.alert).toBe(false);
    expect(result.path).toBeNull();
  });

  it("QA-15: 8 weeks of verified history, price within 10% of the low, and a fitting budget alerts once on Path A", () => {
    const result = evaluate({
      history: [point({ capturedAt: T0, effectivePriceCents: 10_000 })],
      candidate: point({
        capturedAt: at(8 * WEEK_MS),
        effectivePriceCents: 10_000,
        evidenceObjectKey: "evidence/path-a",
      }),
    });
    expect(result.alert).toBe(true);
    expect(result.path).toBe("A");
    expect(result.evidenceObjectKey).toBe("evidence/path-a");

    const again = evaluate({
      history: [point({ capturedAt: T0 })],
      candidate: point({ capturedAt: at(8 * WEEK_MS) }),
      alreadyAlerted: true,
    });
    expect(again.alert).toBe(false);
    expect(again.reason).toBe("duplicate");
  });

  it("QA-16: a backfill baseline plus only 3 verified observations does not alert", () => {
    const result = evaluate({
      backfillBaseline: labeledBackfill,
      history: [point({ capturedAt: T0 }), point({ capturedAt: at(14 * DAY_MS) })],
      candidate: point({ capturedAt: at(21 * DAY_MS) }),
    });
    expect(result.alert).toBe(false);
  });

  it("QA-17: a backfill baseline plus 4 verified observations inside 1 week does not alert", () => {
    const result = evaluate({
      backfillBaseline: labeledBackfill,
      history: [
        point({ capturedAt: T0 }),
        point({ capturedAt: at(1 * DAY_MS) }),
        point({ capturedAt: at(3 * DAY_MS) }),
      ],
      candidate: point({ capturedAt: at(6 * DAY_MS) }),
    });
    expect(result.alert).toBe(false);
  });

  it("QA-18: backfill plus 4 verified observations over 2 or more weeks alerts once on Path B", () => {
    const result = evaluate({
      backfillBaseline: labeledBackfill,
      history: [
        point({ capturedAt: T0 }),
        point({ capturedAt: at(3 * DAY_MS) }),
        point({ capturedAt: at(7 * DAY_MS) }),
      ],
      candidate: point({
        capturedAt: at(14 * DAY_MS),
        evidenceObjectKey: "evidence/path-b",
      }),
    });
    expect(result.alert).toBe(true);
    expect(result.path).toBe("B");
    expect(result.evidenceObjectKey).toBe("evidence/path-b");
  });

  it("QA-19: a price 11% above the verified low does not alert", () => {
    const result = evaluate({
      history: [point({ capturedAt: T0, effectivePriceCents: 10_000 })],
      candidate: point({
        capturedAt: at(8 * WEEK_MS),
        effectivePriceCents: 11_100,
      }),
    });
    expect(result.alert).toBe(false);
    expect(result.reason).toBe("above_low_band");
  });

  it("QA-20: a price exactly 10% above the verified low alerts", () => {
    const result = evaluate({
      history: [point({ capturedAt: T0, effectivePriceCents: 10_000 })],
      candidate: point({
        capturedAt: at(8 * WEEK_MS),
        effectivePriceCents: 11_000,
        evidenceObjectKey: "evidence/boundary",
      }),
    });
    expect(result.alert).toBe(true);
    expect(result.path).toBe("A");
  });

  it("QA-25: a qualifying deal that pushes the plan over the example $350 budget does not alert", () => {
    const result = evaluate({
      annualCostCents: 35_100,
      budgetCents: 35_000,
      history: [point({ capturedAt: T0, effectivePriceCents: 10_000 })],
      candidate: point({
        capturedAt: at(8 * WEEK_MS),
        effectivePriceCents: 10_000,
      }),
    });
    expect(result.alert).toBe(false);
    expect(result.reason).toBe("over_budget");
  });
});
