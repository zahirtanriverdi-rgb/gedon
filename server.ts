import express from "express";
import path from "path";
import fs from "fs";
import { jsPDF } from "jspdf";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { initializeDatabase } from "./server/db";
import dbClient from "./server/db";
import { scheduleTourTranslation } from "./server/translate";
import {
  startWhatsApp,
  getWhatsAppStatus,
  logoutWhatsApp,
  isRegisteredOnWhatsApp,
  checkAndConsumeRateLimit,
  generateCaptchaChallenge,
  verifyCaptchaChallenge
} from "./server/whatsapp";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Lazy initialize GoogleGenAI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Body parser (raised limit: tour/vendor forms can include base64-encoded images/GPX data
// well beyond Express's 100kb default, which otherwise fails with a hard-to-diagnose
// "request entity too large" 413 whose HTML error page breaks response.json() on the client)
app.use(express.json({ limit: '50mb' }));

// JWT/bcrypt Authentication System
//
// JWT_SECRET must come from the environment in any real deployment. If it's missing we
// generate a random one at boot instead of falling back to a fixed string — a hardcoded
// fallback would let anyone who reads this source forge valid tokens for any user/role.
// The tradeoff: without JWT_SECRET set, all sessions are invalidated on server restart.
if (!process.env.JWT_SECRET) {
  console.warn("[SECURITY] JWT_SECRET is not set — generating a random one for this process only. Set JWT_SECRET in your environment for stable sessions across restarts.");
}
const JWT_SECRET = process.env.JWT_SECRET || randomUUID() + randomUUID();

// Verifies the `Authorization: Bearer <token>` header issued by /api/auth/operator/login or
// /api/auth/admin/login. Attaches the decoded { id, email, role } to req.operator for route
// handlers that need to know which user is calling and enforce per-resource ownership.
function authenticateUser(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization as string | undefined;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Giriş tələb olunur (Authorization token yoxdur)." });
  }
  try {
    req.operator = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Token etibarsızdır və ya vaxtı bitib. Yenidən daxil olun." });
  }
}

// Non-throwing variant for GET endpoints that are public by default (customer marketplace
// browsing needs no login) but scope their response when a valid vendor/admin token IS
// present. Returns the decoded { id, email, role } payload, or null if there's no token
// or it doesn't verify — callers treat null the same as "anonymous/public request".
function getOptionalUser(req: any): { id: string; email: string; role: string } | null {
  const authHeader = req.headers.authorization as string | undefined;
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch {
    return null;
  }
}

// Converts a raw `users` row into the shape the frontend's User type expects. `extra_data`
// currently only carries `guides` (vendor team members) but is structured so future optional
// profile fields can be added without another schema migration.
function rowToUser(row: any) {
  let extra: Record<string, any> = {};
  try { extra = row.extra_data ? JSON.parse(row.extra_data) : {}; } catch { extra = {}; }
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    username: row.username || undefined,
    role: row.role,
    phone: row.phone,
    avatar: row.avatar || undefined,
    companyName: row.company_name || undefined,
    balance: Number(row.balance) || 0,
    about: row.about || undefined,
    guides: extra.guides || undefined,
    subscriptionValidUntil: row.subscription_valid_until || undefined,
    createdAt: row.created_at,
    isArchived: !!row.deleted_at,
    isManuallyDeactivated: !!row.is_manually_deactivated,
  };
}

// ADMIN LOGIN (JWT Sign & Return) — checks the real `users` table (Postgres/SQLite via
// server/db.ts).
app.post("/api/auth/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Zəhmət olmasa e-poçt və şifrəni daxil edin." });
  }

  try {
    const rows = await dbClient.query(
      `SELECT * FROM users WHERE email = ? AND role = 'admin'`,
      [email]
    );
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "E-poçt və ya şifrə yanlışdır!" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({
      success: true,
      token,
      user: rowToUser(user)
    });
  } catch (error: any) {
    console.error("[POST /api/auth/admin/login] error:", error);
    return res.status(500).json({ error: "Giriş zamanı server xətası baş verdi: " + error.message });
  }
});

// OPERATOR LOGIN (JWT Sign & Return) — checks the real `users` table (Postgres/SQLite via
// server/db.ts), not a mock in-memory list, so actual seeded/registered vendor accounts work.
// `identifier` accepts either the vendor's email or username.
app.post("/api/auth/operator/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) {
    return res.status(400).json({ error: "Zəhmət olmasa istifadəçi adı/e-poçt və şifrəni daxil edin." });
  }

  try {
    const rows = await dbClient.query(
      `SELECT * FROM users WHERE (email = ? OR username = ?) AND role = 'vendor' AND deleted_at IS NULL`,
      [identifier, identifier]
    );
    const user = rows[0];
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: "İstifadəçi adı/e-poçt və ya şifrə yanlışdır!" });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
    return res.json({
      success: true,
      token,
      user: rowToUser(user)
    });
  } catch (error: any) {
    console.error("[POST /api/auth/operator/login] error:", error);
    return res.status(500).json({ error: "Giriş zamanı server xətası baş verdi: " + error.message });
  }
});

// POST /api/admin/vendors — admin creates a new Tour Operator (vendor) account. Only the
// company name, login (username or email), and an initial password are required; the vendor
// fills in the rest of their own profile (phone, about, guides, etc.) after their first login.
// The password is bcrypt-hashed before it ever reaches the database — the plaintext value is
// never stored or logged, and the response never echoes the hash back.
app.post("/api/admin/vendors", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Yalnız adminlər yeni operator hesabı yarada bilər." });
  }

  try {
    const { companyName, login, password } = req.body || {};
    if (!companyName || !login || !password) {
      return res.status(400).json({ error: "Şirkət adı, login və ilkin parol tələb olunur." });
    }
    if (String(password).length < 6) {
      return res.status(400).json({ error: "Parol ən azı 6 simvol olmalıdır." });
    }

    const trimmedLogin = String(login).trim();
    // The login doubles as either an email or a username. `email` is NOT NULL/UNIQUE in the
    // schema, so if the admin typed a plain username we derive a private placeholder email —
    // it's never shown to anyone and login still works via the username itself.
    const isEmailLogin = trimmedLogin.includes('@');
    const email = isEmailLogin ? trimmedLogin : `${trimmedLogin.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@vendor.gedekgorek.local`;
    const username = isEmailLogin ? null : trimmedLogin;

    const existing = await dbClient.query(
      `SELECT id FROM users WHERE email = ? OR (username IS NOT NULL AND username = ?)`,
      [email, trimmedLogin]
    );
    if (existing.length > 0) {
      return res.status(409).json({ error: "Bu login artıq istifadə olunur. Zəhmət olmasa başqa login seçin." });
    }

    const passwordHash = await bcrypt.hash(String(password), 10);
    const id = `user-${randomUUID()}`;

    await dbClient.execute(
      `INSERT INTO users (id, name, email, username, password_hash, role, phone, company_name, balance, created_at)
       VALUES (?, ?, ?, ?, ?, 'vendor', '', ?, 0, CURRENT_TIMESTAMP)`,
      [id, companyName, email, username, passwordHash, companyName]
    );

    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [id]);
    return res.status(201).json({ success: true, user: rowToUser(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/admin/vendors] error:", error);
    return res.status(500).json({ error: "Vendor hesabı yaradıla bilmədi: " + error.message });
  }
});

// DELETE /api/admin/vendors/:id — soft-deletes (archives) a vendor account. Requires the
// admin to confirm with their OWN password (checked twice client-side as a "type it again"
// confirmation, then sent once here and verified server-side against the admin's real hash —
// this isn't the vendor's password, since an admin has no legitimate way to know that).
// This is a soft delete: the user row is only stamped with deleted_at, never removed, so all
// of the vendor's tours/slots/bookings stay intact for records. The vendor can no longer log
// in (see /api/auth/operator/login's deleted_at IS NULL check) and disappears from the
// customer-facing marketplace (see GET /api/tours), but nothing about their history is lost.
app.delete("/api/admin/vendors/:id", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Yalnız adminlər operator hesabını silə bilər." });
  }

  try {
    const { adminPassword } = req.body || {};
    if (!adminPassword) {
      return res.status(400).json({ error: "Təsdiq üçün öz parolunuzu daxil edin." });
    }

    const adminRows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.operator.id]);
    const adminRow = adminRows[0];
    if (!adminRow || !bcrypt.compareSync(String(adminPassword), adminRow.password_hash)) {
      return res.status(401).json({ error: "Daxil etdiyiniz parol yanlışdır." });
    }

    const vendorRows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    const vendorRow = vendorRows[0];
    if (!vendorRow || vendorRow.role !== 'vendor') {
      return res.status(404).json({ error: "Operator tapılmadı." });
    }
    if (vendorRow.deleted_at) {
      return res.status(409).json({ error: "Bu operator artıq arxivləşdirilib." });
    }

    await dbClient.execute('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/admin/vendors/:id] error:", error);
    return res.status(500).json({ error: "Operator arxivləşdirilə bilmədi: " + error.message });
  }
});

