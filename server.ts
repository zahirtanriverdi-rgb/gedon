// Load .env before anything else reads process.env (JWT_SECRET, DATABASE_URL, seed passwords…).
import "dotenv/config";
import express from "express";
import path from "path";
import fs from "fs";
import { jsPDF } from "jspdf";
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
  getSetting,
} from "./server/campSites.ts";
import {
  isTelegramEnabled,
  escapeHtml,
  broadcastTelegram,
  startTelegramPolling,
  setTelegramCallbackHandler,
} from "./server/telegram.ts";
import { parseBboxParam, getPoisForBbox } from "./server/overpass.ts";
import { resolveGoogleMapsLink } from "./server/geo.ts";
import multer from "multer";
import { storeMediaFile, isAllowedMediaType, isS3Enabled } from "./server/storage.ts";
import QRCode from "qrcode";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// ===================== BASE URL & STATIC FILES =====================
const publicDir = path.join(process.cwd(), "public");
app.use("/tour-images", express.static(path.join(publicDir, "tour-images")));
app.use("/uploads", express.static(path.join(publicDir, "uploads")));
app.use("/public", express.static(publicDir));

const getBaseUrl = () => {
  if (process.env.NODE_ENV === "production") {
    return process.env.VITE_API_BASE_URL ||
      process.env.RENDER_EXTERNAL_URL ||
      "https://gedekgorek.onrender.com";
  }
  return `http://localhost:${process.env.PORT || 3000}`;
};

console.log(`[Static] Serving files from: ${publicDir}`);
console.log(`[Base URL] Current base: ${getBaseUrl()}`);
console.log(`[Storage] Media uploads → ${isS3Enabled() ? "S3-compatible bucket" : "local disk (public/uploads) — S3 env not configured"}`);

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

app.use(express.json({ limit: '50mb' }));

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ error: "Göndərilən məlumat düzgün formatda deyil (JSON parse xətası)." });
  }
  next(err);
});

if (!process.env.JWT_SECRET) {
  console.warn("[SECURITY] JWT_SECRET is not set — generating a random one for this process only.");
}
const JWT_SECRET = process.env.JWT_SECRET || randomUUID() + randomUUID();

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
    telegramChatIds: Array.isArray(extra.telegramChatIds) ? extra.telegramChatIds : [],
    waTemplates: Array.isArray(extra.waTemplates) ? extra.waTemplates : [],
  };
}

function verifyPasswordAndIssueToken(user: any, password: string): { token: string } | null {
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  return { token };
}

// ===================== MEDIA UPLOAD =====================
const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (isAllowedMediaType(file.mimetype)) cb(null, true);
    else cb(new Error(`Dəstəklənməyən fayl tipi: ${file.mimetype}`));
  },
});

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
app.post("/api/upload", authenticateUser, (req: any, res) => {
  mediaUpload.array("files", 10)(req, res, async (err: any) => {
    if (err) {
      const msg = err.code === "LIMIT_FILE_SIZE"
        ? "Fayl çox böyükdür (maksimum 100MB)."
        : err.message || "Fayl yüklənmədi.";
      return res.status(400).json({ success: false, error: msg });
    }
    const files = (req.files || []) as Express.Multer.File[];
    if (files.length === 0) {
      return res.status(400).json({ success: false, error: "Heç bir fayl göndərilməyib." });
    }
    const oversizedImage = files.find(f => f.mimetype.startsWith("image/") && f.size > MAX_IMAGE_BYTES);
    if (oversizedImage) {
      return res.status(400).json({ success: false, error: "Şəkil çox böyükdür (maksimum 15MB)." });
    }
    try {
      const stored = await Promise.all(files.map(f => storeMediaFile(f.buffer, f.mimetype)));
      return res.json({
        success: true,
        urls: stored.map(s => s.url),
        images: stored.filter(s => s.kind === "image").map(s => s.url),
        videos: stored.filter(s => s.kind === "video").map(s => s.url),
      });
    } catch (e: any) {
      console.error("[Upload] Media storage failed:", e);
      return res.status(500).json({ success: false, error: "Fayl saxlanarkən xəta baş verdi." });
    }
  });
});

// ADMIN LOGIN
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

// OPERATOR LOGIN
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

// POST /api/admin/vendors
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

// DELETE /api/admin/vendors/:id
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

// GET /api/users
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

// GET /api/vendors/:id (Public endpoint - müştəri səhifəsi üçün vendor məlumatları)
app.get("/api/vendors/:id", async (req, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM users WHERE id = ? AND role = \'vendor\'', [req.params.id]);
    if (!rows.length) {
      return res.status(404).json({ error: "Vendor tapılmadı." });
    }
    res.json({ user: rowToUser(rows[0]) });
  } catch (error: any) {
    console.error("[GET /api/vendors/:id] error:", error);
    res.status(500).json({ error: "Vendor məlumatlarını gətirmək mümkün olmadı: " + error.message });
  }
});

