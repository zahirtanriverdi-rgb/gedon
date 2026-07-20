'use client';

import { useEffect, useState } from 'react';

/**
 * Admin-controlled customer-facing feature flags (settings table, public config endpoints).
 *
 * Pass the SSR-resolved values (getSiteFeatureFlags in lib/api) as `initial` so the first
 * client render already matches reality — otherwise the icons flash in then out on every load
 * (camp defaults hidden, calculator defaults visible, and only the fetch corrects them). The
 * effect still re-fetches for freshness; with a correct `initial` it resolves to the same value
 * and nothing flickers.
 */
export function useSiteFeatureFlags(initial?: {
  campSitesEnabled?: boolean;
  groupCalculatorEnabled?: boolean;
}) {
  const [campSitesEnabled, setCampSitesEnabled] = useState<boolean>(
    initial?.campSitesEnabled ?? false,
  );
  const [groupCalculatorEnabled, setGroupCalculatorEnabled] = useState<boolean>(
    initial?.groupCalculatorEnabled ?? true,
  );

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