// PUT /api/users/:id — update a user's profile. An admin can update any user, including
// login credentials (username/password) and subscription; a vendor/customer can only update
// their own profile fields (name, email, phone, companyName, avatar, about, guides) — never
// their own username or password through this route (password changes must go through
// /api/auth/change-password, which verifies the current password first).
app.put("/api/users/:id", authenticateUser, async (req: any, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
    const existingRow = rows[0];
    const isAdmin = req.operator.role === 'admin';
    const isSelf = req.operator.id === req.params.id;
    if (!isAdmin && !isSelf) {
      return res.status(403).json({ error: "Bu istifadəçini yeniləmək icazəniz yoxdur." });
    }

    const body = req.body || {};
    const name = body.name !== undefined ? body.name : existingRow.name;
    const email = body.email !== undefined ? body.email : existingRow.email;
    const phone = body.phone !== undefined ? body.phone : existingRow.phone;
    const companyName = body.companyName !== undefined ? body.companyName : existingRow.company_name;
    const avatar = body.avatar !== undefined ? body.avatar : existingRow.avatar;
    const about = body.about !== undefined ? body.about : existingRow.about;

    let extra: Record<string, any> = {};
    try { extra = existingRow.extra_data ? JSON.parse(existingRow.extra_data) : {}; } catch { extra = {}; }
    if (body.guides !== undefined) extra.guides = body.guides;

    let username = existingRow.username;
    let passwordHash = existingRow.password_hash;
    let subscriptionValidUntil = existingRow.subscription_valid_until;
    let isManuallyDeactivated = !!existingRow.is_manually_deactivated;
    if (isAdmin) {
      if (body.username !== undefined) username = body.username;
      if (body.password) passwordHash = await bcrypt.hash(body.password, 10);
      if (body.subscriptionValidUntil !== undefined) subscriptionValidUntil = body.subscriptionValidUntil;
      if (body.isManuallyDeactivated !== undefined) isManuallyDeactivated = !!body.isManuallyDeactivated;
    }

    await dbClient.execute(
      `UPDATE users SET name = ?, email = ?, username = ?, password_hash = ?, phone = ?, company_name = ?, avatar = ?, about = ?, subscription_valid_until = ?, extra_data = ?, is_manually_deactivated = ? WHERE id = ?`,
      [name, email, username, passwordHash, phone, companyName, avatar, about, subscriptionValidUntil, JSON.stringify(extra), isManuallyDeactivated ? 1 : 0, req.params.id]
    );

    const updatedRows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    res.json({ user: rowToUser(updatedRows[0]) });
  } catch (error: any) {
    console.error("[PUT /api/users/:id] error:", error);
    res.status(500).json({ error: "İstifadəçi yenilənə bilmədi: " + error.message });
  }
});

// POST /api/auth/change-password — the logged-in user changes their own password. Requires
// the current password to verify identity before writing a new bcrypt hash.
app.post("/api/auth/change-password", authenticateUser, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: "Cari və yeni şifrəni daxil edin." });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "Yeni şifrə ən azı 6 simvol olmalıdır." });
    }

    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.operator.id]);
    if (!rows.length) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
    const user = rows[0];
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: "Cari şifrə yanlışdır." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await dbClient.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.operator.id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/auth/change-password] error:", error);
    res.status(500).json({ error: "Şifrə yenilənə bilmədi: " + error.message });
  }
});

// In-memory "Bookings" table to act as our backend DB tracking WhatsApp click-through leads
interface ServerBooking {
  id: string;
  tourId: string;
  startDate: string;
  participantsCount: number;
  vendorId: string;
  booking_reference: string;
  status: 'Redirected_to_WhatsApp';
  clickedAt: string;
}

const serverBookings: ServerBooking[] = [];

// Endpoint to fetch CBAR live rates (dynamic or fallback to 22.05.2026)
app.get("/api/exchange-rates/cbar", async (req, res) => {
  try {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateStr = `${day}.${month}.${year}`;

    let url = `https://cbar.az/currencies/${dateStr}.xml`;
    console.log(`[CBAR] Fetching live rates from: ${url}`);

    let response = await globalThis.fetch(url);
    if (!response.ok) {
      console.log(`[CBAR] Fetch failed for dynamic date ${dateStr} (status ${response.status}). Falling back to static target 22.05.2026.xml`);
      url = "https://cbar.az/currencies/22.05.2026.xml";
      response = await globalThis.fetch(url);
    }

    if (!response.ok) {
      throw new Error(`CBAR returned status ${response.status}`);
    }

    const xmlText = await response.text();

    const usdMatch = xmlText.match(/<Valute Code="USD">[\s\S]*?<Value>([\d.]+)<\/Value>/);
    const eurMatch = xmlText.match(/<Valute Code="EUR">[\s\S]*?<Value>([\d.]+)<\/Value>/);

    if (!usdMatch || !eurMatch) {
      throw new Error("Could not parse USD/EUR values from CBAR XML response.");
    }

    const usd = parseFloat(usdMatch[1]);
    const eur = parseFloat(eurMatch[1]);

    console.log(`[CBAR] Successfully parsed rates: USD = ${usd} AZN, EUR = ${eur} AZN`);
    return res.json({ success: true, USD: usd, EUR: eur, date: dateStr, source: url });
  } catch (error: any) {
    console.error("[CBAR Rate Fetch Error]", error);
    try {
      const fallbackUrl = "https://cbar.az/currencies/22.05.2026.xml";
      const resp = await globalThis.fetch(fallbackUrl);
      if (resp.ok) {
        const text = await resp.text();
        const usdMatch = text.match(/<Valute Code="USD">[\s\S]*?<Value>([\d.]+)<\/Value>/);
        const eurMatch = text.match(/<Valute Code="EUR">[\s\S]*?<Value>([\d.]+)<\/Value>/);
        if (usdMatch && eurMatch) {
          return res.json({
            success: true,
            USD: parseFloat(usdMatch[1]),
            EUR: parseFloat(eurMatch[1]),
            date: "22.05.2026",
            source: fallbackUrl,
            warning: "Fetched from backup date due to primary error"
          });
        }
      }
    } catch (e) {}

    return res.status(500).json({ error: "CBAR məzənnələrini gətirmək mümkün olmadı: " + error.message });
  }
});

// Endpoint to track WhatsApp redirect analytics (Lead Tracking)
app.post("/api/bookings/whatsapp-click", (req, res) => {
  const { tourId, startDate, participantsCount, vendorId, booking_reference } = req.body;

  if (!tourId || !startDate || !participantsCount || !vendorId || !booking_reference) {
    return res.status(400).json({ error: "Zəhmət olmasa bütün məlumatları qeyd edin (tourId, startDate, participantsCount, vendorId, booking_reference)" });
  }

  const newLead: ServerBooking = {
    id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tourId,
    startDate,
    participantsCount: Number(participantsCount),
    vendorId,
    booking_reference,
    status: "Redirected_to_WhatsApp",
    clickedAt: new Date().toISOString()
  };

  serverBookings.push(newLead);
  console.log(`[Lead Tracked] Booking Ref: ${booking_reference} | Tour: ${tourId} -> Redirected to WhatsApp.`);

  return res.json({
    success: true,
    message: "Klik statistikası uğurla qeydə alındı (Redirected_to_WhatsApp)",
    lead: newLead,
    totalLeadsForVendor: serverBookings.filter(b => b.vendorId === vendorId).length
  });
});

// Endpoint to expose all tracked WhatsApp leads for admin/vendor analytic panels
app.get("/api/bookings/whatsapp-leads", (req, res) => {
  res.json({
    leads: serverBookings,
    totalCount: serverBookings.length
  });
});

// ============================================================================
// WhatsApp verification — checks whether a phone number actually has an active
// WhatsApp account through a Baileys-driven WhatsApp Web session (see
// server/whatsapp.ts). No code is sent/entered: a positive check is itself the
// verification. The session is connected/disconnected from the admin panel by
// scanning a QR code.
// ============================================================================

// GET/POST connection management — admin-only, mirrors the /api/admin/vendors role check.
app.get("/api/whatsapp/status", authenticateUser, (req: any, res) => {
  if (req.operator.role !== "admin") {
    return res.status(403).json({ error: "Yalnız adminlər WhatsApp bağlantısını idarə edə bilər." });
  }
  return res.json(getWhatsAppStatus());
});

app.post("/api/whatsapp/connect", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== "admin") {
    return res.status(403).json({ error: "Yalnız adminlər WhatsApp bağlantısını idarə edə bilər." });
  }
  try {
    await startWhatsApp();
    return res.json(getWhatsAppStatus());
  } catch (error: any) {
    console.error("[POST /api/whatsapp/connect] error:", error);
    return res.status(500).json({ error: "WhatsApp sessiyası başladıla bilmədi: " + error.message });
  }
});

