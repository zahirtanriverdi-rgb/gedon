'use client';
import { useEffect, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { useCurrency, type DisplayCurrency } from '../lib/currency';
import { useLanguage, type Language } from '../i18n/LanguageContext';

const CURRENCIES: { code: DisplayCurrency; label: string; symbol: string }[] = [
  { code: 'AZN', label: 'AZN', symbol: '₼' },
  { code: 'USD', label: 'USD', symbol: '$' },
  { code: 'EUR', label: 'EUR', symbol: '€' },
];

const LABELS: Record<Language, string> = { az: 'Valyuta', en: 'Currency', ru: 'Валюта' };

export default function CurrencySwitcher({
  className = '',
  showLabel = false,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const { displayCurrency, setDisplayCurrency } = useCurrency();
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const active = CURRENCIES.find((c) => c.code === displayCurrency) ?? CURRENCIES[0];

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Icon in a 40px circle (matching the tour-card action buttons), label below when requested. */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${LABELS[language]}: ${active.label}`}
        title={active.label}
        className={`group flex flex-col items-center justify-center transition-colors ${
          showLabel ? 'h-16 min-w-10 gap-1.5' : ''
        } ${open ? 'text-[var(--color-primary)]' : 'text-[var(--color-text-muted)]'}`}
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full transition-all duration-200 group-hover:bg-[var(--background-secondary)] group-hover:text-[var(--color-primary)] group-hover:scale-110 group-active:scale-95">
          <Coins className="h-6 w-6" />
        </span>
        {showLabel && (
          <span className="text-[11px] font-semibold leading-none whitespace-nowrap">{LABELS[language]}</span>
        )}
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 top-full mt-1 min-w-[110px] py-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
        >
          {CURRENCIES.map(({ code, label, symbol }) => (
            <li key={code} role="option" aria-selected={displayCurrency === code}>
              <button
                type="button"
                onClick={() => {
                  setDisplayCurrency(code);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-xs font-semibold transition-colors ${
                  displayCurrency === code
                    ? 'text-[var(--color-primary)] bg-gray-50'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="inline-block w-4 text-gray-400">{symbol}</span> {label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
