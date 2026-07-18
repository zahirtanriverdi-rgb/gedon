'use client';

import Link from 'next/link';
import { Heart, Scale, Calculator, Tent } from 'lucide-react';
import { useLanguage } from '@/i18n/LanguageContext';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { UrgentDealsBell } from '@/components/customer/UrgentDealsBell';

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

export function SiteHeader() {
  const { language } = useLanguage();
  const labels = NAV_LABELS[language] || NAV_LABELS.az;
  const nav = [
    { href: '/wishlist', label: labels.wishlist, Icon: Heart },
    { href: '/compare', label: labels.compare, Icon: Scale },
    { href: '/camp-sites', label: labels.camp, Icon: Tent },
    { href: '/calculator', label: labels.calc, Icon: Calculator },
  ];

  return (
    <header
      className="sticky top-0 z-40 border-b border-[var(--border-primary)] bg-white/90 backdrop-blur"
      style={{ height: 'var(--header-height)' }}
    >
      <div className="mx-auto flex h-full max-w-[var(--global-max-width)] items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="text-xl font-black tracking-tight text-[var(--color-primary)]">
          GedəkGörək
        </Link>
        <nav className="flex items-center gap-1 sm:gap-3">
          {nav.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-[var(--color-text-muted)] transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--color-primary)]"
              title={label}
            >
              <Icon className="h-5 w-5" />
              <span className="hidden md:inline">{label}</span>
            </Link>
          ))}
          {/* "Təcili fürsətlər" — rings + shows an amber badge whenever any approved tour
              has an upcoming departure with fewer than 5 seats left; opens a popup listing
              them with direct "Bilet al" links. */}
          <UrgentDealsBell />
          <LanguageSwitcher />
        </nav>
      </div>
    </header>
  );
}
