import { Tour } from '../types';

// Client-side-only refinement filters for the "hiking" category on the homepage.
// There is no dedicated tags/subcategory field on Tour yet, so these are heuristics
// over fields that already exist (difficulty, duration, free-text name/description).
export type HikingSubcategory = 'all' | 'peak' | 'waterfall' | 'camp' | 'extreme' | 'family';

export const HIKING_SUBCATEGORIES: { id: HikingSubcategory; emoji: string; labelKey: string }[] = [
  { id: 'all', emoji: '🌍', labelKey: 'customerHome.toursHomeView.hikingSubcategories.all' },
  { id: 'peak', emoji: '🏔️', labelKey: 'customerHome.toursHomeView.hikingSubcategories.peak' },
  { id: 'waterfall', emoji: '🌊', labelKey: 'customerHome.toursHomeView.hikingSubcategories.waterfall' },
  { id: 'camp', emoji: '⛺', labelKey: 'customerHome.toursHomeView.hikingSubcategories.camp' },
  { id: 'extreme', emoji: '🔥', labelKey: 'customerHome.toursHomeView.hikingSubcategories.extreme' },
  { id: 'family', emoji: '👨‍👩‍👧', labelKey: 'customerHome.toursHomeView.hikingSubcategories.family' },
];

const PEAK_KEYWORDS = /zirvə|zirve|dağ zirvəsi|peak/i;
const WATERFALL_KEYWORDS = /şəlalə|selale|waterfall/i;
const CAMP_KEYWORDS = /kemp|çadır|kamp|camp/i;

export function matchesHikingSubcategory(tour: Tour, subcategory: HikingSubcategory): boolean {
  if (subcategory === 'all') return true;
  const haystack = `${tour.name} ${tour.description}`.toLowerCase();

  switch (subcategory) {
    case 'peak':
      return tour.difficulty === 'hard' || tour.difficulty === 'extreme' || PEAK_KEYWORDS.test(haystack);
    case 'waterfall':
      return WATERFALL_KEYWORDS.test(haystack);
    case 'camp':
      return CAMP_KEYWORDS.test(haystack) || (tour.durationNights ?? 0) > 0;
    case 'extreme':
      return tour.difficulty === 'extreme' || (tour.durationDays || 1) > 1;
    case 'family':
      return tour.difficulty === 'easy';
    default:
      return true;
  }
}
