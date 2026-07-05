import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import makeWASocket, {
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  type WASocket
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import QRCode from "qrcode";
import pino from "pino";

// Baileys drives a real WhatsApp Web session from the server (the admin scans a QR code with
// a dedicated business number, same as opening web.whatsapp.com). That connected number is
// what performs "does this phone have WhatsApp" lookups — there is no official free API for
// this, so this unofficial-but-widely-used approach is the only viable one without a paid,
// pre-approved Meta Business/Cloud API account.
const AUTH_DIR = path.join(process.cwd(), "data", "whatsapp-auth");
const logger = pino({ level: "silent" });

export type WhatsAppConnectionStatus = "disconnected" | "connecting" | "qr_pending" | "connected";

let sock: WASocket | null = null;
let status: WhatsAppConnectionStatus = "disconnected";
let currentQrDataUrl: string | null = null;
let connectedNumber: string | null = null;
let startingPromise: Promise<void> | null = null;

export function getWhatsAppStatus() {
  return { status, qr: currentQrDataUrl, number: connectedNumber };
}

export async function startWhatsApp(): Promise<void> {
  if (startingPromise) return startingPromise;

  startingPromise = (async () => {
    status = "connecting";
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger,
      // We render our own QR (as a data URL) for the admin panel instead of the terminal.
      printQRInTerminal: false
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        currentQrDataUrl = await QRCode.toDataURL(qr);
        status = "qr_pending";
      }

      if (connection === "open") {
        status = "connected";
        currentQrDataUrl = null;
        connectedNumber = sock?.user?.id?.split(":")[0] || null;
        console.log("[WhatsApp] Bağlantı quruldu:", connectedNumber);
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.warn("[WhatsApp] Bağlantı kəsildi. Yenidən qoşulma cəhdi ediləcək:", shouldReconnect);

        status = "disconnected";
        connectedNumber = null;
        sock = null;
        startingPromise = null;

        if (shouldReconnect) {
          startWhatsApp().catch((e) => console.error("[WhatsApp] Yenidən qoşulma xətası:", e));
        }
      }
    });
  })();

  return startingPromise;
}

export async function logoutWhatsApp(): Promise<void> {
  if (sock) {
    try {
      await sock.logout();
    } catch {
      // Already disconnected — nothing to clean up on the socket itself.
    }
  }
  sock = null;
  status = "disconnected";
  currentQrDataUrl = null;
  connectedNumber = null;
  startingPromise = null;
  fs.rmSync(AUTH_DIR, { recursive: true, force: true });
}

export async function isRegisteredOnWhatsApp(phone: string): Promise<boolean> {
  if (!sock || status !== "connected") {
    throw new Error("WHATSAPP_NOT_CONNECTED");
  }
  const digits = phone.replace(/\D/g, "");
  const results = await sock.onWhatsApp(digits);
  return !!results?.[0]?.exists;
}

// --- Rate limiting -----------------------------------------------------------------------
// Every lookup/send is a real query against WhatsApp's servers from one connected number, so
// both a per-phone cooldown and a global cap exist to keep that number's traffic pattern
// looking human rather than tripping WhatsApp's spam/abuse detection.
const PHONE_COOLDOWN_MS = 60_000;
const PHONE_MAX_PER_WINDOW = 3;
const PHONE_WINDOW_MS = 60 * 60 * 1000;
const GLOBAL_MAX_PER_WINDOW = 20;
const GLOBAL_WINDOW_MS = 60_000;

type PhoneRateEntry = { count: number; windowStart: number; lastSentAt: number };
const phoneRateMap = new Map<string, PhoneRateEntry>();
const globalTimestamps: number[] = [];

// Flat shape (not a discriminated union) — this project's tsconfig doesn't set
// strictNullChecks, under which TS won't narrow a `{allowed:true}|{allowed:false,...}`
// union via `if (!x.allowed)`, so callers would fail to type-check against the `false` arm.
export type RateLimitResult = {
  allowed: boolean;
  reason?: "COOLDOWN" | "PHONE_LIMIT" | "GLOBAL_LIMIT";
  retryAfterSec?: number;
};

export function checkAndConsumeRateLimit(phone: string): RateLimitResult {
  const now = Date.now();
  const digits = phone.replace(/\D/g, "");

  while (globalTimestamps.length && now - globalTimestamps[0] > GLOBAL_WINDOW_MS) {
    globalTimestamps.shift();
  }
  if (globalTimestamps.length >= GLOBAL_MAX_PER_WINDOW) {
    const retryAfterSec = Math.ceil((GLOBAL_WINDOW_MS - (now - globalTimestamps[0])) / 1000);
    return { allowed: false, reason: "GLOBAL_LIMIT", retryAfterSec };
  }

  let entry = phoneRateMap.get(digits);
  if (!entry || now - entry.windowStart > PHONE_WINDOW_MS) {
    entry = { count: 0, windowStart: now, lastSentAt: 0 };
  }
  if (now - entry.lastSentAt < PHONE_COOLDOWN_MS) {
    const retryAfterSec = Math.ceil((PHONE_COOLDOWN_MS - (now - entry.lastSentAt)) / 1000);
    return { allowed: false, reason: "COOLDOWN", retryAfterSec };
  }
  if (entry.count >= PHONE_MAX_PER_WINDOW) {
    const retryAfterSec = Math.ceil((PHONE_WINDOW_MS - (now - entry.windowStart)) / 1000);
    return { allowed: false, reason: "PHONE_LIMIT", retryAfterSec };
  }

  entry.count += 1;
  entry.lastSentAt = now;
  phoneRateMap.set(digits, entry);
  globalTimestamps.push(now);
  return { allowed: true };
}

// --- Captcha -------------------------------------------------------------------------------
// A tiny self-hosted math challenge gating the (rate-limited but still real) WhatsApp lookup
// below, so a scripted loop can't cheaply hammer the connected number just by varying phone
// numbers. No external account/keys needed, unlike reCAPTCHA/hCaptcha — enough friction for
// this scale given the per-phone/global limits already in place.
const CAPTCHA_TTL_MS = 3 * 60 * 1000;

type CaptchaEntry = { answer: number; expiresAt: number };
const captchaStore = new Map<string, CaptchaEntry>();

export function generateCaptchaChallenge(): { id: string; question: string } {
  // Opportunistic sweep of abandoned challenges (never submitted) so the map doesn't grow
  // unbounded — each entry is otherwise only ever removed when someone submits an answer.
  const now = Date.now();
  for (const [id, entry] of captchaStore) {
    if (now > entry.expiresAt) captchaStore.delete(id);
  }

  const a = 1 + Math.floor(Math.random() * 8);
  const b = 1 + Math.floor(Math.random() * 8);
  const id = randomUUID();
  captchaStore.set(id, { answer: a + b, expiresAt: now + CAPTCHA_TTL_MS });
  return { id, question: `${a} + ${b}` };
}

// One-time use: the entry is removed on the first submission attempt regardless of outcome,
// so a wrong guess can't just be retried against the same challenge.
export function verifyCaptchaChallenge(id: string, answer: number): boolean {
  const entry = captchaStore.get(id);
  captchaStore.delete(id);
  if (!entry) return false;
  if (Date.now() > entry.expiresAt) return false;
  return entry.answer === answer;
}
