import { randomUUID } from "crypto";
import dbClient from "./db.ts";

// --- Phone normalization -------------------------------------------------------------------
// Contributor points are keyed by phone number, so every submission and lookup must resolve
// the same human to the same key regardless of how they typed it ("050 123 45 67",
// "+994501234567", "994501234567"…). Stored form: digits only, e.g. "994501234567".
// Foreign numbers are allowed through as-is (digits only) as long as they look like a phone.
export function normalizeAzPhone(raw: string): string | null {
  if (typeof raw !== "string") return null;
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("994") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "994" + digits.slice(1);
  if (digits.length === 9) return "994" + digits;
  if (digits.length >= 9 && digits.length <= 15) return digits;
  return null;
}

// --- Server-side settings ---------------------------------------------------------------------
// Read/write helpers over the `settings` key-value table. The camp-points numbers live here
// (not in the client's localStorage platformConfig) because the server stamps points_awarded
// at approval time and must read the current value itself.
export async function getSetting(key: string, fallback: string): Promise<string> {
  const rows = await dbClient.query(`SELECT value FROM settings WHERE key = ?`, [key]);
  return rows.length > 0 ? String(rows[0].value) : fallback;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const existing = await dbClient.query(`SELECT key FROM settings WHERE key = ?`, [key]);
  if (existing.length > 0) {
    await dbClient.execute(`UPDATE settings SET value = ? WHERE key = ?`, [value, key]);
  } else {
    await dbClient.execute(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value]);
  }
}

export async function getCampPointsConfig(): Promise<{ pointsPerSite: number; threshold: number }> {
  const pointsPerSite = parseInt(await getSetting("camp_points_per_site", "10"), 10) || 10;
  const threshold = parseInt(await getSetting("camp_reward_threshold", "100"), 10) || 100;
  return { pointsPerSite, threshold };
}

// Feature flag: admin can hide the whole camp sites feature from customers with one switch.
export async function isCampSitesEnabled(): Promise<boolean> {
  return (await getSetting("camp_sites_enabled", "true")) !== "false";
}

// Feature flag: admin can hide the "Qrup hesabla" group price calculator from customers with
// one switch. Not camp-specific, but lives alongside isCampSitesEnabled since both are simple
// settings-table flags read the same way.
export async function isGroupCalculatorEnabled(): Promise<boolean> {
  return (await getSetting("group_calculator_enabled", "true")) !== "false";
}

// --- Points lookup rate limiting ------------------------------------------------------------
// Deliberately separate from whatsapp.ts's checkAndConsumeRateLimit: that limiter's global
// budget protects the single connected WhatsApp number, and points lookups shouldn't burn it.
// This one is much cheaper (a local DB aggregate), so limits are looser: 5s cooldown,
// 10 lookups per hour per phone.
const LOOKUP_COOLDOWN_MS = 5_000;
const LOOKUP_MAX_PER_WINDOW = 10;
const LOOKUP_WINDOW_MS = 60 * 60 * 1000;

type LookupRateEntry = { count: number; windowStart: number; lastAt: number };
const lookupRateMap = new Map<string, LookupRateEntry>();

export type LookupRateResult = { allowed: boolean; retryAfterSec?: number };

export function checkAndConsumeLookupRateLimit(phoneNormalized: string): LookupRateResult {
  const now = Date.now();
  // Opportunistic sweep so the map doesn't grow unbounded across many distinct phones.
  if (lookupRateMap.size > 5000) {
    for (const [key, entry] of lookupRateMap) {
      if (now - entry.windowStart > LOOKUP_WINDOW_MS) lookupRateMap.delete(key);
    }
  }

  let entry = lookupRateMap.get(phoneNormalized);
  if (!entry || now - entry.windowStart > LOOKUP_WINDOW_MS) {
    entry = { count: 0, windowStart: now, lastAt: 0 };
  }
  if (now - entry.lastAt < LOOKUP_COOLDOWN_MS) {
    return { allowed: false, retryAfterSec: Math.ceil((LOOKUP_COOLDOWN_MS - (now - entry.lastAt)) / 1000) };
  }
  if (entry.count >= LOOKUP_MAX_PER_WINDOW) {
    return { allowed: false, retryAfterSec: Math.ceil((LOOKUP_WINDOW_MS - (now - entry.windowStart)) / 1000) };
  }
  entry.count += 1;
  entry.lastAt = now;
  lookupRateMap.set(phoneNormalized, entry);
  return { allowed: true };
}

