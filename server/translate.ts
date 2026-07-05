import dbClient from "./db";

// Self-hosted LibreTranslate instance (see docker-compose.libretranslate.yml).
// Source content is always Azerbaijani; LibreTranslate/Argos pivots through English
// automatically for pairs without a direct model (e.g. az->ru).
const LIBRETRANSLATE_URL = process.env.LIBRETRANSLATE_URL || "http://localhost:5050";
const LIBRETRANSLATE_API_KEY = process.env.LIBRETRANSLATE_API_KEY || "";
const SOURCE_LANGUAGE = "az";
const TARGET_LANGUAGES = ["en", "ru"];

export type TourTranslations = Record<string, { name: string; description: string | null }>;

async function translateText(text: string, target: string): Promise<string | null> {
  if (!text) return null;
  try {
    const res = await fetch(`${LIBRETRANSLATE_URL}/translate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        q: text,
        source: SOURCE_LANGUAGE,
        target,
        format: "text",
        ...(LIBRETRANSLATE_API_KEY ? { api_key: LIBRETRANSLATE_API_KEY } : {}),
      }),
    });
    if (!res.ok) {
      console.error(`[translate] LibreTranslate ${SOURCE_LANGUAGE}->${target} failed: ${res.status} ${await res.text()}`);
      return null;
    }
    const data = await res.json();
    return typeof data.translatedText === "string" ? data.translatedText : null;
  } catch (error: any) {
    console.error(`[translate] LibreTranslate request failed (${SOURCE_LANGUAGE}->${target}):`, error.message);
    return null;
  }
}

export async function translateTourContent(name: string, description: string | null): Promise<TourTranslations> {
  const translations: TourTranslations = {};
  for (const target of TARGET_LANGUAGES) {
    const [translatedName, translatedDescription] = await Promise.all([
      translateText(name, target),
      description ? translateText(description, target) : Promise.resolve(null),
    ]);
    if (translatedName) {
      translations[target] = { name: translatedName, description: translatedDescription };
    }
  }
  return translations;
}

// Fire-and-forget: translates a tour's name/description in the background and merges the
// result into extra_data.translations. Never throws — LibreTranslate being offline or slow
// must never block or fail tour creation/editing.
export function scheduleTourTranslation(tourId: string, name: string, description: string | null) {
  translateTourContent(name, description)
    .then(async (translations) => {
      if (!Object.keys(translations).length) return;
      const rows = await dbClient.query("SELECT extra_data FROM tours WHERE id = ?", [tourId]);
      if (!rows.length) return;
      let extra: Record<string, any> = {};
      try {
        extra = rows[0].extra_data ? JSON.parse(rows[0].extra_data) : {};
      } catch {
        extra = {};
      }
      extra.translations = translations;
      await dbClient.execute("UPDATE tours SET extra_data = ? WHERE id = ?", [JSON.stringify(extra), tourId]);
    })
    .catch((error: any) => console.error(`[translate] scheduleTourTranslation failed for ${tourId}:`, error.message));
}
