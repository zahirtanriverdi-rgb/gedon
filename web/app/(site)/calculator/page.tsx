'use client';

import { useRouter } from 'next/navigation';
import { PriceCalculator } from '@/components/PriceCalculator';

// Group-price calculator. Uses the component's built-in FALLBACK_CONFIG; wiring the
// admin-tuned platform config (GET platform config) is a follow-up enhancement.
export default function CalculatorRoute() {
  const router = useRouter();
  return (
    <div className="mx-auto max-w-[var(--global-max-width)] px-4 py-8 sm:px-6">
      <PriceCalculator onBack={() => router.push('/')} />
    </div>
  );
}