app.post("/api/whatsapp/logout", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== "admin") {
    return res.status(403).json({ error: "Yalnız adminlər WhatsApp bağlantısını idarə edə bilər." });
  }
  await logoutWhatsApp();
  return res.json({ success: true });
});

// GET /api/whatsapp/captcha — public, issues a one-time math challenge that must accompany
// the verify-number call below. Keeps a scripted loop from cheaply hammering the connected
// number just by varying phone numbers (on top of the rate limits already in place).
app.get("/api/whatsapp/captcha", (req, res) => {
  return res.json(generateCaptchaChallenge());
});

// POST /api/whatsapp/verify-number — public (guest booking flow, same as whatsapp-click
// above). Requires a valid captcha answer, is rate-limited per phone + globally, and simply
// reports whether the number has an active WhatsApp account — that check result IS the
// verification, no code is sent or entered.
app.post("/api/whatsapp/verify-number", async (req, res) => {
  const { phone, captchaId, captchaAnswer } = req.body || {};
  if (!phone || typeof phone !== "string" || phone.replace(/\D/g, "").length < 7) {
    return res.status(400).json({ error: "Zəhmət olmasa düzgün WhatsApp nömrəsi daxil edin." });
  }
  if (!captchaId || captchaAnswer === undefined || captchaAnswer === null || captchaAnswer === "") {
    return res.status(400).json({ error: "Zəhmət olmasa təhlükəsizlik sualını cavablandırın." });
  }
  if (!verifyCaptchaChallenge(String(captchaId), Number(captchaAnswer))) {
    return res.status(400).json({ error: "Təhlükəsizlik sualının cavabı yanlışdır. Zəhmət olmasa yenidən cəhd edin.", captchaFailed: true });
  }

  const rate = checkAndConsumeRateLimit(phone);
  if (!rate.allowed) {
    return res.status(429).json({
      error: "Çox sayda cəhd edildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.",
      reason: rate.reason,
      retryAfterSec: rate.retryAfterSec
    });
  }

  try {
    const hasWhatsapp = await isRegisteredOnWhatsApp(phone);
    if (!hasWhatsapp) {
      return res.status(422).json({ error: "Bu nömrədə aktiv WhatsApp hesabı tapılmadı.", hasWhatsapp: false });
    }
    return res.json({ success: true, hasWhatsapp: true });
  } catch (error: any) {
    if (error.message === "WHATSAPP_NOT_CONNECTED") {
      return res.status(503).json({ error: "WhatsApp doğrulama sistemi hazırda əlçatan deyil. Zəhmət olmasa bir az sonra yenidən cəhd edin." });
    }
    console.error("[POST /api/whatsapp/verify-number] error:", error);
    return res.status(500).json({ error: "Nömrə yoxlanıla bilmədi." });
  }
});

// ============================================================================
// Marketplace Core Data API — Tours / Slots / Bookings / Reviews
// Backed by dbClient (server/db.ts), which talks to PostgreSQL when
// DATABASE_URL is configured and falls back to local SQLite otherwise.
// All queries below use "?" placeholders bound through dbClient's params
// array, which dbClient translates into safely parameterized queries for
// both drivers — no request value is ever concatenated into SQL text.
// ============================================================================

// Fields that live as real columns on the `tours` table. Everything else on
// the request body (itinerary, roomTypes, includes, etc.) is preserved as-is
// inside the `extra_data` JSON column so the full Tour shape round-trips.
const TOUR_CORE_FIELDS = [
  'id', 'vendorId', 'vendorName', 'name', 'category', 'difficulty', 'region',
  'durationDays', 'description', 'image', 'isActive', 'isApproved', 'status',
  'priceCurrency', 'rating', 'reviewsCount', 'createdAt',
  // pendingData lives in its own `pending_data` column, never inside extra_data.
  'pendingData'
];

function rowToTour(row: any) {
  let extra: Record<string, any> = {};
  try { extra = row.extra_data ? JSON.parse(row.extra_data) : {}; } catch { extra = {}; }
  let pendingData: Record<string, any> | undefined;
  try { pendingData = row.pending_data ? JSON.parse(row.pending_data) : undefined; } catch { pendingData = undefined; }
  const status: 'approved' | 'pending_approval' | 'rejected' = row.status || (row.is_approved ? 'approved' : 'pending_approval');
  return {
    ...extra,
    id: row.id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name,
    name: row.name,
    category: row.category,
    difficulty: row.difficulty,
    region: row.region,
    durationDays: Number(row.duration_days),
    description: row.description,
    image: row.image,
    isActive: !!row.is_active,
    isApproved: status === 'approved',
    status,
    pendingData,
    priceCurrency: row.price_currency,
    rating: Number(row.rating) || 0,
    reviewsCount: Number(row.reviews_count) || 0,
    createdAt: row.created_at,
  };
}

function splitTourBody(body: Record<string, any>) {
  const extra: Record<string, any> = {};
  for (const key of Object.keys(body)) {
    if (!TOUR_CORE_FIELDS.includes(key)) extra[key] = body[key];
  }
  return extra;
}

// GET /api/tours — list tours, optionally filtered by vendorId / category / isApproved / isActive
// GET /api/tours — public by default (the customer marketplace needs to browse everyone's
// tours), but a valid vendor token scopes the result to that vendor's own tours only —
// the vendorId query param is ignored in that case so a vendor can't request another
// vendor's data just by passing a different id. An admin token sees everything, same as
// an anonymous/public request.
app.get("/api/tours", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const { category, isApproved, isActive } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (user && user.role === 'vendor') {
      conditions.push('vendor_id = ?');
      params.push(user.id);
    } else if (user && user.role === 'admin') {
      if (req.query.vendorId) {
        conditions.push('vendor_id = ?');
        params.push(String(req.query.vendorId));
      }
    } else {
      // Anonymous/customer requests only ever see tours with status = 'approved'. The moment
      // a vendor edits a live tour (status flips to 'pending_approval', see PUT handler below)
      // or an admin rejects one, it disappears from the marketplace immediately — no exceptions,
      // and no "keep showing the stale approved version while a proposal is under review".
      conditions.push("status = 'approved'");
      // A vendor keeps showing up for 3 days past subscriptionValidUntil (grace period —
      // matches the copy in AdminPortal's subscription section); only once that grace
      // period has fully elapsed do their tours disappear from the public marketplace.
      const subscriptionGraceCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      conditions.push(
        "vendor_id NOT IN (SELECT id FROM users WHERE deleted_at IS NOT NULL OR is_manually_deactivated = 1 OR (subscription_valid_until IS NOT NULL AND subscription_valid_until < ?))"
      );
      params.push(subscriptionGraceCutoff);
      if (req.query.vendorId) {
        conditions.push('vendor_id = ?');
        params.push(String(req.query.vendorId));
      }
    }
    if (category) { conditions.push('category = ?'); params.push(String(category)); }
    if (isApproved !== undefined) { conditions.push('is_approved = ?'); params.push(isApproved === 'true' ? 1 : 0); }
    if (isActive !== undefined) { conditions.push('is_active = ?'); params.push(isActive === 'true' ? 1 : 0); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbClient.query(`SELECT * FROM tours ${whereClause} ORDER BY created_at DESC`, params);
    res.json({ tours: rows.map(rowToTour) });
  } catch (error: any) {
    console.error("[GET /api/tours] error:", error);
    res.status(500).json({ error: "Turları gətirmək mümkün olmadı: " + error.message });
  }
});

// GET /api/tours/:id — single tour. Same visibility rule as the list endpoint: a vendor may
// fetch their own tour in any status, an admin may fetch anything, but an anonymous/customer
// request (or a vendor token for someone else's tour) 404s unless the tour is 'approved' —
// pending/rejected tours don't leak through direct-by-id lookups either.
app.get("/api/tours/:id", async (req, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM tours WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Tur tapılmadı." });
    const tour = rowToTour(rows[0]);

    const user = getOptionalUser(req);
    const isOwnerVendor = !!user && user.role === 'vendor' && user.id === tour.vendorId;
    const isAdmin = !!user && user.role === 'admin';
    if (!isAdmin && !isOwnerVendor && tour.status !== 'approved') {
      return res.status(404).json({ error: "Tur tapılmadı." });
    }

    res.json({ tour });
  } catch (error: any) {
    console.error("[GET /api/tours/:id] error:", error);
    res.status(500).json({ error: "Turu gətirmək mümkün olmadı: " + error.message });
  }
});

