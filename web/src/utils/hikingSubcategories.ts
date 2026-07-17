import { Tour } from '../types';

// Client-side-only refinement filters for the "hiking" category on the homepage.
// There is no dedicated tags/subcategory field on Tour yet, so these are heuristics
// over fields that already exist (difficulty, duration, free-text name/description/region).
//
// NOTE: 'peak' and 'camp' were removed on purpose — they duplicated the top-level
// "Zirvə" and "Kamp" category pills that sit right above this row, so selecting them
// here was confusing (a tour could show up as a "hiking" result while its real
// category is already peak/camp). These subcategories are meant to *refine* hiking
// results by theme or difficulty, not restate the top-level categories.
export type HikingSubcategory = 'all' | 'waterfall' | 'forest' | 'family' | 'hard';

export const HIKING_SUBCATEGORIES: { id: HikingSubcategory; emoji: string; labelKey: string }[] = [
  { id: 'all', emoji: '🌍', labelKey: 'customerHome.toursHomeView.hikingSubcategories.all' },
  { id: 'waterfall', emoji: '🌊', labelKey: 'customerHome.toursHomeView.hikingSubcategories.waterfall' },
  { id: 'forest', emoji: '🌲', labelKey: 'customerHome.toursHomeView.hikingSubcategories.forest' },
  { id: 'family', emoji: '👨‍👩‍👧', labelKey: 'customerHome.toursHomeView.hikingSubcategories.family' },
  { id: 'hard', emoji: '🔥', labelKey: 'customerHome.toursHomeView.hikingSubcategories.hard' },
];

const WATERFALL_KEYWORDS = /şəlalə|selale|waterfall/i;
const FOREST_KEYWORDS = /meşə|mese|meshe|forest|park/i;

export function matchesHikingSubcategory(tour: Tour, subcategory: HikingSubcategory): boolean {
  if (subcategory === 'all') return true;
  const haystack = `${tour.name} ${tour.description || ''} ${tour.region || ''}`.toLowerCase();

  switch (subcategory) {
    case 'waterfall':
      return WATERFALL_KEYWORDS.test(haystack);
    case 'forest':
      return FOREST_KEYWORDS.test(haystack);
    case 'family':
      // Easy-difficulty hikes suited to families with kids.
      return tour.difficulty === 'easy';
    case 'hard':
      // Demanding hikes — hard or extreme difficulty.
      return tour.difficulty === 'hard' || tour.difficulty === 'extreme';
    default:
      return true;
  }
}
