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
import { scheduleTourTranslation, scheduleUserTranslation } from "./server/translate";
import { generateUniqueSlug } from "./server/slugify";
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
  };
}

function verifyPasswordAndIssueToken(user: any, password: string): { token: string } | null {
  if (!user || !bcrypt.compareSync(password, user.password_hash)) return null;
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "24h" });
  return { token };
}

// AUTH & ADMIN & USERS API ROUTES
app.post("/api/auth/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Zəhmət olmasa e-poçt və şifrəni daxil edin." });
  try {
    const rows = await dbClient.query(`SELECT * FROM users WHERE email = ? AND role = 'admin'`, [email]);
    const user = rows[0];
    const auth = verifyPasswordAndIssueToken(user, password);
    if (!auth) return res.status(401).json({ error: "E-poçt və ya şifrə yanlışdır!" });
    return res.json({ success: true, token: auth.token, user: rowToUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: "Giriş zamanı server xətası baş verdi: " + error.message });
  }
});

app.post("/api/auth/operator/login", async (req, res) => {
  const { identifier, password } = req.body;
  if (!identifier || !password) return res.status(400).json({ error: "Zəhmət olmasa istifadəçi adı/e-poçt və şifrəni daxil edin." });
  try {
    const rows = await dbClient.query(`SELECT * FROM users WHERE (email = ? OR username = ?) AND role = 'vendor' AND deleted_at IS NULL`, [identifier, identifier]);
    const user = rows[0];
    const auth = verifyPasswordAndIssueToken(user, password);
    if (!auth) return res.status(401).json({ error: "İstifadəçi adı/e-poçt və ya şifrə yanlışdır!" });
    return res.json({ success: true, token: auth.token, user: rowToUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: "Giriş zamanı server xətası baş verdi: " + error.message });
  }
});

app.post("/api/admin/vendors", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') return res.status(403).json({ error: "Yalnız adminlər yeni operator hesabı yarada bilər." });
  try {
    const { companyName, login, password } = req.body || {};
    if (!companyName || !login || !password) return res.status(400).json({ error: "Şirkət adı, login və ilkin parol tələb olunur." });
    if (String(password).length < 6) return res.status(400).json({ error: "Parol ən azı 6 simvol olmalıdır." });

    const trimmedLogin = String(login).trim();
    const isEmailLogin = trimmedLogin.includes('@');
    const email = isEmailLogin ? trimmedLogin : `${trimmedLogin.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@vendor.gedekgorek.local`;
    const username = isEmailLogin ? null : trimmedLogin;

    const existing = await dbClient.query(`SELECT id FROM users WHERE email = ? OR (username IS NOT NULL AND username = ?)`, [email, trimmedLogin]);
    if (existing.length > 0) return res.status(409).json({ error: "Bu login artıq istifadə olunur. Zəhmət olmasa başqa login seçin." });

    const passwordHash = await bcrypt.hash(String(password), 10);
    const id = `user-${randomUUID()}`;

    await dbClient.execute(
      `INSERT INTO users (id, name, email, username, password_hash, role, phone, company_name, balance, created_at) VALUES (?, ?, ?, ?, ?, 'vendor', '', ?, 0, CURRENT_TIMESTAMP)`,
      [id, companyName, email, username, passwordHash, companyName]
    );
    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [id]);
    return res.status(201).json({ success: true, user: rowToUser(rows[0]) });
  } catch (error: any) {
    return res.status(500).json({ error: "Vendor hesabı yaradıla bilmədi: " + error.message });
  }
});

app.delete("/api/admin/vendors/:id", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') return res.status(403).json({ error: "Yalnız adminlər operator hesabını silə bilər." });
  try {
    const { adminPassword } = req.body || {};
    if (!adminPassword) return res.status(400).json({ error: "Təsdiq üçün öz parolunuzu daxil edin." });
    const adminRows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.operator.id]);
    if (!adminRows[0] || !bcrypt.compareSync(String(adminPassword), adminRows[0].password_hash)) return res.status(401).json({ error: "Daxil etdiyiniz parol yanlışdır." });

    const vendorRows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!vendorRows[0] || vendorRows[0].role !== 'vendor') return res.status(404).json({ error: "Operator tapılmadı." });
    if (vendorRows[0].deleted_at) return res.status(409).json({ error: "Bu operator artıq arxivləşdirilib." });

    await dbClient.execute('UPDATE users SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?', [req.params.id]);
    return res.json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: "Operator arxivləşdirilə bilmədi: " + error.message });
  }
});

