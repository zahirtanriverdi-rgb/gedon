// Load .env before anything else reads process.env (JWT_SECRET, DATABASE_URL, seed passwords…).
import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { jsPDF } from "jspdf";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID, randomBytes, createHash } from "crypto";
import { initializeDatabase } from "./server/db.ts";
import dbClient from "./server/db.ts";
import { getEmailConfigMasked, updateEmailConfig, sendEmail } from "./server/email.ts";
import { scheduleTourTranslation, scheduleUserTranslation } from "./server/translate.ts";
import { generateUniqueSlug } from "./server/slugify.ts";
import {
  startWhatsApp,
  getWhatsAppStatus,
  getPublicWhatsAppStatus,
  logoutWhatsApp,
  isRegisteredOnWhatsApp,
  checkAndConsumeRateLimit,
  generateCaptchaChallenge,
  verifyCaptchaChallenge
} from "./server/whatsapp.ts";
import {
  validateCampSiteSubmission,
  validateAdminCampSiteInput,
  insertAdminCampSite,
  findNearbyDuplicate,
  insertCampSite,
  toDbBool,
  rowToPublicCampSite,
  rowToAdminCampSite,
  normalizeAzPhone,
  checkAndConsumeLookupRateLimit,
  getContributorStats,
  getCampPointsConfig,
  isCampSitesEnabled,
  isGroupCalculatorEnabled,
  listContributors,
  setSetting,
} from "./server/campSites.ts";
import { parseBboxParam, getPoisForBbox } from "./server/overpass.ts";
import { resolveGoogleMapsLink } from "./server/geo.ts";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
// ===================== BASE URL & STATIC FILES =====================
const publicDir = path.join(process.cwd(), "public");

// Bütün upload qovluqlarını static edirik
app.use("/tour-images", express.static(path.join(publicDir, "tour-images")));
app.use("/uploads", express.static(path.join(publicDir, "uploads")));
app.use("/public", express.static(publicDir));

// Əsas URL funksiyası (localhost və Render üçün)
const getBaseUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.VITE_API_BASE_URL || 
           process.env.RENDER_EXTERNAL_URL || 
           "https://gedekgorek.onrender.com";   // ← buranı öz Render linkinə dəyiş
  }
  return `http://localhost:${process.env.PORT || 3000}`;
};

console.log(`[Static] Serving files from: ${publicDir}`);
console.log(`[Base URL] Current base: ${getBaseUrl()}`);

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

// Malformed JSON bodies would otherwise fall through to Express's default HTML error page
// (a full stack trace, including server file paths) instead of the JSON error shape every
// other endpoint returns — breaking response.json() on the client and leaking server internals.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: "Göndərilən məlumat düzgün formatda deyil (JSON parse xətası)." });
  }
  next(err);
});

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
// carries `guides` (vendor team members) and `aboutTranslations` (hand-written EN/RU of the
// `about` bio) but is structured so future optional profile fields can be added without
// another schema migration.
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
    aboutTranslations: extra.aboutTranslations || undefined,
    guides: extra.guides || undefined,
    subscriptionValidUntil: row.subscription_valid_until || undefined,
    createdAt: row.created_at,
    isArchived: !!row.deleted_at,
    isManuallyDeactivated: !!row.is_manually_deactivated,
    emailVerified: !!row.email_verified_at,
    calculatorEnabled: !!extra.calculatorEnabled,
    busTrackingEnabled: !!extra.busTrackingEnabled,
    calculatorConfig: extra.calculatorConfig || undefined,
  };
}

