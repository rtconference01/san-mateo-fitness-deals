import { USER_AGENT } from "./robots";

/** Live capture. Unit tests do not call this. Browsers are installed only in the daily job. */
export async function captureWithPlaywright(url: string): Promise<{
  html: string;
  screenshot: Uint8Array;
  finalUrl: string;
}> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ userAgent: USER_AGENT });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20_000 });
    const html = await page.content();
    const screenshot = await page.screenshot({ fullPage: true });
    return { html, screenshot: new Uint8Array(screenshot), finalUrl: page.url() };
  } finally {
    await browser.close();
  }
}
