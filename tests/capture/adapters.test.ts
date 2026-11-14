import { describe, expect, it } from "vitest";
import { studioAdapters } from "../../src/capture";

describe("studio adapters", () => {
  it("are stubs that throw not implemented", async () => {
    expect(studioAdapters.map((adapter) => adapter.studioId)).toEqual([
      "corepower_yoga",
      "bodyrok",
      "club_pilates",
      "rocksalt_pilates",
    ]);
    for (const adapter of studioAdapters) {
      await expect(adapter.capture("https://example.test")).rejects.toThrow("not implemented");
      await expect(
        adapter.parse({
          sourceUrl: "https://example.test",
          capturedAt: new Date("2026-11-14T00:00:00.000Z"),
          html: "",
          screenshot: new Uint8Array(),
        }),
      ).rejects.toThrow("not implemented");
    }
  });
});
