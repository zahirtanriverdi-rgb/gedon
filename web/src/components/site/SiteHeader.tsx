'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Heart, Scale, Calculator, Tent, Menu, X, BookOpen, Search, ArrowLeft } from 'lucide-react';
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
import { useCurrency } from '@/lib/currency';
import { useSiteFeatureFlags } from './useSiteFeatureFlags';

const NAV_LABELS: Record<'az' | 'en' | 'ru', { wishlist: string; compare: string; camp: string; calc: string; guide: string; menu: string; langHeading: string }> = {
  az: { wishlist: 'İstəklər', compare: 'Müqayisə', camp: 'Kamp yerləri', calc: 'Qrup hesabla', guide: 'Bələdçi', menu: 'Menyu', langHeading: 'Dil / Valyuta' },
  en: { wishlist: 'Wishlist', compare: 'Compare', camp: 'Camp sites', calc: 'Calculator', guide: 'Guide', menu: 'Menu', langHeading: 'Language / Currency' },
  ru: { wishlist: 'Избранное', compare: 'Сравнить', camp: 'Кемпинги', calc: 'Калькулятор', guide: 'Гид', menu: 'Меню', langHeading: 'Язык / Валюта' },
};

const HEADER_SEARCH_SCROLL_Y = 300;

export function SiteHeader({
  tours,
  featureFlags,
}: {
  tours: Tour[];
  featureFlags?: { campSitesEnabled: boolean; groupCalculatorEnabled: boolean };
}) {
  const { language, setLanguage, t } = useLanguage();
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const router = useRouter();
  const pathname = usePathname();
  const labels = NAV_LABELS[language] || NAV_LABELS.az;

  const { campSitesEnabled, groupCalculatorEnabled } = useSiteFeatureFlags(featureFlags);

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

  const submitSearch = (term: string) => {
    if (term.trim()) setRecentSearches(addRecentSearch(term));
    setIsSearchFocused(false);
    if (pathname === '/') {
      window.scrollTo({ top: HEADER_SEARCH_SCROLL_Y, behavior: 'smooth' });
    } else {
      router.push(term.trim() ? `/?q=${encodeURIComponent(term.trim())}` : '/');
    }
  };

  const isTourDetail = pathname?.startsWith('/tours/');
  
// Tur adını tap (header-də göstərmək üçün)
const currentTour = tours.find(t => (t.slug || t.id) === pathname?.split('/tours/')[1]);
const tourName = currentTour?.name || '';

  const [showHeaderSearch, setShowHeaderSearch] = useState(false);
  React.useEffect(() => {
    if (!isTourDetail) return;
    const onScroll = () => {
      const el = document.getElementById('ggMainTitle');
      const bar = document.getElementById('ggTopBar');
      setShowHeaderSearch(
        el
          ? el.getBoundingClientRect().bottom < (bar?.offsetHeight ?? 52)
          : window.scrollY > HEADER_SEARCH_SCROLL_Y,
      );
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isTourDetail, pathname]);

  const [burgerOpen, setBurgerOpen] = useState(false);
  const burgerRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!burgerOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (burgerRef.current && !burgerRef.current.contains(event.target as Node)) {
        setBurgerOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [burgerOpen]);

  const goBurger = (href: string) => {
    setBurgerOpen(false);
    router.push(href);
  };

  const burgerLangOption = (lang: 'az' | 'en' | 'ru', currency: 'AZN' | 'USD' | 'EUR', label: string) => (
    <button
      type="button"
      onClick={() => {
        setLanguage(lang);
        setDisplayCurrency(currency);
        setBurgerOpen(false);
      }}
      className={`w-full flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
        language === lang && displayCurrency === currency ? 'text-brand-primary bg-emerald-50' : 'text-brand-text-main hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  const compactIconNav = (
    <div className="hidden sm:flex lg:hidden items-center gap-1 shrink-0">
      {[
        { href: '/wishlist', label: labels.wishlist, Icon: Heart, count: wishlistCount, badgeClass: 'bg-rose-600', activeFill: true },
        { href: '/compare', label: labels.compare, Icon: Scale, count: compareCount, badgeClass: 'bg-brand-cta', activeFill: false },
      ].map(({ href, label, Icon, count, badgeClass, activeFill }) => {
        const active = count > 0;
        return (
          <Link
            key={href}
            href={href}
            aria-label={active ? `${label} (${count})` : label}
            title={active ? `${label} (${count})` : label}
            className={`relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--background-secondary)] ${
              active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
            }`}
          >
            <Icon className="h-6 w-6" fill={active && activeFill ? 'currentColor' : 'none'} />
            {active && (
              <span className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 ${badgeClass} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                {count}
              </span>
            )}
          </Link>
        );
      })}
      <div className="relative" ref={burgerRef}>
        <button
          type="button"
          onClick={() => setBurgerOpen((v) => !v)}
          aria-label={labels.menu}
          aria-haspopup="true"
          aria-expanded={burgerOpen}
          className={`flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--background-secondary)] ${
            burgerOpen ? 'text-[var(--color-primary)] bg-[var(--background-secondary)]' : 'text-[var(--color-text-muted)]'
          }`}
        >
          {burgerOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
        {burgerOpen && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-top-2 duration-200">
            {campSitesEnabled && (
              <button
                type="button"
                onClick={() => goBurger('/camp-sites')}
                className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-brand-text-main hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <Tent className="w-5 h-5 text-brand-text-muted" />
                {labels.camp}
              </button>
            )}
            {groupCalculatorEnabled && (
              <button
                type="button"
                onClick={() => goBurger('/calculator')}
                className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-brand-text-main hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <Calculator className="w-5 h-5 text-brand-text-muted" />
                {labels.calc}
              </button>
            )}
            <button
              type="button"
              onClick={() => goBurger('/faq')}
              className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-brand-text-main hover:bg-slate-50 transition-colors border-b border-slate-100"
            >
              <BookOpen className="w-5 h-5 text-brand-text-muted" />
              {labels.guide}
            </button>
            <div className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-wide font-bold text-slate-400">
              {labels.langHeading}
            </div>
            {burgerLangOption('az', 'AZN', '🇦🇿 AZ (AZN)')}
            {burgerLangOption('ru', 'AZN', '🇷🇺 RU (AZN)')}
            {burgerLangOption('en', 'USD', '🇬🇧 EN (USD)')}
            {burgerLangOption('en', 'EUR', '🇪🇺 EN (EUR)')}
          </div>
        )}
      </div>
    </div>
  );

  if (isTourDetail) {
    return (
      <header
        id="ggTopBar"
        className={`bg-white sticky top-0 z-40 border-b transition-shadow duration-200 ${
          showHeaderSearch ? 'border-slate-100 shadow-[0_1px_8px_rgba(0,0,0,0.06)]' : 'border-transparent'
        }`}
        style={{ minHeight: 52 }}
      >
        <div
          className="relative max-w-[var(--global-max-width)] mx-auto px-4 sm:px-8 py-0 flex flex-nowrap items-center justify-between gap-2 sm:gap-4"
          style={{ minHeight: 52 }}
        >
          {/* Geri buttonu — mobildə loqo əvəzinə */}
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? window.history.back() : (window.location.href = '/'))}
            className="sm:hidden flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-[var(--background-secondary)] text-[var(--color-text-muted)] shrink-0"
            aria-label="Geri qayıt"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          {/* Sayt başlığında logo */}
          <Link
            href="/"
            className={`shrink-0 transition-opacity duration-300 ${
              showHeaderSearch ? 'opacity-0 pointer-events-none w-0 overflow-hidden' : ''
            }`}
          >
            <Image
              src="/logo/gotabiat_logo.svg"
              alt="Gotabiat"
              width={120}
              height={30}
              className="h-8 w-auto"
            />
          </Link>

          {/* Orta zolaq: mobil cihazlarda tur adı, planşet+desktop-da axtarış çubuğu */}
<div className="flex-1 min-w-0 flex justify-center">
  {showHeaderSearch && (
    <>
      {/* Mobil cihazlarda: tur adı */}
      <div className="sm:hidden flex-1 min-w-0 truncate px-2">
        <h2 className="text-sm font-bold text-slate-900 truncate">
          {tourName}
        </h2>
      </div>
      
      {/* Planşet və desktop: axtarış çubuğu */}
      <div ref={searchRef} className="hidden sm:block relative w-full max-w-xl animate-header-search-in">
        <div className="relative flex w-full items-center rounded-full border border-slate-200 bg-white p-1 shadow-sm">
          <div className="flex flex-1 min-w-0 items-center pl-3 sm:pl-4 pr-1">
            <input
              type="text"
              placeholder={t('app.search.placeholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitSearch(query);
              }}
              className="w-full bg-transparent py-1.5 text-base sm:text-sm font-medium text-brand-text-main placeholder-brand-text-muted focus:outline-none"
            />
          </div>
          <button
            onClick={() => submitSearch(query)}
            className="flex-shrink-0 cursor-pointer rounded-full bg-brand-primary px-4 py-1.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
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
              if (query.trim()) setRecentSearches(addRecentSearch(query));
              setIsSearchFocused(false);
              router.push(`/tours/${tour.slug || tour.id}`);
            }}
            appLanguage={language}
          />
        )}
      </div>
    </>
  )}
</div>

          {compactIconNav}

          {/* Tam naviqasiya — yalnız desktop (lg+) */}
          <nav className="hidden lg:flex items-center gap-[14px] shrink-0">
            {nav.map(({ href, label, Icon, count, badgeClass, activeFill }) => {
              const active = count > 0;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`group flex h-16 min-w-10 flex-col items-center justify-center gap-1.5 transition-colors ${
                    active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                  }`}
                  title={active ? `${label} (${count})` : label}
                  aria-label={active ? `${label} (${count})` : label}
                >
                  <span className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 group-hover:bg-[var(--background-secondary)] group-hover:text-[var(--color-primary)] group-hover:scale-110 group-active:scale-95">
                    <Icon className="h-6 w-6" fill={active && activeFill ? 'currentColor' : 'none'} />
                    {active && (
                      <span className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 ${badgeClass} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                        {count}
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-semibold leading-none whitespace-nowrap">{label}</span>
                </Link>
              );
            })}
            <UrgentDealsBell />
            <LanguageSwitcher showLabel />
            <CurrencySwitcher showLabel />
          </nav>
        </div>
      </header>
    );
  }

  return (
    <header
      className={`relative sm:sticky top-0 z-40 border-b transition-colors ${
        pathname === '/' && !isScrolled ? 'border-transparent bg-transparent' : 'border-[var(--border-primary)] bg-white/90 backdrop-blur'
      }`}
      style={{ height: 'var(--header-height)' }}
    >
      <div className="mx-auto flex h-full max-w-[var(--global-max-width)] items-center justify-center sm:justify-between gap-4 px-4 sm:px-5 md:px-8 lg:px-12 xl:px-14 min-[1440px]:px-[72px]">
        <Link href="/" className="shrink-0 transition-opacity duration-300">
          <Image
            src="/logo/gotabiat_logo.svg"
            alt="Gotabiat"
            width={120}
            height={30}
            className="h-8 w-auto"
          />
        </Link>
        
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
                  if (query.trim()) setRecentSearches(addRecentSearch(query));
                  setIsSearchFocused(false);
                  router.push(`/tours/${tour.slug || tour.id}`);
                }}
                appLanguage={language}
              />
            )}
          </div>
        )}
        
        {compactIconNav}
        
        <nav className="hidden lg:flex items-center gap-[14px]">
          {nav.map(({ href, label, Icon, count, badgeClass, activeFill }) => {
            const active = count > 0;
            return (
              <Link
                key={href}
                href={href}
                className={`group flex h-16 min-w-10 flex-col items-center justify-center gap-1.5 transition-colors ${
                  active ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'
                }`}
                title={active ? `${label} (${count})` : label}
                aria-label={active ? `${label} (${count})` : label}
              >
                <span className="relative flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 group-hover:bg-[var(--background-secondary)] group-hover:text-[var(--color-primary)] group-hover:scale-110 group-active:scale-95">
                  <Icon className="h-6 w-6" fill={active && activeFill ? 'currentColor' : 'none'} />
                  {active && (
                    <span className={`absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] px-1 ${badgeClass} text-white text-[10px] font-bold rounded-full flex items-center justify-center`}>
                      {count}
                    </span>
                  )}
                </span>
                <span className="text-[11px] font-semibold leading-none whitespace-nowrap">{label}</span>
              </Link>
            );
          })}
          <UrgentDealsBell />
          <LanguageSwitcher showLabel />
          <CurrencySwitcher showLabel />
        </nav>
      </div>
    </header>
  );
}