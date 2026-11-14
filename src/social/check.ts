export interface SocialCheckInput {
  pageId: string;
  foundDeal: boolean;
  postUrl?: string;
  postDate?: string;
  screenshotPath?: string;
  checker: string;
  checkedAt: Date;
}

export interface SocialCheckRecord {
  page: string;
  checkedAt: string;
  checker: string;
  foundDeal: boolean;
  postUrl: string | null;
  postDate: string | null;
  screenshotKey: string | null;
}

export interface RecaptureRequest {
  studioId: string;
  reason: "studio_social";
  dueAt: string;
  pageId: string;
}

export function recordSocialCheck(input: SocialCheckInput): {
  record: SocialCheckRecord;
  recapture: RecaptureRequest | null;
} {
  if (input.foundDeal && (!input.postUrl || !input.postDate || !input.screenshotPath)) {
    throw new Error("a studio deal requires a post url, post date, and screenshot");
  }
  const studioId = input.pageId.split(":")[0] ?? input.pageId;
  return {
    record: {
      page: input.pageId,
      checkedAt: input.checkedAt.toISOString(),
      checker: input.checker,
      foundDeal: input.foundDeal,
      postUrl: input.postUrl ?? null,
      postDate: input.postDate ?? null,
      screenshotKey: input.screenshotPath ?? null,
    },
    recapture: input.foundDeal
      ? {
          studioId,
          reason: "studio_social",
          dueAt: input.checkedAt.toISOString(),
          pageId: input.pageId,
        }
      : null,
  };
}
