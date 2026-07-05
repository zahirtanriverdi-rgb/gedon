import { GoogleGenAI, Type } from "@google/genai";
import dbClient from "./db";

// Gemini-powered translation for tour content (source: Azerbaijani -> English/Russian).
// Domain-aware prompting handles tourism vocabulary (zirvə/şəlalə/yürüş etc.) far more
// reliably than a generic machine-translation model would.
const TARGET_LANGUAGES = ["en", "ru"] as const;
type TargetLanguage = (typeof TARGET_LANGUAGES)[number];

export type TourTranslations = Partial<Record<TargetLanguage, { name: string; description: string | null }>>;

let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required.");
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

const SYSTEM_INSTRUCTION = `Sən Azərbaycan dilindən ingilis və rus dillərinə tərcümə edən peşəkar turizm tərcüməçisisən.
Tur adlarını və təsvirlərini hərfi yox, təbii və axıcı şəkildə tərcümə et.
Turizm terminologiyasına diqqət et: "zirvə" = "peak/summit", "şəlalə" = "waterfall", "yürüş" = "hike/trek", "kamp" = "camp" və s.
Yalnız istənilən JSON strukturunda cavab ver, əlavə şərh yazma.`;

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    en: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
      },
      required: ["name", "description"],
    },
    ru: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
      },
      required: ["name", "description"],
    },
  },
  required: ["en", "ru"],
};

function isRateLimitError(error: any): boolean {
  return error?.status === 429 || /rate limit|quota/i.test(error?.message || "");
}

async function requestTranslation(name: string, description: string | null, attempt = 0): Promise<TourTranslations> {
  try {
    const ai = getGeminiClient();
    const promptText = `Tur adı: ${name}\nTur təsviri: ${description || "(yoxdur)"}`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
      },
    });
    const parsed = JSON.parse(response.text || "{}");
    const translations: TourTranslations = {};
    for (const lang of TARGET_LANGUAGES) {
      const entry = parsed[lang];
      if (entry?.name) {
        translations[lang] = {
          name: entry.name,
          description: description ? entry.description || null : null,
        };
      }
    }
    return translations;
  } catch (error: any) {
    if (isRateLimitError(error) && attempt < 3) {
      const delayMs = 2000 * (attempt + 1);
      console.warn(`[translate] Gemini rate-limited, retrying in ${delayMs}ms (attempt ${attempt + 1})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return requestTranslation(name, description, attempt + 1);
    }
    console.error("[translate] Gemini translation failed:", error.message);
    return {};
  }
}

export async function translateTourContent(name: string, description: string | null): Promise<TourTranslations> {
  if (!name) return {};
  return requestTranslation(name, description);
}

// Fire-and-forget: translates a tour's name/description in the background and merges the
// result into extra_data.translations. Never throws — Gemini being offline, rate-limited, or
// slow must never block or fail tour creation/editing.
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
