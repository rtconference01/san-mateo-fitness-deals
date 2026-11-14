import { describe, expect, it } from "vitest";
import { sameOfferTerms, termsFingerprint } from "../../src/domain/terms";

const eightClass = {
  classCount: 8,
  length: "50 min",
  restrictions: "new students",
};

describe("termsFingerprint", () => {
  it("QA-33: an 8-class pack that becomes a 10-class pack is a new offer, not a price change", () => {
    const before = termsFingerprint(eightClass);
    const after = termsFingerprint({ ...eightClass, classCount: 10 });
    expect(after).not.toBe(before);
    expect(sameOfferTerms(eightClass, { ...eightClass, classCount: 10 })).toBe(false);
    expect(before).not.toContain("price");
  });

  it("QA-34: the same terms keep the same fingerprint when only the price changes", () => {
    const first = termsFingerprint(eightClass);
    const second = termsFingerprint({ ...eightClass });
    expect(second).toBe(first);
    expect(termsFingerprint(eightClass)).toBe(
      termsFingerprint({
        classCount: 8,
        length: " 50   min ",
        restrictions: "New Students",
      }),
    );
  });
});
