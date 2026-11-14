import { describe, expect, it } from "vitest";
import { officialSocialPages, studios } from "../../config/sources";

describe("sources registry", () => {
  it("lists eight official studio social pages", () => {
    const pages = officialSocialPages();
    expect(pages).toHaveLength(8);
    expect(pages.map((page) => page.url)).toEqual([
      "https://www.instagram.com/corepoweryoga/",
      "https://www.facebook.com/CorePowerYogaSanMateo",
      "https://www.instagram.com/bodyrokstudio/",
      "https://www.facebook.com/bodyrokstudios",
      "https://www.instagram.com/clubpilates_sanmateo/",
      "https://www.facebook.com/clubpilatessanmateo/",
      "https://www.instagram.com/rocksaltpilates/",
      "https://www.facebook.com/rocksaltpilates",
    ]);
  });

  it("marks pages that need a San Mateo location check", () => {
    const byUrl = new Map(officialSocialPages().map((page) => [page.url, page]));
    expect(byUrl.get("https://www.instagram.com/corepoweryoga/")?.needsLocationCheck).toBe(true);
    expect(byUrl.get("https://www.instagram.com/bodyrokstudio/")?.needsLocationCheck).toBe(true);
    expect(byUrl.get("https://www.instagram.com/rocksaltpilates/")?.needsLocationCheck).toBe(true);
    expect(byUrl.get("https://www.facebook.com/CorePowerYogaSanMateo")?.scope).toBe("san_mateo");
    expect(byUrl.get("https://www.instagram.com/clubpilates_sanmateo/")?.scope).toBe("san_mateo");
    expect(byUrl.get("https://www.facebook.com/clubpilatessanmateo/")?.scope).toBe("san_mateo");
  });

  it("confirms BODYROK and RockSalt Facebook after the studio sites were checked", () => {
    const bodyrok = studios.find((studio) => studio.id === "bodyrok");
    const rocksalt = studios.find((studio) => studio.id === "rocksalt_pilates");
    expect(bodyrok?.facebook.confirmation).toBe("confirmed");
    expect(rocksalt?.facebook.confirmation).toBe("confirmed");
    expect(bodyrok?.facebook.notes.toLowerCase()).toContain("bodyrokstudios");
    expect(rocksalt?.facebook.notes.toLowerCase()).toContain("rocksaltpilates");
  });
});
