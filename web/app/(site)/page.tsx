import { getTours } from '@/lib/api';
import { TourGrid } from '@/components/site/TourGrid';

// Home is SSR'd on every request so the tour list (and its crawlable links) is in the initial
// HTML. Interactive filtering/search is a client enhancement layered on top later.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const tours = await getTours();
  const approved = tours.filter((t) => t.status === 'approved' && t.isActive !== false);

  return (
    <div className="mx-auto max-w-[var(--global-max-width)] px-4 py-8 sm:px-6">
      <section className="mb-8">
        <h1 className="text-3xl font-black text-[var(--color-text-main)] sm:text-4xl">
          Xəyalınızdakı Turları Kəşf Edin
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Azərbaycan boyu turlar, kamp yerləri və təbiət səyahətləri.
        </p>
      </section>
      <TourGrid tours={approved} />
    </div>
  );
}