// Shared by both login routes below: verifies the bcrypt hash and, on success, signs the same
// shape of JWT (id/email/role, 24h expiry) both admin and vendor sessions use.
function verifyPasswordAndIssueToken(user: any, password: string): { token: string } | null {
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  return { token };
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
    const auth = verifyPasswordAndIssueToken(user, password);
    if (!auth) {
      return res.status(401).json({ error: "E-poçt və ya şifrə yanlışdır!" });
    }

    return res.json({
      success: true,
      token: auth.token,
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
    const auth = verifyPasswordAndIssueToken(user, password);
    if (!auth) {
      return res.status(401).json({ error: "İstifadəçi adı/e-poçt və ya şifrə yanlışdır!" });
    }

    return res.json({
      success: true,
      token: auth.token,
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

// GET /api/users — admin-only. Without this, the AdminPortal's "Tərəfdaşlar" list had no way
// to ever learn about vendors archived/reactivated from another session — it just kept
// replaying whatever was last cached in localStorage (or the bundled seed data), so an
// archived vendor kept showing up as fully active and editable.
app.get("/api/users", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Yalnız adminlər istifadəçi siyahısını görə bilər." });
  }
  try {
    const rows = await dbClient.query('SELECT * FROM users ORDER BY created_at DESC', []);
    res.json({ users: rows.map(rowToUser) });
  } catch (error: any) {
    console.error("[GET /api/users] error:", error);
    res.status(500).json({ error: "İstifadəçiləri gətirmək mümkün olmadı: " + error.message });
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
    // Rate values (day rates, offroad/food unit prices) are self-service: a vendor tunes their
    // own numbers same as admin can. Whether the calculator/bus-tracking tab exists at all stays
    // an admin-only call below — a vendor can't turn the feature on for themselves.
    if ((isAdmin || isSelf) && body.calculatorConfig !== undefined) extra.calculatorConfig = body.calculatorConfig;

    let username = existingRow.username;
    let passwordHash = existingRow.password_hash;
    let subscriptionValidUntil = existingRow.subscription_valid_until;
    let isManuallyDeactivated = !!existingRow.is_manually_deactivated;
    if (isAdmin) {
      if (body.username !== undefined) username = body.username;
      if (body.password) passwordHash = await bcrypt.hash(body.password, 10);
      if (body.subscriptionValidUntil !== undefined) subscriptionValidUntil = body.subscriptionValidUntil;
      if (body.isManuallyDeactivated !== undefined) isManuallyDeactivated = !!body.isManuallyDeactivated;
      if (body.calculatorEnabled !== undefined) extra.calculatorEnabled = !!body.calculatorEnabled;
      if (body.busTrackingEnabled !== undefined) extra.busTrackingEnabled = !!body.busTrackingEnabled;
    }

    // Changing the email — whether the owner edits their own profile or an admin edits it for
    // them — always throws away any prior verification. Otherwise an admin (or an attacker who
    // compromised the profile form) could repoint a vendor's account at an inbox they don't
    // control while keeping the "verified, safe for password-reset" status of the OLD address.
    const emailChanged = email !== existingRow.email;
    const emailVerifiedAt = emailChanged ? null : existingRow.email_verified_at;

    await dbClient.execute(
      `UPDATE users SET name = ?, email = ?, username = ?, password_hash = ?, phone = ?, company_name = ?, avatar = ?, about = ?, subscription_valid_until = ?, extra_data = ?, is_manually_deactivated = ?, email_verified_at = ? WHERE id = ?`,
      [name, email, username, passwordHash, phone, companyName, avatar, about, subscriptionValidUntil, JSON.stringify(extra), isManuallyDeactivated ? 1 : 0, emailVerifiedAt, req.params.id]
    );

    const updatedRows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (body.about !== undefined || body.guides !== undefined) {
      scheduleUserTranslation(req.params.id, about, extra.guides);
    }
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

// POST /api/auth/send-email-verification — the logged-in admin/vendor asks to prove they
// control their OWN account's current email (not a draft value from an unsaved profile-form
// edit) before it's trusted as a password-reset destination. A fresh code always overwrites any
// unused previous one, so only the most recently sent code is ever valid.
app.post("/api/auth/send-email-verification", authenticateUser, async (req: any, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.operator.id]);
    if (!rows.length) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
    const user = rows[0];

    // 6-digit numeric code — short-lived (10 min) and single-use, so a 6-digit search space
    // isn't the weak point a reset token would be; hashed the same way reset_token is, so the
    // plaintext code only ever exists in the email itself, never at rest in the DB.
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const codeHash = createHash("sha256").update(code).digest("hex");
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await dbClient.execute(
      `UPDATE users SET email_verification_code = ?, email_verification_expires = ? WHERE id = ?`,
      [codeHash, expires.toISOString(), user.id]
    );

    await sendEmail({
      to: user.email,
      subject: "E-poçt təsdiqləmə kodu - GedəkGörək",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #047857;">E-poçt ünvanınızı təsdiqləyin</h2>
          <p>Salam ${user.name || ""},</p>
          <p>Şifrə bərpası üçün bu e-poçt ünvanının sizə aid olduğunu təsdiqləmək üçün aşağıdakı kodu daxil edin. Kod 10 dəqiqə ərzində etibarlıdır.</p>
          <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #047857; margin: 24px 0;">${code}</p>
          <p style="font-size: 12px; color: #64748b;">Əgər bu tələbi siz etməmisinizsə, bu emaili nəzərə almaya bilərsiniz.</p>
        </div>
      `
    });

    res.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/auth/send-email-verification] error:", error);
    // Unlike forgot-password, there's no user-enumeration concern here — the caller is already
    // authenticated as this exact account — so the real error (e.g. "email sending disabled")
    // is safe and useful to surface.
    res.status(500).json({ error: error.message || "Təsdiqləmə kodu göndərilə bilmədi." });
  }
});

// POST /api/auth/verify-email — consumes a code minted by /api/auth/send-email-verification
// above and marks the CALLER's own account email as verified.
app.post("/api/auth/verify-email", authenticateUser, async (req: any, res) => {
  const code = String((req.body || {}).code || "").trim();
  if (!code) {
    return res.status(400).json({ error: "Təsdiqləmə kodunu daxil edin." });
  }

  try {
    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.operator.id]);
    if (!rows.length) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
    const user = rows[0];

    const codeHash = createHash("sha256").update(code).digest("hex");
    if (
      !user.email_verification_code ||
      user.email_verification_code !== codeHash ||
      !user.email_verification_expires ||
      new Date(user.email_verification_expires).getTime() < Date.now()
    ) {
      return res.status(400).json({ error: "Kod yanlışdır və ya vaxtı bitib. Yenidən kod göndərin." });
    }

    await dbClient.execute(
      `UPDATE users SET email_verified_at = CURRENT_TIMESTAMP, email_verification_code = NULL, email_verification_expires = NULL WHERE id = ?`,
      [user.id]
    );

    const updatedRows = await dbClient.query('SELECT * FROM users WHERE id = ?', [user.id]);
    res.json({ success: true, user: rowToUser(updatedRows[0]) });
  } catch (error: any) {
    console.error("[POST /api/auth/verify-email] error:", error);
    res.status(500).json({ error: "Kod yoxlanıla bilmədi: " + error.message });
  }
});

// POST /api/auth/forgot-password — logged-out admin/vendor requests a reset link by email
// (or, for vendors, by username — same field the login screen accepts). Always responds with
// the same generic success message whether or not the account exists, so this endpoint can't
// be used to enumerate registered emails/usernames.
// The raw token is only ever emailed to the user — the DB stores just its SHA-256 hash (see
// server/db.ts's reset_token migration), so a database leak alone can't be replayed as a
// working reset link.
app.post("/api/auth/forgot-password", async (req, res) => {
  const identifier = String((req.body || {}).identifier || "").trim();
  const genericResponse = {
    success: true,
    message: "Əgər bu e-poçt/istifadəçi adı ilə hesab mövcuddursa, şifrə bərpası linki göndərildi."
  };
  if (!identifier) {
    return res.status(400).json({ error: "E-poçt və ya istifadəçi adını daxil edin." });
  }

  try {
    const rows = await dbClient.query(
      `SELECT * FROM users WHERE (email = ? OR username = ?) AND role IN ('admin', 'vendor') AND deleted_at IS NULL`,
      [identifier, identifier]
    );
    const user = rows[0];
    // Same generic response whether the account doesn't exist OR its email was never verified
    // (see POST /api/auth/send-email-verification) — an unverified address might not belong to
    // the account holder at all (e.g. an admin fat-fingered a vendor's email), so a reset link
    // must never be mailed there.
    if (!user || !user.email_verified_at) {
      return res.json(genericResponse);
    }

    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await dbClient.execute(
      `UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?`,
      [tokenHash, expires.toISOString(), user.id]
    );

    const resetLink = `${getBaseUrl()}/reset-password?token=${rawToken}`;
    try {
      await sendEmail({
        to: user.email,
        subject: "Şifrənizi bərpa edin - GedəkGörək",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
            <h2 style="color: #047857;">Şifrənizi bərpa edin</h2>
            <p>Salam ${user.name || ""},</p>
            <p>Hesabınız üçün şifrə bərpası tələb olundu. Yeni şifrə təyin etmək üçün aşağıdakı düyməyə klikləyin. Bu link 30 dəqiqə ərzində etibarlıdır.</p>
            <p style="margin: 24px 0;">
              <a href="${resetLink}" style="background:#059669;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">Yeni şifrə təyin et</a>
            </p>
            <p style="font-size: 12px; color: #64748b;">Əgər bu tələbi siz etməmisinizsə, bu emaili nəzərə almaya bilərsiniz.</p>
          </div>
        `
      });
    } catch (emailError: any) {
      // Sending can fail (misconfigured provider, etc.) but the response must stay generic —
      // otherwise a failed send for a valid account would reveal that the account exists.
      console.error("[POST /api/auth/forgot-password] email send error:", emailError.message);
    }

    return res.json(genericResponse);
  } catch (error: any) {
    console.error("[POST /api/auth/forgot-password] error:", error);
    return res.status(500).json({ error: "Sorğu zamanı server xətası baş verdi." });
  }
});

// POST /api/auth/reset-password — consumes a token minted by /api/auth/forgot-password above.
// Looks the token up by its SHA-256 hash (never stored/compared in plaintext) and checks
// expiry in JS rather than in SQL, since the two DB backends (Postgres/SQLite) don't share a
// single portable "compare TIMESTAMP to now" expression through this project's `?`-placeholder
// query layer.
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body || {};
  if (!token || !password) {
    return res.status(400).json({ error: "Token və yeni şifrə tələb olunur." });
  }
  if (String(password).length < 6) {
    return res.status(400).json({ error: "Yeni şifrə ən azı 6 simvol olmalıdır." });
  }

  try {
    const tokenHash = createHash("sha256").update(String(token)).digest("hex");
    const rows = await dbClient.query(`SELECT * FROM users WHERE reset_token = ?`, [tokenHash]);
    const user = rows[0];
    if (!user || !user.reset_token_expires || new Date(user.reset_token_expires).getTime() < Date.now()) {
      return res.status(400).json({ error: "Link etibarsızdır və ya vaxtı bitib. Yenidən şifrə bərpası tələb edin." });
    }

    const newHash = await bcrypt.hash(String(password), 10);
    await dbClient.execute(
      `UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?`,
      [newHash, user.id]
    );
    return res.json({ success: true, role: user.role });
  } catch (error: any) {
    console.error("[POST /api/auth/reset-password] error:", error);
    return res.status(500).json({ error: "Şifrə yenilənə bilmədi: " + error.message });
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
    } catch {
      // Backup-date fallback also failed — fall through to the generic 500 below.
    }

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

// Endpoint to expose all tracked WhatsApp leads for admin/vendor analytic panels. Leads carry
// the same customer-identifying data as bookings, so this requires a session — a vendor only
// sees leads for their own tours, an admin sees everything.
app.get("/api/bookings/whatsapp-leads", authenticateUser, (req: any, res) => {
  const leads = req.operator.role === 'vendor'
    ? serverBookings.filter((b) => b.vendorId === req.operator.id)
    : serverBookings;
  res.json({
    leads,
    totalCount: leads.length
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
  try {
    await logoutWhatsApp();
    return res.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/whatsapp/logout] error:", error);
    return res.status(500).json({ error: "WhatsApp sessiyasından çıxış edilə bilmədi: " + error.message });
  }
});

// GET /api/whatsapp/public-status — public, lets the booking form show whether number
// verification is currently possible (badge + fallback link) without leaking the QR code
// or the linked number (those stay behind the admin-only /api/whatsapp/status above).
app.get("/api/whatsapp/public-status", (req, res) => {
  return res.json(getPublicWhatsAppStatus());
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
  const captchaResult = verifyCaptchaChallenge(String(captchaId), Number(captchaAnswer));
  if (captchaResult === "expired") {
    return res.status(400).json({
      error: "Təhlükəsizlik sualının vaxtı bitib. Yeni sual göndərildi — zəhmət olmasa onu cavablandırın.",
      captchaFailed: true,
      captchaExpired: true
    });
  }
  if (captchaResult === "wrong") {
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
// Camp Sites — community-submitted camp spots (public page + admin moderation)
// and the contributor points/reward system keyed by normalized phone number.
// ============================================================================

// GET /api/camp-sites — public list of approved camp sites. Submitter is credited by first
// name + surname initial only; the phone number never leaves the server on this endpoint.
app.get("/api/camp-sites", async (req, res) => {
  try {
    // Feature switched off by admin → the public API acts as if no camp sites exist, which
    // also blanks the camp layer on tour maps without any client-side changes.
    if (!(await isCampSitesEnabled())) {
      return res.json({ campSites: [] });
    }
    const rows = await dbClient.query(
      `SELECT * FROM camp_sites WHERE status = 'approved' ORDER BY created_at DESC`
    );
    res.json({ campSites: rows.map(rowToPublicCampSite) });
  } catch (error: any) {
    console.error("[GET /api/camp-sites] error:", error);
    res.status(500).json({ error: "Kamp yerlərini gətirmək mümkün olmadı." });
  }
});

// GET /api/camp-sites/config — public points configuration (shown on the camp sites page:
// "hər təsdiqlənən yer X xal, Y xala pulsuz tur").
app.get("/api/camp-sites/config", async (req, res) => {
  try {
    const config = await getCampPointsConfig();
    res.json({ ...config, enabled: await isCampSitesEnabled() });
  } catch (error: any) {
    console.error("[GET /api/camp-sites/config] error:", error);
    res.status(500).json({ error: "Konfiqurasiya yüklənə bilmədi." });
  }
});

// GET /api/group-calculator/config — public flag for whether the "Qrup hesabla" group price
// calculator nav button is shown to customers (admin-controlled, mirrors /api/camp-sites/config).
app.get("/api/group-calculator/config", async (req, res) => {
  try {
    res.json({ enabled: await isGroupCalculatorEnabled() });
  } catch (error: any) {
    console.error("[GET /api/group-calculator/config] error:", error);
    res.status(500).json({ error: "Konfiqurasiya yüklənə bilmədi." });
  }
});

// GET /api/camp-sites/points?phone=... — public contributor points lookup. Uses its own
// (cheap, DB-only) rate limiter, not the WhatsApp one. Unknown phones get zeros rather than
// 404 so the endpoint can't be used to enumerate which numbers have submitted sites.
app.get("/api/camp-sites/points", async (req, res) => {
  const normalized = normalizeAzPhone(String(req.query.phone || ""));
  if (!normalized) {
    return res.status(400).json({ error: "Zəhmət olmasa düzgün əlaqə nömrəsi daxil edin." });
  }
  const rate = checkAndConsumeLookupRateLimit(normalized);
  if (!rate.allowed) {
    return res.status(429).json({
      error: "Çox sayda cəhd edildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.",
      retryAfterSec: rate.retryAfterSec,
    });
  }
  try {
    res.json(await getContributorStats(normalized));
  } catch (error: any) {
    console.error("[GET /api/camp-sites/points] error:", error);
    res.status(500).json({ error: "Xallar yoxlanıla bilmədi." });
  }
});

// POST /api/camp-sites — public submission (any visitor may propose a camp site). Same
// abuse-protection flow as /api/whatsapp/verify-number: captcha (issued by GET
// /api/whatsapp/captcha) + per-phone rate limiting, then validation and a nearby-duplicate
// check before the row lands in the admin review queue as 'pending_approval'.
app.post("/api/camp-sites", async (req, res) => {
  if (!(await isCampSitesEnabled())) {
    return res.status(403).json({ error: "Kamp yerləri bölməsi hazırda aktiv deyil." });
  }
  const body = req.body || {};
  if (!body.captchaId || body.captchaAnswer === undefined || body.captchaAnswer === null || body.captchaAnswer === "") {
    return res.status(400).json({ error: "Zəhmət olmasa təhlükəsizlik sualını cavablandırın." });
  }
  const captchaResult = verifyCaptchaChallenge(String(body.captchaId), Number(body.captchaAnswer));
  if (captchaResult === "expired") {
    return res.status(400).json({
      error: "Təhlükəsizlik sualının vaxtı bitib. Yeni sual göndərildi — zəhmət olmasa onu cavablandırın.",
      captchaFailed: true,
      captchaExpired: true,
    });
  }
  if (captchaResult === "wrong") {
    return res.status(400).json({ error: "Təhlükəsizlik sualının cavabı yanlışdır. Zəhmət olmasa yenidən cəhd edin.", captchaFailed: true });
  }

  const submission = validateCampSiteSubmission(body);
  if ("error" in submission) {
    return res.status(400).json({ error: submission.error });
  }

  const rate = checkAndConsumeRateLimit(submission.submitterPhoneNormalized);
  if (!rate.allowed) {
    return res.status(429).json({
      error: "Çox sayda cəhd edildi. Zəhmət olmasa bir az sonra yenidən cəhd edin.",
      reason: rate.reason,
      retryAfterSec: rate.retryAfterSec,
    });
  }

  try {
    if (await findNearbyDuplicate(submission)) {
      return res.status(409).json({ error: "Bu nömrə ilə yaxınlıqda artıq bir kamp yeri təqdim edilib." });
    }
    const id = await insertCampSite(submission);
    res.status(201).json({ success: true, id });
  } catch (error: any) {
    console.error("[POST /api/camp-sites] error:", error);
    res.status(500).json({ error: "Kamp yeri göndərilə bilmədi." });
  }
});

// GET /api/admin/camp-sites?status=... — full rows (incl. submitter phone) for moderation.
app.get("/api/admin/camp-sites", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  try {
    const status = typeof req.query.status === "string" ? req.query.status : null;
    const rows = status
      ? await dbClient.query(`SELECT * FROM camp_sites WHERE status = ? ORDER BY created_at DESC`, [status])
      : await dbClient.query(`SELECT * FROM camp_sites ORDER BY created_at DESC`);
    res.json({ campSites: rows.map(rowToAdminCampSite) });
  } catch (error: any) {
    console.error("[GET /api/admin/camp-sites] error:", error);
    res.status(500).json({ error: "Kamp yerlərini gətirmək mümkün olmadı." });
  }
});

// POST /api/admin/camp-sites — admin creates a camp site directly: lands as 'approved'
// immediately (no moderation queue), is excluded from contributor points (no phone), and may
// carry the is_verified "checked by our team" badge from the start.
app.post("/api/admin/camp-sites", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  const input = validateAdminCampSiteInput(req.body || {});
  if ("error" in input) {
    return res.status(400).json({ error: input.error });
  }
  try {
    const id = await insertAdminCampSite(input);
    const rows = await dbClient.query(`SELECT * FROM camp_sites WHERE id = ?`, [id]);
    res.status(201).json({ campSite: rowToAdminCampSite(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/admin/camp-sites] error:", error);
    res.status(500).json({ error: "Kamp yeri yaradıla bilmədi." });
  }
});

// PUT /api/admin/camp-sites/:id — approve/reject, mirroring the tour moderation flow.
// Approval stamps points_awarded with the CURRENT camp_points_per_site setting (a snapshot:
// later setting changes never rewrite already-earned points) — but only when transitioning
// from a non-approved status, so re-sending 'approved' can't double-award.
app.put("/api/admin/camp-sites/:id", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  try {
    const rows = await dbClient.query(`SELECT * FROM camp_sites WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Kamp yeri tapılmadı." });
    const existing = rows[0];

    const body = req.body || {};
    const status = body.status;

    // Badge/flag updates (is_verified "checked by our team", is_paid) can come alone or
    // alongside a status change — they never touch the points logic.
    const hasFlagUpdate = body.isVerified !== undefined || body.isPaid !== undefined;
    if (hasFlagUpdate) {
      if (body.isVerified !== undefined) {
        await dbClient.execute(`UPDATE camp_sites SET is_verified = ? WHERE id = ?`, [toDbBool(body.isVerified), req.params.id]);
      }
      if (body.isPaid !== undefined) {
        await dbClient.execute(`UPDATE camp_sites SET is_paid = ? WHERE id = ?`, [toDbBool(body.isPaid), req.params.id]);
      }
    }

    if (status === 'approved') {
      if (existing.status !== 'approved') {
        const { pointsPerSite } = await getCampPointsConfig();
        // Admin-created rows (no phone) never earn points even if re-approved after a reject.
        const points = existing.submitter_phone_normalized ? pointsPerSite : 0;
        await dbClient.execute(
          `UPDATE camp_sites SET status = 'approved', points_awarded = ?, approved_at = CURRENT_TIMESTAMP, rejection_reason = NULL WHERE id = ?`,
          [points, req.params.id]
        );
      }
    } else if (status === 'rejected') {
      const reason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : '';
      if (!reason) {
        return res.status(400).json({ error: "Rədd etmək üçün səbəb qeyd edilməlidir." });
      }
      await dbClient.execute(
        `UPDATE camp_sites SET status = 'rejected', points_awarded = 0, approved_at = NULL, rejection_reason = ? WHERE id = ?`,
        [reason, req.params.id]
      );
    } else if (status !== undefined) {
      return res.status(400).json({ error: "Status 'approved' və ya 'rejected' olmalıdır." });
    } else if (!hasFlagUpdate) {
      return res.status(400).json({ error: "Yenilənəcək sahə göndərilməyib." });
    }

    const updated = await dbClient.query(`SELECT * FROM camp_sites WHERE id = ?`, [req.params.id]);
    res.json({ campSite: rowToAdminCampSite(updated[0]) });
  } catch (error: any) {
    console.error("[PUT /api/admin/camp-sites/:id] error:", error);
    res.status(500).json({ error: "Kamp yeri yenilənə bilmədi." });
  }
});

// DELETE /api/admin/camp-sites/:id — spam cleanup. Note: deleting an APPROVED site also
// removes its points from the submitter (points are computed from approved rows).
app.delete("/api/admin/camp-sites/:id", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  try {
    const rows = await dbClient.query(`SELECT id FROM camp_sites WHERE id = ?`, [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Kamp yeri tapılmadı." });
    await dbClient.execute(`DELETE FROM camp_sites WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/admin/camp-sites/:id] error:", error);
    res.status(500).json({ error: "Kamp yeri silinə bilmədi." });
  }
});

// GET /api/admin/camp-contributors — points leaderboard with reward earned/redeemed counts.
app.get("/api/admin/camp-contributors", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  try {
    res.json({ contributors: await listContributors() });
  } catch (error: any) {
    console.error("[GET /api/admin/camp-contributors] error:", error);
    res.status(500).json({ error: "İştirakçı siyahısı gətirilə bilmədi." });
  }
});

// POST /api/admin/camp-rewards/redeem — records that an admin handed out one earned free-tour
// reward (the tour itself is arranged offline by contacting the contributor).
app.post("/api/admin/camp-rewards/redeem", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  const phoneNormalized = normalizeAzPhone(String((req.body || {}).phoneNormalized || ""));
  if (!phoneNormalized) {
    return res.status(400).json({ error: "Düzgün telefon nömrəsi tələb olunur." });
  }
  try {
    const stats = await getContributorStats(phoneNormalized);
    if (stats.rewardsAvailable <= 0) {
      return res.status(400).json({ error: "Bu iştirakçının istifadə olunmamış mükafatı yoxdur." });
    }
    const note = typeof (req.body || {}).note === 'string' ? req.body.note.trim() : null;
    await dbClient.execute(
      `INSERT INTO camp_reward_redemptions (id, phone_normalized, note, admin_id) VALUES (?, ?, ?, ?)`,
      [`redeem-${randomUUID()}`, phoneNormalized, note, req.operator.id]
    );
    res.json({ success: true, stats: await getContributorStats(phoneNormalized) });
  } catch (error: any) {
    console.error("[POST /api/admin/camp-rewards/redeem] error:", error);
    res.status(500).json({ error: "Mükafat qeydə alına bilmədi." });
  }
});

// GET/PUT /api/admin/settings — the server-persisted camp points configuration (unlike the
// client-side localStorage platformConfig, these values are read by the server at approval).
app.get("/api/admin/settings", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  try {
    const { pointsPerSite, threshold } = await getCampPointsConfig();
    res.json({
      campPointsPerSite: pointsPerSite,
      campRewardThreshold: threshold,
      campSitesEnabled: await isCampSitesEnabled(),
      groupCalculatorEnabled: await isGroupCalculatorEnabled(),
    });
  } catch (error: any) {
    console.error("[GET /api/admin/settings] error:", error);
    res.status(500).json({ error: "Parametrlər yüklənə bilmədi." });
  }
});

app.put("/api/admin/settings", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  const body = req.body || {};
  const pointsPerSite = Number(body.campPointsPerSite);
  const threshold = Number(body.campRewardThreshold);
  if (!Number.isInteger(pointsPerSite) || pointsPerSite <= 0 || !Number.isInteger(threshold) || threshold <= 0) {
    return res.status(400).json({ error: "Hər iki qiymət müsbət tam ədəd olmalıdır." });
  }
  if (body.campSitesEnabled !== undefined && typeof body.campSitesEnabled !== 'boolean') {
    return res.status(400).json({ error: "campSitesEnabled true/false olmalıdır." });
  }
  if (body.groupCalculatorEnabled !== undefined && typeof body.groupCalculatorEnabled !== 'boolean') {
    return res.status(400).json({ error: "groupCalculatorEnabled true/false olmalıdır." });
  }
  try {
    await setSetting('camp_points_per_site', String(pointsPerSite));
    await setSetting('camp_reward_threshold', String(threshold));
    if (body.campSitesEnabled !== undefined) {
      await setSetting('camp_sites_enabled', body.campSitesEnabled ? 'true' : 'false');
    }
    if (body.groupCalculatorEnabled !== undefined) {
      await setSetting('group_calculator_enabled', body.groupCalculatorEnabled ? 'true' : 'false');
    }
    res.json({
      campPointsPerSite: pointsPerSite,
      campRewardThreshold: threshold,
      campSitesEnabled: await isCampSitesEnabled(),
      groupCalculatorEnabled: await isGroupCalculatorEnabled(),
    });
  } catch (error: any) {
    console.error("[PUT /api/admin/settings] error:", error);
    res.status(500).json({ error: "Parametrlər saxlanıla bilmədi." });
  }
});

// GET/PUT /api/admin/email-settings — lets an admin switch outbound email (used today only by
// the forgot-password flow) between Resend and their own domain's SMTP, or turn it off, without
// touching .env or restarting the server. GET never returns secret values themselves (API key /
// SMTP password) — only whether one is currently set — since this response reaches the browser.
app.get("/api/admin/email-settings", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  try {
    res.json(await getEmailConfigMasked());
  } catch (error: any) {
    console.error("[GET /api/admin/email-settings] error:", error);
    res.status(500).json({ error: "Email parametrləri yüklənə bilmədi." });
  }
});

