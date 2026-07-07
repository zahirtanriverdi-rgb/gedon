import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TourStatsRow } from './TourStatsRow';
import { LanguageProvider } from '../../i18n/LanguageContext';
import { Tour } from '../../types';

const baseTour: Tour = {
  id: 't1',
  name: 'Test Tour',
  category: 'hiking',
  difficulty: 'medium',
  description: 'A test tour',
  region: 'Quba',
  durationDays: 1,
  includes: ['Nahar'],
  vendorId: 'v1',
  vendorName: 'Vendor',
  image: 'image.jpg',
  isApproved: true,
  status: 'approved',
};

const commonProps = {
  durationLabel: '5 saat',
  difficultyLabel: 'Orta',
  difficultyBarColorClass: 'bg-sky-500',
  difficultyPercent: 60,
  ratingValue: 4.5,
  reviewsCount: 3,
  isTopSeller: false,
  topSellerMonth: 'may',
};

describe('TourStatsRow', () => {
  it('renders GPX route stats when the tour has route data (hasRoute: true)', () => {
    render(
      <LanguageProvider>
        <TourStatsRow
          tour={baseTour}
          parsedGpx={{
            fileName: 'route.gpx',
            points: [[41.0, 48.0, 100], [41.1, 48.1, 200]],
            stats: { distanceKm: 8.98, highestPointM: 200, lowestPointM: 100, elevationGainM: 822, elevationLossM: 0 },
          }}
          {...commonProps}
        />
      </LanguageProvider>
    );
    expect(screen.getByText('8.98 km')).toBeInTheDocument();
    expect(screen.getByText('822 m')).toBeInTheDocument();
  });

  it('renders camping-appropriate metadata when the tour has no route data (hasRoute: false)', () => {
    render(
      <LanguageProvider>
        <TourStatsRow
          tour={{ ...baseTour, category: 'camp', durationNights: 2 }}
          parsedGpx={null}
          {...commonProps}
        />
      </LanguageProvider>
    );
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText('Nahar')).toBeInTheDocument();
  });
});
