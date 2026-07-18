// Birdəfəlik migrasiya: DB-də hələ də base64 data-URI kimi saxlanan köhnə media
// qeydlərini tapır, storeMediaFile (server/storage.ts) ilə storage-a (S3 və ya dev-də
// public/uploads/ disk fallback) yazır və DB-dəki dəyəri URL ilə əvəz edir.
//
// Yoxlanan yerlər:
//   tours.image                    — düz string sütun
//   tours.extra_data               — JSON (images[], itinerary[].image və s. — dərin gəzinti)
//   tours.pending_data             — JSON (təsdiq gözləyən redaktə də base64 saxlaya bilər)
//   users.avatar                   — düz string sütun
//   users.extra_data               — JSON (guides[].avatar və s. — dərin gəzinti)
//
// İstifadə:
//   npx tsx scripts/migrate-base64-media.ts            # DRY-RUN — heç nə dəyişmir, hesabat verir
//   npx tsx scripts/migrate-base64-media.ts --apply    # faktiki yükləyib DB-ni yeniləyir
//
// DİQQƏT: database.sqlite canlı dev bazadır (dev serverlə paylaşılır) — ona görə default
// rejim dry-run-dır; yazma yalnız açıq --apply flag-i ilə olur. Skript idempotentdir:
// təkrar işə salınanda yalnız qalmış data-URI-ləri tapır (URL-ə çevrilmişlərə toxunmur).
import 'dotenv/config';
import { createHash } from 'crypto';
import dbClient from '../server/db';
import { storeMediaFile, isS3Enabled, isAllowedMediaType } from '../server/storage';

const APPLY = process.argv.includes('--apply');

// image/* və video/* data-URI-ləri (base64). Whitespace-li base64-ü də tuturuq —
// Buffer.from(..., 'base64') onları onsuz da qəbul edir.
const DATA_URI_RE = /^data:((?:image|video)\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/i;

interface Hit {
  table: string;
  rowId: string;
  rowLabel: string;
  path: string; // sütun və ya sütun içində JSON yolu, məs. extra_data.itinerary[2].image
  mimeType: string;
  bytes: number;
  hash: string; // eyni şəkil bir neçə yerdə təkrarlanırsa, bir dəfə yüklənsin deyə
  skippedReason?: string;
}

const hits: Hit[] = [];
// hash → yüklənmiş URL (apply rejimində doldurulur; dublikatlar eyni URL-i alır)
const uploadedByHash = new Map<string, string>();

function inspectValue(value: unknown, table: string, rowId: string, rowLabel: string, path: string): Hit | null {
  if (typeof value !== 'string') return null;
  const m = value.match(DATA_URI_RE);
  if (!m) return null;
  const mimeType = m[1].toLowerCase();
  const buffer = Buffer.from(m[2], 'base64');
  const hit: Hit = {
    table, rowId, rowLabel, path, mimeType,
    bytes: buffer.length,
    hash: createHash('sha256').update(value).digest('hex'),
  };
  if (!isAllowedMediaType(mimeType)) hit.skippedReason = `icazəsiz media tipi (${mimeType})`;
  else if (buffer.length === 0) hit.skippedReason = 'boş base64 payload';
  hits.push(hit);
  return hit;
}

async function migrateValue(hit: Hit, rawValue: string): Promise<string | null> {
  if (hit.skippedReason) return null;
  const cached = uploadedByHash.get(hit.hash);
  if (cached) return cached;
  const m = rawValue.match(DATA_URI_RE)!;
  const { url } = await storeMediaFile(Buffer.from(m[2], 'base64'), hit.mimeType);
  uploadedByHash.set(hit.hash, url);
  return url;
}

// JSON strukturunu dərindən gəzir; hər data-URI string üçün hesabat yazır və (apply-da)
// yerində URL ilə əvəz edir. Dəyişiklik olub-olmadığını qaytarır.
async function walkJson(
  node: any, table: string, rowId: string, rowLabel: string, path: string
): Promise<boolean> {
  let changed = false;
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i++) {
      const child = node[i];
      if (typeof child === 'string') {
        const hit = inspectValue(child, table, rowId, rowLabel, `${path}[${i}]`);
        if (hit && APPLY) {
          const url = await migrateValue(hit, child);
          if (url) { node[i] = url; changed = true; }
        }
      } else if (child && typeof child === 'object') {
        changed = (await walkJson(child, table, rowId, rowLabel, `${path}[${i}]`)) || changed;
      }
    }
  } else if (node && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      const child = node[key];
      if (typeof child === 'string') {
        const hit = inspectValue(child, table, rowId, rowLabel, `${path}.${key}`);
        if (hit && APPLY) {
          const url = await migrateValue(hit, child);
          if (url) { node[key] = url; changed = true; }
        }
      } else if (child && typeof child === 'object') {
        changed = (await walkJson(child, table, rowId, rowLabel, `${path}.${key}`)) || changed;
      }
    }
  }
  return changed;
}

