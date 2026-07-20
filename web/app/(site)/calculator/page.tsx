'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PriceCalculator } from '@/components/PriceCalculator';
import type { PriceCalculatorConfig } from '@/types';

// Group-price calculator. Loads the admin-tuned cost elements (settings table, saved from
// the admin panel's "Qiymət hesablayıcısı" section); until the fetch lands — or if the admin
// never saved one — the component's built-in FALLBACK_CONFIG applies.
export default function CalculatorRoute() {
  const router = useRouter();
  const [config, setConfig] = useState<PriceCalculatorConfig | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/group-calculator/config');
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled && data?.config && typeof data.config === 'object') {
          setConfig(data.config as PriceCalculatorConfig);
        }
      } catch {
        /* fallback config stays */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-[var(--global-max-width)] px-4 py-8 sm:px-6">
      <PriceCalculator onBack={() => router.push('/')} config={config} />
    </div>
  );
}
