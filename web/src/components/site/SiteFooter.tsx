'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import type { Tour } from '@/types';
import { useLanguage } from '@/i18n/LanguageContext';
import { getLocalizedTourName } from '@/i18n/tourLocalization';

// SEO daxili linkləmə üçün sayt footer-i: "Populyar Destinasiyalar" və "Ən çox axtarılan
// turlar" real tur məlumatından hesablanır və HƏQİQİ URL-lərə (crawl olunan <a href>)
// gedir — region/kateqoriya linkləri ana səhifənin oxuduğu /?region= və /?category=
// query param-larına, tur linkləri /tours/:slug səhifələrinə. Tours SSR layout-dan gəlir,
// ona görə linklər ilkin HTML-də crawl olunandır.
interface SiteFooterProps {
  tours: Tour[];
}

// "Quba (Xınalıq)", "İsmayıllı / Lahıc", "İtaliya, Roma" kimi qranular region adlarından
// baza destinasiya adını çıxarır ("Quba", "İsmayıllı", "İtaliya") — footer-də eyni bölgənin
// kəndləri ayrı-ayrı sadalanmasın deyə. Filtr `.includes()` ilə işlədiyi üçün baza ad
// bütün alt-bölgə turlarına uyğun gəlir.
function baseRegionName(region: string): string {
  return region.split(/[(,/]/)[0].trim();
}

const FOOTER_CATEGORIES = ['hiking', 'peak', 'camp', 'active', 'international'] as const;

export function SiteFooter({ tours }: SiteFooterProps) {
  const { t, language } = useLanguage();

  // Yalnız müştərinin onsuz da görə bildiyi turlar (approved + aktiv) — search dropdown-dakı
  // eyni ehtiyat qaydası: pending/rejected tur footer linklərində də görünməməlidir.
  const visibleTours = useMemo(
    () => tours.filter(tour => tour.status === 'approved' && tour.isActive !== false),
    [tours]
  );

  // Populyar destinasiyalar: baza region adına görə qruplaşdır, tur sayına görə sırala.
  const destinations = useMemo(() => {
    const counts = new Map<string, number>();
    for (const tour of visibleTours) {
      const base = baseRegionName(tour.region || '');
      if (!base) continue;
      counts.set(base, (counts.get(base) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);
  }, [visibleTours]);

  // Ən çox axtarılan/seçilən turlar: rəy sayı (real tələb siqnalı), bərabərlikdə reytinq.
  const popularTours = useMemo(() => {
    return [...visibleTours]
      .sort((a, b) => (b.reviewsCount || 0) - (a.reviewsCount || 0) || (b.rating || 0) - (a.rating || 0))
      .slice(0, 6);
  }, [visibleTours]);

  const presentCategories = useMemo(() => {
    const present = new Set(visibleTours.map(tour => tour.category));
    return FOOTER_CATEGORIES.filter(cat => present.has(cat));
  }, [visibleTours]);

  const linkClass = 'text-[13px] text-primary-200/80 hover:text-white transition-colors leading-snug';
  const headingClass = 'text-[11px] font-black uppercase tracking-widest text-accent-orange-300 mb-3';

  return (
    <footer className="bg-primary-900 text-primary-100 mt-12">
      <div className="max-w-[var(--global-max-width)] mx-auto px-6 sm:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-[1.4fr_1fr_1.3fr_1fr] gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <div className="flex flex-col font-black text-white leading-tight text-xl tracking-tight">
              <span>Gotabiat</span>
              <span className="text-[11px] uppercase tracking-widest text-primary-300 font-bold">Marketplace</span>
            </div>
            <p className="mt-3 text-[13px] text-primary-200/80 leading-relaxed max-w-xs">
              {t('customerMisc.siteFooter.tagline')}
            </p>
          </div>

          {/* Populyar Destinasiyalar */}
          <nav aria-label={t('customerMisc.siteFooter.popularDestinations')}>
            <h3 className={headingClass}>{t('customerMisc.siteFooter.popularDestinations')}</h3>
            <ul className="space-y-2">
              {destinations.map(([name, count]) => (
                <li key={name}>
                  <Link href={`/?region=${encodeURIComponent(name)}`} className={`${linkClass} inline-flex items-center gap-1.5`}>
                    <MapPin className="w-3 h-3 shrink-0 text-primary-400" />
                    <span>{name}</span>
                    <span className="text-primary-400 text-[11px]">· {t('customerMisc.siteFooter.tourCount', { count })}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Ən çox axtarılan turlar */}
          <nav aria-label={t('customerMisc.siteFooter.popularTours')}>
            <h3 className={headingClass}>{t('customerMisc.siteFooter.popularTours')}</h3>
            <ul className="space-y-2">
              {popularTours.map(tour => (
                <li key={tour.id}>
                  <Link href={`/tours/${tour.slug || tour.id}`} className={`${linkClass} block truncate max-w-[240px]`}>
                    {getLocalizedTourName(tour, language)}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Kateqoriyalar + Sayt */}
          <div className="space-y-8">
            <nav aria-label={t('customerMisc.siteFooter.categoriesHeading')}>
              <h3 className={headingClass}>{t('customerMisc.siteFooter.categoriesHeading')}</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/" className={linkClass}>{t('customerMisc.siteFooter.allTours')}</Link>
                </li>
                {presentCategories.map(cat => (
                  <li key={cat}>
                    <Link href={`/?category=${cat}`} className={linkClass}>
                      {t(`customerHome.toursHomeView.categories.${cat}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <nav aria-label={t('customerMisc.siteFooter.siteHeading')}>
              <h3 className={headingClass}>{t('customerMisc.siteFooter.siteHeading')}</h3>
              <ul className="space-y-2">
                <li><Link href="/faq" className={linkClass}>{t('customerMisc.siteFooter.faq')}</Link></li>
                <li><Link href="/compare" className={linkClass}>{t('customerMisc.siteFooter.compare')}</Link></li>
                <li><Link href="/wishlist" className={linkClass}>{t('customerMisc.siteFooter.wishlist')}</Link></li>
                <li>
                  <a href="https://wa.me/994706717804" target="_blank" rel="noopener noreferrer" className={linkClass}>
                    {t('app.footer.supportLink')}
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        <div className="mt-10 pt-5 border-t border-primary-800 text-[12px] text-primary-300/80">
          © {new Date().getFullYear()} Gotabiat Marketplace. {t('customerMisc.siteFooter.rightsReserved')}
        </div>
      </div>
    </footer>
  );
}
