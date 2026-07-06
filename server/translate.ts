import { GoogleGenAI, Type } from "@google/genai";
import dbClient from "./db";
import type { Guide } from "../src/types";

// Gemini-powered translation for tour/vendor content (source: Azerbaijani -> English/Russian).
// Domain-aware prompting handles tourism vocabulary (zirvə/şəlalə/yürüş etc.) far more
// reliably than a generic machine-translation model would.
const TARGET_LANGUAGES = ["en", "ru"] as const;
type TargetLanguage = (typeof TARGET_LANGUAGES)[number];

export type TourContentInput = {
  name: string;
  description: string | null;
  includes?: string[];
  notIncluded?: string[];
  highlights?: string[];
};

export type TourTranslationEntry = {
  name: string;
  description: string | null;
  includes?: string[];
  notIncluded?: string[];
  highlights?: string[];
};

export type TourTranslations = Partial<Record<TargetLanguage, TourTranslationEntry>>;

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

function isRateLimitError(error: any): boolean {
  return error?.status === 429 || /rate limit|quota/i.test(error?.message || "");
}

async function generateTranslationJson(
  systemInstruction: string,
  promptText: string,
  responseSchema: object,
  attempt = 0
): Promise<any> {
  try {
    const ai = getGeminiClient();
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptText,
      config: { systemInstruction, responseMimeType: "application/json", responseSchema },
    });
    return JSON.parse(response.text || "{}");
  } catch (error: any) {
    if (isRateLimitError(error) && attempt < 3) {
      const delayMs = 2000 * (attempt + 1);
      console.warn(`[translate] Gemini rate-limited, retrying in ${delayMs}ms (attempt ${attempt + 1})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return generateTranslationJson(systemInstruction, promptText, responseSchema, attempt + 1);
    }
    throw error;
  }
}

const TOUR_SYSTEM_INSTRUCTION = `Sən Azərbaycan dilindən ingilis və rus dillərinə tərcümə edən peşəkar turizm tərcüməçisisən.
Mətnləri hərfi yox, təbii və axıcı şəkildə tərcümə et.
Turizm terminologiyasına diqqət et: "zirvə" = "peak/summit", "şəlalə" = "waterfall", "yürüş" = "hike/trek", "kamp" = "camp" və s.
Siyahı elementlərini (includes/notIncluded/highlights) eyni sırada və eyni sayda tərcümə et, heç birini buraxma və yenisini əlavə etmə.
Yalnız istənilən JSON strukturunda cavab ver, əlavə şərh yazma.`;

const TOUR_LIST_SCHEMA = { type: Type.ARRAY, items: { type: Type.STRING } };

const TOUR_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    en: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        includes: TOUR_LIST_SCHEMA,
        notIncluded: TOUR_LIST_SCHEMA,
        highlights: TOUR_LIST_SCHEMA,
      },
      required: ["name", "description", "includes", "notIncluded", "highlights"],
    },
    ru: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING },
        description: { type: Type.STRING },
        includes: TOUR_LIST_SCHEMA,
        notIncluded: TOUR_LIST_SCHEMA,
        highlights: TOUR_LIST_SCHEMA,
      },
      required: ["name", "description", "includes", "notIncluded", "highlights"],
    },
  },
  required: ["en", "ru"],
};

export async function translateTourContent(input: TourContentInput): Promise<TourTranslations> {
  if (!input.name) return {};
  try {
    const promptText = [
      `Tur adı: ${input.name}`,
      `Tur təsviri: ${input.description || "(yoxdur)"}`,
      `Qiymətə daxildir (includes): ${JSON.stringify(input.includes || [])}`,
      `Qiymətə daxil deyil (notIncluded): ${JSON.stringify(input.notIncluded || [])}`,
      `Xüsusiyyətlər (highlights): ${JSON.stringify(input.highlights || [])}`,
    ].join("\n");
    const parsed = await generateTranslationJson(TOUR_SYSTEM_INSTRUCTION, promptText, TOUR_RESPONSE_SCHEMA);
    const translations: TourTranslations = {};
    for (const lang of TARGET_LANGUAGES) {
      const entry = parsed[lang];
      if (entry?.name) {
        translations[lang] = {
          name: entry.name,
          description: input.description ? entry.description || null : null,
          includes: input.includes?.length ? entry.includes : undefined,
          notIncluded: input.notIncluded?.length ? entry.notIncluded : undefined,
          highlights: input.highlights?.length ? entry.highlights : undefined,
        };
      }
    }
    return translations;
  } catch (error: any) {
    console.error("[translate] Gemini tour translation failed:", error.message);
    return {};
  }
}

// Fire-and-forget: translates a tour's content in the background and merges the result into
// extra_data.translations. Never throws — Gemini being offline, rate-limited, or slow must
// never block or fail tour creation/editing.
export function scheduleTourTranslation(tourId: string, input: TourContentInput) {
  translateTourContent(input)
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

const USER_SYSTEM_INSTRUCTION = `Sən Azərbaycan dilindən ingilis və rus dillərinə tərcümə edən peşəkar turizm tərcüməçisisən.
Vendor (tur operatoru) haqqında qısa məlumatı və komanda üzvlərinin (bələdçilərin) bio/ixtisas mətnlərini
hərfi yox, təbii və peşəkar şəkildə tərcümə et. Siyahını eyni sırada və eyni sayda saxla.
Yalnız istənilən JSON strukturunda cavab ver, əlavə şərh yazma.`;

const USER_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    en: {
      type: Type.OBJECT,
      properties: {
        about: { type: Type.STRING },
        guides: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { bio: { type: Type.STRING }, specialty: { type: Type.STRING } },
            required: ["bio", "specialty"],
          },
        },
      },
      required: ["about", "guides"],
    },
    ru: {
      type: Type.OBJECT,
      properties: {
        about: { type: Type.STRING },
        guides: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: { bio: { type: Type.STRING }, specialty: { type: Type.STRING } },
            required: ["bio", "specialty"],
          },
        },
      },
      required: ["about", "guides"],
    },
  },
  required: ["en", "ru"],
};

export type UserTranslationResult = {
  aboutTranslations?: Partial<Record<TargetLanguage, string>>;
  guides?: Guide[];
};

// Fire-and-forget: translates a vendor's "about" text and their guides' bio/specialty in the
// background and merges the result into users.extra_data (aboutTranslations, guides[].translations).
// Never throws — must never block or fail a profile save.
export function scheduleUserTranslation(userId: string, about: string | null | undefined, guides: Guide[] | undefined) {
  const hasAbout = !!about;
  const guidesList = guides || [];
  if (!hasAbout && guidesList.length === 0) return;

  (async () => {
    try {
      const promptText = [
        `Vendor haqqında (about): ${about || "(yoxdur)"}`,
        `Bələdçilər (guides): ${JSON.stringify(guidesList.map((g) => ({ bio: g.bio || "", specialty: g.specialty || "" })))}`,
      ].join("\n");
      const parsed = await generateTranslationJson(USER_SYSTEM_INSTRUCTION, promptText, USER_RESPONSE_SCHEMA);

      const aboutTranslations: Partial<Record<TargetLanguage, string>> = {};
      const guideTranslationsByLang: Record<TargetLanguage, Array<{ bio?: string; specialty?: string }>> = { en: [], ru: [] };
      for (const lang of TARGET_LANGUAGES) {
        const entry = parsed[lang];
        if (hasAbout && entry?.about) aboutTranslations[lang] = entry.about;
        if (Array.isArray(entry?.guides)) guideTranslationsByLang[lang] = entry.guides;
      }

      const rows = await dbClient.query("SELECT extra_data FROM users WHERE id = ?", [userId]);
      if (!rows.length) return;
      let extra: Record<string, any> = {};
      try {
        extra = rows[0].extra_data ? JSON.parse(rows[0].extra_data) : {};
      } catch {
        extra = {};
      }

      if (hasAbout && Object.keys(aboutTranslations).length) {
        extra.aboutTranslations = aboutTranslations;
      }
      if (guidesList.length) {
        extra.guides = guidesList.map((guide, i) => {
          const translations: Guide["translations"] = {};
          for (const lang of TARGET_LANGUAGES) {
            const t = guideTranslationsByLang[lang][i];
            if (t?.bio || t?.specialty) translations[lang] = { bio: t.bio, specialty: t.specialty };
          }
          return Object.keys(translations).length ? { ...guide, translations } : guide;
        });
      }

      await dbClient.execute("UPDATE users SET extra_data = ? WHERE id = ?", [JSON.stringify(extra), userId]);
    } catch (error: any) {
      console.error(`[translate] scheduleUserTranslation failed for ${userId}:`, error.message);
    }
  })();
}