// POST /api/tours — create a tour
// POST /api/tours — vendors may only create tours under their own vendorId (the JWT's
// subject, not whatever the client sends); admins may create/assign on any vendor's behalf.
// New vendor-created tours are always forced unapproved — only an admin can approve.
app.post("/api/tours", authenticateUser, async (req: any, res) => {
  try {
    const body = req.body || {};
    const isAdmin = req.operator.role === 'admin';
    const vendorId = isAdmin ? body.vendorId : req.operator.id;
    const { name, category, difficulty, region, durationDays, description, image } = body;
    if (!vendorId || !name || !category || !difficulty || !region || !durationDays) {
      return res.status(400).json({ error: "Zəhmət olmasa bütün məcburi sahələri doldurun (vendorId, name, category, difficulty, region, durationDays)." });
    }

    const id = body.id || `tour-${randomUUID()}`;
    const extra = splitTourBody(body);
    const status: 'approved' | 'pending_approval' = isAdmin && body.status === 'approved' ? 'approved' : 'pending_approval';

    await dbClient.execute(
      `INSERT INTO tours (id, vendor_id, vendor_name, name, category, difficulty, region, duration_days, description, image, is_active, is_approved, status, pending_data, price_currency, rating, reviews_count, extra_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, vendorId, body.vendorName || null, name, category, difficulty, region, Number(durationDays),
        description || null, image || null,
        body.isActive === undefined ? 1 : (body.isActive ? 1 : 0),
        status === 'approved' ? 1 : 0,
        status,
        null,
        body.priceCurrency || 'AZN',
        Number(body.rating) || 0,
        Number(body.reviewsCount) || 0,
        JSON.stringify(extra)
      ]
    );

    const rows = await dbClient.query('SELECT * FROM tours WHERE id = ?', [id]);
    scheduleTourTranslation(id, name, description || null);
    res.status(201).json({ tour: rowToTour(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/tours] error:", error);
    res.status(500).json({ error: "Tur yaradıla bilmədi: " + error.message });
  }
});

// Writes a fully-merged Tour object onto the live row's core columns + extra_data.
async function writeLiveTourRow(id: string, merged: Record<string, any>, status: 'approved' | 'pending_approval' | 'rejected', pendingData: Record<string, any> | null) {
  const extra = splitTourBody(merged);
  await dbClient.execute(
    `UPDATE tours SET vendor_id = ?, vendor_name = ?, name = ?, category = ?, difficulty = ?, region = ?, duration_days = ?, description = ?, image = ?, is_active = ?, is_approved = ?, status = ?, pending_data = ?, price_currency = ?, rating = ?, reviews_count = ?, extra_data = ? WHERE id = ?`,
    [
      merged.vendorId, merged.vendorName || null, merged.name, merged.category, merged.difficulty, merged.region,
      Number(merged.durationDays), merged.description || null, merged.image || null,
      merged.isActive ? 1 : 0, status === 'approved' ? 1 : 0, status,
      pendingData ? JSON.stringify(pendingData) : null,
      merged.priceCurrency || 'AZN',
      Number(merged.rating) || 0, Number(merged.reviewsCount) || 0,
      JSON.stringify(extra), id
    ]
  );
  scheduleTourTranslation(id, merged.name, merged.description || null);
}

// PUT /api/tours/:id — update a tour. Admins edit the live row directly and control approval
// status. Vendors editing a tour that's still under review (pending_approval/rejected, i.e.
// never reached customers) also edit the live row directly. But a vendor editing a tour that
// is currently `approved` (already public) never touches the live columns — the proposed
// changes are stashed in `pending_data` and status flips to `pending_approval`, which per the
// GET /api/tours filter means the tour vanishes from the customer marketplace immediately and
// stays hidden until an admin reviews and either approves (merges the proposal) or rejects it.
app.put("/api/tours/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM tours WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Tur tapılmadı." });

    const existing = rowToTour(existingRows[0]);
    const isAdmin = req.operator.role === 'admin';
    if (!isAdmin && existing.vendorId !== req.operator.id) {
      return res.status(403).json({ error: "Bu tur sizin hesabınıza aid deyil." });
    }

    const body = req.body || {};

    if (isAdmin) {
      if (body.status === 'approved') {
        // Merge the pending proposal (if any) plus any last-minute admin edits onto the live row.
        const source = { ...(existing.pendingData || {}), ...body };
        delete source.status;
        const merged = { ...existing, ...source, id: req.params.id };
        delete merged.rejectionReason; // clear any stale reason from a past reject/resubmit cycle
        await writeLiveTourRow(req.params.id, merged, 'approved', null);
      } else if (body.status === 'rejected') {
        // Reject always lands on 'rejected' — it never silently reverts to 'approved'. Applies
        // uniformly whether this is a brand-new tour or an edit proposal on a previously-live
        // tour; either way the pending proposal is discarded and the tour stays hidden from
        // customers (GET /api/tours only returns status = 'approved') until the vendor edits it
        // again (which resubmits it as 'pending_approval') and an admin approves it.
        const reason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : '';
        if (!reason) {
          return res.status(400).json({ error: "Rədd etmək üçün səbəb qeyd edilməlidir." });
        }
        const merged = { ...existing, ...body, id: req.params.id, rejectionReason: reason };
        delete merged.status;
        await writeLiveTourRow(req.params.id, merged, 'rejected', null);
      } else {
        // Plain admin edit/save with no status transition — updates the live row directly.
        // Clears any stale pending_data: once an admin hand-edits and saves, their write
        // supersedes whatever a vendor had proposed, so there's nothing left to merge later.
        const merged = { ...existing, ...body, id: req.params.id };
        await writeLiveTourRow(req.params.id, merged, (body.status || existing.status), null);
      }
    } else if (existing.status === 'approved') {
      // Vendor editing a currently-live tour: stash the proposal, leave the live row untouched.
      const proposal = { ...body, id: req.params.id, vendorId: existing.vendorId };
      delete proposal.status;
      delete proposal.isApproved;
      await dbClient.execute(
        `UPDATE tours SET status = 'pending_approval', pending_data = ? WHERE id = ?`,
        [JSON.stringify(proposal), req.params.id]
      );
    } else {
      // Vendor editing a tour that's still under review (or was rejected) — no live/public
      // version exists yet, so apply the edit directly and (re)submit for approval.
      const merged = { ...existing, ...body, id: req.params.id, vendorId: existing.vendorId };
      delete merged.status;
      delete merged.isApproved;
      delete merged.rejectionReason; // resubmitting clears the old reason — it no longer applies
      await writeLiveTourRow(req.params.id, merged, 'pending_approval', null);
    }

    const rows = await dbClient.query('SELECT * FROM tours WHERE id = ?', [req.params.id]);
    res.json({ tour: rowToTour(rows[0]) });
  } catch (error: any) {
    console.error("[PUT /api/tours/:id] error:", error);
    res.status(500).json({ error: "Tur yenilənə bilmədi: " + error.message });
  }
});

// PUT /api/tours/:id/featured — dedicated toggle for the "Ayın Ən Çox Satılanı" manual
// override. Deliberately bypasses the whole approve/pending-approval dance above: flipping
// this flag must never resubmit the tour for review or hide it from customers, so it writes
// straight to `extra_data` on the live row instead of going through writeLiveTourRow/PUT
// /api/tours/:id's pending_data logic. Only one tour per vendor may be manually featured at a
// time — turning it on for a tour automatically turns it off on any other tour of the same
// vendor that currently has it (the previous pick just silently drops out).
app.put("/api/tours/:id/featured", authenticateUser, async (req: any, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM tours WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Tur tapılmadı." });
    const existingRow = rows[0];
    const isAdmin = req.operator.role === 'admin';
    if (!isAdmin && existingRow.vendor_id !== req.operator.id) {
      return res.status(403).json({ error: "Bu tur sizin hesabınıza aid deyil." });
    }

    const isManuallyFeatured = !!(req.body || {}).isManuallyFeatured;
    let extra: Record<string, any> = {};
    try { extra = existingRow.extra_data ? JSON.parse(existingRow.extra_data) : {}; } catch { extra = {}; }

    if (isManuallyFeatured) {
      const siblingRows = await dbClient.query(
        `SELECT id, extra_data FROM tours WHERE vendor_id = ? AND id != ?`,
        [existingRow.vendor_id, req.params.id]
      );
      for (const sib of siblingRows) {
        let sibExtra: Record<string, any> = {};
        try { sibExtra = sib.extra_data ? JSON.parse(sib.extra_data) : {}; } catch { sibExtra = {}; }
        if (sibExtra.isManuallyFeatured) {
          delete sibExtra.isManuallyFeatured;
          delete sibExtra.manuallyFeaturedAt;
          await dbClient.execute(`UPDATE tours SET extra_data = ? WHERE id = ?`, [JSON.stringify(sibExtra), sib.id]);
        }
      }
      extra.isManuallyFeatured = true;
      extra.manuallyFeaturedAt = new Date().toISOString();
    } else {
      delete extra.isManuallyFeatured;
      delete extra.manuallyFeaturedAt;
    }

    await dbClient.execute(`UPDATE tours SET extra_data = ? WHERE id = ?`, [JSON.stringify(extra), req.params.id]);
    const updatedRows = await dbClient.query('SELECT * FROM tours WHERE id = ?', [req.params.id]);
    return res.json({ tour: rowToTour(updatedRows[0]) });
  } catch (error: any) {
    console.error("[PUT /api/tours/:id/featured] error:", error);
    return res.status(500).json({ error: "Seçim yenilənə bilmədi: " + error.message });
  }
});

// DELETE /api/tours/:id — vendors may only delete their own tours; admins may delete any.
app.delete("/api/tours/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT vendor_id FROM tours WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Tur tapılmadı." });
    if (req.operator.role !== 'admin' && existingRows[0].vendor_id !== req.operator.id) {
      return res.status(403).json({ error: "Bu tur sizin hesabınıza aid deyil." });
    }

    await dbClient.execute('DELETE FROM tours WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/tours/:id] error:", error);
    res.status(500).json({ error: "Tur silinə bilmədi: " + error.message });
  }
});

function rowToSlot(row: any) {
  return {
    id: row.id,
    tourId: row.tour_id,
    startDate: row.start_date,
    endDate: row.end_date,
    price: Number(row.price),
    capacity: Number(row.capacity),
    bookedCount: Number(row.booked_count) || 0,
  };
}

// GET /api/slots — list all slots, optionally filtered by tourId (flat list across every tour)
app.get("/api/slots", async (req, res) => {
  try {
    const { tourId } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    if (tourId) { conditions.push('tour_id = ?'); params.push(String(tourId)); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbClient.query(`SELECT * FROM tour_slots ${whereClause} ORDER BY start_date ASC`, params);
    res.json({ slots: rows.map(rowToSlot) });
  } catch (error: any) {
    console.error("[GET /api/slots] error:", error);
    res.status(500).json({ error: "Tarixləri gətirmək mümkün olmadı: " + error.message });
  }
});

// GET /api/tours/:tourId/slots — list slots for a tour
app.get("/api/tours/:tourId/slots", async (req, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM tour_slots WHERE tour_id = ? ORDER BY start_date ASC', [req.params.tourId]);
    res.json({ slots: rows.map(rowToSlot) });
  } catch (error: any) {
    console.error("[GET /api/tours/:tourId/slots] error:", error);
    res.status(500).json({ error: "Tarixləri gətirmək mümkün olmadı: " + error.message });
  }
});

// POST /api/tours/:tourId/slots — create a slot for a tour
app.post("/api/tours/:tourId/slots", authenticateUser, async (req: any, res) => {
  try {
    const tourRows = await dbClient.query('SELECT id, vendor_id FROM tours WHERE id = ?', [req.params.tourId]);
    if (!tourRows.length) return res.status(404).json({ error: "Tur tapılmadı." });
    if (req.operator.role !== 'admin' && tourRows[0].vendor_id !== req.operator.id) {
      return res.status(403).json({ error: "Bu tur sizin hesabınıza aid deyil." });
    }

    const { startDate, endDate, price, capacity } = req.body || {};
    if (!startDate || price === undefined || capacity === undefined) {
      return res.status(400).json({ error: "Zəhmət olmasa bütün məcburi sahələri doldurun (startDate, price, capacity)." });
    }

    const id = req.body.id || `slot-${randomUUID()}`;
    await dbClient.execute(
      `INSERT INTO tour_slots (id, tour_id, start_date, end_date, price, capacity, booked_count) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, req.params.tourId, startDate, endDate || null, Number(price), Number(capacity), Number(req.body.bookedCount) || 0]
    );

    const rows = await dbClient.query('SELECT * FROM tour_slots WHERE id = ?', [id]);
    res.status(201).json({ slot: rowToSlot(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/tours/:tourId/slots] error:", error);
    res.status(500).json({ error: "Tarix yaradıla bilmədi: " + error.message });
  }
});

// PUT /api/slots/:id — update a slot (partial update)
app.put("/api/slots/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM tour_slots WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Tarix tapılmadı." });

    const existing = rowToSlot(existingRows[0]);
    if (req.operator.role !== 'admin') {
      const tourRows = await dbClient.query('SELECT vendor_id FROM tours WHERE id = ?', [existing.tourId]);
      if (!tourRows.length || tourRows[0].vendor_id !== req.operator.id) {
        return res.status(403).json({ error: "Bu tarix sizin hesabınıza aid deyil." });
      }
    }
    const merged = { ...existing, ...(req.body || {}) };

    await dbClient.execute(
      `UPDATE tour_slots SET start_date = ?, end_date = ?, price = ?, capacity = ?, booked_count = ? WHERE id = ?`,
      [merged.startDate, merged.endDate || null, Number(merged.price), Number(merged.capacity), Number(merged.bookedCount) || 0, req.params.id]
    );

    const rows = await dbClient.query('SELECT * FROM tour_slots WHERE id = ?', [req.params.id]);
    res.json({ slot: rowToSlot(rows[0]) });
  } catch (error: any) {
    console.error("[PUT /api/slots/:id] error:", error);
    res.status(500).json({ error: "Tarix yenilənə bilmədi: " + error.message });
  }
});

