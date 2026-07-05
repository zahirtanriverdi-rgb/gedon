import type { Tour } from '../types';
import type { Language } from './LanguageContext';

// Tour name/description are authored in Azerbaijani; scheduleTourTranslation (server/translate.ts)
// fills in tour.translations.en/ru in the background via LibreTranslate. Falls back to the
// Azerbaijani source whenever a translation hasn't landed yet (or LibreTranslate was offline).
export function getLocalizedTourName(tour: Tour, language: Language): string {
  if (language === 'az') return tour.name;
  return tour.translations?.[language]?.name || tour.name;
}

export function getLocalizedTourDescription(tour: Tour, language: Language): string {
  if (language === 'az') return tour.description;
  return tour.translations?.[language]?.description || tour.description;
}
