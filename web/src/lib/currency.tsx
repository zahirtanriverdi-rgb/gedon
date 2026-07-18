'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export type DisplayCurrency = 'AZN' | 'USD' | 'EUR';

interface CurrencyState {
  displayCurrency: DisplayCurrency;
  setDisplayCurrency: (c: DisplayCurrency) => void;
  // Live CBAR rates with static fallbacks — same defaults the old App.tsx used.
  exchangeRates: { USD: number; EUR: number };
}

const CurrencyContext = createContext<CurrencyState | undefined>(undefined);

/**
 * Display-currency selection + CBAR exchange rates, ported from the old App.tsx state.
 * Lives in the root providers so the header/mobile-nav language-currency switcher and the
 * price displays (home grid, tour detail) all see the same selection.
 */
export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>('AZN');
  const [exchangeRates, setExchangeRates] = useState<{ USD: number; EUR: number }>({
    USD: 1.7,
    EUR: 1.85,
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/exchange-rates/cbar');
        if (res.ok) {
          const data = await res.json();
          if (data?.USD && data?.EUR) setExchangeRates({ USD: data.USD, EUR: data.EUR });
        }
      } catch {
        /* keep fallback rates */
      }
    })();
  }, []);

  return (
    <CurrencyContext.Provider value={{ displayCurrency, setDisplayCurrency, exchangeRates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyState {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}

/**
 * Shared price-conversion helper (ported from CustomerPortal.getConvertedPriceInfo): converts a
 * slot price in its stored currency to AZN, then into the selected display currency.
 */
export function makeConvertedPriceInfo(
  displayCurrency: DisplayCurrency,
  exchangeRates: { USD: number; EUR: number },
) {
  return (price: number, currency?: 'AZN' | 'USD' | 'EUR') => {
    const usdRate = exchangeRates?.USD || 1.7;
    const eurRate = exchangeRates?.EUR || 1.85;

    let aznPrice = price;
    if (currency === 'USD') aznPrice = price * usdRate;
    if (currency === 'EUR') aznPrice = price * eurRate;

    let displayPrice = aznPrice;
    let symbol = '₼';
    let code = 'AZN';
    if (displayCurrency === 'USD') {
      displayPrice = aznPrice / usdRate;
      symbol = '$';
      code = 'USD';
    } else if (displayCurrency === 'EUR') {
      displayPrice = aznPrice / eurRate;
      symbol = '€';
      code = 'EUR';
    }

    const finalPrice = Math.round(displayPrice);
    return {
      azn: aznPrice,
      currencySymbol: symbol,
      currencyCode: code,
      original: `${finalPrice} ${symbol}`,
      both: `${finalPrice} ${symbol}`,
      detailed: `${finalPrice} ${symbol}`,
    };
  };
}
