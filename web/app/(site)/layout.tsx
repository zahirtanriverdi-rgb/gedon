import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { MobileBottomNav } from '@/components/site/MobileBottomNav';
import { GlobalSearchProvider } from '@/components/site/GlobalSearchContext';
import { getTours, getSiteFeatureFlags } from '@/lib/api';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [tours, featureFlags] = await Promise.all([getTours(), getSiteFeatureFlags()]);

  return (
    <GlobalSearchProvider>
      <div className="flex min-h-screen flex-col bg-[var(--color-bg-page)]">
        <SiteHeader tours={tours} featureFlags={featureFlags} />

        {/* pb-28 (112px) on mobile: floating nav capsule (64px) + bottom gap (16px) +
            32px breathing room so the last card / sticky booking bar never hides behind
            the glass capsule. Desktop (sm+) has no bottom nav, so padding resets to 0. */}
        <main className="flex-1 pb-28 sm:pb-0">{children}</main>

        <SiteFooter tours={tours} />
        <MobileBottomNav featureFlags={featureFlags} />
      </div>
    </GlobalSearchProvider>
  );
}