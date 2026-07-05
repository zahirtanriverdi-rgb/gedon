import type { Guide, Tour, User } from '../types';
import type { Language } from './LanguageContext';

// Tour name/description are authored in Azerbaijani; scheduleTourTranslation (server/translate.ts)
// fills in tour.translations.en/ru in the background via Gemini. Falls back to the
// Azerbaijani source whenever a translation hasn't landed yet (or Gemini was offline).
export function getLocalizedTourName(tour: Tour, language: Language): string {
  if (language === 'az') return tour.name;
  return tour.translations?.[language]?.name || tour.name;
}

export function getLocalizedTourDescription(tour: Tour, language: Language): string {
  if (language === 'az') return tour.description;
  return tour.translations?.[language]?.description || tour.description;
}

// Vendor "about" bio and guide bio/specialty are authored in Azerbaijani; hand-written EN/RU
// translations live alongside them (see seedUsers in data/toursData.ts) rather than going
// through machine translation, since earlier tests hallucinated on this kind of prose.
export function getLocalizedUserAbout(user: User, language: Language): string | undefined {
  if (language === 'az') return user.about;
  return user.aboutTranslations?.[language] || user.about;
}

export function getLocalizedGuideBio(guide: Guide, language: Language): string {
  if (language === 'az') return guide.bio;
  return guide.translations?.[language]?.bio || guide.bio;
}

export function getLocalizedGuideSpecialty(guide: Guide, language: Language): string | undefined {
  if (language === 'az') return guide.specialty;
  return guide.translations?.[language]?.specialty || guide.specialty;
}