// --- Row mappers ------------------------------------------------------------------------------

function parsePhotos(raw: any): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Public shape: submitter is credited as "Name S." and the phone number is never exposed.
export function rowToPublicCampSite(row: any) {
  const surnameInitial = row.submitter_surname ? `${String(row.submitter_surname).charAt(0).toUpperCase()}.` : "";
  return {
    id: row.id,
    name: row.name,
    description: row.description || "",
    lat: Number(row.lat),
    lon: Number(row.lon),
    photos: parsePhotos(row.photos),
    submitterName: `${row.submitter_name} ${surnameInitial}`.trim(),
    isVerified: !!row.is_verified,
    isPaid: !!row.is_paid,
    addedByAdmin: !!row.added_by_admin,
    createdAt: row.created_at,
  };
}

// Admin shape: full submitter details for moderation + contacting reward winners.
export function rowToAdminCampSite(row: any) {
  return {
    ...rowToPublicCampSite(row),
    submitterName: row.submitter_name,
    submitterSurname: row.submitter_surname,
    submitterPhone: row.submitter_phone,
    submitterPhoneNormalized: row.submitter_phone_normalized,
    status: row.status,
    rejectionReason: row.rejection_reason || undefined,
    pointsAwarded: Number(row.points_awarded) || 0,
    approvedAt: row.approved_at || undefined,
  };
}

// Boolean columns arrive as 0/1 (SQLite) or true/false (Postgres); requests send booleans.
export function toDbBool(value: any): number {
  return value ? 1 : 0;
}

// --- Submission validation ----------------------------------------------------------------
// Padded Azerbaijan bounding box — submissions outside it are rejected outright.
const AZ_BBOX = { minLat: 38.0, maxLat: 42.5, minLon: 44.0, maxLon: 51.5 };
const MAX_PHOTOS = 3;
const MAX_PHOTO_CHARS = 2_000_000; // ~1.5MB binary per base64 photo
const PHOTO_PREFIX_RE = /^data:image\/(jpeg|jpg|png|webp);base64,/;

export type CampSiteSubmission = {
  name: string;
  description: string;
  lat: number;
  lon: number;
  photos: string[];
  isPaid: boolean;
  submitterName: string;
  submitterSurname: string;
  submitterPhone: string;
  submitterPhoneNormalized: string;
};

// Returns a validated submission or an Azerbaijani error message string.
export function validateCampSiteSubmission(body: any): CampSiteSubmission | { error: string } {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 3 || name.length > 100) {
    return { error: "Kamp yerinin adı 3–100 simvol aralığında olmalıdır." };
  }
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (description.length > 2000) {
    return { error: "Təsvir maksimum 2000 simvol ola bilər." };
  }
  const lat = Number(body?.lat);
  const lon = Number(body?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: "Xəritədə kamp yerinin yerini seçin." };
  }
  if (lat < AZ_BBOX.minLat || lat > AZ_BBOX.maxLat || lon < AZ_BBOX.minLon || lon > AZ_BBOX.maxLon) {
    return { error: "Seçilən koordinatlar Azərbaycan ərazisindən kənardır." };
  }
  const photos = Array.isArray(body?.photos) ? body.photos : [];
  if (photos.length > MAX_PHOTOS) {
    return { error: `Maksimum ${MAX_PHOTOS} foto əlavə etmək olar.` };
  }
  for (const photo of photos) {
    if (typeof photo !== "string" || !PHOTO_PREFIX_RE.test(photo) || photo.length > MAX_PHOTO_CHARS) {
      return { error: "Fotolar JPEG/PNG/WebP formatında və maksimum ~1.5MB olmalıdır." };
    }
  }
  const submitterName = typeof body?.submitterName === "string" ? body.submitterName.trim() : "";
  const submitterSurname = typeof body?.submitterSurname === "string" ? body.submitterSurname.trim() : "";
  if (submitterName.length < 2 || submitterName.length > 100 || submitterSurname.length < 2 || submitterSurname.length > 100) {
    return { error: "Ad və soyad daxil edilməlidir (2–100 simvol)." };
  }
  const submitterPhone = typeof body?.submitterPhone === "string" ? body.submitterPhone.trim() : "";
  const normalized = normalizeAzPhone(submitterPhone);
  if (!normalized) {
    return { error: "Zəhmət olmasa düzgün əlaqə nömrəsi daxil edin." };
  }
  return {
    name, description, lat, lon,
    photos: photos as string[],
    isPaid: !!body?.isPaid,
    submitterName, submitterSurname, submitterPhone,
    submitterPhoneNormalized: normalized,
  };
}