app.put("/api/admin/email-settings", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  const body = req.body || {};
  if (body.activeProvider !== undefined && !['none', 'resend', 'smtp'].includes(body.activeProvider)) {
    return res.status(400).json({ error: "activeProvider 'none', 'resend' və ya 'smtp' olmalıdır." });
  }
  try {
    // Secret fields (resendApiKey/smtpPassword) are only overwritten when the admin actually
    // typed a new value — an empty string means "leave the currently-saved secret unchanged",
    // since GET never echoes it back for the form to keep pre-filled.
    await updateEmailConfig({
      activeProvider: body.activeProvider,
      resendApiKey: typeof body.resendApiKey === 'string' ? body.resendApiKey.trim() : undefined,
      resendFromEmail: typeof body.resendFromEmail === 'string' ? body.resendFromEmail.trim() : undefined,
      resendFromName: typeof body.resendFromName === 'string' ? body.resendFromName.trim() : undefined,
      smtpHost: typeof body.smtpHost === 'string' ? body.smtpHost.trim() : undefined,
      smtpPort: body.smtpPort !== undefined ? Number(body.smtpPort) : undefined,
      smtpSecure: typeof body.smtpSecure === 'boolean' ? body.smtpSecure : undefined,
      smtpUser: typeof body.smtpUser === 'string' ? body.smtpUser.trim() : undefined,
      smtpPassword: typeof body.smtpPassword === 'string' ? body.smtpPassword.trim() : undefined,
      smtpFromEmail: typeof body.smtpFromEmail === 'string' ? body.smtpFromEmail.trim() : undefined,
      smtpFromName: typeof body.smtpFromName === 'string' ? body.smtpFromName.trim() : undefined,
    });
    res.json(await getEmailConfigMasked());
  } catch (error: any) {
    console.error("[PUT /api/admin/email-settings] error:", error);
    res.status(500).json({ error: "Email parametrləri saxlanıla bilmədi." });
  }
});