// PUT /api/users/:id
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
    if ((isAdmin || isSelf) && body.calculatorConfig !== undefined) extra.calculatorConfig = body.calculatorConfig;
    if ((isAdmin || isSelf) && body.waTemplates !== undefined) {
      if (!Array.isArray(body.waTemplates)) return res.status(400).json({ error: "waTemplates massiv olmalıdır." });
      extra.waTemplates = body.waTemplates
        .filter((t: any) => t && typeof t.text === 'string')
        .map((t: any) => ({
          id: String(t.id || `tpl-${randomUUID()}`),
          name: String(t.name || '').slice(0, 100),
          text: String(t.text).slice(0, 2000),
        }));
    }
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
      if (body.telegramChatIds !== undefined) {
        if (!Array.isArray(body.telegramChatIds)) return res.status(400).json({ error: "telegramChatIds massiv olmalıdır." });
        extra.telegramChatIds = body.telegramChatIds.map((c: any) => String(c).trim()).filter(Boolean);
      }
    }
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

// POST /api/auth/change-password
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

// POST /api/auth/send-email-verification
app.post("/api/auth/send-email-verification", authenticateUser, async (req: any, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.operator.id]);
    if (!rows.length) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
    const user = rows[0];
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
    res.status(500).json({ error: error.message || "Təsdiqləmə kodu göndərilə bilmədi." });
  }
});

// POST /api/auth/verify-email
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

// POST /api/auth/forgot-password
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
    if (!user || !user.email_verified_at) {
      return res.json(genericResponse);
    }
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const expires = new Date(Date.now() + 30 * 60 * 1000);
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
      console.error("[POST /api/auth/forgot-password] email send error:", emailError.message);
    }
    return res.json(genericResponse);
  } catch (error: any) {
    console.error("[POST /api/auth/forgot-password] error:", error);
    return res.status(500).json({ error: "Sorğu zamanı server xətası baş verdi." });
  }
});

// POST /api/auth/reset-password
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

// In-memory "Bookings" table
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

// Endpoint to fetch CBAR live rates
app.get("/api/exchange-rates/cbar", async (req, res) => {
  try {
    if (req.query.live !== '1') {
      const override = await getStoredExchangeRateOverride();
      if (override) {
        return res.json({ success: true, USD: override.USD, EUR: override.EUR, source: 'manual-override' });
      }
    }
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateStr = `${day}.${month}.${year}`;
    let url = `https://cbar.az/currencies/${dateStr}.xml`;
    console.log(`[CBAR] Fetching live rates from: ${url}`);
    let response = await globalThis.fetch(url);
    if (!response.ok) {
      console.log(`[CBAR] Fetch failed for dynamic date ${dateStr}. Falling back to static target.`);
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
      // Backup-date fallback also failed
    }
    return res.status(500).json({ error: "CBAR məzənnələrini gətirmək mümkün olmadı: " + error.message });
  }
});

// Endpoint to track WhatsApp redirect analytics
app.post("/api/bookings/whatsapp-click", (req, res) => {
  const { tourId, startDate, participantsCount, vendorId, booking_reference } = req.body;
  if (!tourId || !startDate || !participantsCount || !vendorId || !booking_reference) {
    return res.status(400).json({ error: "Zəhmət olmasa bütün məlumatları qeyd edin." });
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
    message: "Klik statistikası uğurla qeydə alındı",
    lead: newLead,
    totalLeadsForVendor: serverBookings.filter(b => b.vendorId === vendorId).length
  });
});

// GET /api/bookings/whatsapp-leads
app.get("/api/bookings/whatsapp-leads", authenticateUser, (req: any, res) => {
  const leads = req.operator.role === 'vendor'
    ? serverBookings.filter((b) => b.vendorId === req.operator.id)
    : serverBookings;
  res.json({
    leads,
    totalCount: leads.length
  });
});

// WhatsApp verification endpoints
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

app.get("/api/whatsapp/public-status", (req, res) => {
  return res.json(getPublicWhatsAppStatus());
});

app.get("/api/whatsapp/captcha", (req, res) => {
  return res.json(generateCaptchaChallenge());
});

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
      error: "Təhlükəsizlik sualının vaxtı bitib.",
      captchaFailed: true,
      captchaExpired: true
    });
  }
  if (captchaResult === "wrong") {
    return res.status(400).json({ error: "Təhlükəsizlik sualının cavabı yanlışdır.", captchaFailed: true });
  }
  const rate = checkAndConsumeRateLimit(phone);
  if (!rate.allowed) {
    return res.status(429).json({
      error: "Çox sayda cəhd edildi.",
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
      return res.status(503).json({ error: "WhatsApp doğrulama sistemi hazırda əlçatan deyil." });
    }
    console.error("[POST /api/whatsapp/verify-number] error:", error);
    return res.status(500).json({ error: "Nömrə yoxlanıla bilmədi." });
  }
});

