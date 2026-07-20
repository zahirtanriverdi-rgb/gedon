import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { MobileBottomNav } from '@/components/site/MobileBottomNav';
import { GlobalSearchProvider } from '@/components/site/GlobalSearchContext';
import { getTours, getSiteFeatureFlags } from '@/lib/api';

/** Chrome for the public marketing/customer pages (header + SEO footer + mobile bottom nav).
 *  Auth and dashboard route groups deliberately opt out of this layout. Tours are fetched
 *  server-side so the footer's internal links (destinations, popular tours, categories) are
 *  in the initial HTML for crawlers. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [tours, featureFlags] = await Promise.all([getTours(), getSiteFeatureFlags()]);

  return (
    <GlobalSearchProvider>
      <div className="flex min-h-screen flex-col bg-[var(--color-bg-page)]">
        {/* Tours feed the header's inline search suggestions dropdown (desktop, on scroll).
            featureFlags is resolved here so the calculator/camp nav icons render in their
            final state in the initial HTML (no flash-in/out on refresh). */}
        <SiteHeader tours={tours} featureFlags={featureFlags} />
        <main className="flex-1 pb-16 sm:pb-0">{children}</main>
        <SiteFooter tours={tours} />
        <MobileBottomNav featureFlags={featureFlags} />
      </div>
    </GlobalSearchProvider>
  );
}