// POST /api/admin/email-settings/test — sends a real test email to the logged-in admin's own
// address using whatever provider is currently active, so they can confirm it works before
// relying on it for the forgot-password flow. Unlike forgot-password, errors ARE surfaced here
// verbatim — there's no user-enumeration concern since the admin is testing their own config.
app.post("/api/admin/email-settings/test", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  try {
    await sendEmail({
      to: req.operator.email,
      subject: "Test Email - GedəkGörək",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;">
          <h2 style="color: #047857;">Test uğurludur ✅</h2>
          <p>Bu, GedəkGörək admin panelindən göndərilən test emailidir. Email tənzimləmələriniz düzgün işləyir.</p>
        </div>
      `
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/admin/email-settings/test] error:", error);
    res.status(500).json({ error: error.message || "Test email göndərilə bilmədi." });
  }
});

// GET /api/geo/gmaps?url=... — turns a pasted Google Maps link into {lat, lon} for the
// camp-site forms. Full links are parsed without any network call; Google short links
// (maps.app.goo.gl…) are resolved by following their redirect, behind a host allowlist
// and a small global budget (see server/geo.ts).
app.get("/api/geo/gmaps", async (req, res) => {
  const result = await resolveGoogleMapsLink(req.query.url);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  res.json(result.coords);
});

// GET /api/osm/pois?bbox=minLat,minLon,maxLat,maxLon — cached Overpass (OpenStreetMap) proxy
// feeding the GPX map's POI layer (peaks, springs, waterfalls, shelters, camp sites…).
// Proxied server-side so the browser never talks to community Overpass mirrors directly and
// repeated views of the same route hit our 24h cache instead of Overpass.
app.get("/api/osm/pois", async (req, res) => {
  const bbox = parseBboxParam(req.query.bbox);
  if (!bbox) {
    return res.status(400).json({ error: "bbox parametri 'minLat,minLon,maxLat,maxLon' formatında və maksimum 1°×1° olmalıdır." });
  }
  try {
    res.json({ pois: await getPoisForBbox(bbox) });
  } catch (error: any) {
    console.error("[GET /api/osm/pois] error:", error?.message || error);
    res.status(502).json({ error: "OpenStreetMap məlumatları hazırda əlçatan deyil." });
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
  'id', 'vendorId', 'vendorName', 'name', 'slug', 'category', 'difficulty', 'region',
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
    slug: row.slug,
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
    rating: row.rating !== null && row.rating !== undefined ? Number(row.rating) : undefined,
    reviewsCount: row.reviews_count !== null && row.reviews_count !== undefined ? Number(row.reviews_count) : undefined,
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
        "vendor_id NOT IN (SELECT id FROM users WHERE deleted_at IS NOT NULL OR is_manually_deactivated = true OR (subscription_valid_until IS NOT NULL AND subscription_valid_until < ?))"
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

// SEO: robots.txt + a DB-generated sitemap.xml (not a static file — regenerated from the
// live `tours` table on every request so newly-approved tours show up immediately).
const SITE_URL = "https://gedekgorek.com";

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(`User-agent: *\nAllow: /\nSitemap: ${SITE_URL}/sitemap.xml\n`);
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    // Same "publicly visible" semantics as the anonymous branch of GET /api/tours, simplified
    // (skips the vendor-subscription-grace-period join — sitemap freshness isn't as critical
    // as the live listing, and a slightly stale sitemap entry is harmless).
    const rows = await dbClient.query(
      `SELECT slug FROM tours WHERE status = 'approved' AND slug IS NOT NULL AND slug != '' AND (is_active IS NULL OR is_active != false)`
    );
    const staticPaths = ["", "/faq", "/calculator", "/camp-sites", "/camp-sites/add"];
    const urls = [
      ...staticPaths.map((p) => `<url><loc>${SITE_URL}${p}</loc></url>`),
      ...rows.map((r: any) => `<url><loc>${SITE_URL}/tours/${r.slug}</loc></url>`),
    ];
    res.type("application/xml").send(
      `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.join("")}</urlset>`
    );
  } catch (error: any) {
    console.error("[GET /sitemap.xml] error:", error);
    res.status(500).type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`);
  }
});

