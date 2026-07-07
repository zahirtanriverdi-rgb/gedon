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
import cors from "cors";
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

// CORS tənzimləməsi
app.use(cors());

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

// Body parser (raised limit for base64 images/GPX data)
app.use(express.json({ limit: '50mb' }));

// Malformed JSON error handler
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

// ==================== API ROUTES (Bütün API-lar yuxarıda olmalıdır) ====================

app.post("/api/auth/admin/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Zəhmət olmasa e-poçt və şifrəni daxil edin." });
  }
  try {
    const rows = await dbClient.query(`SELECT * FROM users WHERE email = ? AND role = 'admin'`, [email]);
    const user = rows[0];
    const auth = verifyPasswordAndIssueToken(user, password);
    if (!auth) return res.status(401).json({ error: "E-poçt və ya şifrə yanlışdır!" });
    return res.json({ success: true, token: auth.token, user: rowToUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: "Giriş xətası: " + error.message });
  }
});

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
    if (!auth) return res.status(401).json({ error: "İstifadəçi adı/e-poçt və ya şifrə yanlışdır!" });
    return res.json({ success: true, token: auth.token, user: rowToUser(user) });
  } catch (error: any) {
    return res.status(500).json({ error: "Giriş xətası: " + error.message });
  }
});

app.post("/api/admin/vendors", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') return res.status(403).json({ error: "İcazə yoxdur." });
  try {
    const { companyName, login, password } = req.body || {};
    if (!companyName || !login || !password) return res.status(400).json({ error: "Məlumatlar əskikdir." });
    const trimmedLogin = String(login).trim();
    const isEmailLogin = trimmedLogin.includes('@');
    const email = isEmailLogin ? trimmedLogin : `${trimmedLogin.toLowerCase().replace(/[^a-z0-9._-]/g, '')}@vendor.gedekgorek.local`;
    const username = isEmailLogin ? null : trimmedLogin;

    const passwordHash = await bcrypt.hash(String(password), 10);
    const id = `user-${randomUUID()}`;
    await dbClient.execute(
      `INSERT INTO users (id, name, email, username, password_hash, role, phone, company_name, balance, created_at) VALUES (?, ?, ?, ?, ?, 'vendor', '', ?, 0, CURRENT_TIMESTAMP)`,
      [id, companyName, email, username, passwordHash, companyName]
    );
    const rows = await dbClient.query('SELECT * FROM users WHERE id = ?', [id]);
    return res.status(201).json({ success: true, user: rowToUser(rows[0]) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/users", authenticateUser, async (req: any, res) => {
  if (req.operator.role !== 'admin') return res.status(403).json({ error: "İcazə yoxdur." });
  try {
    const rows = await dbClient.query('SELECT * FROM users ORDER BY created_at DESC', []);
    return res.json({ users: rows.map(rowToUser) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

app.get("/api/exchange-rates/cbar", async (req, res) => {
  try {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateStr = `${day}.${month}.${year}`;

    let url = `https://cbar.az/currencies/${dateStr}.xml`;
    let response = await globalThis.fetch(url);
    if (!response.ok) {
      url = "https://cbar.az/currencies/07.07.2026.xml"; // Günün tarixinə uyğun fallback
      response = await globalThis.fetch(url);
    }
    const xmlText = await response.text();
    const usdMatch = xmlText.match(/<Valute Code="USD">[\s\S]*?<Value>([\d.]+)<\/Value>/);
    const eurMatch = xmlText.match(/<Valute Code="EUR">[\s\S]*?<Value>([\d.]+)<\/Value>/);
    
    return res.json({ 
      success: true, 
      USD: usdMatch ? parseFloat(usdMatch[1]) : 1.70, 
      EUR: eurMatch ? parseFloat(eurMatch[1]) : 1.82, 
      date: dateStr 
    });
  } catch (error: any) {
    return res.json({ success: true, USD: 1.70, EUR: 1.82, warning: "Sabit məzənnə tətbiq olundu." });
  }
});

interface ServerBooking {
  id: string; tourId: string; startDate: string; participantsCount: number; vendorId: string; booking_reference: string; status: 'Redirected_to_WhatsApp'; clickedAt: string;
}
const serverBookings: ServerBooking[] = [];

app.post("/api/bookings/whatsapp-click", (req, res) => {
  const { tourId, startDate, participantsCount, vendorId, booking_reference } = req.body;
  const newLead: ServerBooking = {
    id: `lead-${Date.now()}`, tourId, startDate, participantsCount: Number(participantsCount), vendorId, booking_reference, status: "Redirected_to_WhatsApp", clickedAt: new Date().toISOString()
  };
  serverBookings.push(newLead);
  return res.json({ success: true, lead: newLead });
});

app.get("/api/bookings/whatsapp-leads", authenticateUser, (req: any, res) => {
  const leads = req.operator.role === 'vendor' ? serverBookings.filter((b) => b.vendorId === req.operator.id) : serverBookings;
  return res.json({ leads, totalCount: leads.length });
});

// WhatsApp endpoints
app.get("/api/whatsapp/status", authenticateUser, (req: any, res) => res.json(getWhatsAppStatus()));
app.get("/api/whatsapp/captcha", (req, res) => res.json(generateCaptchaChallenge()));

const TOUR_CORE_FIELDS = ['id', 'vendorId', 'vendorName', 'name', 'slug', 'category', 'difficulty', 'region', 'durationDays', 'description', 'image', 'isActive', 'isApproved', 'status', 'priceCurrency', 'rating', 'reviewsCount', 'createdAt'];

function rowToTour(row: any) {
  let extra: Record<string, any> = {};
  try { extra = row.extra_data ? JSON.parse(row.extra_data) : {}; } catch { extra = {}; }
  return {
    ...extra,
    id: row.id, vendor_id: row.vendor_id, name: row.name, slug: row.slug, category: row.category, status: row.status || 'approved', createdAt: row.created_at
  };
}

app.get("/api/tours", async (req, res) => {
  try {
    const user = getOptionalUser(req);
    let rows;
    if (user && user.role === 'vendor') {
      rows = await dbClient.query('SELECT * FROM tours WHERE vendor_id = ?', [user.id]);
    } else {
      rows = await dbClient.query("SELECT * FROM tours WHERE status = 'approved'", []);
    }
    return res.json({ tours: rows.map(rowToTour) });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// ==================== FRONTEND PAYLANMASI (Ən aşağıda olmalıdır) ====================

const distPath = path.resolve(process.cwd(), "dist");

// Statik faylları (JS, CSS, Şəkillər) Render üçün aktiv et
app.use(express.static(distPath));

// Hər hansı digər sorğu gələndə (məs. /turlar, /profil) index.html faylını qaytar ki, React Router işləyə bilsin
app.get("*", (req, res) => {
  const indexPath = path.resolve(distPath, "index.html");
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send("Frontend faylları (dist) tapılmadı. Zəhmət olmasa əvvəlcə layihəni build edin.");
  }
});

app.listen(PORT, () => {
  console.log(`Server [PRODUCTION] rejimində start götürdü: http://localhost:${PORT}`);
});
