'use client';

import React, { createContext, useContext, useState } from 'react';

/**
 * Global search query shared between the home page's own search box (HomeClient/ToursHomeView)
 * and the inline copy that appears in the SiteHeader on desktop once the page is scrolled past
 * the home box — the old SPA kept this in App.tsx state; in the App Router the header and the
 * page live in separate trees, so a context spanning the (site) layout replaces it.
 */
const GlobalSearchContext = createContext<{
  query: string;
  setQuery: (q: string) => void;
} | null>(null);

export function GlobalSearchProvider({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = useState('');
  return (
    <GlobalSearchContext.Provider value={{ query, setQuery }}>
      {children}
    </GlobalSearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const ctx = useContext(GlobalSearchContext);
  if (!ctx) throw new Error('useGlobalSearch must be used within GlobalSearchProvider');
  return ctx;
}