// Bir cədvəli emal edir: plainColumns düz string sütunlardır, jsonColumns JSON-string
// sütunlardır. Apply rejimində dəyişən sütunlar tək UPDATE ilə yazılır.
async function processTable(
  table: string,
  labelSql: string, // SELECT-də row etiketi üçün ifadə (məs. name)
  plainColumns: string[],
  jsonColumns: string[]
) {
  const cols = ['id', `${labelSql} AS row_label`, ...plainColumns, ...jsonColumns].join(', ');
  const rows = await dbClient.query(`SELECT ${cols} FROM ${table}`);

  for (const row of rows) {
    const updates: Record<string, string> = {};

    for (const col of plainColumns) {
      const value = row[col];
      const hit = inspectValue(value, table, row.id, row.row_label || row.id, col);
      if (hit && APPLY) {
        const url = await migrateValue(hit, value);
        if (url) updates[col] = url;
      }
    }

    for (const col of jsonColumns) {
      const raw = row[col];
      if (typeof raw !== 'string' || !raw.includes('data:')) continue;
      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        console.warn(`  [xəbərdarlıq] ${table}#${row.id}.${col}: JSON parse alınmadı — ötürülür`);
        continue;
      }
      const changed = await walkJson(parsed, table, row.id, row.row_label || row.id, col);
      if (changed && APPLY) updates[col] = JSON.stringify(parsed);
    }

    if (APPLY && Object.keys(updates).length > 0) {
      const setSql = Object.keys(updates).map(c => `${c} = ?`).join(', ');
      await dbClient.execute(
        `UPDATE ${table} SET ${setSql} WHERE id = ?`,
        [...Object.values(updates), row.id]
      );
    }
  }
}

function fmtKB(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

async function main() {
  console.log(`[migrate-base64-media] Rejim: ${APPLY ? 'APPLY — DB dəyişdiriləcək!' : 'DRY-RUN (heç nə dəyişmir)'}`);
  console.log(
    `[migrate-base64-media] Storage backend: ${isS3Enabled()
      ? `S3 (bucket: ${process.env.S3_BUCKET})`
      : 'lokal disk fallback (public/uploads/) — S3 konfiqurasiya olunmayıb'}`
  );

  await processTable('tours', 'name', ['image'], ['extra_data', 'pending_data']);
  await processTable('users', 'email', ['avatar'], ['extra_data']);

  if (hits.length === 0) {
    console.log('\n[migrate-base64-media] Heç bir base64 data-URI tapılmadı — miqrasiya ediləcək bir şey yoxdur. ✔');
    return;
  }

  console.log(`\nTapılan base64 media dəyərləri (${hits.length}):`);
  for (const hit of hits) {
    const status = hit.skippedReason
      ? `ÖTÜRÜLDÜ — ${hit.skippedReason}`
      : APPLY
        ? `→ ${uploadedByHash.get(hit.hash)}`
        : 'miqrasiya olunacaq';
    console.log(`  ${hit.table}#${hit.rowId} (${hit.rowLabel}) ${hit.path}  [${hit.mimeType}, ${fmtKB(hit.bytes)}]  ${status}`);
  }

  const migratable = hits.filter(h => !h.skippedReason);
  const skipped = hits.length - migratable.length;
  const totalBytes = migratable.reduce((sum, h) => sum + h.bytes, 0);
  const uniqueFiles = new Set(migratable.map(h => h.hash)).size;

  console.log(`\nCəm: ${migratable.length} dəyər (${uniqueFiles} unikal fayl, ${fmtKB(totalBytes)})${skipped ? `, ${skipped} ötürüldü` : ''}`);
  if (APPLY) {
    console.log(`[migrate-base64-media] Hazırdır: ${uploadedByHash.size} fayl storage-a yazıldı, DB URL-lərlə yeniləndi. ✔`);
  } else {
    console.log('[migrate-base64-media] Bu, dry-run idi. Faktiki miqrasiya üçün: npx tsx scripts/migrate-base64-media.ts --apply');
  }
}

main().catch(err => {
  console.error('[migrate-base64-media] Xəta:', err);
  process.exit(1);
});