// Camp Sites endpoints
app.get("/api/camp-sites", async (req, res) => {
  try {
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

app.get("/api/camp-sites/config", async (req, res) => {
  try {
    const config = await getCampPointsConfig();
    res.json({ ...config, enabled: await isCampSitesEnabled() });
  } catch (error: any) {
    console.error("[GET /api/camp-sites/config] error:", error);
    res.status(500).json({ error: "Konfiqurasiya yüklənə bilmədi." });
  }
});

async function getStoredPriceCalculatorConfig(): Promise<Record<string, any> | null> {
  try {
    const raw = await getSetting('price_calculator_config', '');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

async function getStoredExchangeRateOverride(): Promise<{ USD: number; EUR: number } | null> {
  try {
    const raw = await getSetting('exchange_rate_override', '');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.USD > 0 && parsed?.EUR > 0 ? { USD: Number(parsed.USD), EUR: Number(parsed.EUR) } : null;
  } catch {
    return null;
  }
}

app.get("/api/group-calculator/config", async (req, res) => {
  try {
    res.json({
      enabled: await isGroupCalculatorEnabled(),
      config: await getStoredPriceCalculatorConfig(),
    });
  } catch (error: any) {
    console.error("[GET /api/group-calculator/config] error:", error);
    res.status(500).json({ error: "Konfiqurasiya yüklənə bilmədi." });
  }
});

app.get("/api/camp-sites/points", async (req, res) => {
  const normalized = normalizeAzPhone(String(req.query.phone || ""));
  if (!normalized) {
    return res.status(400).json({ error: "Zəhmət olmasa düzgün əlaqə nömrəsi daxil edin." });
  }
  const rate = checkAndConsumeLookupRateLimit(normalized);
  if (!rate.allowed) {
    return res.status(429).json({
      error: "Çox sayda cəhd edildi.",
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
      error: "Təhlükəsizlik sualının vaxtı bitib.",
      captchaFailed: true,
      captchaExpired: true,
    });
  }
  if (captchaResult === "wrong") {
    return res.status(400).json({ error: "Təhlükəsizlik sualının cavabı yanlışdır.", captchaFailed: true });
  }
  const submission = validateCampSiteSubmission(body);
  if ("error" in submission) {
    return res.status(400).json({ error: submission.error });
  }
  const rate = checkAndConsumeRateLimit(submission.submitterPhoneNormalized);
  if (!rate.allowed) {
    return res.status(429).json({
      error: "Çox sayda cəhd edildi.",
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
      priceCalculatorConfig: await getStoredPriceCalculatorConfig(),
      exchangeRateOverride: await getStoredExchangeRateOverride(),
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
  const hasCampFields = body.campPointsPerSite !== undefined || body.campRewardThreshold !== undefined;
  const pointsPerSite = Number(body.campPointsPerSite);
  const threshold = Number(body.campRewardThreshold);
  if (hasCampFields && (!Number.isInteger(pointsPerSite) || pointsPerSite <= 0 || !Number.isInteger(threshold) || threshold <= 0)) {
    return res.status(400).json({ error: "Hər iki qiymət müsbət tam ədəd olmalıdır." });
  }
  if (body.campSitesEnabled !== undefined && typeof body.campSitesEnabled !== 'boolean') {
    return res.status(400).json({ error: "campSitesEnabled true/false olmalıdır." });
  }
  if (body.groupCalculatorEnabled !== undefined && typeof body.groupCalculatorEnabled !== 'boolean') {
    return res.status(400).json({ error: "groupCalculatorEnabled true/false olmalıdır." });
  }
  if (body.priceCalculatorConfig !== undefined && (typeof body.priceCalculatorConfig !== 'object' || body.priceCalculatorConfig === null || Array.isArray(body.priceCalculatorConfig))) {
    return res.status(400).json({ error: "priceCalculatorConfig obyekt olmalıdır." });
  }
  const hasRateFields = body.usdRate !== undefined || body.eurRate !== undefined;
  const usdRate = Number(body.usdRate);
  const eurRate = Number(body.eurRate);
  if (hasRateFields && (!(usdRate > 0) || !(eurRate > 0))) {
    return res.status(400).json({ error: "usdRate və eurRate birlikdə göndərilməli və müsbət ədəd olmalıdır." });
  }
  try {
    if (hasCampFields) {
      await setSetting('camp_points_per_site', String(pointsPerSite));
      await setSetting('camp_reward_threshold', String(threshold));
    }
    if (body.campSitesEnabled !== undefined) {
      await setSetting('camp_sites_enabled', body.campSitesEnabled ? 'true' : 'false');
    }
    if (body.groupCalculatorEnabled !== undefined) {
      await setSetting('group_calculator_enabled', body.groupCalculatorEnabled ? 'true' : 'false');
    }
    if (body.priceCalculatorConfig !== undefined) {
      await setSetting('price_calculator_config', JSON.stringify(body.priceCalculatorConfig));
    }
    if (hasRateFields) {
      await setSetting('exchange_rate_override', JSON.stringify({ USD: usdRate, EUR: eurRate }));
    } else if (body.clearRateOverride === true) {
      await setSetting('exchange_rate_override', '');
    }
    const campConfig = await getCampPointsConfig();
    res.json({
      campPointsPerSite: campConfig.pointsPerSite,
      campRewardThreshold: campConfig.threshold,
      campSitesEnabled: await isCampSitesEnabled(),
      groupCalculatorEnabled: await isGroupCalculatorEnabled(),
      priceCalculatorConfig: await getStoredPriceCalculatorConfig(),
      exchangeRateOverride: await getStoredExchangeRateOverride(),
    });
  } catch (error: any) {
    console.error("[PUT /api/admin/settings] error:", error);
    res.status(500).json({ error: "Parametrlər saxlanıla bilmədi." });
  }
});

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

app.post("/api/admin/email-settings/test", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') {
    return res.status(403).json({ error: "Bu əməliyyat yalnız adminlər üçündür." });
  }
  try {
    await sendEmail({
      to: req.operator.email,
      subject: "Test Email - GedəkGörək",
      html: `<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #1e293b;"> <h2 style="color: #047857;">Test uğurludur ✅</h2> <p>Bu, GedəkGörək admin panelindən göndərilən test emailidir.</p> </div>`
    });
    res.json({ success: true });
  } catch (error: any) {
    console.error("[POST /api/admin/email-settings/test] error:", error);
    res.status(500).json({ error: error.message || "Test email göndərilə bilmədi." });
  }
});

app.get("/api/geo/gmaps", async (req, res) => {
  const result = await resolveGoogleMapsLink(req.query.url);
  if (!result.ok) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  res.json(result.coords);
});

app.get("/api/osm/pois", async (req, res) => {
  const bbox = parseBboxParam(req.query.bbox);
  if (!bbox) {
    return res.status(400).json({ error: "bbox parametri 'minLat,minLon,maxLat,maxLon' formatında olmalıdır." });
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
// ============================================================================
const TOUR_CORE_FIELDS = [
  'id', 'vendorId', 'vendorName', 'name', 'slug', 'category', 'difficulty', 'region',
  'durationDays', 'description', 'image', 'isActive', 'isApproved', 'status',
  'priceCurrency', 'rating', 'reviewsCount', 'createdAt', 'pendingData'
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

// GET /api/tours
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
      conditions.push("status = 'approved'");
      conditions.push("(is_active IS NULL OR is_active != false)");
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

// GET /api/tours/:id
app.get("/api/tours/:id", async (req, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM tours WHERE id = ? OR slug = ?', [req.params.id, req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Tur tapılmadı." });
    const tour = rowToTour(rows[0]);
    const user = getOptionalUser(req);
    const isOwnerVendor = !!user && user.role === 'vendor' && user.id === tour.vendorId;
    const isAdmin = !!user && user.role === 'admin';
    if (!isAdmin && !isOwnerVendor && (tour.status !== 'approved' || tour.isActive === false)) {
      return res.status(404).json({ error: "Tur tapılmadı." });
    }
    res.json({ tour });
  } catch (error: any) {
    console.error("[GET /api/tours/:id] error:", error);
    res.status(500).json({ error: "Turu gətirmək mümkün olmadı: " + error.message });
  }
});

// POST /api/tours
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
    if (!isAdmin) {
      const vendorRows = await dbClient.query('SELECT name, company_name FROM users WHERE id = ?', [vendorId]);
      const vendorName = vendorRows[0]?.company_name || vendorRows[0]?.name || body.vendorName || 'Vendor';
      notifyAdminsTourEvent('tour_created', { id, name }, vendorName);
    }
    res.status(201).json({ tour: rowToTour(rows[0]) });
  } catch (error: any) {
    console.error("[POST /api/tours] error:", error);
    res.status(500).json({ error: "Tur yaradıla bilmədi: " + error.message });
  }
});

// PUT /api/tours/:id
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
        const source = { ...(existing.pendingData || {}), ...body };
        delete source.status;
        const merged = { ...existing, ...source, id: req.params.id };
        delete merged.rejectionReason;
        await writeLiveTourRow(req.params.id, merged, 'approved', null);
      } else if (body.status === 'rejected') {
        const reason = typeof body.rejectionReason === 'string' ? body.rejectionReason.trim() : '';
        if (!reason) {
          return res.status(400).json({ error: "Rədd etmək üçün səbəb qeyd edilməlidir." });
        }
        const merged = { ...existing, ...body, id: req.params.id, rejectionReason: reason };
        delete merged.status;
        await writeLiveTourRow(req.params.id, merged, 'rejected', null);
      } else {
        const merged = { ...existing, ...body, id: req.params.id };
        await writeLiveTourRow(req.params.id, merged, (body.status || existing.status), null);
      }
    } else if (existing.status === 'approved') {
      const proposal = { ...body, id: req.params.id, vendorId: existing.vendorId };
      delete proposal.status;
      delete proposal.isApproved;
      await dbClient.execute(
        `UPDATE tours SET status = 'pending_approval', pending_data = ? WHERE id = ?`,
        [JSON.stringify(proposal), req.params.id]
      );
      notifyAdminsTourEvent('tour_edited', { id: req.params.id, name: existing.name }, existing.vendorName || 'Vendor');
    } else {
      const merged = { ...existing, ...body, id: req.params.id, vendorId: existing.vendorId };
      delete merged.status;
      delete merged.isApproved;
      delete merged.rejectionReason;
      await writeLiveTourRow(req.params.id, merged, 'pending_approval', null);
      notifyAdminsTourEvent('tour_edited', { id: req.params.id, name: merged.name || existing.name }, existing.vendorName || 'Vendor');
    }
    const rows = await dbClient.query('SELECT * FROM tours WHERE id = ?', [req.params.id]);
    res.json({ tour: rowToTour(rows[0]) });
  } catch (error: any) {
    console.error("[PUT /api/tours/:id] error:", error);
    res.status(500).json({ error: "Tur yenilənə bilmədi: " + error.message });
  }
});

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

// DELETE /api/tours/:id
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

// Slots
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

app.get("/api/tours/:tourId/slots", async (req, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM tour_slots WHERE tour_id = ? ORDER BY start_date ASC', [req.params.tourId]);
    res.json({ slots: rows.map(rowToSlot) });
  } catch (error: any) {
    console.error("[GET /api/tours/:tourId/slots] error:", error);
    res.status(500).json({ error: "Tarixləri gətirmək mümkün olmadı: " + error.message });
  }
});

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

