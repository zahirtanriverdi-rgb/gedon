'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Scale, Calculator, Tent } from 'lucide-react';
import type { Tour } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import CurrencySwitcher from '@/components/CurrencySwitcher';
import { UrgentDealsBell } from '@/components/customer/UrgentDealsBell';
import { SearchDropdown } from '@/components/SearchDropdown';
import { getRecentSearches, addRecentSearch } from '@/utils/recentSearches';
import { getWishlist, WISHLIST_CHANGED_EVENT } from '@/utils/wishlist';
import { getCompareList, COMPARE_CHANGED_EVENT } from '@/utils/compare';
import { useGlobalSearch } from './GlobalSearchContext';
import { useSiteFeatureFlags } from './useSiteFeatureFlags';

/**
 * Site chrome header. Replaces the old App.tsx renderChrome header. Kept intentionally small and
 * modular — the incoming designer restyles this without touching data/logic. Nav links are real
 * Next <Link>s (crawlable). Labels are localized inline (these nav strings lived in the old
 * CustomerPortal's local translations object, not the global i18n dictionary).
 */
const NAV_LABELS: Record<'az' | 'en' | 'ru', { wishlist: string; compare: string; camp: string; calc: string }> = {
  az: { wishlist: 'İstəklər', compare: 'Müqayisə', camp: 'Kamp yerləri', calc: 'Qrup hesabla' },
  en: { wishlist: 'Wishlist', compare: 'Compare', camp: 'Camp sites', calc: 'Calculator' },
  ru: { wishlist: 'Избранное', compare: 'Сравнить', camp: 'Кемпинги', calc: 'Калькулятор' },
};

// Scroll depth past which the home page's own search box is out of view — same 300px
// threshold the old SPA used to decide when the header's inline copy takes over.
const HEADER_SEARCH_SCROLL_Y = 300;

