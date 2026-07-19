'use client';

import { useEffect, useState } from 'react';

/**
 * Admin-controlled customer-facing feature flags (settings table, public config endpoints).
 * Defaults mirror the old CustomerPortal behavior: camp sites stay hidden until the config
 * loads (never flashes on installs where it's off), the calculator stays visible until told
 * otherwise (never flashes away in the common case).
 */
export function useSiteFeatureFlags() {
  const [campSitesEnabled, setCampSitesEnabled] = useState<boolean>(false);
  const [groupCalculatorEnabled, setGroupCalculatorEnabled] = useState<boolean>(true);

  useEffect(() => {
    fetch('/api/camp-sites/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCampSitesEnabled(!!data && data.enabled !== false))
      .catch(() => setCampSitesEnabled(true));
    fetch('/api/group-calculator/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setGroupCalculatorEnabled(!!data && data.enabled !== false))
      .catch(() => setGroupCalculatorEnabled(true));
  }, []);

  return { campSitesEnabled, groupCalculatorEnabled };
}
