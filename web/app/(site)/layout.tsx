import { SiteHeader } from '@/components/site/SiteHeader';
import { SiteFooter } from '@/components/site/SiteFooter';
import { MobileBottomNav } from '@/components/site/MobileBottomNav';
import { getTours } from '@/lib/api';

/** Chrome for the public marketing/customer pages (header + SEO footer + mobile bottom nav).
 *  Auth and dashboard route groups deliberately opt out of this layout. Tours are fetched
 *  server-side so the footer's internal links (destinations, popular tours, categories) are
 *  in the initial HTML for crawlers. */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const tours = await getTours();

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-bg-page)]">
      <SiteHeader />
      <main className="flex-1 pb-16 sm:pb-0">{children}</main>
      <SiteFooter tours={tours} />
      <MobileBottomNav />
    </div>
  );
}
