import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { seedUsers, seedTours, seedTourSlots } from '../src/data/toursData';
import { seedPasswords, SEED_FALLBACK_PASSWORD } from './seedCredentials';
import type { Tour } from '../src/types';
import { generateUniqueSlug } from './slugify';

// This abstracts the database layer, allowing seamless transition from Local SQLite to Production PostgreSQL.
export interface DBClient {
  query(sql: string, params?: any[]): Promise<any[]>;
  execute(sql: string, params?: any[]): Promise<void>;
}

// 1. Database connection logic based on environment
// Use PostgreSQL whenever DATABASE_URL is configured; otherwise fall back to local SQLite.
const isPostgres = !!process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '';

let dbClient: DBClient;

if (isPostgres) {
  console.log('[DB] Connecting to PostgreSQL Enterprise Database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  dbClient = {
    async query(sql: string, params: any[] = []) {
      // Basic translation of named/ordinal params for Postgres ($1, $2) vs SQLite (?, ?)
      const pgSql = sql.replace(/\?/g, (() => {
        let i = 1;
        return () => `$${i++}`;
      })());
      const res = await pool.query(pgSql, params);
      return res.rows;
    },
    async execute(sql: string, params: any[] = []) {
      const pgSql = sql.replace(/\?/g, (() => {
        let i = 1;
        return () => `$${i++}`;
      })());
      await pool.query(pgSql, params);
    }
  };
} else {
  console.log('[DB] Using Local node:sqlite fallback for MVP Development...');
  const dbPath = path.join(process.cwd(), 'database.sqlite');
  const db = new DatabaseSync(dbPath);
  // SQLite disables FK enforcement by default; enable it so ON DELETE CASCADE actually fires.
  db.exec('PRAGMA foreign_keys = ON;');

  dbClient = {
    async query(sql: string, params: any[] = []): Promise<any[]> {
      const stmt = db.prepare(sql);
      return stmt.all(...params) as any[];
    },
    async execute(sql: string, params: any[] = []): Promise<void> {
      const stmt = db.prepare(sql);
      stmt.run(...params);
    }
  };
}