// Bookings
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

async function generateBookingReference(): Promise<string> {
  for (let digits = 4; digits <= 6; digits++) {
    const min = Math.pow(10, digits - 1);
    const span = min * 9;
    for (let attempt = 0; attempt < 8; attempt++) {
      const candidate = `#TUR-${Math.floor(min + Math.random() * span)}`;
      const clash = await dbClient.query('SELECT id FROM bookings WHERE booking_reference = ?', [candidate]);
      if (!clash.length) return candidate;
    }
  }
  return `#TUR-${Date.now().toString().slice(-7)}`;
}

function splitBookingBody(body: Record<string, any>) {
  const extra: Record<string, any> = {};
  for (const key of Object.keys(body)) {
    if (!BOOKING_CORE_FIELDS.includes(key)) extra[key] = body[key];
  }
  return extra;
}

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
    const bookingReference = body.booking_reference || await generateBookingReference();
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

app.delete("/api/bookings/:id", authenticateUser, async (req: any, res) => {
  try {
    const existingRows = await dbClient.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
    if (!existingRows.length) return res.status(404).json({ error: "Rezervasiya tapılmadı." });
    const existing = rowToBooking(existingRows[0]);
    if (req.operator.role !== 'admin' && existing.vendorId !== req.operator.id) {
      return res.status(403).json({ error: "Bu rezervasiya sizin hesabınıza aid deyil." });
    }
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
// ============================================================================
// QR KODLU BİLET GENERASİYASI (PREMİUM "GedəkGörək" DİZAYNI)
// ============================================================================
// qrcode kitabxanası artıq faylın yuxarısında import olunub (HİSSƏ 1)
// TICKET_COLORS və sanitizeForFallback da yuxarıda təyin olunub

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
    status,
    meetingPoint,
    vendorName,
  } = req.body;

  if (!bookingId || !customerName || !tourName) {
    return res.status(400).json({ error: "Zəhmət olmasa tələb olunan booking məlumatlarını göndərin." });
  }

  try {
    // ===== 1. QR KODU SERVER-DƏ YARADIRIQ (xarici API-yə ehtiyac yoxdur) =====
    const bRef = reference || `TUR-${String(bookingId).slice(0, 5).toUpperCase()}`;
    const qrData = `GEDƏKGÖRƏK|${bRef}|${customerName}|${tourName}`;
    let qrBase64: string | null = null;
    try {
      qrBase64 = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 300,
        color: {
          dark: "#047857",
          light: "#FFFFFF",
        },
      });
      // "data:image/png;base64,..." prefixini çıxarırıq
      qrBase64 = qrBase64.split(",")[1];
    } catch (qrErr) {
      console.error("[QR] Lokal QR yaratmaq alınmadı:", qrErr);
    }

    // ===== 2. PDF SƏNƏDİNİ YARADIRIQ =====
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [400, 720],
    });

    const W = 400;
    const H = 720;

    // ===== 3. ŞRİFTLƏRİ YÜKLƏYİRİK =====
    let hasCustomFonts = false;
    let fontName = "Helvetica";
    if (robotoRegularBase64 && robotoBoldBase64) {
      try {
        doc.addFileToVFS("Roboto-Regular.ttf", robotoRegularBase64);
        doc.addFont("Roboto-Regular.ttf", "Roboto", "normal");
        doc.addFileToVFS("Roboto-Bold.ttf", robotoBoldBase64);
        doc.addFont("Roboto-Bold.ttf", "Roboto", "bold");
        doc.setFont("Roboto", "normal");
        hasCustomFonts = true;
        fontName = "Roboto";
      } catch (e) {
        console.error("[Fonts] Roboto yüklənmədi:", e);
      }
    }
    const displayText = (s: string) => (hasCustomFonts ? s || "" : sanitizeForFallback(s));

    // ===== 4. ARXA FON VƏ ÇƏRÇİVƏ =====
    doc.setFillColor(...TICKET_COLORS.white);
    doc.rect(0, 0, W, H, "F");

    // Üst yaşıl başlıq zolağı
    doc.setFillColor(...TICKET_COLORS.primary);
    doc.rect(0, 0, W, 110, "F");
    doc.setFillColor(...TICKET_COLORS.secondary);
    doc.rect(0, 95, W, 15, "F");

    // ===== 5. BAŞLIQ: BREND + "ELEKTRON BİLET" =====
    doc.setTextColor(...TICKET_COLORS.white);
    doc.setFont(fontName, "bold");
    doc.setFontSize(22);
    doc.text(displayText("GedəkGörək"), 24, 42);

    doc.setFont(fontName, "normal");
    doc.setFontSize(10);
    doc.setTextColor(220, 252, 231);
    doc.text(displayText("Elektron Bilet • E-Ticket"), 24, 60);

    // Sağ üstdə bilet nömrəsi (qızılı vurğu)
    doc.setFillColor(...TICKET_COLORS.accent);
    doc.roundedRect(W - 140, 22, 116, 28, 4, 4, "F");
    doc.setTextColor(...TICKET_COLORS.white);
    doc.setFont(fontName, "bold");
    doc.setFontSize(10);
    doc.text(displayText(`#${bRef}`), W - 82, 40, { align: "center" });

    // ===== 6. TUR ADI BAŞLIĞI (ağ kart üzərində) =====
    doc.setFillColor(...TICKET_COLORS.white);
    doc.roundedRect(20, 85, W - 40, 50, 6, 6, "F");
    doc.setDrawColor(...TICKET_COLORS.divider);
    doc.setLineWidth(0.3);
    doc.roundedRect(20, 85, W - 40, 50, 6, 6, "S");

    doc.setTextColor(...TICKET_COLORS.primary);
    doc.setFont(fontName, "bold");
    doc.setFontSize(9);
    doc.text(displayText("TUR MARŞRUTU"), 32, 100);

    doc.setTextColor(...TICKET_COLORS.dark);
    doc.setFont(fontName, "bold");
    doc.setFontSize(14);
    const tourLines = doc.splitTextToSize(displayText(tourName), W - 80);
    doc.text(tourLines.slice(0, 2), 32, 116);

    doc.setFont(fontName, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TICKET_COLORS.muted);
    doc.text(displayText(region ? `📍 ${region}` : "📍 Azərbaycan"), 32, 130);

    // ===== 7. ƏSAS MƏLUMAT KARTLARI (2x2 grid) =====
    let y = 155;
    const cardW = (W - 60) / 2;
    const cardH = 62;

    const drawInfoCard = (x: number, label: string, value: string, valueColor: number[] = TICKET_COLORS.dark, isBold: boolean = true) => {
      doc.setFillColor(...TICKET_COLORS.bg);
      doc.roundedRect(x, y, cardW, cardH, 5, 5, "F");
      doc.setDrawColor(...TICKET_COLORS.divider);
      doc.setLineWidth(0.5);
      doc.roundedRect(x, y, cardW, cardH, 5, 5, "S");

      doc.setTextColor(...TICKET_COLORS.muted);
      doc.setFont(fontName, "normal");
      doc.setFontSize(8);
      doc.text(displayText(label), x + 10, y + 16);

      doc.setTextColor(...valueColor);
      doc.setFont(fontName, isBold ? "bold" : "normal");
      doc.setFontSize(12);
      const valLines = doc.splitTextToSize(displayText(value), cardW - 20);
      doc.text(valLines.slice(0, 2), x + 10, y + 36);
    };

    // Sətir 1
    drawInfoCard(20, "📅 SƏFƏR TARİXİ", date || "—", TICKET_COLORS.primary);
    drawInfoCard(20 + cardW + 20, "👥 İŞTİRAKÇI", `${participantsCount || 1} nəfər`, TICKET_COLORS.dark);
    y += cardH + 10;

    // Sətir 2
    drawInfoCard(20, "💰 ÜMUMİ MƏBLƏĞ", `${amount || 0} AZN`, TICKET_COLORS.primary, true);
    drawInfoCard(20 + cardW + 20, "✅ STATUS", status === "cancelled" ? "LƏĞV EDİLDİ" : "TƏSDİQLƏNİB", [21, 128, 61]);
    y += cardH + 10;

    // ===== 8. MÜŞTƏRİ MƏLUMATLARI (tam enli zolaq) =====
    doc.setFillColor(...TICKET_COLORS.white);
    doc.roundedRect(20, y, W - 40, 52, 5, 5, "F");
    doc.setDrawColor(...TICKET_COLORS.divider);
    doc.roundedRect(20, y, W - 40, 52, 5, 5, "S");

    doc.setTextColor(...TICKET_COLORS.muted);
    doc.setFont(fontName, "normal");
    doc.setFontSize(8);
    doc.text(displayText("MÜŞTƏRİ MƏLUMATLARI"), 32, y + 15);

    doc.setTextColor(...TICKET_COLORS.dark);
    doc.setFont(fontName, "bold");
    doc.setFontSize(12);
    doc.text(displayText(customerName), 32, y + 32);

    doc.setFont(fontName, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...TICKET_COLORS.muted);
    doc.text(displayText(customerPhone ? `📞 ${customerPhone}` : ""), 32, y + 45);

    if (vendorName) {
      doc.setFont(fontName, "italic");
      doc.setFontSize(8);
      doc.text(displayText(`🏢 ${vendorName}`), W - 32, y + 45, { align: "right" });
    }
    y += 62;

    // ===== 9. GÖRÜŞ YERİ (əgər varsa) =====
    if (meetingPoint) {
      doc.setFillColor(254, 249, 195); // yellow-100
      doc.roundedRect(20, y, W - 40, 30, 4, 4, "F");
      doc.setDrawColor(...TICKET_COLORS.accent);
      doc.setLineWidth(0.8);
      doc.roundedRect(20, y, W - 40, 30, 4, 4, "S");

      doc.setTextColor(146, 64, 14); // yellow-800
      doc.setFont(fontName, "bold");
      doc.setFontSize(9);
      doc.text(displayText(`📍 GÖRÜŞ YERİ: ${meetingPoint}`), 32, y + 19);
      y += 40;
    }

    // ===== 10. AYIRICI XƏTT (bəzəkli) =====
    doc.setDrawColor(...TICKET_COLORS.divider);
    doc.setLineWidth(0.8);
    doc.setLineDashPattern([3, 3], 0);
    doc.line(30, y + 5, W - 30, y + 5);
    doc.setLineDashPattern([], 0);
    y += 18;

    // ===== 11. QR KOD BÖLMƏSİ =====
    const qrSize = 140;
    const qrX = (W - qrSize) / 2;
    const qrY = y;

    // QR arxa fon (ağ)
    doc.setFillColor(...TICKET_COLORS.white);
    doc.roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 8, 8, "F");
    doc.setDrawColor(...TICKET_COLORS.primary);
    doc.setLineWidth(1.5);
    doc.roundedRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20, 8, 8, "S");

    if (qrBase64) {
      try {
        doc.addImage(qrBase64, "PNG", qrX, qrY, qrSize, qrSize);
      } catch (err) {
        console.error("[QR] PDF-ə əlavə etmək alınmadı:", err);
      }
    } else {
      // Fallback: boz placeholder
      doc.setFillColor(241, 245, 249);
      doc.rect(qrX, qrY, qrSize, qrSize, "F");
      doc.setTextColor(...TICKET_COLORS.muted);
      doc.setFont(fontName, "normal");
      doc.setFontSize(9);
      doc.text(displayText("QR kod yüklənmədi"), qrX + qrSize / 2, qrY + qrSize / 2, { align: "center" });
    }

    y = qrY + qrSize + 22;

    doc.setTextColor(...TICKET_COLORS.primary);
    doc.setFont(fontName, "bold");
    doc.setFontSize(9);
    doc.text(displayText("Bileti girişdə bələdçiyə göstərin"), W / 2, y, { align: "center" });
    y += 14;

    // ===== 12. TƏHLÜKƏSİZLİK QAYDALARI (kompakt) =====
    doc.setFillColor(...TICKET_COLORS.bg);
    doc.roundedRect(20, y, W - 40, 80, 5, 5, "F");

    doc.setFillColor(...TICKET_COLORS.primary);
    doc.rect(20, y, 3, 80, "F");

    doc.setTextColor(...TICKET_COLORS.dark);
    doc.setFont(fontName, "bold");
    doc.setFontSize(9);
    doc.text(displayText("⚠️ VACİB QAYDALAR"), 32, y + 14);

    const rules = [
      "• Bələdçinin təlimatlarına əməl edin",
      "• Rahat yürüş ayaqqabısı və su mütləqdir",
      "• Təbiəti qoruyun, zibil atmayın",
      "• Xroniki xəstəlik barədə əvvəlcədən xəbərdar edin",
    ];
    doc.setFont(fontName, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...TICKET_COLORS.muted);
    let ruleY = y + 26;
    rules.forEach((r) => {
      doc.text(displayText(r), 32, ruleY);
      ruleY += 12;
    });
    y += 90;

    // ===== 13. ALT BİLDİRİŞ (footer) =====
    doc.setDrawColor(...TICKET_COLORS.divider);
    doc.setLineWidth(0.5);
    doc.line(30, H - 40, W - 30, H - 40);

    doc.setTextColor(...TICKET_COLORS.muted);
    doc.setFont(fontName, "normal");
    doc.setFontSize(7.5);
    doc.text(displayText("Xidmətdən istifadə etdiyiniz üçün təşəkkürlər!"), W / 2, H - 28, { align: "center" });
    doc.setFont(fontName, "bold");
    doc.setTextColor(...TICKET_COLORS.primary);
    doc.text(displayText("gedekgorek.com"), W / 2, H - 18, { align: "center" });

    // ===== 14. FAYLI YADDAŞA VERİRİK VƏ QAYTARIRIQ =====
    const pdfBuffer = doc.output("arraybuffer");
    const filename = `ticket_${bookingId}.pdf`;
    const filepath = path.join(ticketsDir, filename);
    fs.writeFileSync(filepath, Buffer.from(pdfBuffer));

    console.log(`[Ticket] ✅ Yeni bilet yaradıldı: ${filename}`);
    return res.json({ success: true, ticketUrl: `/tickets/${filename}` });
  } catch (error: any) {
    console.error("[Ticket] ❌ PDF yaratmaq alınmadı:", error);
    return res.status(500).json({ error: "Bilet yaradılarkən xəta: " + error.message });
  }
});

