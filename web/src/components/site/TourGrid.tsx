import type { Tour } from '@/types';
import type { Language } from '@/i18n/LanguageContext';
import { TourCard } from './TourCard';

/** Server-renderable responsive grid of tour cards. Modular wrapper for the designer. */
export function TourGrid({ tours, language = 'az' }: { tours: Tour[]; language?: Language }) {
  if (!tours.length) {
    return (
      <p className="py-16 text-center text-[var(--color-text-muted)]">
        Hazırda uyğun tur yoxdur.
      </p>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {tours.map((tour) => (
        <TourCard key={tour.id} tour={tour} language={language} />
      ))}
    </div>
  );
}