export function SiteHeader({
  tours,
  featureFlags,
}: {
  tours: Tour[];
  featureFlags?: { campSitesEnabled: boolean; groupCalculatorEnabled: boolean };
}) {
  const { language, t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const labels = NAV_LABELS[language] || NAV_LABELS.az;
  // Camp sites / group calculator are admin-toggled features — their nav icons must disappear
  // when the admin turns them off (the mobile bottom nav already does this via the same flags).
  // featureFlags is the SSR-resolved state, passed so the icons don't flash in/out on load.
  const { campSitesEnabled, groupCalculatorEnabled } = useSiteFeatureFlags(featureFlags);

  // Wishlist/compare counts — both stores live in localStorage and fire a change event whenever
  // the customer toggles a tour from a card, so the header icons must listen and re-render. Init
  // to 0 to match SSR (localStorage isn't available server-side), then hydrate in the effect.
  // Also listen to the native `storage` event so a change made in another tab reflects here too.
  const [wishlistCount, setWishlistCount] = useState(0);
  const [compareCount, setCompareCount] = useState(0);
  React.useEffect(() => {
    const sync = () => {
      setWishlistCount(getWishlist().length);
      setCompareCount(getCompareList().length);
    };
    sync();
    window.addEventListener(WISHLIST_CHANGED_EVENT, sync);
    window.addEventListener(COMPARE_CHANGED_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(WISHLIST_CHANGED_EVENT, sync);
      window.removeEventListener(COMPARE_CHANGED_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const nav = [
    { href: '/wishlist', label: labels.wishlist, Icon: Heart, count: wishlistCount, badgeClass: 'bg-rose-600', activeFill: true },
    { href: '/compare', label: labels.compare, Icon: Scale, count: compareCount, badgeClass: 'bg-brand-cta', activeFill: false },
    ...(campSitesEnabled ? [{ href: '/camp-sites', label: labels.camp, Icon: Tent, count: 0, badgeClass: '', activeFill: false }] : []),
    ...(groupCalculatorEnabled ? [{ href: '/calculator', label: labels.calc, Icon: Calculator, count: 0, badgeClass: '', activeFill: false }] : []),
  ];

  // Inline search bar state — desktop (sm+) only, revealed once scrolled past the home page's
  // own search box. Bound to the same global query as that box, so they always stay in sync;
  // this is effectively that same search reflected here once its own copy scrolled away.
  const { query, setQuery } = useGlobalSearch();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const searchRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => setRecentSearches(getRecentSearches()), []);

  React.useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > HEADER_SEARCH_SCROLL_Y);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Off the home page there's no tour grid to filter live, so submitting hops to the home
  // page with ?q= (HomeClient's URL-driven filter effect picks it up). On the home page the
  // grid already filtered as the user typed — just scroll back down to the results.
  const submitSearch = (term: string) => {
    if (term.trim()) setRecentSearches(addRecentSearch(term));
    setIsSearchFocused(false);
    if (pathname === '/') {
      window.scrollTo({ top: HEADER_SEARCH_SCROLL_Y, behavior: 'smooth' });
    } else {
      router.push(term.trim() ? `/?q=${encodeURIComponent(term.trim())}` : '/');
    }
  };

  return (
    // Sticky only from sm up — on mobile the header scrolls away with the logo and the home
    // page's own search bar takes over the viewport top (its sticky top-0 pins flush there,
    // exactly like the old SPA). Making this sticky on mobile would cover that search bar.
    <header
      className={`relative sm:sticky top-0 z-40 border-b transition-colors ${
        // On the home page at the very top, the hero's green gradient extends up behind the
        // header — so keep it transparent/borderless there to blend in. Once scrolled (or on
        // any other page) it becomes the solid white bar with a divider.
        pathname === '/' && !isScrolled
          ? 'border-transparent bg-transparent'
          : 'border-[var(--border-primary)] bg-white/90 backdrop-blur'
      }`}
      style={{ height: 'var(--header-height)' }}
    >
      <div className="mx-auto flex h-full max-w-[var(--global-max-width)] items-center justify-center sm:justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-xl font-black tracking-tight text-[var(--color-primary)]">
          GedəkGörək
        </Link>

        {/* Inline Search Bar — desktop only, appears glued into the header (same row as the
            logo and nav icons) once the page is scrolled past the home page's search box. */}
        {isScrolled && (
          <div ref={searchRef} className="relative hidden sm:flex sm:max-w-xl sm:flex-1 sm:mx-6 animate-header-search-in">
            <div className="relative flex w-full items-center rounded-full border border-slate-200 bg-white p-1.5 shadow-sm">
              <div className="flex flex-1 items-center pl-4 pr-2">
                <input
                  type="text"
                  placeholder={t('app.search.placeholder')}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitSearch(query);
                  }}
                  className="w-full bg-transparent py-2 text-sm font-medium text-brand-text-main placeholder-brand-text-muted focus:outline-none"
                />
              </div>
              <button
                onClick={() => submitSearch(query)}
                className="flex-shrink-0 cursor-pointer rounded-full bg-brand-primary px-5 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
              >
                {t('app.search.button')}
              </button>
            </div>

            {isSearchFocused && (
              <SearchDropdown
                query={query}
                tours={tours}
                recentSearches={recentSearches}
                onSelect={(val) => {
                  setQuery(val);
                  submitSearch(val);
                }}
                onSelectTour={(tour) => {
                  // Header search — a tour pick jumps straight to that tour's page.
                  if (query.trim()) setRecentSearches(addRecentSearch(query));
                  setIsSearchFocused(false);
                  router.push(`/tours/${tour.slug || tour.id}`);
                }}
                appLanguage={language}
              />
            )}
          </div>
        )}

        {/* Hidden below sm — on mobile these all live in the fixed bottom nav instead
            (wishlist/compare/camp/bell as tabs, calculator + language in its burger menu). */}
        <nav className="hidden sm:flex items-center gap-1 sm:gap-3">
          {/* Icon-only by request — each label survives as tooltip (title) + aria-label. */}
          {nav.map(({ href, label, Icon, count, badgeClass, activeFill }) => {
            const active = count > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center rounded-full p-2.5 transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--color-primary)] ${
                  active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                }`}
                title={active ? `${label} (${count})` : label}
                aria-label={active ? `${label} (${count})` : label}
              >
                <Icon className="h-5 w-5" fill={active && activeFill ? 'currentColor' : 'none'} />
                {active && (
                  <span className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 ${badgeClass} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                    {count}
                  </span>
                )}
              </Link>
            );
          })}
          {/* "Təcili fürsətlər" — rings + shows an amber badge whenever any approved tour
              has an upcoming departure with fewer than 5 seats left; opens a popup listing
              them with direct "Bilet al" links. */}
          <UrgentDealsBell />
          <LanguageSwitcher />
          <CurrencySwitcher />
        </nav>
      </div>
    </header>
  );
}
