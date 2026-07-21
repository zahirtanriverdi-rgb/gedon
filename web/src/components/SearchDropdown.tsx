'use client';
import React from 'react';
import { Search, Clock, MapPin } from 'lucide-react';
import { Tour } from '../types';
import { normalizeAzText } from '../utils/searchNormalize';
import { getLocalizedTourName, getLocalizedTourDescription } from '../i18n/tourLocalization';
import type { Language } from '../i18n/LanguageContext';

interface SearchDropdownProps {
  query: string;
  tours: Tour[];
  recentSearches: string[];
  onSelect: (value: string) => void;
  appLanguage?: Language;
}

// Renders a suggestion title the way the reference mock does: the part the user has already
// typed (the matched span) stays light/muted, the remaining "completion" is bold — so the eye
// is drawn to what each suggestion *adds* over the current query. Falls back to a plain bold
// title when the query doesn't match by substring (e.g. it matched via the description).
const HighlightedTitle: React.FC<{ title: string; query: string }> = ({ title, query }) => {
  const trimmed = query.trim();
  if (!trimmed) {
    return <span className="font-bold text-slate-800">{title}</span>;
  }
  const idx = normalizeAzText(title).indexOf(normalizeAzText(trimmed));
  if (idx === -1) {
    return <span className="font-bold text-slate-800">{title}</span>;
  }
  const end = idx + trimmed.length;
  return (
    <>
      <span className="font-normal text-slate-400">{title.slice(0, end)}</span>
      <span className="font-bold text-slate-800">{title.slice(end)}</span>
    </>
  );
};