// Admin-created camp sites skip captcha/rate-limit/dedupe and land directly as approved.
// They carry no submitter phone (empty string), which keeps them out of the contributor
// points system entirely, and are credited publicly to the GedəkGörək team.
export type AdminCampSiteInput = {
  name: string;
  description: string;
  lat: number;
  lon: number;
  photos: string[];
  isPaid: boolean;
  isVerified: boolean;
};

export function validateAdminCampSiteInput(body: any): AdminCampSiteInput | { error: string } {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (name.length < 3 || name.length > 100) {
    return { error: "Kamp yerinin adı 3–100 simvol aralığında olmalıdır." };
  }
  const description = typeof body?.description === "string" ? body.description.trim() : "";
  if (description.length > 2000) {
    return { error: "Təsvir maksimum 2000 simvol ola bilər." };
  }
  const lat = Number(body?.lat);
  const lon = Number(body?.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return { error: "Xəritədə kamp yerinin yerini seçin." };
  }
  if (lat < AZ_BBOX.minLat || lat > AZ_BBOX.maxLat || lon < AZ_BBOX.minLon || lon > AZ_BBOX.maxLon) {
    return { error: "Seçilən koordinatlar Azərbaycan ərazisindən kənardır." };
  }
  const photos = Array.isArray(body?.photos) ? body.photos : [];
  if (photos.length > MAX_PHOTOS) {
    return { error: `Maksimum ${MAX_PHOTOS} foto əlavə etmək olar.` };
  }
  for (const photo of photos) {
    if (typeof photo !== "string" || !PHOTO_PREFIX_RE.test(photo) || photo.length > MAX_PHOTO_CHARS) {
      return { error: "Fotolar JPEG/PNG/WebP formatında və maksimum ~1.5MB olmalıdır." };
    }
  }
  return {
    name, description, lat, lon,
    photos: photos as string[],
    isPaid: !!body?.isPaid,
    isVerified: !!body?.isVerified,
  };
}

export async function insertAdminCampSite(input: AdminCampSiteInput): Promise<string> {
  const id = `camp-${randomUUID()}`;
  await dbClient.execute(
    `INSERT INTO camp_sites (id, name, description, lat, lon, photos, submitter_name, submitter_surname, submitter_phone, submitter_phone_normalized, status, points_awarded, is_verified, is_paid, added_by_admin, approved_at)
     VALUES (?, ?, ?, ?, ?, ?, 'GedəkGörək', '', '', '', 'approved', 0, ?, ?, 1, CURRENT_TIMESTAMP)`,
    [
      id, input.name, input.description || null, input.lat, input.lon,
      JSON.stringify(input.photos), toDbBool(input.isVerified), toDbBool(input.isPaid),
    ]
  );
  return id;
}

// Anti-gaming dedupe: the same phone re-submitting (or nudging the pin a few meters) near an
// existing pending/approved spot of theirs is a duplicate, not a new contribution.
const DUPLICATE_RADIUS_M = 150;

export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export async function findNearbyDuplicate(submission: CampSiteSubmission): Promise<boolean> {
  const rows = await dbClient.query(
    `SELECT lat, lon FROM camp_sites WHERE submitter_phone_normalized = ? AND status IN ('pending_approval', 'approved')`,
    [submission.submitterPhoneNormalized]
  );
  return rows.some(
    (row: any) => haversineMeters(submission.lat, submission.lon, Number(row.lat), Number(row.lon)) < DUPLICATE_RADIUS_M
  );
}