app.get("/api/users", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') return res.status(403).json({ error: "Yalnız adminlər istifadəçi siyahısını görə bilər." });
  try {
    const rows = await dbClient.query('SELECT * FROM users ORDER BY created_at DESC', []);
    res.json({ users: rows.map(rowToUser) });
  } catch (error: any) {
    res.status(500).json({ error: "İstifadəçiləri gətirmək mümkün olmadı: " + error.message });
  }
});

app.put("/api/users/:id", authenticateUser, async (req: any, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
    const existingRow = rows[0];
    const isAdmin = req.operator.role === 'admin';
    const isSelf = req.operator.id === req.params.id;
    if (!isAdmin && !isSelf) return res.status(403).json({ error: "Bu istifadəçini yeniləmək icazəniz yoxdur." });

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
    if (body.about !== undefined || body.guides !== undefined) {
      scheduleUserTranslation(req.params.id, about, extra.guides);
    }
    res.json({ user: rowToUser(updatedRows[0]) });
  } catch (error: any) {
    res.status(500).json({ error: "İstifadəçi yenilənə bilmədi: " + error.message });
  }
});

app.post("/api/auth/change-password", authenticateUser, async (req: any, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) return res.status(400).json({ error: "Cari və yeni şifrəni daxil edin." });
    if (String(newPassword).length < 6) return res.status(400).json({ error: "Yeni şifrə ən azı 6 simvol olmalıdır." });

    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [req.operator.id]);
    if (!rows.length) return res.status(404).json({ error: "İstifadəçi tapılmadı." });
    if (!bcrypt.compareSync(currentPassword, rows[0].password_hash)) return res.status(401).json({ error: "Cari şifrə yanlışdır." });

    const newHash = await bcrypt.hash(newPassword, 10);
    await dbClient.execute('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, req.operator.id]);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: "Şifrə yenilənə bilmədi: " + error.message });
  }
});

// IN-MEMORY BOOKINGS & CBAR LIVE RATES
interface ServerBooking {
  id: string; tourId: string; startDate: string; participantsCount: number; vendorId: string; booking_reference: string; status: 'Redirected_to_WhatsApp'; clickedAt: string;
}
const serverBookings: ServerBooking[] = [];

app.get("/api/exchange-rates/cbar", async (req, res) => {
  try {
    const today = new Date();
    const dateStr = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    let url = `https://cbar.az/currencies/${dateStr}.xml`;
    let response = await globalThis.fetch(url);
    if (!response.ok) {
      url = "https://cbar.az/currencies/22.05.2026.xml";
      response = await globalThis.fetch(url);
    }
    if (!response.ok) throw new Error(`CBAR returned status ${response.status}`);
    const xmlText = await response.text();
    const usdMatch = xmlText.match(/<Valute Code="USD">[\s\S]*?<Value>([\d.]+)<\/Value>/);
    const eurMatch = xmlText.match(/<Valute Code="EUR">[\s\S]*?<Value>([\d.]+)<\/Value>/);
    if (!usdMatch || !eurMatch) throw new Error("Could not parse USD/EUR values.");
    return res.json({ success: true, USD: parseFloat(usdMatch[1]), EUR: parseFloat(eurMatch[1]), date: dateStr, source: url });
  } catch (error: any) {
    try {
      const fallbackUrl = "https://cbar.az/currencies/22.05.2026.xml";
      const resp = await globalThis.fetch(fallbackUrl);
      if (resp.ok) {
        const text = await resp.text();
        const usdMatch = text.match(/<Valute Code="USD">[\s\S]*?<Value>([\d.]+)<\/Value>/);
        const eurMatch = text.match(/<Valute Code="EUR">[\s\S]*?<Value>([\d.]+)<\/Value>/);
        if (usdMatch && eurMatch) {
          return res.json({ success: true, USD: parseFloat(usdMatch[1]), EUR: parseFloat(eurMatch[1]), date: "22.05.2026", source: fallbackUrl, warning: "Fetched from backup date" });
        }
      }
    } catch {}
    return res.status(500).json({ error: "CBAR məzənnələrini gətirmək mümkün olmadı." });
  }
});

