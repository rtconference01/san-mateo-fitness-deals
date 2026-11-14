import { describe, expect, it } from "vitest";
import { studioAdapters } from "../../src/capture";

describe("studio adapters", () => {
  it("lists the four studios and parses without throwing on empty html", async () => {
    expect(studioAdapters.map((adapter) => adapter.studioId)).toEqual([
      "corepower_yoga",
      "bodyrok",
      "club_pilates",
      "rocksalt_pilates",
    ]);
    const evidence = {
      sourceUrl: "https://example.test",
      capturedAt: new Date("2026-11-14T00:00:00.000Z"),
      html: "",
      screenshot: new Uint8Array(),
      locationSelected: false,
    };
    for (const adapter of studioAdapters) {
      const offers = await adapter.parse(evidence);
      expect(Array.isArray(offers)).toBe(true);
    }
  });
});
