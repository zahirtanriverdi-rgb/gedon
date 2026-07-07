import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { seedUsers, seedTours, seedTourSlots } from '../src/data/toursData';
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

  console.log('[DB] Schema ready. Indexes created successfully.');

  await seedIfEmpty();
  await backfillMissingUsernames();
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
    const passwordHash = await bcrypt.hash(user.password || 'changeme123', 10);
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