app.post("/api/bookings/whatsapp-click", (req, res) => {
  const { tourId, startDate, participantsCount, vendorId, booking_reference } = req.body;
  if (!tourId || !startDate || !participantsCount || !vendorId || !booking_reference) {
    return res.status(400).json({ error: "Bütün məlumatları qeyd edin." });
  }
  const newLead: ServerBooking = {
    id: `lead-${Date.now()}-${Math.floor(Math.random() * 1000)}`, tourId, startDate, participantsCount: Number(participantsCount), vendorId, booking_reference, status: "Redirected_to_WhatsApp", clickedAt: new Date().toISOString()
  };
  serverBookings.push(newLead);
  return res.json({ success: true, lead: newLead });
});

app.get("/api/bookings/whatsapp-leads", authenticateUser, (req: any, res) => {
  const leads = req.operator.role === 'vendor' ? serverBookings.filter((b) => b.vendorId === req.operator.id) : serverBookings;
  res.json({ leads, totalCount: leads.length });
});

// WHATSAPP VERIFICATION & CAPTCHA
app.get("/api/whatsapp/status", authenticateUser, (req: any, res) => {
  if (req.operator.role !== "admin") return res.status(403).json({ error: "İcazə yoxdur." });
  return res.json(getWhatsAppStatus());
});

app.post("/api/whatsapp/connect", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== "admin") return res.status(403).json({ error: "İcazə yoxdur." });
  try { await startWhatsApp(); return res.json(getWhatsAppStatus()); } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.post("/api/whatsapp/logout", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== "admin") return res.status(403).json({ error: "İcazə yoxdur." });
  try { await logoutWhatsApp(); return res.json({ success: true }); } catch (error: any) { return res.status(500).json({ error: error.message }); }
});

app.get("/api/whatsapp/captcha", (req, res) => res.json(generateCaptchaChallenge()));

app.post("/api/whatsapp/verify-number", async (req, res) => {
  const { phone, captchaId, captchaAnswer } = req.body || {};
  if (!phone || String(phone).length < 7) return res.status(400).json({ error: "Düzgün nömrə daxil edin." });
  if (!verifyCaptchaChallenge(String(captchaId), Number(captchaAnswer))) return res.status(400).json({ error: "Təhlükəsizlik sualı səhvdir.", captchaFailed: true });

  const rate = checkAndConsumeRateLimit(phone);
  if (!rate.allowed) return res.status(429).json({ error: "Çox sayda cəhd edildi.", retryAfterSec: rate.retryAfterSec });

  try {
    const hasWhatsapp = await isRegisteredOnWhatsApp(phone);
    if (!hasWhatsapp) return res.status(422).json({ error: "Aktiv WhatsApp hesabı tapılmadı.", hasWhatsapp: false });
    return res.json({ success: true, hasWhatsapp: true });
  } catch (error: any) {
    if (error.message === "WHATSAPP_NOT_CONNECTED") return res.status(503).json({ error: "Sistem hazır deyil." });
    return res.status(500).json({ error: "Nömrə yoxlanıla bilmədi." });
  }
});

// MARKETPLACE CORE API: TOURS & SLOTS
const TOUR_CORE_FIELDS = ['id', 'vendorId', 'vendorName', 'name', 'slug', 'category', 'difficulty', 'region', 'durationDays', 'description', 'image', 'isActive', 'isApproved', 'status', 'priceCurrency', 'rating', 'reviewsCount', 'createdAt', 'pendingData'];

