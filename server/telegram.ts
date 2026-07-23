// Telegram bot inteqrasiyası — rezervasiya sorğuları vendor/admin chat-lərinə bildiriş kimi gedir.
//
// Token .env-dəki TELEGRAM_BOT_TOKEN-dən oxunur; token yoxdursa bütün funksiyalar səssiz no-op
// olur (marketplace Telegram-sız da tam işləməlidir). Mesajlar HTML parse_mode ilə göndərilir,
// istifadəçi mətnləri escapeHtml-dən keçir ki, ad/cavab içindəki < > & simvolları formatı sındırmasın.
//
// Chat ID-lərin tapılması üçün getUpdates long-polling işləyir: kimsə bota /start (və ya hər
// hansı mesaj) yazanda bot ona öz chat ID-sini cavab verir — vendor bu ID-ni admin vasitəsilə
// panelə əlavə etdirir. Eyni tokenlə iki proses polling edərsə Telegram 409 qaytarır (məs. dev-də
// user-in öz serveri də işləyirsə) — bu halda sakitcə gözləyib yenidən cəhd edirik, çünki o biri
// proses onsuz da eyni cavabı verəcək.

const TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const API_BASE = `https://api.telegram.org/bot${TOKEN}`;

export function isTelegramEnabled(): boolean {
  return !!TOKEN;
}

export function escapeHtml(s: string): string {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export interface TelegramButton {
  text: string;
  url?: string; // wa.me linki və s.
  callback_data?: string; // bot-daxili əməliyyat (məs. "inqread:<inquiryId>")
}

// Bir chat-ə mesaj. Uğursuzluq atmır — nəticəni qaytarır ki, çağıran log yaza bilsin.
export async function sendTelegramMessage(
  chatId: string,
  html: string,
  buttons?: TelegramButton[]
): Promise<{ ok: boolean; error?: string }> {
  if (!TOKEN) return { ok: false, error: "TELEGRAM_BOT_TOKEN yoxdur" };
  try {
    const body: any = {
      chat_id: chatId,
      text: html,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (buttons && buttons.length) {
      // Hər düymə öz sətrində — şablon adları uzun ola bilər, yan-yana sığmır.
      body.reply_markup = {
        inline_keyboard: buttons.map((b) =>
          [b.url ? { text: b.text, url: b.url } : { text: b.text, callback_data: b.callback_data || '' }]
        ),
      };
    }
    const res = await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json: any = await res.json().catch(() => ({}));
    if (!json.ok) {
      return { ok: false, error: json.description || `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

// Eyni mesajı bir neçə chat-ə paylayır (bir vendora bir neçə chat ID bağlana bilər).
// Bir chat-in uğursuzluğu digərlərini dayandırmır.
export async function broadcastTelegram(
  chatIds: string[],
  html: string,
  buttons?: TelegramButton[]
): Promise<void> {
  const unique = [...new Set(chatIds.map((c) => String(c).trim()).filter(Boolean))];
  await Promise.all(
    unique.map(async (chatId) => {
      const result = await sendTelegramMessage(chatId, html, buttons);
      if (!result.ok) {
        console.error(`[Telegram] chat ${chatId} göndərilmədi: ${result.error}`);
      }
    })
  );
}

// ===================== CHAT ID KÖMƏKÇİSİ + CALLBACK (long polling) =====================

// İnline callback düymələri üçün handler — server.ts qeydiyyatdan keçirir (DB işi orada qalır).
// Qaytarılan mətn istifadəçiyə toast (answerCallbackQuery) kimi göstərilir.
type CallbackHandler = (data: string) => Promise<string | void>;
let callbackHandler: CallbackHandler | null = null;
export function setTelegramCallbackHandler(handler: CallbackHandler): void {
  callbackHandler = handler;
}

async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  try {
    await fetch(`${API_BASE}/answerCallbackQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text: text || undefined }),
    });
  } catch {
    // toast göstərilməsə də əməliyyat onsuz da yerinə yetirilib
  }
}

// "Oxundu" basılandan sonra düyməni işarələnmiş vəziyyətə salır (təkrar basılmanın qarşısı
// vizual olaraq alınır; təkrar basılsa da handler idempotentdir).
async function markMessageButtonDone(chatId: string | number, messageId: number): Promise<void> {
  try {
    await fetch(`${API_BASE}/editMessageReplyMarkup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: "✅ Oxundu", callback_data: "noop" }]] },
      }),
    });
  } catch {
    // düymə köhnə halda qalsa problem deyil
  }
}

let pollingStarted = false;

export function startTelegramPolling(): void {
  if (!TOKEN || pollingStarted) return;
  pollingStarted = true;

  let offset = 0;
  let conflictLogged = false;

  const loop = async () => {
    // Sonsuz dövr — hər getUpdates çağırışı 25 san server-side gözləyir (long poll),
    // boşda CPU/traffic sıfıra yaxındır.
    for (;;) {
      try {
        const res = await fetch(`${API_BASE}/getUpdates?timeout=25&offset=${offset}`, {
          // long poll timeout-dan bir az böyük client timeout
          signal: AbortSignal.timeout(35_000),
        });
        if (res.status === 409) {
          // Başqa bir proses (məs. paralel dev server) artıq polling edir — o cavab verəcək.
          if (!conflictLogged) {
            console.warn("[Telegram] getUpdates 409 — başqa proses polling edir, gözləyirəm.");
            conflictLogged = true;
          }
          await new Promise((r) => setTimeout(r, 60_000));
          continue;
        }
        conflictLogged = false;
        const json: any = await res.json().catch(() => ({}));
        if (!json.ok || !Array.isArray(json.result)) {
          await new Promise((r) => setTimeout(r, 10_000));
          continue;
        }
        for (const update of json.result) {
          offset = Math.max(offset, update.update_id + 1);

          // İnline düymə basıldı (məs. "✅ Oxundu işarələ")
          const cb = update.callback_query;
          if (cb && cb.data && cb.data !== "noop") {
            let toast: string | void;
            try {
              toast = callbackHandler ? await callbackHandler(String(cb.data)) : undefined;
            } catch (err) {
              console.error("[Telegram] callback emalı alınmadı:", err);
              toast = "Xəta baş verdi";
            }
            await answerCallbackQuery(cb.id, typeof toast === "string" ? toast : undefined);
            if (cb.message && typeof toast === "string" && toast.startsWith("✅")) {
              await markMessageButtonDone(cb.message.chat.id, cb.message.message_id);
            }
            continue;
          }
          if (cb) {
            await answerCallbackQuery(cb.id);
            continue;
          }

          const msg = update.message;
          if (!msg || !msg.chat) continue;
          const chatId = String(msg.chat.id);
          const name = [msg.chat.first_name, msg.chat.last_name].filter(Boolean).join(" ") || msg.chat.title || "";
          await sendTelegramMessage(
            chatId,
            `Salam${name ? " <b>" + escapeHtml(name) + "</b>" : ""}! 👋\n\n` +
              `Bu, <b>Gotabiat</b> bildiriş botudur.\n\n` +
              `Sizin chat ID: <code>${escapeHtml(chatId)}</code>\n\n` +
              `Bu ID panelə əlavə olunduqdan sonra yeni rezervasiya sorğuları bura bildiriş kimi gələcək.`
          );
        }
      } catch {
        // Şəbəkə xətası / timeout — qısa fasilə ilə davam
        await new Promise((r) => setTimeout(r, 10_000));
      }
    }
  };

  loop();
  console.log("[Telegram] Bot aktivdir — chat ID köməkçisi (long polling) işə düşdü.");
}