// DELETE /api/slots/:id
app.delete("/api/slots/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT id, tour_id FROM tour_slots WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Tarix tapılmadı." });
    if (req.operator.role !== 'admin') {
      const tourRows = await dbClient.query('SELECT vendor_id FROM tours WHERE id = ?', [existingRows[0].tour_id]);
      if (!tourRows.length || tourRows[0].vendor_id !== req.operator.id) {
        return res.status(403).json({ error: "Bu tarix sizin hesabınıza aid deyil." });
      }
    }

    await dbClient.execute('DELETE FROM tour_slots WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/slots/:id] error:", error);
    res.status(500).json({ error: "Tarix silinə bilmədi: " + error.message });
  }
});

const BOOKING_CORE_FIELDS = [
  'id', 'tourId', 'slotId', 'vendorId', 'customerId', 'customerName', 'customerPhone',
  'bookingDate', 'participantsCount', 'totalAmount', 'status', 'paymentMethod', 'booking_reference'
];

function rowToBooking(row: any) {
  let extra: Record<string, any> = {};
  try { extra = row.extra_data ? JSON.parse(row.extra_data) : {}; } catch { extra = {}; }
  return {
    ...extra,
    id: row.id,
    tourId: row.tour_id,
    slotId: row.slot_id,
    vendorId: row.vendor_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    customerPhone: row.customer_phone,
    bookingDate: row.created_at,
    participantsCount: Number(row.participants_count),
    totalAmount: Number(row.total_amount),
    status: row.status,
    paymentMethod: row.payment_method,
    booking_reference: row.booking_reference,
  };
}

function splitBookingBody(body: Record<string, any>) {
  const extra: Record<string, any> = {};
  for (const key of Object.keys(body)) {
    if (!BOOKING_CORE_FIELDS.includes(key)) extra[key] = body[key];
  }
  return extra;
}

// GET /api/bookings — list bookings, optionally filtered by vendorId / tourId / customerId / status
// GET /api/bookings — same optional-auth scoping as GET /api/tours: a vendor token
// restricts the result to that vendor's own bookings (ignoring any client-supplied
// vendorId), an admin token or no token at all keeps the existing behavior.
app.get("/api/bookings", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const { tourId, customerId, status } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (user && user.role === 'vendor') {
      conditions.push('vendor_id = ?');
      params.push(user.id);
    } else if (req.query.vendorId) {
      conditions.push('vendor_id = ?');
      params.push(String(req.query.vendorId));
    }
    if (tourId) { conditions.push('tour_id = ?'); params.push(String(tourId)); }
    if (customerId) { conditions.push('customer_id = ?'); params.push(String(customerId)); }
    if (status) { conditions.push('status = ?'); params.push(String(status)); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbClient.query(`SELECT * FROM bookings ${whereClause} ORDER BY created_at DESC`, params);
    res.json({ bookings: rows.map(rowToBooking) });
  } catch (error: any) {
    console.error("[GET /api/bookings] error:", error);
    res.status(500).json({ error: "Rezervasiyaları gətirmək mümkün olmadı: " + error.message });
  }
});

