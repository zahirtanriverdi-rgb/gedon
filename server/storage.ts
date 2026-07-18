// Media (şəkil/video) saxlama qatı — S3-uyğun obyekt storage (AWS S3, Cloudflare R2,
// Backblaze B2, Hetzner, MinIO…) və ya, S3 konfiqurasiya olunmayıbsa, dev üçün lokal disk
// (public/uploads/) fallback-i. Fayllar DB-yə base64 kimi YAZILMIR — DB yalnız URL saxlayır.
//
// Konfiqurasiya (.env):
//   S3_ENDPOINT          — provayder endpoint-i (məs. https://<accountid>.r2.cloudflarestorage.com)
//   S3_REGION            — region (R2/B2 üçün adətən "auto"; default: "auto")
//   S3_BUCKET            — bucket adı
//   S3_ACCESS_KEY_ID     — açar ID
//   S3_SECRET_ACCESS_KEY — gizli açar
//   S3_PUBLIC_URL        — faylların oxunduğu public baza URL (CDN/custom domain,
//                          məs. https://media.gedekgorek.az). Yoxdursa, path-style
//                          `${S3_ENDPOINT}/${S3_BUCKET}` istifadə olunur.
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";
import fs from "fs";

const S3_ENDPOINT = process.env.S3_ENDPOINT || "";
const S3_REGION = process.env.S3_REGION || "auto";
const S3_BUCKET = process.env.S3_BUCKET || "";
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || "";
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || "";
const S3_PUBLIC_URL = (process.env.S3_PUBLIC_URL || "").replace(/\/+$/, "");

export function isS3Enabled(): boolean {
  return !!(S3_ENDPOINT && S3_BUCKET && S3_ACCESS_KEY_ID && S3_SECRET_ACCESS_KEY);
}

// Lazy singleton — env dəyişənləri olmadan client yaradılmır (dev-də disk fallback işləyir).
let s3Client: S3Client | null = null;
function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: S3_ENDPOINT,
      region: S3_REGION,
      credentials: {
        accessKeyId: S3_ACCESS_KEY_ID,
        secretAccessKey: S3_SECRET_ACCESS_KEY,
      },
      // R2/MinIO/B2 kimi provayderlərlə uyğunluq üçün path-style (bucket URL-in path
      // hissəsində) — virtual-host style bəzi S3-uyğun endpoint-lərdə işləmir.
      forcePathStyle: true,
    });
  }
  return s3Client;
}

// Yalnız icazə verilən media tipləri — upload endpoint-in fileFilter-i də bunu yoxlayır,
// amma açar/ext seçimi üçün burada da mərkəzi mənbə saxlayırıq.
const MIME_EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/ogg": "ogv",
};

export function isAllowedMediaType(mimeType: string): boolean {
  return mimeType in MIME_EXTENSIONS;
}

// Orijinal fayl adına etibar etmirik (path traversal, unicode zibili, ad toqquşması) —
// açar həmişə uuid + mimetype-dan çıxarılan ext ilə qurulur.
function buildObjectKey(mimeType: string): string {
  const ext = MIME_EXTENSIONS[mimeType] || "bin";
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  return `uploads/${yyyy}/${mm}/${randomUUID()}.${ext}`;
}

export interface StoredMedia {
  url: string;
  key: string;
  kind: "image" | "video";
}

// Bir faylı storage-a yazır və public URL qaytarır. S3 aktivdirsə bucket-ə, deyilsə
// public/uploads/ altına (dev fallback — static route artıq server.ts-də mövcuddur).
export async function storeMediaFile(buffer: Buffer, mimeType: string): Promise<StoredMedia> {
  const key = buildObjectKey(mimeType);
  const kind: StoredMedia["kind"] = mimeType.startsWith("video/") ? "video" : "image";

  if (isS3Enabled()) {
    await getS3Client().send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        // Şəkillər dəyişməz açarla (uuid) yazılır — brauzer/CDN-in aqressiv keşləməsi təhlükəsizdir.
        CacheControl: "public, max-age=31536000, immutable",
      })
    );
    const base = S3_PUBLIC_URL || `${S3_ENDPOINT.replace(/\/+$/, "")}/${S3_BUCKET}`;
    return { url: `${base}/${key}`, key, kind };
  }

  // Dev fallback: lokal disk. `key` "uploads/…" ilə başlayır, ona görə public/ altına düşür
  // və mövcud `/uploads` static route-u ilə eynilə servis olunur.
  const absPath = path.join(process.cwd(), "public", key);
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, buffer);
  return { url: `/${key}`, key, kind };
}
