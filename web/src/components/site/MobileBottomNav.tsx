'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Compass, Heart, Scale, Menu, X, BookOpen, Calculator, Tent } from 'lucide-react';
import { UrgentDealsBell } from '@/components/customer/UrgentDealsBell';
import { getWishlist, WISHLIST_CHANGED_EVENT } from '@/utils/wishlist';
import { getCompareList, COMPARE_CHANGED_EVENT } from '@/utils/compare';
import { useLanguage } from '@/i18n/LanguageContext';
import { useCurrency } from '@/lib/currency';
import { useSiteFeatureFlags } from './useSiteFeatureFlags';

// Local nav strings — same inline dictionary the old CustomerPortal's bottom nav carried.
const NAV_STRINGS = {
  az: { navDiscover: 'Kəşf et', navWishlist: 'İstəklər', navCompare: 'Müqayisə', navCampSites: 'Kamp yerləri', navMenu: 'Menyu', navGuide: 'Bələdçi', navCalculator: 'Qrup hesabla', langHeading: 'Dil / Valyuta' },
  en: { navDiscover: 'Discover', navWishlist: 'Wishlist', navCompare: 'Compare', navCampSites: 'Camp sites', navMenu: 'Menu', navGuide: 'Guide', navCalculator: 'Group calculator', langHeading: 'Language / Currency' },
  ru: { navDiscover: 'Обзор', navWishlist: 'Избранное', navCompare: 'Сравнить', navCampSites: 'Кемпинги', navMenu: 'Меню', navGuide: 'Гид', navCalculator: 'Групповой калькулятор', langHeading: 'Язык / Валюта' },
} as const;

/**
 * Mobile bottom navigation bar for the public site — ported from the old CustomerPortal's
 * fixed bottom nav. Lives in the (site) layout so it shows on every customer page (never on
 * vendor/admin dashboards, which use their own route groups). Wishlist/compare badges listen
 * to the utils' change events since the toggles now live in sibling components.
 */