// POST /api/bookings — create a booking (vendorId is derived from the tour, and the
// matching slot's booked_count is incremented so capacity stays consistent)
app.post("/api/bookings", async (req, res) => {
  try {
    const body = req.body || {};
    const { tourId, slotId, customerName, customerPhone, participantsCount, totalAmount } = body;
    if (!tourId || !slotId || !customerName || !customerPhone || !participantsCount || totalAmount === undefined) {
      return res.status(400).json({ error: "Zəhmət olmasa bütün məcburi sahələri doldurun (tourId, slotId, customerName, customerPhone, participantsCount, totalAmount)." });
    }

    const tourRows = await dbClient.query('SELECT vendor_id FROM tours WHERE id = ?', [tourId]);
    if (!tourRows.length) return res.status(404).json({ error: "Tur tapılmadı." });

    const slotRows = await dbClient.query('SELECT id FROM tour_slots WHERE id = ? AND tour_id = ?', [slotId, tourId]);
    if (!slotRows.length) return res.status(404).json({ error: "Bu tur üçün belə bir tarix tapılmadı." });

    const id = body.id || `book-${randomUUID()}`;
    const bookingReference = body.booking_reference || `#TUR-${Math.floor(1000 + Math.random() * 9000)}`;
    const extra = splitBookingBody(body);

    await dbClient.execute(
      `INSERT INTO bookings (id, tour_id, slot_id, vendor_id, customer_id, customer_name, customer_phone, booking_reference, participants_count, total_amount, status, payment_method, extra_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, tourId, slotId, tourRows[0].vendor_id, body.customerId || null, customerName, customerPhone,
        bookingReference, Number(participantsCount), Number(totalAmount),
        body.status || 'pending', body.paymentMethod || 'whatsapp', JSON.stringify(extra)
      ]
    );

    await dbClient.execute(
      'UPDATE tour_slots SET booked_count = booked_count + ? WHERE id = ?',
      [Number(participantsCount), slotId]
    );

    const rows = await dbClient.query('SELECT * FROM bookings WHERE id = ?', [id]);
    res.status(201).json({ booking: rowToBooking(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/bookings] error:", error);
    res.status(500).json({ error: "Rezervasiya yaradıla bilmədi: " + error.message });
  }
});

// PUT /api/bookings/:id — update a booking (e.g. status changes, operator notes)
app.put("/api/bookings/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Rezervasiya tapılmadı." });

    const existing = rowToBooking(existingRows[0]);
    if (req.operator.role !== 'admin' && existing.vendorId !== req.operator.id) {
      return res.status(403).json({ error: "Bu rezervasiya sizin hesabınıza aid deyil." });
    }
    const merged = { ...existing, ...(req.body || {}), id: req.params.id };
    const extra = splitBookingBody(merged);

    await dbClient.execute(
      `UPDATE bookings SET customer_id = ?, customer_name = ?, customer_phone = ?, participants_count = ?, total_amount = ?, status = ?, payment_method = ?, extra_data = ? WHERE id = ?`,
      [
        merged.customerId || null, merged.customerName, merged.customerPhone,
        Number(merged.participantsCount), Number(merged.totalAmount),
        merged.status, merged.paymentMethod || 'whatsapp', JSON.stringify(extra), req.params.id
      ]
    );

    // Keep slot capacity consistent: cancelling frees up the seats, reinstating retakes them.
    const wasCancelled = existing.status === 'cancelled';
    const isCancelled = merged.status === 'cancelled';
    if (wasCancelled !== isCancelled) {
      const delta = isCancelled ? -Number(merged.participantsCount) : Number(merged.participantsCount);
      await dbClient.execute('UPDATE tour_slots SET booked_count = booked_count + ? WHERE id = ?', [delta, merged.slotId]);
    }

    const rows = await dbClient.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    res.json({ booking: rowToBooking(rows[0]) });
  } catch (error: any) {
    console.error("[PUT /api/bookings/:id] error:", error);
    res.status(500).json({ error: "Rezervasiya yenilənə bilmədi: " + error.message });
  }
});

// POST /api/bookings/checkin — operator scans a ticket's QR code/reference to check the
// customer in. Requires a valid operator JWT (authenticateUser); only succeeds for
// bookings under tours that belong to the authenticated operator's own vendor account.
app.post("/api/bookings/checkin", authenticateUser, async (req: any, res) => {
  try {
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ error: "Skan edilmiş bilet kodu göndərilmədi." });
    }

    let rows = await dbClient.query('SELECT * FROM bookings WHERE booking_reference = ?', [reference]);
    if (!rows.length) {
      // Fallback: some older/manual bookings are referenced by a short code derived from
      // their id (TUR-XXXXX) rather than the stored booking_reference.
      const candidates = await dbClient.query('SELECT * FROM bookings WHERE vendor_id = ?', [req.operator.id]);
      rows = candidates.filter((b: any) => `TUR-${String(b.id).slice(0, 5).toUpperCase()}` === reference);
    }

    if (!rows.length) {
      return res.status(404).json({ error: "Sistemdə bu bilet məlumatı tapılmadı!" });
    }

    const bookingRow = rows[0];
    if (bookingRow.vendor_id !== req.operator.id) {
      return res.status(403).json({ error: "Bu bilet sizin hesabınıza aid deyil." });
    }

    const booking = rowToBooking(bookingRow);
    if ((booking as any).attendanceStatus === 'İştirakçı gəldi') {
      return res.json({ alreadyCheckedIn: true, booking });
    }

    const extra = splitBookingBody({ ...booking, attendanceStatus: 'İştirakçı gəldi' });
    await dbClient.execute('UPDATE bookings SET extra_data = ? WHERE id = ?', [JSON.stringify(extra), booking.id]);

    const updatedRows = await dbClient.query('SELECT * FROM bookings WHERE id = ?', [booking.id]);
    res.json({ alreadyCheckedIn: false, booking: rowToBooking(updatedRows[0]) });
  } catch (error: any) {
    console.error("[POST /api/bookings/checkin] error:", error);
    res.status(500).json({ error: "Check-in zamanı xəta baş verdi: " + error.message });
  }
});

function rowToReview(row: any) {
  return {
    id: row.id,
    tourId: row.tour_id,
    bookingId: row.booking_id,
    customerId: row.customer_id,
    customerName: row.customer_name,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at,
    verifiedAttendee: !!row.verified_attendee,
  };
}

// GET /api/reviews — list reviews, optionally filtered by tourId
app.get("/api/reviews", async (req, res) => {
  try {
    const { tourId } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];
    if (tourId) { conditions.push('tour_id = ?'); params.push(String(tourId)); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbClient.query(`SELECT * FROM reviews ${whereClause} ORDER BY created_at DESC`, params);
    res.json({ reviews: rows.map(rowToReview) });
  } catch (error: any) {
    console.error("[GET /api/reviews] error:", error);
    res.status(500).json({ error: "Rəyləri gətirmək mümkün olmadı: " + error.message });
  }
});

// POST /api/reviews — create a review (must reference a real booking for that tour,
// enforcing the anti-fake-rating rule), then refreshes the tour's rating/reviewsCount
app.post("/api/reviews", async (req, res) => {
  try {
    const body = req.body || {};
    const { tourId, bookingId, customerName, rating, comment } = body;
    if (!tourId || !bookingId || !customerName || rating === undefined) {
      return res.status(400).json({ error: "Zəhmət olmasa bütün məcburi sahələri doldurun (tourId, bookingId, customerName, rating)." });
    }

    const bookingRows = await dbClient.query('SELECT id FROM bookings WHERE id = ? AND tour_id = ?', [bookingId, tourId]);
    const verifiedAttendee = bookingRows.length > 0;
    if (!verifiedAttendee) {
      return res.status(400).json({ error: "Rəy yalnız həmin turu rezerv etmiş müştərilər üçün mümkündür (bookingId uyğun gəlmədi)." });
    }

    const id = body.id || `review-${randomUUID()}`;
    await dbClient.execute(
      `INSERT INTO reviews (id, tour_id, booking_id, customer_id, customer_name, rating, comment, verified_attendee)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, tourId, bookingId, body.customerId || null, customerName, Number(rating), comment || null, 1]
    );

    // Refresh the tour's aggregate rating / reviewsCount from the reviews table.
    const aggRows = await dbClient.query(
      'SELECT AVG(rating) as avg_rating, COUNT(*) as review_count FROM reviews WHERE tour_id = ?',
      [tourId]
    );
    const avgRating = Number(aggRows[0]?.avg_rating) || 0;
    const reviewCount = Number(aggRows[0]?.review_count) || 0;
    await dbClient.execute('UPDATE tours SET rating = ?, reviews_count = ? WHERE id = ?', [avgRating, reviewCount, tourId]);

    const rows = await dbClient.query('SELECT * FROM reviews WHERE id = ?', [id]);
    res.status(201).json({ review: rowToReview(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/reviews] error:", error);
    res.status(500).json({ error: "Rəy yaradıla bilmədi: " + error.message });
  }
});

// Endpoint for AI beginner and experienced packing assistant returning strict JSON
app.post("/api/gemini/packing", async (req, res) => {
  const { tourDetails } = req.body;
  if (!tourDetails) {
    return res.status(400).json({ error: "Tur detalları tələb olunur." });
  }

  try {
    const ai = getGeminiClient();

    const systemInstruction = `Sən Azərbaycanda fəaliyyət göstərən turlar üçün peşəkar "Ağıllı Çanta və Yürüş Hazırlığı AI Kökləndiricisi"sən.
İstifadəçilərin həm yeni başlayan ("basics" siyahısı), həm də təcrübəli yürüşçülər ("pro_gear" siyahısı) olduğunu nəzərə alaraq, xüsusi çanta tövsiyələri hazırlamalısan.
Tövsiyələri mütləq doğma Azərbaycan dilində, hər bir bənddə aydın, anlaşıqlı və tam faydalı şəkildə formalaşdır.

Siyahı tələbləri:
1. "basics" siyahısı: İlk dəfə və ya yeni başlayanlar üçün mütləq olan baza elementlər (məsələn: lazım olan su miqdarı, adi rahat sürüşməyən idman ayaqqabısı, günəşdən qorunma, yüngül qidalar). Bunlar hər kəsin evində asanlıqla tapa biləcəyi və ya ucuz şəkildə əldə edə biləcəyi detallar olmalıdır ki, insanların gözü qorxmasın.
2. "pro_gear" siyahısı: Təcrübəli yürüşçülər üçün nəzərdə tutulmuş texniki, daxili relyef və hava şəraitinə uyğun peşəkar avadanlıqlar (məsələn: dik yoxuş-enişlər üçün teleskopik yürüş çubuqları, diz qoruyucuları, sukeçirməyən Gore-Tex botlar, palçıqlı relyef üçün ayaq qamaşları, gecikmələr üçün alın fənəri, termal alt paltarı və ya membran gödəkçə). Baza elementləri bura qətiyyən daxil etmə!

Mövcud turun adı, regionu, çətinliyi və xüsusiyyətlərini analiz edərək tam nöqtə atışı tövsiyələr siyahısı yarat.`;

    const promptText = `Aşağıdakı tur üçün həm yeni başlayanlar ("basics"), həm də təcrübəli yürüşçülər ("pro_gear") üçün Azərbaycan dilində çanta tövsiyələri hazırlat.
- Tur adı: ${tourDetails.name}
- Region: ${tourDetails.region}
- Çətinlik səviyyəsi: ${tourDetails.difficulty === 'easy' ? 'Asan' : tourDetails.difficulty === 'medium' ? 'Orta' : tourDetails.difficulty === 'hard' ? 'Çətin' : 'Ekstrim'}
- Kateqoriya: ${tourDetails.category === 'hiking' ? 'Yürüş / Hiking' : tourDetails.category === 'camp' ? 'Kamp' : 'Zirvə'}
- Müddət: ${tourDetails.durationDays} Gün`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            packing_advice: {
              type: Type.OBJECT,
              properties: {
                basics: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Azərbaycan dilində: Yeni başlayanlar üçün sadə və evdə asan tapılan təməl əşyalar və hazırlıq addımları"
                },
                pro_gear: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Azərbaycan dilində: Təcrübəli yürüşçülər üçün bu turun çətinliyinə və relyefinə uyğun sırf texniki, peşəkar avadanlıq və geyim təklifləri"
                }
              },
              required: ["basics", "pro_gear"]
            }
          },
          required: ["packing_advice"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    return res.json(parsedData);
  } catch (err: any) {
    console.error("Gemini Packing Advice error:", err);
    return res.status(500).json({ error: err.message || "Xəta baş verdi" });
  }
});

