export interface OfferTerms {
  classCount: number | "unlimited";
  length: string;
  restrictions: string;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Identity of an offer's terms. Price is not part of the fingerprint.
 * A change in class count, length, or restrictions is a new offer, not a price change.
 */
export function termsFingerprint(terms: OfferTerms): string {
  const count = terms.classCount === "unlimited" ? "unlimited" : String(terms.classCount);
  if (terms.classCount !== "unlimited" && (!Number.isInteger(terms.classCount) || terms.classCount < 0)) {
    throw new Error("class count must be a non-negative integer or unlimited");
  }
  return `classes:${count}|length:${normalize(terms.length)}|restrictions:${normalize(terms.restrictions)}`;
}

export function sameOfferTerms(left: OfferTerms, right: OfferTerms): boolean {
  return termsFingerprint(left) === termsFingerprint(right);
}