// 2. Automated Schema Initialization
export async function initializeDatabase() {
  console.log('[DB] Initializing Enterprise Database Schema & Strict RBAC constraints...');
  
  // Users (Admin, Vendors, Customers)
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      username VARCHAR(255) UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      role VARCHAR(50) NOT NULL,
      phone VARCHAR(255),
      company_name VARCHAR(255),
      balance DECIMAL DEFAULT 0.0,
      avatar VARCHAR(1024),
      about TEXT,
      subscription_valid_until TIMESTAMP,
      extra_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      deleted_at TIMESTAMP,
      is_manually_deactivated BOOLEAN DEFAULT false
    );
  `);

  // Migration for databases created before `deleted_at` existed (soft-delete support for
  // admin-archived vendor accounts — see DELETE /api/admin/vendors/:id).
  try {
    await dbClient.execute(`ALTER TABLE users ADD COLUMN deleted_at TIMESTAMP`);
  } catch {
    // column already exists — safe to ignore
  }

  // Migration for databases created before `username`/`extra_data` existed (fresh installs
  // already get them from the CREATE TABLE above, so these are no-ops there).
  try {
    await dbClient.execute(`ALTER TABLE users ADD COLUMN username VARCHAR(255)`);
  } catch {
    // column already exists — safe to ignore
  }
  try {
    await dbClient.execute(`ALTER TABLE users ADD COLUMN extra_data TEXT`);
  } catch {
    // column already exists — safe to ignore
  }

  // Migration for databases created before `is_manually_deactivated` existed — lets an admin
  // hide a vendor's tours instantly, independent of their subscription_valid_until date.
  try {
    await dbClient.execute(`ALTER TABLE users ADD COLUMN is_manually_deactivated BOOLEAN DEFAULT false`);
  } catch {
    // column already exists — safe to ignore
  }

  // Password-reset flow (admin/vendor "forgot password" via email). `reset_token` stores a
  // SHA-256 hash of the raw token emailed to the user — never the raw value — so a DB leak
  // alone can't be used to reset accounts. Deliberately not UNIQUE: NULL is the common case
  // for every row that never requested a reset, and most DBs don't enforce uniqueness on NULL
  // consistently anyway (Postgres allows many NULLs; the token itself is random enough that a
  // real collision is not a realistic concern).
  try {
    await dbClient.execute(`ALTER TABLE users ADD COLUMN reset_token VARCHAR(255)`);
  } catch {
    // column already exists — safe to ignore
  }
  try {
    await dbClient.execute(`ALTER TABLE users ADD COLUMN reset_token_expires TIMESTAMP`);
  } catch {
    // column already exists — safe to ignore
  }

  // Email ownership verification — separate from the reset flow above. An admin/vendor must
  // confirm they actually control `email` (by entering a code mailed to it) before that address
  // is trusted as a password-reset destination; see POST /api/auth/send-email-verification and
  // /verify-email. `email_verified_at` resets to NULL whenever `email` itself changes (PUT
  // /api/users/:id), so editing the address always requires re-proving ownership.
  try {
    await dbClient.execute(`ALTER TABLE users ADD COLUMN email_verified_at TIMESTAMP`);
  } catch {
    // column already exists — safe to ignore
  }
  try {
    await dbClient.execute(`ALTER TABLE users ADD COLUMN email_verification_code VARCHAR(255)`);
  } catch {
    // column already exists — safe to ignore
  }
  try {
    await dbClient.execute(`ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMP`);
  } catch {
    // column already exists — safe to ignore
  }

  // Tours & Accommodations
  // `extra_data` holds the rich/optional Tour fields (includes, images, itinerary, roomTypes,
  // international/active-lifestyle specifics, etc.) as a JSON string, since those vary a lot
  // per tour type and don't need to be queried on directly.
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS tours (
      id VARCHAR(255) PRIMARY KEY,
      vendor_id VARCHAR(255) NOT NULL,
      vendor_name VARCHAR(255),
      name VARCHAR(255) NOT NULL,
      category VARCHAR(100) NOT NULL,
      difficulty VARCHAR(100) NOT NULL,
      region VARCHAR(255) NOT NULL,
      duration_days INTEGER NOT NULL,
      description TEXT,
      image TEXT,
      is_active BOOLEAN DEFAULT true,
      is_approved BOOLEAN DEFAULT false,
      status VARCHAR(20) DEFAULT 'pending_approval',
      pending_data TEXT,
      price_currency VARCHAR(10) DEFAULT 'AZN',
      rating DECIMAL DEFAULT 0,
      reviews_count INTEGER DEFAULT 0,
      extra_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Migration for databases created before `status`/`pending_data` existed (fresh installs
  // already get them from the CREATE TABLE above, so these are no-ops there).
  try {
    await dbClient.execute(`ALTER TABLE tours ADD COLUMN status VARCHAR(20) DEFAULT 'pending_approval'`);
  } catch {
    // column already exists — safe to ignore
  }
  try {
    await dbClient.execute(`ALTER TABLE tours ADD COLUMN pending_data TEXT`);
  } catch {
    // column already exists — safe to ignore
  }
  // Backfill status for rows that existed before the 3-state model (status was just added
  // above with a 'pending_approval' default, but rows that were already is_approved=1 should
  // read as 'approved', not go back into the review queue). Runs on every startup, so it's
  // scoped to pending_data IS NULL — a tour with a genuine pending edit under review always
  // has pending_data set, and must not be silently flipped back to 'approved' by this backfill.
  await dbClient.execute(
    `UPDATE tours SET status = 'approved' WHERE is_approved = true AND status = 'pending_approval' AND pending_data IS NULL`
  );
  await dbClient.execute(
    `UPDATE tours SET status = 'pending_approval' WHERE status IS NULL`
  );

  // Migration for databases created before `slug` existed — URL-friendly identifier used in
  // /tours/:slug routes. Backfill runs on every startup but only touches rows that don't have
  // one yet; the unique index is created afterwards so it never trips over the transient
  // all-NULL state on a fresh ALTER TABLE.
  try {
    await dbClient.execute(`ALTER TABLE tours ADD COLUMN slug VARCHAR(255)`);
  } catch {
    // column already exists — safe to ignore
  }
  const slugless = await dbClient.query(`SELECT id, name FROM tours WHERE slug IS NULL OR slug = ''`);
  for (const row of slugless) {
    const slug = await generateUniqueSlug(row.name, dbClient, row.id);
    await dbClient.execute(`UPDATE tours SET slug = ? WHERE id = ?`, [slug, row.id]);
  }
  await dbClient.execute(`CREATE UNIQUE INDEX IF NOT EXISTS idx_tours_slug ON tours(slug)`);

  // Tour Slots (Scheduling)
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS tour_slots (
      id VARCHAR(255) PRIMARY KEY,
      tour_id VARCHAR(255) NOT NULL,
      start_date VARCHAR(255) NOT NULL,
      end_date VARCHAR(255),
      capacity INTEGER NOT NULL,
      price DECIMAL NOT NULL,
      booked_count INTEGER DEFAULT 0,
      FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
    );
  `);

  // Bookings / WhatsApp Redirect CRM
  // `extra_data` holds optional Booking fields (attendanceStatus, operatorNote, ticketUrl,
  // team booking details, equipment rental info, etc.) as a JSON string.
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id VARCHAR(255) PRIMARY KEY,
      tour_id VARCHAR(255) NOT NULL,
      slot_id VARCHAR(255) NOT NULL,
      vendor_id VARCHAR(255) NOT NULL,
      customer_id VARCHAR(255),
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(255) NOT NULL,
      booking_reference VARCHAR(255) NOT NULL,
      participants_count INTEGER NOT NULL,
      total_amount DECIMAL NOT NULL,
      status VARCHAR(50) DEFAULT 'pending',
      payment_method VARCHAR(50) DEFAULT 'whatsapp',
      extra_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
      FOREIGN KEY (slot_id) REFERENCES tour_slots(id) ON DELETE CASCADE,
      FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Vendor transport tracking — which vehicle (bus, offroad, etc.) a vendor sent to which tour
  // departure, and at what cost. Admin-gated per vendor (users.extra_data.busTrackingEnabled).
  // The list itself is shared/visible across all vendors (so operators can see what transport
  // is already booked platform-wide); only the owning vendor may edit or delete their own rows.
  // tour_name/vendor_name are snapshots so a record still reads fine if the tour is renamed or
  // the vendor's display name changes later.
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS vendor_buses (
      id VARCHAR(255) PRIMARY KEY,
      vendor_id VARCHAR(255) NOT NULL,
      vendor_name VARCHAR(255),
      tour_id VARCHAR(255),
      tour_name VARCHAR(255) NOT NULL,
      contact_phone VARCHAR(255) NOT NULL DEFAULT '',
      bus_name VARCHAR(255),
      price DECIMAL NOT NULL,
      travel_date VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await dbClient.execute(
    `CREATE INDEX IF NOT EXISTS idx_vendor_buses_vendor ON vendor_buses(vendor_id)`
  );
  // Migration for the table as it existed before contact_phone/vendor_name existed. Note
  // plate_number was this column's very first name (renamed same day the field's real meaning
  // — a driver contact phone, not a vehicle plate — was clarified); a fresh install never sees
  // that column at all, so no migration reads from it.
  for (const alter of [
    `ALTER TABLE vendor_buses ADD COLUMN contact_phone VARCHAR(255) NOT NULL DEFAULT ''`,
    `ALTER TABLE vendor_buses ADD COLUMN vendor_name VARCHAR(255)`,
  ]) {
    try {
      await dbClient.execute(alter);
    } catch {
      // column already exists — safe to ignore
    }
  }

  // Driver blacklist — a vendor flags a bad driver (name/phone/reason) so other vendors avoid
  // them. Same shared-read/owner-write model as vendor_buses, gated by the same
  // busTrackingEnabled flag since it's part of the same "transport" workflow.
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS driver_blacklist (
      id VARCHAR(255) PRIMARY KEY,
      vendor_id VARCHAR(255) NOT NULL,
      vendor_name VARCHAR(255),
      driver_name VARCHAR(255) NOT NULL,
      phone_number VARCHAR(255) NOT NULL,
      reason TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await dbClient.execute(
    `CREATE INDEX IF NOT EXISTS idx_driver_blacklist_vendor ON driver_blacklist(vendor_id)`
  );

  // Saved guide-payment/net-income calculations — a snapshot a vendor keeps for a tour departure
  // after using the Kalkulyator tab. Unlike vendor_buses/driver_blacklist this is private
  // financial data: never shared across vendors, only ever queried/written scoped to vendor_id.
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS guide_calculations (
      id VARCHAR(255) PRIMARY KEY,
      vendor_id VARCHAR(255) NOT NULL,
      tour_id VARCHAR(255),
      tour_name VARCHAR(255) NOT NULL,
      slot_id VARCHAR(255),
      slot_date VARCHAR(255),
      participants INTEGER NOT NULL,
      price_per_person DECIMAL NOT NULL,
      duration_days INTEGER NOT NULL,
      tier VARCHAR(50) NOT NULL,
      main_guide_total DECIMAL NOT NULL,
      assistant_guide_total DECIMAL NOT NULL,
      guide_total DECIMAL NOT NULL,
      bus_price DECIMAL NOT NULL DEFAULT 0,
      niva_total DECIMAL NOT NULL DEFAULT 0,
      uaz_total DECIMAL NOT NULL DEFAULT 0,
      gaz66_total DECIMAL NOT NULL DEFAULT 0,
      sandwich_total DECIMAL NOT NULL DEFAULT 0,
      village_lunch_total DECIMAL NOT NULL DEFAULT 0,
      village_tea_total DECIMAL NOT NULL DEFAULT 0,
      national_park_total DECIMAL NOT NULL DEFAULT 0,
      other_costs_total DECIMAL NOT NULL DEFAULT 0,
      collected DECIMAL NOT NULL DEFAULT 0,
      net_income DECIMAL NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (vendor_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  await dbClient.execute(
    `CREATE INDEX IF NOT EXISTS idx_guide_calculations_vendor ON guide_calculations(vendor_id)`
  );
  await dbClient.execute(
    `CREATE INDEX IF NOT EXISTS idx_guide_calculations_tour ON guide_calculations(tour_id)`
  );
  // Migration for the table as it existed before costs were itemized (it originally lumped
  // everything into offroad_total/food_total) — those two old columns are left in place, unused,
  // on databases that already have them; harmless since nothing reads or writes them anymore.
  for (const alter of [
    `ALTER TABLE guide_calculations ADD COLUMN niva_total DECIMAL NOT NULL DEFAULT 0`,
    `ALTER TABLE guide_calculations ADD COLUMN uaz_total DECIMAL NOT NULL DEFAULT 0`,
    `ALTER TABLE guide_calculations ADD COLUMN gaz66_total DECIMAL NOT NULL DEFAULT 0`,
    `ALTER TABLE guide_calculations ADD COLUMN sandwich_total DECIMAL NOT NULL DEFAULT 0`,
    `ALTER TABLE guide_calculations ADD COLUMN village_lunch_total DECIMAL NOT NULL DEFAULT 0`,
    `ALTER TABLE guide_calculations ADD COLUMN village_tea_total DECIMAL NOT NULL DEFAULT 0`,
    `ALTER TABLE guide_calculations ADD COLUMN national_park_total DECIMAL NOT NULL DEFAULT 0`,
  ]) {
    try {
      await dbClient.execute(alter);
    } catch {
      // column already exists — safe to ignore
    }
  }

  // Reviews (anti-fake rating system: tied to a verified booking)
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS reviews (
      id VARCHAR(255) PRIMARY KEY,
      tour_id VARCHAR(255) NOT NULL,
      booking_id VARCHAR(255) NOT NULL,
      customer_id VARCHAR(255),
      customer_name VARCHAR(255) NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT,
      verified_attendee BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
      FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
    );
  `);

  // Community-submitted camp sites (public submissions, admin-moderated like tours).
  // `points_awarded` is a snapshot of the camp_points_per_site setting at approval time, so
  // later changes to the setting never retroactively rewrite a contributor's earned points.
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS camp_sites (
      id VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      lat DECIMAL NOT NULL,
      lon DECIMAL NOT NULL,
      photos TEXT,
      submitter_name VARCHAR(255) NOT NULL,
      submitter_surname VARCHAR(255) NOT NULL,
      submitter_phone VARCHAR(50) NOT NULL,
      submitter_phone_normalized VARCHAR(20) NOT NULL,
      status VARCHAR(20) DEFAULT 'pending_approval',
      rejection_reason TEXT,
      points_awarded INTEGER DEFAULT 0,
      approved_at TIMESTAMP,
      is_verified BOOLEAN DEFAULT false,
      is_paid BOOLEAN DEFAULT false,
      added_by_admin BOOLEAN DEFAULT false,
      extra_data TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
  await dbClient.execute(
    `CREATE INDEX IF NOT EXISTS idx_camp_sites_phone ON camp_sites(submitter_phone_normalized)`
  );

  // Migrations for camp_sites tables created before these columns existed:
  // is_verified — "we camped here and checked it ourselves" badge, admin-set only;
  // is_paid — paid vs free camp spot; added_by_admin — rows created straight from the admin
  // panel (auto-approved, excluded from the contributor points system).
  for (const alter of [
    `ALTER TABLE camp_sites ADD COLUMN is_verified BOOLEAN DEFAULT false`,
    `ALTER TABLE camp_sites ADD COLUMN is_paid BOOLEAN DEFAULT false`,
    `ALTER TABLE camp_sites ADD COLUMN added_by_admin BOOLEAN DEFAULT false`,
  ]) {
    try {
      await dbClient.execute(alter);
    } catch {
      // column already exists — safe to ignore
    }
  }

  // A row per free-tour reward handed out by an admin; rewardsEarned is always computed live
  // from points, so redemptions only ever add rows here (no counters to keep in sync).
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS camp_reward_redemptions (
      id VARCHAR(255) PRIMARY KEY,
      phone_normalized VARCHAR(20) NOT NULL,
      note TEXT,
      admin_id VARCHAR(255),
      redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Server-side key-value settings. Unlike the client's localStorage platformConfig, these
  // must live in the DB because the server itself reads them (e.g. stamping points_awarded
  // on camp-site approval).
  await dbClient.execute(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(100) PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);
  const defaultSettings: Array<[string, string]> = [
    ['camp_points_per_site', '10'],
    ['camp_reward_threshold', '100'],
    // Admin-toggleable feature flag: when 'false', the camp sites feature disappears from the
    // customer side entirely (header nav, /camp-sites page, public API) — admin keeps access.
    ['camp_sites_enabled', 'true'],
    // Admin-toggleable feature flag: when 'false', the "Qrup hesabla" group price calculator
    // nav button disappears from the customer side entirely.
    ['group_calculator_enabled', 'true'],
  ];
  for (const [key, value] of defaultSettings) {
    const existing = await dbClient.query(`SELECT key FROM settings WHERE key = ?`, [key]);
    if (existing.length === 0) {
      await dbClient.execute(`INSERT INTO settings (key, value) VALUES (?, ?)`, [key, value]);
    }
  }

  console.log('[DB] Schema ready. Indexes created successfully.');

  await seedIfEmpty();
  await backfillMissingUsernames();
  await fixAdminEmailTypo();
  await backfillSeedContentFixes();
}

// Content fixes for databases seeded from older seed data (seedIfEmpty only runs once, so
// corrections to src/data/toursData.ts never reach an existing DB by themselves). Every
// UPDATE is guarded to only touch rows still carrying the old value, making this idempotent
// and safe to run on every boot.
async function backfillSeedContentFixes() {
  // (a) Wrong or duplicated stock cover photos — tour-tufandag's old one was literally a car.
  const imageFixes: Array<[string, string, string]> = [
    ['tour-tufandag', 'photo-1544829099', 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&auto=format&fit=crop&q=80'],
    ['tour-niyaldag', 'photo-1454496522488', 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&auto=format&fit=crop&q=80'],
    ['tour-dilman', 'photo-1441974231531', 'https://images.unsplash.com/photo-1433086966358-54859d0ed716?w=800&auto=format&fit=crop&q=80'],
    ['tour-yardimli', 'photo-1473448912268', 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&auto=format&fit=crop&q=80'],
    ['tour-xalit-yasil-nerimankend', 'photo-1470071459604', 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?w=800&auto=format&fit=crop&q=80'],
    ['tour-xanbulan', 'photo-1447752875215', 'https://images.unsplash.com/photo-1439066615861-d1af74d74000?w=800&auto=format&fit=crop&q=80'],
    ['tour-gobelek-turu', 'photo-1447752875215', 'https://images.unsplash.com/photo-1418065460487-3e41a6c84dc5?w=800&auto=format&fit=crop&q=80'],
  ];
  for (const [tourId, oldMarker, newUrl] of imageFixes) {
    await dbClient.execute(
      `UPDATE tours SET image = ? WHERE id = ? AND image LIKE ?`,
      [newUrl, tourId, `%${oldMarker}%`]
    );
  }

  // (a2) The vendor's public avatar was a random Unsplash portrait of a stranger — clear it
  // so the organizer page falls back to its brand-initial badge.
  await dbClient.execute(
    `UPDATE users SET avatar = '' WHERE id = 'user-vendor-1' AND avatar LIKE '%photo-1534528741775%'`
  );

  // (b) Tufandağ's route runs via Khinalig/Shahyaylag (Quba side) per its description — not
  // the Gabala ski-resort approach the old region label implied.
  await dbClient.execute(
    `UPDATE tours SET region = ? WHERE id = 'tour-tufandag' AND region = 'Qəbələ (Tufandağ)'`,
    ['Quba (Xınalıq)']
  );

  // (c) Hand-written EN/RU translations added to the seed after a row was already in the DB
  // (e.g. the international/active-lifestyle tours) — copy them in wherever still missing.
  for (const tour of seedTours) {
    if (!tour.translations) continue;
    const rows = await dbClient.query(`SELECT extra_data FROM tours WHERE id = ?`, [tour.id]);
    if (!rows.length) continue;
    let extra: Record<string, any> = {};
    try {
      extra = JSON.parse(rows[0].extra_data || '{}') || {};
    } catch {
      extra = {};
    }
    if (extra.translations) continue;
    extra.translations = tour.translations;
    await dbClient.execute(`UPDATE tours SET extra_data = ? WHERE id = ?`, [JSON.stringify(extra), tour.id]);
  }
}

// Databases seeded from the original seed data have the admin's email with a typo'd domain
// ("gedekgore.az", missing the "k"). The seed file now says admin@gedekgorek.az — align any
// existing row so the documented login e-mail actually works.
async function fixAdminEmailTypo() {
  await dbClient.execute(
    `UPDATE users SET email = 'admin@gedekgorek.az' WHERE email = 'admin@gedekgore.az' AND role = 'admin'`
  );
}

// Databases seeded before the `username` column existed have it as NULL on every row
// (ALTER TABLE can't retroactively populate it). Fill it in from the seed data whenever
// a row's email matches a known seed user and its username is still empty.
async function backfillMissingUsernames() {
  for (const user of seedUsers) {
    if (!user.username) continue;
    await dbClient.execute(
      `UPDATE users SET username = ? WHERE email = ? AND (username IS NULL OR username = '')`,
      [user.username, user.email]
    );
  }
}

// 3. One-time demo data seed so a fresh Postgres/SQLite database isn't an empty marketplace.
// Only runs when the `tours` table has zero rows; bookings/reviews are intentionally left
// empty so they can be created live through the app to exercise the real API end-to-end.
async function seedIfEmpty() {
  const existing = await dbClient.query('SELECT COUNT(*) as count FROM tours');
  const tourCount = Number(existing[0]?.count) || 0;
  if (tourCount > 0) return;

  console.log('[DB] Tours table is empty — seeding demo users, tours & slots...');

  for (const user of seedUsers) {
    const passwordHash = await bcrypt.hash(seedPasswords[user.email] || SEED_FALLBACK_PASSWORD, 10);
    const extra: Record<string, any> = {};
    if (user.guides && user.guides.length > 0) extra.guides = user.guides;
    if (user.aboutTranslations) extra.aboutTranslations = user.aboutTranslations;
    await dbClient.execute(
      `INSERT INTO users (id, name, email, username, password_hash, role, phone, company_name, balance, avatar, about, extra_data, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id, user.name, user.email, user.username || null, passwordHash, user.role, user.phone || null,
        user.companyName || null, Number(user.balance) || 0, user.avatar || null,
        user.about || null, JSON.stringify(extra), user.createdAt || new Date().toISOString()
      ]
    );
  }

  for (const tour of seedTours as Tour[]) {
    const {
      id, vendorId, vendorName, name, category, difficulty, region, durationDays,
      description, image, isActive, isApproved, priceCurrency, rating, reviewsCount,
      slug: _seedSlug, ...extra
    } = tour;
    const status = isApproved ? 'approved' : 'pending_approval';
    const slug = await generateUniqueSlug(name, dbClient);
    await dbClient.execute(
      `INSERT INTO tours (id, vendor_id, vendor_name, name, slug, category, difficulty, region, duration_days, description, image, is_active, is_approved, status, price_currency, rating, reviews_count, extra_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, vendorId, vendorName || null, name, slug, category, difficulty, region, Number(durationDays),
        description || null, image || null,
        isActive === false ? 0 : 1, isApproved ? 1 : 0, status, priceCurrency || 'AZN',
        rating !== undefined && rating !== null ? Number(rating) : null,
        reviewsCount !== undefined && reviewsCount !== null ? Number(reviewsCount) : null,
        JSON.stringify(extra)
      ]
    );
  }

  for (const slot of seedTourSlots) {
    await dbClient.execute(
      `INSERT INTO tour_slots (id, tour_id, start_date, end_date, price, capacity, booked_count) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [slot.id, slot.tourId, slot.startDate, slot.endDate || null, Number(slot.price), Number(slot.capacity), Number(slot.bookedCount) || 0]
    );
  }

  console.log(`[DB] Seed complete: ${seedUsers.length} users, ${seedTours.length} tours, ${seedTourSlots.length} slots.`);
}

export default dbClient;