export function MobileBottomNav({
  featureFlags,
}: {
  featureFlags?: { campSitesEnabled: boolean; groupCalculatorEnabled: boolean };
} = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const { language, setLanguage } = useLanguage();
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const appLanguage = (language as 'az' | 'en' | 'ru') || 'az';
  const t = (key: keyof typeof NAV_STRINGS.az) => NAV_STRINGS[appLanguage]?.[key] || NAV_STRINGS.az[key];

  const [wishlistCount, setWishlistCount] = useState(0);
  const [compareCount, setCompareCount] = useState(0);
  React.useEffect(() => {
    const syncWishlist = () => setWishlistCount(getWishlist().length);
    const syncCompare = () => setCompareCount(getCompareList().length);
    syncWishlist();
    syncCompare();
    window.addEventListener(WISHLIST_CHANGED_EVENT, syncWishlist);
    window.addEventListener(COMPARE_CHANGED_EVENT, syncCompare);
    return () => {
      window.removeEventListener(WISHLIST_CHANGED_EVENT, syncWishlist);
      window.removeEventListener(COMPARE_CHANGED_EVENT, syncCompare);
    };
  }, []);

  // Burger dropdown (Bələdçi / Qrup hesabla / dil-valyuta) — closes on outside tap.
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  // Admin-controlled feature flags (settings table) — shared with the desktop SiteHeader.
  // SSR-resolved values arrive via props so the burger's calculator entry doesn't flicker.
  const { campSitesEnabled, groupCalculatorEnabled } = useSiteFeatureFlags(featureFlags);

  const go = (href: string) => {
    setMenuOpen(false);
    router.push(href);
  };

  const langOption = (
    lang: 'az' | 'en' | 'ru',
    currency: 'AZN' | 'USD' | 'EUR',
    label: string,
  ) => (
    <button
      type="button"
      onClick={() => {
        setLanguage(lang);
        setDisplayCurrency(currency);
        setMenuOpen(false);
      }}
      className={`w-full flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
        language === lang && displayCurrency === currency
          ? 'text-brand-primary bg-emerald-50'
          : 'text-brand-text-main hover:bg-slate-50'
      }`}
    >
      {label}
    </button>
  );

  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 w-full z-[100] bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)] overflow-visible">
      <div className="flex flex-row items-center justify-between w-full h-16 px-1">
        <button
          type="button"
          onClick={() => {
            setMenuOpen(false);
            // Always a hard return to a clean homepage — same guarantee the old SPA gave:
            // whichever page (or filtered home state) the customer is on, this lands them on
            // a fresh '/' with search/filters/scroll reset.
            window.location.href = '/';
          }}
          className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
            pathname === '/' ? 'text-brand-primary' : 'text-brand-text-muted'
          }`}
        >
          <Compass className="w-5 h-5" strokeWidth={pathname === '/' ? 2.5 : 2} />
          <span className="text-[10px] font-bold">{t('navDiscover')}</span>
        </button>

        <button
          type="button"
          onClick={() => go('/wishlist')}
          className={`flex-1 relative flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
            pathname === '/wishlist' ? 'text-brand-primary' : 'text-brand-text-muted'
          }`}
        >
          <span className="relative flex justify-center">
            <Heart
              className="w-5 h-5"
              strokeWidth={pathname === '/wishlist' ? 2.5 : 2}
              fill={pathname === '/wishlist' ? 'currentColor' : 'none'}
            />
            {wishlistCount > 0 && (
              <span className="absolute -top-1.5 -right-3 min-w-[15px] h-[15px] px-0.5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {wishlistCount}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold">{t('navWishlist')}</span>
        </button>

        <button
          type="button"
          onClick={() => go('/compare')}
          className={`flex-1 relative flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
            pathname === '/compare' ? 'text-brand-primary' : 'text-brand-text-muted'
          }`}
        >
          <span className="relative flex justify-center">
            <Scale className="w-5 h-5" strokeWidth={pathname === '/compare' ? 2.5 : 2} />
            {compareCount > 0 && (
              <span className="absolute -top-1.5 -right-3 min-w-[15px] h-[15px] px-0.5 bg-brand-cta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {compareCount}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold">{t('navCompare')}</span>
        </button>

        {/* "Təcili fürsətlər" — bottom-sheet variant; a header-anchored dropdown wouldn't fit
            hanging off a bottom-fixed nav icon. */}
        <UrgentDealsBell variant="mobileNav" />

        {campSitesEnabled && (
          <button
            type="button"
            onClick={() => go('/camp-sites')}
            className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
              pathname.startsWith('/camp-sites') ? 'text-brand-primary' : 'text-brand-text-muted'
            }`}
          >
            <Tent className="w-5 h-5" strokeWidth={pathname.startsWith('/camp-sites') ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{t('navCampSites')}</span>
          </button>
        )}

        <div className="flex-1 relative h-full flex" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={`w-full h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
              menuOpen || pathname === '/faq' || pathname === '/calculator'
                ? 'text-brand-primary'
                : 'text-brand-text-muted'
            }`}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" strokeWidth={2} />}
            <span className="text-[10px] font-bold">{t('navMenu')}</span>
          </button>

          {menuOpen && (
            <div className="absolute bottom-[calc(100%+12px)] right-0 w-48 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-bottom-2 duration-200">
              <button
                type="button"
                onClick={() => go('/faq')}
                className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-brand-text-main hover:bg-slate-50 transition-colors border-b border-slate-100"
              >
                <BookOpen className="w-5 h-5 text-brand-text-muted" />
                {t('navGuide')}
              </button>
              {groupCalculatorEnabled && (
                <button
                  type="button"
                  onClick={() => go('/calculator')}
                  className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-brand-text-main hover:bg-slate-50 transition-colors border-b border-slate-100"
                >
                  <Calculator className="w-5 h-5 text-brand-text-muted" />
                  {t('navCalculator')}
                </button>
              )}

              {/* Dil + valyuta seçimi — desktop menyusu ilə eyni 4 cüt seçim. */}
              <div className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-wide font-bold text-slate-400">
                {t('langHeading')}
              </div>
              {langOption('az', 'AZN', '🇦🇿 AZ (AZN)')}
              {langOption('ru', 'AZN', '🇷🇺 RU (AZN)')}
              {langOption('en', 'USD', '🇬🇧 EN (USD)')}
              {langOption('en', 'EUR', '🇪🇺 EN (EUR)')}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