// ============================================================================
// BƏLƏDÇİ ÖDƏNİŞİ VƏ NET GƏLİR HESABLAMASI PDF-İ
// ============================================================================
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
      doc.setTextColor(6, 95, 70);
      doc.text(displayText(title), marginX, y);
      y += 16;
    };
    const tierLabel = body.tier === 'peak' ? 'Zirvə' : body.tier === 'camp' ? 'Kamp' : 'Hiking';
    drawSectionTitle("Tur Məlumatları");
    drawRow("İştirakçı sayı", `${num(body.participants)} nəfər`);
    drawRow("Turun qiyməti (nəfər başına)", `${num(body.pricePerPerson).toFixed(2)} AZN`);
    drawRow("Tur müddəti", `${num(body.durationDays) || 1} gün`);
    drawRow("Bələdçi qiymət kateqoriyası", tierLabel);
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

// ============================================================================
// SERVER STARTUP
// ============================================================================
async function startServer() {
  // Initialize Enterprise Database schemas / SQLite fallback
  try {
    await initializeDatabase();
  } catch (err) {
    console.error("[DB] Failed to initialize database:", err);
  }

  // Safe load custom UTF-8 Fonts at application startup
  await ensureFonts();

  // WhatsApp session boots in the background
  if (process.env.WHATSAPP_DISABLED === "1") {
    console.log("[WhatsApp] WHATSAPP_DISABLED=1 — sessiya bu prosesdə başladılmır.");
  } else {
    startWhatsApp().catch((err) => console.error("[WhatsApp] Başlanğıc qoşulma xətası:", err));
  }

  // Telegram bot
  if (isTelegramEnabled()) {
    setTelegramCallbackHandler(async (data) => {
      if (!data.startsWith("inqread:")) return;
      const inquiryId = data.slice("inqread:".length);
      const rows = await dbClient.query('SELECT id, status FROM inquiries WHERE id = ?', [inquiryId]);
      if (!rows.length) return "Sorğu tapılmadı";
      if (rows[0].status === 'new') {
        await dbClient.execute(`UPDATE inquiries SET status = 'read' WHERE id = ?`, [inquiryId]);
      }
      await dbClient.execute(
        `UPDATE notifications SET is_read = ? WHERE data LIKE ?`,
        [1, `%"inquiryId":"${inquiryId}"%`]
      );
      return "✅ Oxundu — sorğu CRM-ə köçdü";
    });
    startTelegramPolling();
  } else {
    console.log("[Telegram] TELEGRAM_BOT_TOKEN yoxdur — Telegram bildirişləri deaktivdir.");
  }

  // Any /api/* path that didn't match one of the routes above is a genuine 404
  app.use('/api', (req, res) => {
    res.status(404).json({ error: "Belə bir API endpoint mövcud deyil." });
  });

  // The frontend is the standalone Next.js app in web/ (SSR, own port)
  app.use((req, res) => {
    res.status(404).json({ error: "Bu server yalnız API-yə xidmət edir — sayt Next.js (web/) tərəfindədir." });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();