// GET /api/tours/:id — single tour. Same visibility rule as the list endpoint: a vendor may
// fetch their own tour in any status, an admin may fetch anything, but an anonymous/customer
// request (or a vendor token for someone else's tour) 404s unless the tour is 'approved' —
// pending/rejected tours don't leak through direct-by-id lookups either.
app.get("/api/tours/:id", async (req, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM tours WHERE id = ? OR slug = ?', [req.params.id, req.params.id]);
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
    if (!(Number(durationDays) > 0)) {
      return res.status(400).json({ error: "Müddət (gün) müsbət ədəd olmalıdır." });
    }
    if (body.price !== undefined && !(Number(body.price) >= 0)) {
      return res.status(400).json({ error: "Qiymət mənfi ola bilməz." });
    }

    const id = body.id || `tour-${randomUUID()}`;
    const slug = await generateUniqueSlug(name, dbClient);
    const extra = splitTourBody(body);
    const status: 'approved' | 'pending_approval' = isAdmin && body.status === 'approved' ? 'approved' : 'pending_approval';

    await dbClient.execute(
      `INSERT INTO tours (id, vendor_id, vendor_name, name, slug, category, difficulty, region, duration_days, description, image, is_active, is_approved, status, pending_data, price_currency, rating, reviews_count, extra_data)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, vendorId, body.vendorName || null, name, slug, category, difficulty, region, Number(durationDays),
        description || null, image || null,
        body.isActive === undefined ? 1 : (body.isActive ? 1 : 0),
        status === 'approved' ? 1 : 0,
        status,
        null,
        body.priceCurrency || 'AZN',
        body.rating !== undefined && body.rating !== null && body.rating !== '' ? Number(body.rating) : null,
        body.reviewsCount !== undefined && body.reviewsCount !== null && body.reviewsCount !== '' ? Number(body.reviewsCount) : null,
        JSON.stringify(extra)
      ]
    );

    const rows = await dbClient.query('SELECT * FROM tours WHERE id = ?', [id]);
    scheduleTourTranslation(id, { name, description: description || null, includes: body.includes, notIncluded: body.notIncluded, highlights: body.highlights });
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
      merged.rating !== undefined && merged.rating !== null && merged.rating !== '' ? Number(merged.rating) : null,
      merged.reviewsCount !== undefined && merged.reviewsCount !== null && merged.reviewsCount !== '' ? Number(merged.reviewsCount) : null,
      JSON.stringify(extra), id
    ]
  );
  scheduleTourTranslation(id, { name: merged.name, description: merged.description || null, includes: merged.includes, notIncluded: merged.notIncluded, highlights: merged.highlights });
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

    if (body.durationDays !== undefined && !(Number(body.durationDays) > 0)) {
      return res.status(400).json({ error: "Müddət (gün) müsbət ədəd olmalıdır." });
    }
    if (body.price !== undefined && !(Number(body.price) >= 0)) {
      return res.status(400).json({ error: "Qiymət mənfi ola bilməz." });
    }

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
    if (!(Number(price) >= 0)) {
      return res.status(400).json({ error: "Qiymət mənfi ola bilməz." });
    }
    if (!(Number(capacity) > 0)) {
      return res.status(400).json({ error: "Tutum müsbət ədəd olmalıdır." });
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

// GET /api/bookings — list bookings, optionally filtered by vendorId / tourId / customerId / status.
// Bookings carry customer names and phone numbers, so this requires a valid admin/vendor
// session — a vendor token restricts the result to that vendor's own bookings (ignoring any
// client-supplied vendorId), an admin token can see everything.
app.get("/api/bookings", authenticateUser, async (req: any, res) => {
  try {
    const user = req.operator;
    const { tourId, customerId, status } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (user.role === 'vendor') {
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

// DELETE /api/bookings/:id — vendors may only delete their own bookings; admins may delete any.
app.delete("/api/bookings/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Rezervasiya tapılmadı." });

    const existing = rowToBooking(existingRows[0]);
    if (req.operator.role !== 'admin' && existing.vendorId !== req.operator.id) {
      return res.status(403).json({ error: "Bu rezervasiya sizin hesabınıza aid deyil." });
    }

    // Cancelled bookings already freed their seats via PUT; only give seats back here
    // if the booking being deleted was still occupying capacity.
    if (existing.status !== 'cancelled') {
      await dbClient.execute('UPDATE tour_slots SET booked_count = booked_count - ? WHERE id = ?', [Number(existing.participantsCount), existing.slotId]);
    }

    await dbClient.execute('DELETE FROM bookings WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/bookings/:id] error:", error);
    res.status(500).json({ error: "Rezervasiya silinə bilmədi: " + error.message });
  }
});

// Vendor transport tracking — CRUD for "which vehicle we sent to which tour departure, and at
// what cost". Admin-gated per vendor via users.extra_data.busTrackingEnabled (see
// PUT /api/users/:id). The list is shared: every vendor can read every record (so operators can
// see what's already booked platform-wide), but only the owning vendor may write/edit/delete
// their own rows — enforced below, not just hidden client-side.
function rowToVendorBus(row: any) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name || undefined,
    tourId: row.tour_id || undefined,
    tourName: row.tour_name,
    contactPhone: row.contact_phone || '',
    vehicleDescription: row.bus_name || undefined,
    price: Number(row.price) || 0,
    travelDate: row.travel_date,
    createdAt: row.created_at,
  };
}

async function isBusTrackingEnabledForVendor(vendorId: string): Promise<boolean> {
  const rows = await dbClient.query('SELECT extra_data FROM users WHERE id = ?', [vendorId]);
  if (!rows.length) return false;
  try {
    const extra = rows[0].extra_data ? JSON.parse(rows[0].extra_data) : {};
    return !!extra.busTrackingEnabled;
  } catch {
    return false;
  }
}

app.get("/api/vendor-buses", authenticateUser, async (req: any, res) => {
  try {
    const user = req.operator;
    const conditions: string[] = [];
    const params: any[] = [];

    if (user.role === 'vendor') {
      // Shared list — every vendor sees every vendor's transport records (so operators can see
      // what's already booked platform-wide). Writes stay owner-scoped in POST/PUT/DELETE below.
    } else if (user.role === 'admin') {
      if (req.query.vendorId) { conditions.push('vendor_id = ?'); params.push(String(req.query.vendorId)); }
    } else {
      return res.status(403).json({ error: "Bu bölməyə icazəniz yoxdur." });
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbClient.query(`SELECT * FROM vendor_buses ${whereClause} ORDER BY travel_date DESC, created_at DESC`, params);
    res.json({ buses: rows.map(rowToVendorBus) });
  } catch (error: any) {
    console.error("[GET /api/vendor-buses] error:", error);
    res.status(500).json({ error: "Avtobus qeydləri gətirilə bilmədi: " + error.message });
  }
});

app.post("/api/vendor-buses", authenticateUser, async (req: any, res) => {
  try {
    if (req.operator.role !== 'vendor') {
      return res.status(403).json({ error: "Yalnız operatorlar avtobus qeydi əlavə edə bilər." });
    }
    if (!(await isBusTrackingEnabledForVendor(req.operator.id))) {
      return res.status(403).json({ error: "Avtobus izləmə bu hesab üçün aktiv deyil." });
    }

    const body = req.body || {};
    const { tourName, contactPhone, price, travelDate } = body;
    if (!tourName || !contactPhone || price === undefined || !travelDate) {
      return res.status(400).json({ error: "Zəhmət olmasa bütün məcburi sahələri doldurun (tourName, contactPhone, price, travelDate)." });
    }

    const vendorRows = await dbClient.query('SELECT name, company_name FROM users WHERE id = ?', [req.operator.id]);
    const vendorName = vendorRows.length ? (vendorRows[0].company_name || vendorRows[0].name) : undefined;

    const id = `bus-${randomUUID()}`;
    await dbClient.execute(
      `INSERT INTO vendor_buses (id, vendor_id, vendor_name, tour_id, tour_name, contact_phone, bus_name, price, travel_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, req.operator.id, vendorName || null, body.tourId || null, tourName, contactPhone, body.vehicleDescription || null, Number(price), travelDate]
    );

    const rows = await dbClient.query('SELECT * FROM vendor_buses WHERE id = ?', [id]);
    res.status(201).json({ bus: rowToVendorBus(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/vendor-buses] error:", error);
    res.status(500).json({ error: "Avtobus qeydi yaradıla bilmədi: " + error.message });
  }
});

app.put("/api/vendor-buses/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM vendor_buses WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Avtobus qeydi tapılmadı." });
    const existing = existingRows[0];
    if (req.operator.role !== 'vendor' || existing.vendor_id !== req.operator.id) {
      return res.status(403).json({ error: "Bu qeyd sizin hesabınıza aid deyil." });
    }

    const body = req.body || {};
    const tourId = body.tourId !== undefined ? body.tourId : existing.tour_id;
    const tourName = body.tourName !== undefined ? body.tourName : existing.tour_name;
    const contactPhone = body.contactPhone !== undefined ? body.contactPhone : existing.contact_phone;
    const vehicleDescription = body.vehicleDescription !== undefined ? body.vehicleDescription : existing.bus_name;
    const price = body.price !== undefined ? Number(body.price) : Number(existing.price);
    const travelDate = body.travelDate !== undefined ? body.travelDate : existing.travel_date;

    if (!contactPhone) {
      return res.status(400).json({ error: "Əlaqə nömrəsi mütləq daxil edilməlidir." });
    }

    await dbClient.execute(
      `UPDATE vendor_buses SET tour_id = ?, tour_name = ?, contact_phone = ?, bus_name = ?, price = ?, travel_date = ? WHERE id = ?`,
      [tourId || null, tourName, contactPhone, vehicleDescription || null, price, travelDate, req.params.id]
    );

    const rows = await dbClient.query('SELECT * FROM vendor_buses WHERE id = ?', [req.params.id]);
    res.json({ bus: rowToVendorBus(rows[0]) });
  } catch (error: any) {
    console.error("[PUT /api/vendor-buses/:id] error:", error);
    res.status(500).json({ error: "Avtobus qeydi yenilənə bilmədi: " + error.message });
  }
});