function rowToTour(row: any) {
  let extra: Record<string, any> = {};
  try { extra = row.extra_data ? JSON.parse(row.extra_data) : {}; } catch {}
  let pendingData: Record<string, any> | undefined;
  try { pendingData = row.pending_data ? JSON.parse(row.pending_data) : undefined; } catch {}
  const status = row.status || (row.is_approved ? 'approved' : 'pending_approval');
  return {
    ...extra, id: row.id, vendorId: row.vendor_id, vendorName: row.vendor_name, name: row.name, slug: row.slug, category: row.category, difficulty: row.difficulty, region: row.region, durationDays: Number(row.duration_days), description: row.description, image: row.image, isActive: !!row.is_active, isApproved: status === 'approved', status, pendingData, priceCurrency: row.price_currency, rating: row.rating ? Number(row.rating) : undefined, reviewsCount: row.reviews_count ? Number(row.reviews_count) : undefined, createdAt: row.created_at
  };
}

// Yarımçıq qalan GET /api/tours marşrutunun tam bərpası
app.get("/api/tours", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    const { category, vendorId } = req.query;
    const conditions: string[] = [];
    const params: any[] = [];

    if (user && user.role === 'vendor') {
      conditions.push('vendor_id = ?');
      params.push(user.id);
    } else if (user && user.role === 'admin') {
      if (vendorId) { conditions.push('vendor_id = ?'); params.push(String(vendorId)); }
    } else {
      conditions.push("status = 'approved'");
      const subscriptionGraceCutoff = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
      conditions.push("vendor_id NOT IN (SELECT id FROM users WHERE deleted_at IS NOT NULL OR is_manually_deactivated = true OR (subscription_valid_until IS NOT NULL AND subscription_valid_until < ?))");
      params.push(subscriptionGraceCutoff);
      if (vendorId) { conditions.push('vendor_id = ?'); params.push(String(vendorId)); }
    }
    if (category) { conditions.push('category = ?'); params.push(String(category)); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const rows = await dbClient.query(`SELECT * FROM tours ${whereClause} ORDER BY created_at DESC`, params);
    return res.json({ tours: rows.map(rowToTour) });
  } catch (error: any) {
    return res.status(500).json({ error: "Turları gətirmək mümkün olmadı: " + error.message });
  }
});

// Single tour details by ID
app.get("/api/tours/:id", async (req, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM tours WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: "Tur tapılmadı." });
    return res.json({ tour: rowToTour(rows[0]) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Single tour details by Slug
app.get("/api/tours/slug/:slug", async (req, res) => {
  try {
    const rows = await dbClient.query('SELECT * FROM tours WHERE slug = ?', [req.params.slug]);
    if (!rows.length) return res.status(404).json({ error: "Tur tapılmadı." });
    return res.json({ tour: rowToTour(rows[0]) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// PRODUCTION SERVING & SPA ROUTING (RENDER COMPATIBLE)
// ============================================================================
const distPath = path.resolve(process.cwd(), "dist", "public");

if (process.env.NODE_ENV === "production") {
  // Production mühitində statik asset-ləri (js, css, şəkillər) dist qovluğundan paylayırıq
  app.use(express.static(distPath));

  // Bütün API olmayan GET sorğularını index.html-ə yönləndiririk (SPA fallback)
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) return next(); // API marşrutlarını atla
    const indexHtml = path.join(distPath, "index.html");
    if (fs.existsSync(indexHtml)) {
      return res.sendFile(indexHtml);
    } else {
      return res.status(404).send("Production build tapılmadı. index.html mövcud deyil.");
    }
  });
} else {
  // Development (Vite mode)
  (async () => {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      if (req.path.startsWith("/api/")) return next();
      try {
        const rawIndex = fs.readFileSync(path.resolve(process.cwd(), "index.html"), "utf-8");
        const html = await vite.transformIndexHtml(req.originalUrl, rawIndex);
        return res.status(200).set({ "Content-Type": "text/html" }).end(html);
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        return res.status(500).end(e.message);
      }
    });
  })();
}

app.listen(PORT, "0.0.0.0", () => {
  console.log(`[SERVER] Node environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`[SERVER] Server successfully listening on http://0.0.0.0:${PORT}`);
});