// Setup directory for generated tickets and cache directory for fonts
const ticketsDir = path.join(process.cwd(), "tickets");
if (!fs.existsSync(ticketsDir)) {
  fs.mkdirSync(ticketsDir, { recursive: true });
}

// Custom force download endpoint for tickets to prevent mobile opening in new tab
app.get("/tickets/:filename", (req, res, next) => {
  const filename = req.params.filename;
  const filepath = path.join(ticketsDir, filename);
  if (fs.existsSync(filepath)) {
    // res.download sets the correct Content-Disposition headers for direct device file download
    res.download(filepath, filename);
  } else {
    res.status(404).send("Bilet tapılmadı.");
  }
});

app.use("/tickets", express.static(ticketsDir));

const fontsDir = path.join(process.cwd(), "fonts");
if (!fs.existsSync(fontsDir)) {
  fs.mkdirSync(fontsDir, { recursive: true });
}

let robotoRegularBase64: string | null = null;
let robotoBoldBase64: string | null = null;

// Download Google Fonts helper to safely support Azerbaijani UTF-8 characters natively (Ə, ə, İ, ı, etc.)
async function ensureFonts() {
  const regPath = path.join(fontsDir, "Roboto-Regular.ttf");
  const boldPath = path.join(fontsDir, "Roboto-Bold.ttf");

  const regUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Regular.ttf";
  const boldUrl = "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto-Bold.ttf";

  try {
    if (!fs.existsSync(regPath)) {
      console.log("[Fonts] Downloading Roboto-Regular.ttf for Azerbaijani UTF-8 PDF formatting...");
      const res = await globalThis.fetch(regUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        fs.writeFileSync(regPath, Buffer.from(buf));
      }
    }
    if (fs.existsSync(regPath)) {
      robotoRegularBase64 = fs.readFileSync(regPath).toString("base64");
    }

    if (!fs.existsSync(boldPath)) {
      console.log("[Fonts] Downloading Roboto-Bold.ttf for Azerbaijani UTF-8 PDF formatting...");
      const res = await globalThis.fetch(boldUrl);
      if (res.ok) {
        const buf = await res.arrayBuffer();
        fs.writeFileSync(boldPath, Buffer.from(buf));
      }
    }
    if (fs.existsSync(boldPath)) {
      robotoBoldBase64 = fs.readFileSync(boldPath).toString("base64");
    }
    console.log("[Fonts] Roboto UTF-8 fonts are loaded and cached successfully.");
  } catch (err) {
    console.error("[Fonts] Failed to download or cache Roboto fonts. PDF generator will fallback to standard built-in fonts gracefully.", err);
  }
}