app.delete("/api/vendor-buses/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM vendor_buses WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Avtobus qeydi tapılmadı." });
    const existing = existingRows[0];
    if (req.operator.role !== 'vendor' || existing.vendor_id !== req.operator.id) {
      return res.status(403).json({ error: "Bu qeyd sizin hesabınıza aid deyil." });
    }

    await dbClient.execute('DELETE FROM vendor_buses WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/vendor-buses/:id] error:", error);
    res.status(500).json({ error: "Avtobus qeydi silinə bilmədi: " + error.message });
  }
});

// Driver blacklist — CRUD for "which drivers other vendors should avoid". Same shared-read /
// owner-write model as vendor_buses, gated by the same busTrackingEnabled flag.
function rowToDriverBlacklistEntry(row: any) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    vendorName: row.vendor_name || undefined,
    driverName: row.driver_name,
    phoneNumber: row.phone_number,
    reason: row.reason,
    createdAt: row.created_at,
  };
}

app.get("/api/driver-blacklist", authenticateUser, async (req: any, res) => {
  try {
    const user = req.operator;
    const conditions: string[] = [];
    const params: any[] = [];

    if (user.role === 'vendor') {
      // Shared list — every vendor sees every reported driver.
    } else if (user.role === 'admin') {
      if (req.query.vendorId) { conditions.push('vendor_id = ?'); params.push(String(req.query.vendorId)); }
    } else {
      return res.status(403).json({ error: "Bu bölməyə icazəniz yoxdur." });
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbClient.query(`SELECT * FROM driver_blacklist ${whereClause} ORDER BY created_at DESC`, params);
    res.json({ entries: rows.map(rowToDriverBlacklistEntry) });
  } catch (error: any) {
    console.error("[GET /api/driver-blacklist] error:", error);
    res.status(500).json({ error: "Qara siyahı gətirilə bilmədi: " + error.message });
  }
});

app.post("/api/driver-blacklist", authenticateUser, async (req: any, res) => {
  try {
    if (req.operator.role !== 'vendor') {
      return res.status(403).json({ error: "Yalnız operatorlar qara siyahıya əlavə edə bilər." });
    }
    if (!(await isBusTrackingEnabledForVendor(req.operator.id))) {
      return res.status(403).json({ error: "Nəqliyyat izləmə bu hesab üçün aktiv deyil." });
    }

    const body = req.body || {};
    const { driverName, phoneNumber, reason } = body;
    if (!driverName || !phoneNumber || !reason) {
      return res.status(400).json({ error: "Zəhmət olmasa bütün məcburi sahələri doldurun (driverName, phoneNumber, reason)." });
    }

    const vendorRows = await dbClient.query('SELECT name, company_name FROM users WHERE id = ?', [req.operator.id]);
    const vendorName = vendorRows.length ? (vendorRows[0].company_name || vendorRows[0].name) : undefined;

    const id = `blacklist-${randomUUID()}`;
    await dbClient.execute(
      `INSERT INTO driver_blacklist (id, vendor_id, vendor_name, driver_name, phone_number, reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, req.operator.id, vendorName || null, driverName, phoneNumber, reason]
    );

    const rows = await dbClient.query('SELECT * FROM driver_blacklist WHERE id = ?', [id]);
    res.status(201).json({ entry: rowToDriverBlacklistEntry(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/driver-blacklist] error:", error);
    res.status(500).json({ error: "Qara siyahıya əlavə edilə bilmədi: " + error.message });
  }
});

app.put("/api/driver-blacklist/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM driver_blacklist WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Qeyd tapılmadı." });
    const existing = existingRows[0];
    if (req.operator.role !== 'vendor' || existing.vendor_id !== req.operator.id) {
      return res.status(403).json({ error: "Bu qeyd sizin hesabınıza aid deyil." });
    }

    const body = req.body || {};
    const driverName = body.driverName !== undefined ? body.driverName : existing.driver_name;
    const phoneNumber = body.phoneNumber !== undefined ? body.phoneNumber : existing.phone_number;
    const reason = body.reason !== undefined ? body.reason : existing.reason;

    if (!driverName || !phoneNumber || !reason) {
      return res.status(400).json({ error: "Zəhmət olmasa bütün məcburi sahələri doldurun (driverName, phoneNumber, reason)." });
    }

    await dbClient.execute(
      `UPDATE driver_blacklist SET driver_name = ?, phone_number = ?, reason = ? WHERE id = ?`,
      [driverName, phoneNumber, reason, req.params.id]
    );

    const rows = await dbClient.query('SELECT * FROM driver_blacklist WHERE id = ?', [req.params.id]);
    res.json({ entry: rowToDriverBlacklistEntry(rows[0]) });
  } catch (error: any) {
    console.error("[PUT /api/driver-blacklist/:id] error:", error);
    res.status(500).json({ error: "Qeyd yenilənə bilmədi: " + error.message });
  }
});

app.delete("/api/driver-blacklist/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM driver_blacklist WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Qeyd tapılmadı." });
    const existing = existingRows[0];
    if (req.operator.role !== 'vendor' || existing.vendor_id !== req.operator.id) {
      return res.status(403).json({ error: "Bu qeyd sizin hesabınıza aid deyil." });
    }

    await dbClient.execute('DELETE FROM driver_blacklist WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/driver-blacklist/:id] error:", error);
    res.status(500).json({ error: "Qeyd silinə bilmədi: " + error.message });
  }
});

// Saved guide-payment/net-income calculations — snapshots a vendor keeps from the Kalkulyator
// tab. Unlike vendor_buses/driver_blacklist, this is private financial data: every read and
// write below is scoped to the owning vendor, never a shared list.
function rowToSavedCalculation(row: any) {
  return {
    id: row.id,
    vendorId: row.vendor_id,
    tourId: row.tour_id || undefined,
    tourName: row.tour_name,
    slotId: row.slot_id || undefined,
    slotDate: row.slot_date || undefined,
    participants: Number(row.participants) || 0,
    pricePerPerson: Number(row.price_per_person) || 0,
    durationDays: Number(row.duration_days) || 0,
    tier: row.tier,
    mainGuideTotal: Number(row.main_guide_total) || 0,
    assistantGuideTotal: Number(row.assistant_guide_total) || 0,
    guideTotal: Number(row.guide_total) || 0,
    busPrice: Number(row.bus_price) || 0,
    nivaTotal: Number(row.niva_total) || 0,
    uazTotal: Number(row.uaz_total) || 0,
    gaz66Total: Number(row.gaz66_total) || 0,
    sandwichTotal: Number(row.sandwich_total) || 0,
    villageLunchTotal: Number(row.village_lunch_total) || 0,
    villageTeaTotal: Number(row.village_tea_total) || 0,
    nationalParkTotal: Number(row.national_park_total) || 0,
    otherCostsTotal: Number(row.other_costs_total) || 0,
    collected: Number(row.collected) || 0,
    netIncome: Number(row.net_income) || 0,
    createdAt: row.created_at,
  };
}

async function isCalculatorEnabledForVendor(vendorId: string): Promise<boolean> {
  const rows = await dbClient.query('SELECT extra_data FROM users WHERE id = ?', [vendorId]);
  if (!rows.length) return false;
  try {
    const extra = rows[0].extra_data ? JSON.parse(rows[0].extra_data) : {};
    return !!extra.calculatorEnabled;
  } catch {
    return false;
  }
}

app.get("/api/guide-calculations", authenticateUser, async (req: any, res) => {
  try {
    const user = req.operator;
    const conditions: string[] = [];
    const params: any[] = [];

    if (user.role === 'vendor') {
      conditions.push('vendor_id = ?');
      params.push(user.id);
    } else if (user.role === 'admin') {
      if (req.query.vendorId) { conditions.push('vendor_id = ?'); params.push(String(req.query.vendorId)); }
    } else {
      return res.status(403).json({ error: "Bu bölməyə icazəniz yoxdur." });
    }

    if (req.query.tourId) { conditions.push('tour_id = ?'); params.push(String(req.query.tourId)); }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbClient.query(`SELECT * FROM guide_calculations ${whereClause} ORDER BY created_at DESC`, params);
    res.json({ calculations: rows.map(rowToSavedCalculation) });
  } catch (error: any) {
    console.error("[GET /api/guide-calculations] error:", error);
    res.status(500).json({ error: "Hesablamalar gətirilə bilmədi: " + error.message });
  }
});

app.post("/api/guide-calculations", authenticateUser, async (req: any, res) => {
  try {
    if (req.operator.role !== 'vendor') {
      return res.status(403).json({ error: "Yalnız operatorlar hesablama yadda saxlaya bilər." });
    }
    if (!(await isCalculatorEnabledForVendor(req.operator.id))) {
      return res.status(403).json({ error: "Kalkulyator bu hesab üçün aktiv deyil." });
    }

    const body = req.body || {};
    const { tourName, participants, pricePerPerson, durationDays, tier, mainGuideTotal, assistantGuideTotal, guideTotal } = body;
    if (!tourName || participants === undefined || pricePerPerson === undefined || !durationDays || !tier || guideTotal === undefined) {
      return res.status(400).json({ error: "Zəhmət olmasa bütün məcburi sahələri doldurun." });
    }

    const id = `calc-${randomUUID()}`;
    await dbClient.execute(
      `INSERT INTO guide_calculations (id, vendor_id, tour_id, tour_name, slot_id, slot_date, participants, price_per_person, duration_days, tier, main_guide_total, assistant_guide_total, guide_total, bus_price, niva_total, uaz_total, gaz66_total, sandwich_total, village_lunch_total, village_tea_total, national_park_total, other_costs_total, collected, net_income)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, req.operator.id, body.tourId || null, tourName, body.slotId || null, body.slotDate || null,
        Number(participants), Number(pricePerPerson), Number(durationDays), tier,
        Number(mainGuideTotal) || 0, Number(assistantGuideTotal) || 0, Number(guideTotal),
        Number(body.busPrice) || 0,
        Number(body.nivaTotal) || 0, Number(body.uazTotal) || 0, Number(body.gaz66Total) || 0,
        Number(body.sandwichTotal) || 0, Number(body.villageLunchTotal) || 0, Number(body.villageTeaTotal) || 0,
        Number(body.nationalParkTotal) || 0,
        Number(body.otherCostsTotal) || 0, Number(body.collected) || 0, Number(body.netIncome) || 0,
      ]
    );

    const rows = await dbClient.query('SELECT * FROM guide_calculations WHERE id = ?', [id]);
    res.status(201).json({ calculation: rowToSavedCalculation(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/guide-calculations] error:", error);
    res.status(500).json({ error: "Hesablama yadda saxlanıla bilmədi: " + error.message });
  }
});

app.delete("/api/guide-calculations/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM guide_calculations WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Hesablama tapılmadı." });
    const existing = existingRows[0];
    if (req.operator.role !== 'vendor' || existing.vendor_id !== req.operator.id) {
      return res.status(403).json({ error: "Bu hesablama sizin hesabınıza aid deyil." });
    }

    await dbClient.execute('DELETE FROM guide_calculations WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/guide-calculations/:id] error:", error);
    res.status(500).json({ error: "Hesablama silinə bilmədi: " + error.message });
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

// Itemized PDF export of a guide-payment/net-income calculation. Generated on demand from
// whatever the vendor currently has on screen (not a stored record) — this way every last
// sub-line (bonus splits, per-vehicle/per-item qty x price) shows up in the export even though
// the saved-history table only keeps the item-level totals, not every intermediate number.
// Reuses the same jsPDF + Roboto-font setup as the ticket generator above so Azerbaijani
// characters (Ə, ə, ı, İ, etc.) render natively instead of falling back to transliteration.
app.post("/api/guide-calculations/pdf", authenticateUser, async (req: any, res) => {
  try {
    if (req.operator.role !== 'vendor') {
      return res.status(403).json({ error: "Yalnız operatorlar hesablama PDF-i yükləyə bilər." });
    }
    if (!(await isCalculatorEnabledForVendor(req.operator.id))) {
      return res.status(403).json({ error: "Kalkulyator bu hesab üçün aktiv deyil." });
    }

    const body = req.body || {};
    const { tourName } = body;
    if (!tourName) return res.status(400).json({ error: "Tur adı tələb olunur." });

    const num = (v: any) => Number(v) || 0;

    const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });

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

    const toAscii = (str: string) => (str || "")
      .replace(/Ə/g, "E").replace(/ə/g, "e")
      .replace(/ı/g, "i").replace(/İ/g, "I")
      .replace(/Ö/g, "O").replace(/ö/g, "o")
      .replace(/Ü/g, "U").replace(/ü/g, "u")
      .replace(/Ç/g, "C").replace(/ç/g, "c")
      .replace(/Ş/g, "S").replace(/ş/g, "s")
      .replace(/Ğ/g, "G").replace(/ğ/g, "g");
    const displayText = (str: string) => hasCustomFonts ? (str || "") : toAscii(str);

    const pageWidth = 595;
    const marginX = 40;
    let y = 50;

    doc.setFont(fontName, "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(displayText("BƏLƏDÇİ ÖDƏNİŞİ VƏ NET GƏLİR HESABLAMASI"), pageWidth / 2, y, { align: "center" });
    y += 20;

    doc.setFont(fontName, "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    doc.text(displayText(`${tourName}${body.slotDate ? ' — ' + body.slotDate : ''}`), pageWidth / 2, y, { align: "center" });
    y += 14;
    doc.setFontSize(8.5);
    doc.setTextColor(148, 163, 184);
    doc.text(displayText(new Date().toLocaleDateString('az-AZ')), pageWidth / 2, y, { align: "center" });
    y += 26;

    const drawRow = (label: string, value: string, opts: { bold?: boolean; indent?: number; size?: number; color?: [number, number, number] } = {}) => {
      const { bold = false, indent = 0, size = 10, color = [15, 23, 42] } = opts;
      doc.setFont(fontName, bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(displayText(label), marginX + indent, y);
      doc.text(displayText(value), pageWidth - marginX, y, { align: "right" });
      y += size + 7;
    };

    const drawSectionTitle = (title: string) => {
      y += 4;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.75);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 18;
      doc.setFont(fontName, "bold");
      doc.setFontSize(11.5);
      doc.setTextColor(6, 95, 70); // emerald-800
      doc.text(displayText(title), marginX, y);
      y += 16;
    };

    const tierLabel = body.tier === 'peak' ? 'Zirvə' : body.tier === 'camp' ? 'Kamp' : 'Hiking';

    drawSectionTitle("Tur Məlumatları");
    drawRow("İştirakçı sayı", `${num(body.participants)} nəfər`);
    drawRow("Turun qiyməti (nəfər başına)", `${num(body.pricePerPerson).toFixed(2)} AZN`);
    drawRow("Tur müddəti", `${num(body.durationDays) || 1} gün`);
    drawRow("Bələdçi qiymət kateqoriyası", tierLabel);

    // A saved (historical) calculation only carries item-level totals, not every intermediate
    // number (base pay / second bonus / discretionary bonus share, or each item's qty x unit
    // price) — those sub-lines only render when the caller actually provides them (the live
    // in-progress calculator does; a saved-row export doesn't), so a saved export shows one
    // clean total per line instead of misleading "0.00 AZN" sub-rows.
    const has = (v: any) => v !== undefined && v !== null;
    const qtyDetail = (qty: any, price: any) => has(qty) && has(price) ? ` (${num(qty)} x ${num(price).toFixed(2)} AZN)` : '';

    drawSectionTitle("Bələdçilərə Ödəniş");
    const hasMainBreakdown = has(body.mainGuidePayment);
    if (hasMainBreakdown) {
      drawRow("Əsas bələdçi — əsas ödəniş", `${num(body.mainGuidePayment).toFixed(2)} AZN`, { indent: 10 });
      drawRow("Əsas bələdçi — ikinci bonus", `${num(body.mainGuideSecondBonus).toFixed(2)} AZN`, { indent: 10 });
      if (num(body.mainBonusShare) > 0) drawRow("Əsas bələdçi — əlavə bonus payı", `${num(body.mainBonusShare).toFixed(2)} AZN`, { indent: 10 });
    }
    drawRow("Əsas bələdçiyə cəmi", `${num(body.mainGuideTotal).toFixed(2)} AZN`, { indent: hasMainBreakdown ? 10 : 0, bold: true });
    const hasAssistantBreakdown = has(body.assistantGuidePayment);
    if (hasAssistantBreakdown) {
      drawRow(body.hasThirdGuide ? "Köməkçi bələdçilər — əsas ödəniş" : "Köməkçi bələdçi — əsas ödəniş", `${num(body.assistantGuidePayment).toFixed(2)} AZN`, { indent: 10 });
      drawRow("Köməkçi — ikinci bonus", `${num(body.assistantGuideSecondBonus).toFixed(2)} AZN`, { indent: 10 });
      if (num(body.assistantBonusShare) > 0) drawRow("Köməkçi — əlavə bonus payı", `${num(body.assistantBonusShare).toFixed(2)} AZN`, { indent: 10 });
    }
    drawRow(body.hasThirdGuide ? "Köməkçi bələdçilərə cəmi" : "Köməkçi bələdçiyə cəmi", `${num(body.assistantGuideTotal).toFixed(2)} AZN`, { indent: hasAssistantBreakdown ? 10 : 0, bold: true });
    drawRow("Bələdçilərə ödəniş cəmi", `${num(body.guideTotal).toFixed(2)} AZN`, { bold: true, color: [6, 95, 70] });

    drawSectionTitle("Digər Xərclər");
    if (num(body.busPrice) > 0) drawRow("Nəqliyyat", `${num(body.busPrice).toFixed(2)} AZN`, { indent: 10 });
    if (num(body.nivaTotal) > 0) drawRow(`Niva${qtyDetail(body.nivaQty, body.nivaUnitPrice)}`, `${num(body.nivaTotal).toFixed(2)} AZN`, { indent: 10 });
    if (num(body.uazTotal) > 0) drawRow(`UAZ${qtyDetail(body.uazQty, body.uazUnitPrice)}`, `${num(body.uazTotal).toFixed(2)} AZN`, { indent: 10 });
    if (num(body.gaz66Total) > 0) drawRow(`Gaz-66${qtyDetail(body.gaz66Qty, body.gaz66UnitPrice)}`, `${num(body.gaz66Total).toFixed(2)} AZN`, { indent: 10 });
    if (num(body.sandwichTotal) > 0) drawRow(`Sendviç nahar${qtyDetail(body.sandwichQty, body.sandwichUnitPrice)}`, `${num(body.sandwichTotal).toFixed(2)} AZN`, { indent: 10 });
    if (num(body.villageLunchTotal) > 0) drawRow(`Kənd evində nahar${qtyDetail(body.villageLunchQty, body.villageLunchUnitPrice)}`, `${num(body.villageLunchTotal).toFixed(2)} AZN`, { indent: 10 });
    if (num(body.villageTeaTotal) > 0) drawRow("Kənd evində çay süfrəsi (cəmi)", `${num(body.villageTeaTotal).toFixed(2)} AZN`, { indent: 10 });
    if (num(body.nationalParkTotal) > 0) drawRow(`Milli park girişi${qtyDetail(body.nationalParkQty, body.nationalParkUnitPrice)}`, `${num(body.nationalParkTotal).toFixed(2)} AZN`, { indent: 10 });
    drawRow("Digər xərclər cəmi", `${num(body.otherCostsTotal).toFixed(2)} AZN`, { bold: true });

    drawSectionTitle("Yekun");
    drawRow("Yığılan pul", `${num(body.collected).toFixed(2)} AZN`);
    drawRow("Turdan olan net gəlir", `${num(body.netIncome).toFixed(2)} AZN`, { bold: true, size: 13, color: [6, 95, 70] });

    const pdfArrayBuffer = doc.output("arraybuffer");
    const safeName = toAscii(tourName).replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '_').slice(0, 60) || 'hesablama';

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.pdf"`);
    res.send(Buffer.from(pdfArrayBuffer));
  } catch (error: any) {
    console.error("[POST /api/guide-calculations/pdf] error:", error);
    res.status(500).json({ error: "PDF yaradıla bilmədi: " + error.message });
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

  // Any /api/* path that didn't match one of the routes above is a genuine 404, not a page to
  // render — without this, both the dev Vite middleware and the production static/SPA fallback
  // below would happily serve index.html (200 + HTML) for a typo'd or removed endpoint, which
  // breaks response.json() on the client instead of surfacing a clear error.
  app.use('/api', (req, res) => {
    res.status(404).json({ error: "Belə bir API endpoint mövcud deyil." });
  });

  // Classify page navigations BEFORE the SPA fallbacks below: unknown routes (mistyped URLs,
  // deleted tour slugs) still render the SPA — whose router shows its NotFoundPage — but with
  // a real 404 status instead of a soft-404 (200 + HTML), which search engines would index.
  const STATIC_CLIENT_ROUTES = new Set(['/', '/faq', '/calculator', '/wishlist', '/compare', '/camp-sites', '/camp-sites/add', '/vendor/login', '/admin/login']);
  app.use(async (req, res, next) => {
    if (req.method !== 'GET') return next();
    // Only page navigations — assets (js/css/img) don't send an HTML accept header.
    if (!(req.headers.accept || '').includes('text/html')) return next();
    const p = (req.path || '/').replace(/\/+$/, '') || '/';

    let known = STATIC_CLIENT_ROUTES.has(p)
      || p.startsWith('/vendor/dashboard')
      || p.startsWith('/admin/dashboard');
    try {
      if (!known && p.startsWith('/tours/')) {
        const slug = decodeURIComponent(p.slice('/tours/'.length));
        const rows = await dbClient.query(`SELECT id FROM tours WHERE slug = ?`, [slug]);
        known = rows.length > 0;
      } else if (!known && p.startsWith('/organizer/')) {
        const vendorId = decodeURIComponent(p.slice('/organizer/'.length));
        const rows = await dbClient.query(`SELECT id FROM users WHERE id = ? AND role = 'vendor'`, [vendorId]);
        known = rows.length > 0;
      }
    } catch {
      known = true; // DB hiccup — never 404 a potentially valid page
    }

    if (!known) {
      res.status(404);
      (req as any).spaNotFound = true;
    }
    next();
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Vite's own html middleware always responds 200, wiping the 404 the classifier above
    // set — so unknown pages get their (transformed) index.html served here instead, with
    // the real 404 status. The SPA router still renders its NotFoundPage.
    app.use(async (req, res, next) => {
      if (!(req as any).spaNotFound) return next();
      try {
        const template = fs.readFileSync(path.join(process.cwd(), "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, template);
        res.status(404).set({ "Content-Type": "text/html" }).end(html);
      } catch {
        next();
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // SPA fallback handling — .status() keeps whatever the classifier above decided.
    app.get('*', (req, res) => {
      res.status(res.statusCode || 200).sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();