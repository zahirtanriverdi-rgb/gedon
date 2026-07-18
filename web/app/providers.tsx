'use client';

import React from 'react';
import { LanguageProvider } from '@/i18n/LanguageContext';
import { NotificationProvider } from '@/lib/notification';
import { CurrencyProvider } from '@/lib/currency';

// Re-export so existing imports of useNotification from '@/app/providers' keep working, but the
// canonical home is '@/lib/notification' (reachable from both app/ and src/).
export { useNotification } from '@/lib/notification';

/** All client-side context providers, mounted once in the root layout. */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <CurrencyProvider>
        <NotificationProvider>{children}</NotificationProvider>
      </CurrencyProvider>
    </LanguageProvider>
  );
}