// Fetch QR Code helper
async function fetchQrCodeBase64(data: string): Promise<string | null> {
  try {
    const url = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(data)}`;
    const res = await globalThis.fetch(url);
    if (!res.ok) throw new Error("Failed to fetch QR image");
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString("base64");
  } catch (err) {
    console.error("[QR Code] Failed to fetch live QR code from qrserver API:", err);
    return null;
  }
}

// Automated Landscape Ticket PDF Generation API (Redesigned as beautiful vertical A4 FlixBus format)
app.post("/api/bookings/generate-ticket", async (req, res) => {
  const {
    bookingId,
    customerName,
    customerPhone,
    tourName,
    region,
    date,
    reference,
    participantsCount,
    amount,
    status
  } = req.body;

  if (!bookingId || !customerName || !tourName) {
    return res.status(400).json({ error: "Zəhmət olmasa tələb olunan booking məlumatlarını göndərin." });
  }

  try {
    // Generate compact Portrait Mobile-Friendly PDF (Optimized for beautiful layout on phones)
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [360, 660]
    });

    const pageHeight = 660;
    const pageWidth = 360;

    let hasCustomFonts = false;
    if (robotoRegularBase64 && robotoBoldBase64) {
      try {
        doc.addFileToVFS("Roboto-Regular.ttf", robotoRegularBase64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");

        doc.addFileToVFS("Roboto-Bold.ttf", robotoBoldBase64);
        doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");

        doc.setFont("Roboto", "normal");
        hasCustomFonts = true;
      } catch (e) {
        console.error("Failed to register Roboto fonts in jsPDF:", e);
      }
    }

    const fontName = hasCustomFonts ? "Roboto" : "Helvetica";

    // Force sanitizing clean Azerbaijani/Turkish UTF-8 accents so that standard Helvetica renders flawlessly on all devices
    const sanitizeText = (str: string) => {
      return (str || "")
        .replace(/Ə/g, "E").replace(/ə/g, "e")
        .replace(/ı/g, "i").replace(/I/g, "I")
        .replace(/Ö/g, "O").replace(/ö/g, "o")
        .replace(/Ü/g, "U").replace(/ü/g, "u")
        .replace(/Ç/g, "C").replace(/ç/g, "c")
        .replace(/Ş/g, "S").replace(/ş/g, "s")
        .replace(/Ğ/g, "G").replace(/ğ/g, "g")
        .replace(/İ/g, "I");
    };

    const bRef = reference || `TUR-${bookingId.slice(0, 5).toUpperCase()}`;

    // --- DRAW BACKGROUND & SOLID OUTER GREENISH-TEAL DASHED CONTAINER FRAME ---
    // Background pure white
    doc.setFillColor(255, 255, 255);
    doc.rect(0, 0, pageWidth, pageHeight, "F");

    // Decorative green-emerald dashed rounded outer frame border (matching the green frame in original picture)
    doc.setDrawColor(34, 197, 94); // emerald/green-500 (#22C55E)
    doc.setLineWidth(1.2);
    doc.setLineDashPattern([3, 3], 0);
    // Draw rounded rect enclosing ticket content
    doc.roundedRect(12, 12, 336, 636, 10, 10, "D");
    doc.setLineDashPattern([], 0); // Restore line rendering

    // --- 1. CENTERED BRAND HEADER DIRECTLY LIKE SCREENSHOT ---
    // Center indicator brand colors above text
    doc.setFillColor(234, 179, 8); // Golden Amber
    doc.rect(168, 25, 4, 11, "F");
    doc.setFillColor(34, 197, 94); // Leaf Emerald
    doc.rect(174, 25, 4, 11, "F");

    // Center header text
    doc.setTextColor(3, 105, 161); // Sky-700 (#0369A1)
    doc.setFont(fontName, "bold");
    doc.setFontSize(13);
    doc.text(sanitizeText("TURLAR.AZ ELEKTRON BİLET"), 180, 48, { align: "center" });

    // Center pill badge detailing "TƏSDİQLƏNİB - ÖDƏNİLİB" below title
    doc.setFillColor(240, 253, 244); // Green-50 background tint
    doc.setDrawColor(34, 197, 94); // Green-500 border
    doc.setLineWidth(1);
    doc.roundedRect(115, 56, 130, 15, 7, 7, "FD");

    doc.setTextColor(21, 128, 61); // Green-700 accent
    doc.setFont(fontName, "bold");
    doc.setFontSize(7.5);
    doc.text(sanitizeText("TƏSDİQLƏNİB - ÖDƏNİLİB"), 180, 66, { align: "center" });

    // Soft header separator line below the badge
    doc.setDrawColor(241, 245, 249); // slate-100
    doc.setLineWidth(1);
    doc.line(25, 82, 335, 82);


    // --- 2. THE TICKET INFORMATION FIELD GRID LIST (LEFT) & QR CODE BOX (RIGHT) ---
    const safeTourName = sanitizeText(tourName);

    // Route Details Header Anchor
    doc.setFont(fontName, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(sanitizeText("TUR MARSRUTU"), 25, 96);

    const routeFullText = `${safeTourName} (${sanitizeText(region || "Azərbaycan")})`;
    const routeTextLines = doc.splitTextToSize(sanitizeText(routeFullText), 300);
    doc.setFont(fontName, "bold");
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42); // slate-900

    // Small green leaf circle decoration bullet
    doc.setFillColor(34, 197, 94); 
    doc.circle(29, 107, 2.5, "F");
    doc.text(routeTextLines, 36, 109);

    let cY = 111 + (routeTextLines.length * 11) + 12;

    const drawField = (colNum: 1 | 2, label: string, val: string, isBold: boolean = false, fontSz: number = 8.5, customColor: [number, number, number] | null = null) => {
      const startX = colNum === 1 ? 25 : 190;
      
      // Draw Label
      doc.setFont(fontName, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139); // slate-500 label
      doc.text(sanitizeText(label), startX, cY);

      // Draw Value
      doc.setFont(fontName, isBold ? "bold" : "normal");
      doc.setFontSize(fontSz);
      if (customColor) {
        doc.setTextColor(customColor[0], customColor[1], customColor[2]);
      } else {
        doc.setTextColor(15, 23, 42); // slate-900 value
      }
      doc.text(sanitizeText(val), startX, cY + 11);
    };

    // Row 1
    drawField(1, "SIFARIS / BILET ID", `#${bRef}`, true, 9);
    drawField(2, "EKSKURSİYA TARİXİ", date || "N/A", true, 9);
    cY += 26;

    // Row 2
    drawField(1, "MÜŞTƏRİ ADI", customerName, true, 8.5);
    drawField(2, "ƏLAQƏ NÖMRƏSİ", customerPhone || "N/A", true, 8.5);
    cY += 26;

    // Row 3
    drawField(1, "İŞTİRAKÇI SAYI", `${participantsCount || 1} nəfər`, true, 8.5);
    drawField(2, "ÜMUMİ MƏBLƏĞ", `${amount || 0} AZN`, true, 11, [16, 185, 129]); // emerald-500 emphasis
    cY += 26;

    // Row 4
    drawField(1, "ÖDƏNİŞ METODU", "WhatsApp / m10", true, 8.5);
    drawField(2, "STATUS", "TƏSDİQLƏNİB", true, 8.5, [21, 128, 61]); // green-700
    cY += 28;

    // Thin dash list divider
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.setLineWidth(1);
    doc.setLineDashPattern([2, 3], 0);
    doc.line(25, cY, 335, cY);
    doc.setLineDashPattern([], 0); // Restore line rendering
    cY += 12;

    // Center Scanning Live QR Block Frame
    const qSz = 90;
    const qX = (360 - qSz) / 2; // 135
    const qY = cY;
    
    const qrBase64 = await fetchQrCodeBase64(bRef);
    if (qrBase64) {
      try {
        doc.addImage(qrBase64, "PNG", qX, qY, qSz, qSz);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.8);
        doc.rect(qX, qY, qSz, qSz, "D");
      } catch (err) {
        console.error("Failed to add live QR code image to pdf document:", err);
      }
    } else {
      // Gray placeholder boundary
      doc.setFillColor(248, 250, 252);
      doc.rect(qX, qY, qSz, qSz, "F");
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.8);
      doc.rect(qX, qY, qSz, qSz, "D");

      doc.setTextColor(148, 163, 184);
      doc.setFont(fontName, "normal");
      doc.setFontSize(7.5);
      doc.text(sanitizeText("ONLINE QR SCAN"), qX + (qSz / 2), qY + 42, { align: "center" });
      doc.text(sanitizeText("Birləşdirilmədi"), qX + (qSz / 2), qY + 54, { align: "center" });
    }

    // QR validation caption label underneath
    doc.setFont(fontName, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(sanitizeText("TƏSDİQ QR-KODU"), 180, qY + qSz + 11, { align: "center" });

    cY += qSz + 24;


    // --- 3. MÜHÜM TƏHLÜKƏSİZLİK QAYDALARI VƏ TƏLİMATLAR (BOTTOM SAFETY NOTE) ---
    const boxY = cY;
    const boxH = 132;
    // Draw clean solid background wrapper block
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(25, boxY, 310, boxH, "F");
    
    // Solid emerald-500 highlight vertical timeline bar on the left bounds
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(25, boxY, 3, boxH, "F");

    // Title of regulations
    doc.setFont(fontName, "bold");
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(sanitizeText("MÜHÜM TƏHLÜKƏSİZLİK QAYDALARI VƏ TƏLİMATLAR:"), 36, boxY + 14);

    const rules = [
      "1. Bələdçinin təhlükəsizlik və yürüş təlimatlarına 100% əməl edilməlidir.",
      "2. Hava şəraitinə uyğun geyim və sürüşməyən rahat yürüş ayaqqabısı mütləqdir.",
      "3. Təbiətə hörmətlə yanaşılmalı, heç bir növ zibil heç yerə atılmamalıdır.",
      "4. Xroniki xəstəlik, astma barədə bələdçiyə öncədən məlumat verilməlidir.",
      "5. Yürüş boyu alkoqollu içkilərin qəbulu qətiyyən qadağandır."
    ];

    doc.setFont(fontName, "normal");
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105); // slate-600 soft
    
    let ruleY = boxY + 27;
    rules.forEach((rule) => {
      const ruleLines = doc.splitTextToSize(sanitizeText(rule), 285);
      doc.text(ruleLines, 36, ruleY);
      ruleY += (ruleLines.length * 9.5) + 2;
    });


    // --- 4. TICKET FOOTER WITH REFINED CRM SIGNATURE LINE ---
    // Subtle horizontal divider line anchored relative to bottom
    doc.setDrawColor(241, 245, 249);
    doc.setLineWidth(1);
    doc.line(25, pageHeight - 34, 335, pageHeight - 34);

    // Centered fine-print footer signoff matching original picture exactly
    doc.setFont(fontName, "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(sanitizeText("XİDMƏTDƏN YARARLANDIĞINIZ ÜÇÜN TƏŞƏKKÜR EDİRİK! • TURLAR.AZ"), pageWidth / 2, pageHeight - 22, { align: "center" });

    // Output binary array format for flawless Node file writing
    const pdfOutputArrayBuffer = doc.output("arraybuffer");

    const filename = `ticket_${bookingId}.pdf`;
    const filepath = path.join(ticketsDir, filename);

    fs.writeFileSync(filepath, Buffer.from(pdfOutputArrayBuffer));

    const ticketUrl = `/tickets/${filename}`;
    console.log(`[Ticket Success] Beautiful customized vertical mobile boarding pass stored at: ${ticketUrl}`);
    return res.json({ success: true, ticketUrl });

  } catch (error: any) {
    console.error("PDF generation exception:", error);
    return res.status(500).json({ error: "PDF bilet yaradılması zamanı xətalar baş verdi: " + error.message });
  }
});

async function startServer() {
  // Initialize Enterprise Database schemas / SQLite fallback
  try {
    await initializeDatabase();
  } catch (err) {
    console.error("[DB] Failed to initialize database:", err);
  }

  // Safe load custom UTF-8 Fonts at application startup
  await ensureFonts();

  // WhatsApp session boots in the background — the marketplace itself must keep working even
  // if no admin has scanned the QR yet (or the connection later drops), so failures here are
  // only logged, never thrown.
  startWhatsApp().catch((err) => console.error("[WhatsApp] Başlanğıc qoşulma xətası:", err));

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback handling
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