export async function insertCampSite(submission: CampSiteSubmission): Promise<string> {
  const id = `camp-${randomUUID()}`;
  await dbClient.execute(
    `INSERT INTO camp_sites (id, name, description, lat, lon, photos, submitter_name, submitter_surname, submitter_phone, submitter_phone_normalized, status, points_awarded, is_paid)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', 0, ?)`,
    [
      id, submission.name, submission.description || null, submission.lat, submission.lon,
      JSON.stringify(submission.photos), submission.submitterName, submission.submitterSurname,
      submission.submitterPhone, submission.submitterPhoneNormalized, toDbBool(submission.isPaid),
    ]
  );
  return id;
}

// --- Contributor points -------------------------------------------------------------------
// Points are always computed live from approved camp_sites rows (SUM of the per-row
// points_awarded snapshots) — there is no separate counter to drift out of sync, and an
// approve→reject flip deducts points automatically because rejection zeroes points_awarded.

export type ContributorStats = {
  points: number;
  approvedCount: number;
  pointsPerSite: number;
  threshold: number;
  rewardsEarned: number;
  rewardsRedeemed: number;
  rewardsAvailable: number;
  pointsToNextReward: number;
};

export async function getContributorStats(phoneNormalized: string): Promise<ContributorStats> {
  const { pointsPerSite, threshold } = await getCampPointsConfig();
  const rows = await dbClient.query(
    `SELECT COALESCE(SUM(points_awarded), 0) as points, COUNT(*) as approved_count
     FROM camp_sites WHERE submitter_phone_normalized = ? AND status = 'approved'`,
    [phoneNormalized]
  );
  const points = Number(rows[0]?.points) || 0;
  const approvedCount = Number(rows[0]?.approved_count) || 0;
  const redeemedRows = await dbClient.query(
    `SELECT COUNT(*) as count FROM camp_reward_redemptions WHERE phone_normalized = ?`,
    [phoneNormalized]
  );
  const rewardsRedeemed = Number(redeemedRows[0]?.count) || 0;
  const rewardsEarned = Math.floor(points / threshold);
  return {
    points,
    approvedCount,
    pointsPerSite,
    threshold,
    rewardsEarned,
    rewardsRedeemed,
    rewardsAvailable: Math.max(0, rewardsEarned - rewardsRedeemed),
    pointsToNextReward: threshold - (points % threshold),
  };
}

export type ContributorSummary = {
  phoneNormalized: string;
  submitterName: string;
  submitterSurname: string;
  approvedCount: number;
  points: number;
  rewardsEarned: number;
  rewardsRedeemed: number;
  rewardsAvailable: number;
};

export async function listContributors(): Promise<ContributorSummary[]> {
  const { threshold } = await getCampPointsConfig();
  // Admin-created rows carry an empty normalized phone — they are the team's own entries
  // and never participate in the contributor points/reward system.
  const rows = await dbClient.query(
    `SELECT submitter_phone_normalized as phone, COALESCE(SUM(points_awarded), 0) as points, COUNT(*) as approved_count
     FROM camp_sites WHERE status = 'approved' AND submitter_phone_normalized != ''
     GROUP BY submitter_phone_normalized`
  );
  const redemptions = await dbClient.query(
    `SELECT phone_normalized as phone, COUNT(*) as count FROM camp_reward_redemptions GROUP BY phone_normalized`
  );
  const redeemedByPhone = new Map<string, number>(
    redemptions.map((r: any) => [String(r.phone), Number(r.count) || 0])
  );

  const contributors: ContributorSummary[] = [];
  for (const row of rows) {
    // Latest submitted name/surname for this phone (people re-type their name each time).
    const nameRows = await dbClient.query(
      `SELECT submitter_name, submitter_surname FROM camp_sites
       WHERE submitter_phone_normalized = ? ORDER BY created_at DESC LIMIT 1`,
      [row.phone]
    );
    const points = Number(row.points) || 0;
    const rewardsEarned = Math.floor(points / threshold);
    const rewardsRedeemed = redeemedByPhone.get(String(row.phone)) || 0;
    contributors.push({
      phoneNormalized: String(row.phone),
      submitterName: nameRows[0]?.submitter_name || "",
      submitterSurname: nameRows[0]?.submitter_surname || "",
      approvedCount: Number(row.approved_count) || 0,
      points,
      rewardsEarned,
      rewardsRedeemed,
      rewardsAvailable: Math.max(0, rewardsEarned - rewardsRedeemed),
    });
  }
  contributors.sort((a, b) => b.points - a.points);
  return contributors;
}