export const SearchDropdown: React.FC<SearchDropdownProps> = ({
  query,
  tours,
  recentSearches,
  onSelect,
  appLanguage = 'az'
}) => {
  // Without strictNullChecks, a destructuring default widens the param type to `string`, so
  // pin it back to Language for the localization helpers below.
  const lang: Language = (appLanguage || 'az') as Language;
  // Diacritic-folded so "selale" typed on an EN/RU keyboard still matches "şəlalə" — the same
  // normalization the main grid filter uses (utils/searchNormalize).
  const lowerQuery = normalizeAzText(query.trim());

  // Determine if we should show recent searches
  const showRecent = !lowerQuery && recentSearches.length > 0;

  // Get dynamic suggestions
  const suggestions: Array<{ title: string, subtitle: string, type: 'region' | 'tour', image?: string, id?: string }> = [];

  // Belt-and-suspenders alongside the server-side filter (GET /api/tours only returns
  // status = 'approved' to anonymous/customer requests) — a pending or rejected tour must
  // never surface in search suggestions.
  const approvedTours = tours.filter(t => t.status === 'approved');

  if (lowerQuery) {
    // 1. Find matching regions
    const matchedRegions: string[] = Array.from(new Set(approvedTours.filter(t => normalizeAzText(t.region).includes(lowerQuery)).map(t => t.region)));

    matchedRegions.slice(0, 3).forEach(region => {
       const count = approvedTours.filter(t => t.region === region).length;
       suggestions.push({
         title: region,
         subtitle: `${count} ${appLanguage === 'az' ? 'aktivite' : appLanguage === 'ru' ? 'активностей' : 'activities'} • ${appLanguage === 'az' ? 'Region' : appLanguage === 'ru' ? 'Регион' : 'Region'}`,
         type: 'region'
       });
    });

    // 2. Find matching tours — match against both the AZ source text and the localized
    // name/description, so e.g. an EN visitor typing the English tour name also gets hits.
    const matchedTours = approvedTours.filter(t =>
      normalizeAzText(t.name).includes(lowerQuery) ||
      normalizeAzText(t.description).includes(lowerQuery) ||
      normalizeAzText(getLocalizedTourName(t, lang)).includes(lowerQuery) ||
      normalizeAzText(getLocalizedTourDescription(t, lang)).includes(lowerQuery)
    );

    matchedTours.slice(0, 5).forEach(tour => {
       suggestions.push({
         title: getLocalizedTourName(tour, lang),
         subtitle: tour.region,
         type: 'tour',
         image: tour.image,
         id: tour.id
       });
    });
  } else {
    // Popular regions computed from real tour data: rank active/approved tours by
    // region, using total review count as the popularity signal (a real demand proxy,
    // not a guess) — replaces the previously hardcoded ['Quba', 'Qəbələ', ...] list.
    const regionStats = new Map<string, { count: number; totalReviews: number }>();
    approvedTours
      .filter(t => t.isActive !== false)
      .forEach(t => {
        const stat = regionStats.get(t.region) || { count: 0, totalReviews: 0 };
        stat.count += 1;
        stat.totalReviews += t.reviewsCount || 0;
        regionStats.set(t.region, stat);
      });

    Array.from(regionStats.entries())
      .sort((a, b) => b[1].totalReviews - a[1].totalReviews)
      .slice(0, 5)
      .forEach(([region, stat]) => {
        suggestions.push({
          title: region,
          subtitle: `${stat.count} ${appLanguage === 'az' ? 'aktivite' : appLanguage === 'ru' ? 'активностей' : 'activities'} • ${appLanguage === 'az' ? 'Populyar' : appLanguage === 'ru' ? 'Популярное' : 'Popular'}`,
          type: 'region'
        });
      });
  }

  if (suggestions.length === 0 && !showRecent) {
    return (
      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100] py-4 text-left">
        <div className="px-5 text-center text-slate-400 py-4 text-sm font-medium">
          {appLanguage === 'az' ? 'Nəticə tapılmadı' : appLanguage === 'ru' ? 'Ничего не найдено' : 'No results found'}
        </div>
      </div>
    );
  }

  const sectionLabel = showRecent
    ? (appLanguage === 'az' ? 'Son Axtarışlar' : appLanguage === 'ru' ? 'Недавние поиски' : 'Recent Searches')
    : (appLanguage === 'az' ? 'Təkliflər' : appLanguage === 'ru' ? 'Предложения' : 'Suggestions');

  return (
    // Clean single-list dropdown (reference mock): a search-icon row per suggestion, the typed
    // span muted and the completion bold. No thumbnails — kept intentionally flat and fast to scan.
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-[100] py-2 text-left max-h-[70vh] overflow-y-auto">
      <h3 className="px-5 pt-2 pb-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
        {sectionLabel}
      </h3>

      {/* Recent Searches — plain query strings, tapped to re-run. */}
      {showRecent && (
        <div className="flex flex-col">
          {recentSearches.map((search, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(search)}
              className="flex items-center gap-3.5 w-full text-left px-5 py-2.5 hover:bg-slate-50 transition-colors"
            >
              <Clock className="w-[18px] h-[18px] text-slate-400 shrink-0" />
              <span className="font-bold text-slate-800 text-[15px] truncate">{search}</span>
            </button>
          ))}
        </div>
      )}

      {/* Suggestions — regions + tours. */}
      {!showRecent && suggestions.length > 0 && (
        <div className="flex flex-col">
          {suggestions.map((sugg, idx) => (
            <button
              key={idx}
              onClick={() => onSelect(sugg.title)}
              className="flex items-center gap-3.5 w-full text-left px-5 py-2.5 hover:bg-slate-50 transition-colors"
            >
              {sugg.type === 'region' ? (
                <MapPin className="w-[18px] h-[18px] text-slate-400 shrink-0" />
              ) : (
                <Search className="w-[18px] h-[18px] text-slate-400 shrink-0" />
              )}
              <span className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
                <span className="text-[15px] truncate">
                  <HighlightedTitle title={sugg.title} query={query} />
                </span>
                <span className="text-[12px] text-slate-400 font-medium truncate shrink-0 ml-auto">
                  {sugg.subtitle}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
