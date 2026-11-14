import { describe, expect, it } from "vitest";
import { costPerClass } from "../../src/domain/money";

describe("costPerClass", () => {
  it("QA-09: 10-class pack at $150 costs $15.00 per class", () => {
    const result = costPerClass(15_000, 10);
    expect(result.costPerClassCents).toBe(1_500);
    expect(result.classesUsed).toBe(10);
    expect(result.assumption).toBe(false);
    expect(result.label).toBeNull();
  });

  it("QA-10: unlimited month at $99 uses the 12-class default and labels the assumption", () => {
    const result = costPerClass(9_900, "unlimited");
    expect(result.costPerClassCents).toBe(825);
    expect(result.classesUsed).toBe(12);
    expect(result.assumption).toBe(true);
    expect(result.label).toBe("configurable assumption (default 12 classes/month)");
  });
});
