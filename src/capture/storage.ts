import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export interface EvidenceStorage {
  putHtml(key: string, html: string): Promise<void>;
  putScreenshot(key: string, bytes: Uint8Array): Promise<void>;
}

export class MemoryStorage implements EvidenceStorage {
  readonly html = new Map<string, string>();
  readonly screenshots = new Map<string, Uint8Array>();

  async putHtml(key: string, html: string): Promise<void> {
    this.html.set(key, html);
  }

  async putScreenshot(key: string, bytes: Uint8Array): Promise<void> {
    this.screenshots.set(key, bytes);
  }
}

/** Dev and test storage. The directory is gitignored (`captures/`). */
export class LocalFileStorage implements EvidenceStorage {
  constructor(private readonly root: string) {}

  async putHtml(key: string, html: string): Promise<void> {
    const file = path.join(this.root, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, html);
  }

  async putScreenshot(key: string, bytes: Uint8Array): Promise<void> {
    const file = path.join(this.root, key);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, bytes);
  }
}

/**
 * Production evidence goes to Supabase Storage. This class is not used in tests.
 * It refuses to run without the bucket env vars rather than writing into git.
 */
export class SupabaseStorage implements EvidenceStorage {
  constructor(
    private readonly url = process.env.SUPABASE_URL,
    private readonly key = process.env.SUPABASE_SERVICE_ROLE_KEY,
    private readonly bucket = process.env.EVIDENCE_BUCKET,
  ) {}

  async putHtml(objectKey: string, html: string): Promise<void> {
    await this.put(objectKey, new TextEncoder().encode(html), "text/html");
  }

  async putScreenshot(objectKey: string, bytes: Uint8Array): Promise<void> {
    await this.put(objectKey, bytes, "image/png");
  }

  private async put(objectKey: string, body: Uint8Array, contentType: string): Promise<void> {
    if (!this.url || !this.key || !this.bucket) {
      throw new Error("supabase storage is not configured");
    }
    const endpoint = `${this.url}/storage/v1/object/${this.bucket}/${objectKey}`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        authorization: `Bearer ${this.key}`,
        apikey: this.key,
        "content-type": contentType,
        "x-upsert": "true",
      },
      body: new Blob([body]),
    });
    if (!response.ok) {
      throw new Error(`supabase storage upload failed: ${response.status}`);
    }
  }
}
