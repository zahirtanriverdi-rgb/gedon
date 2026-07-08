import type React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Tour, TourSlot, Booking, Review, User } from '../../types';
import { TourDetailPage } from './TourDetailPage';
import { ImageLightbox } from './ImageLightbox';
import NotFoundPage from '../NotFoundPage';

const SITE_URL = 'https://gedekgorek.com';

type ConvertedPriceInfo = {
  azn: number;
  currencySymbol: string;
  currencyCode: string;
  original: string;
  both: string;
  detailed: string;
};

interface TourDetailRouteProps {
  tours: Tour[];
  slots: TourSlot[];
  reviews: Review[];
  users: User[];
  wishlist: string[];
  currentUser: { id: string; name: string; phone: string; balance: number; email: string };
  onAddBooking: (newBooking: Booking) => Promise<void>;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  getConvertedPriceInfo: (price: number, currency?: 'AZN' | 'USD' | 'EUR') => ConvertedPriceInfo;
  getReviewsCount: (tourId: string) => number;
  handleToggleWishlist: (tourId: string, e?: React.MouseEvent) => void;
  lightboxIndex: number | null;
  setLightboxIndex: (updater: number | null | ((prev: number | null) => number | null)) => void;
  packingExperienceMap: Record<string, 'beginner' | 'pro' | null>;
  packingAnalyzingMap: Record<string, boolean>;
  packingAiResultMap: Record<string, { basics: string[]; pro_gear: string[] } | null>;
  checkedPackingItems: Record<string, boolean>;
  handlePackingExperienceSelect: (tourId: string, choice: 'beginner' | 'pro') => void;
  togglePackingItemChecked: (key: string) => void;
}

function truncate(text: string | undefined, length: number): string {
  if (!text) return '';
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

export function TourDetailRoute({ tours, lightboxIndex, setLightboxIndex, ...rest }: TourDetailRouteProps) {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const tour = tours.find(t => (t.slug === slug || t.id === slug) && t.status === 'approved');
  if (!tour) return <NotFoundPage />;

  const description = truncate(tour.description, 160);
  const canonicalUrl = `${SITE_URL}/tours/${tour.slug || tour.id}`;

  const jsonLd: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'TouristTrip',
    name: tour.name,
    description: tour.description,
    image: tour.image,
    offers: {
      '@type': 'Offer',
      price: tour.discountPrice ?? tour.price,
      priceCurrency: tour.priceCurrency || 'AZN',
      availability: 'https://schema.org/InStock',
    },
  };
  if (tour.reviewsCount > 0) {
    jsonLd.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: tour.rating,
      reviewCount: tour.reviewsCount,
    };
  }

  return (
    <>
      <Helmet>
        <title>{`${tour.name} | GədəkGörək`}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={tour.name} />
        <meta property="og:description" content={description} />
        <meta property="og:image" content={tour.image} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="product" />
        <link rel="canonical" href={canonicalUrl} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>
      <TourDetailPage
        key={tour.id}
        selectedTour={tour}
        tours={tours}
        {...rest}
        setLightboxIndex={setLightboxIndex}
        setSelectedOrganizer={(organizer) => {
          if (organizer) navigate(`/organizer/${organizer.id}`);
        }}
        setSelectedTour={(nextTour) => {
          if (nextTour) navigate(`/tours/${nextTour.slug || nextTour.id}`);
          else navigate('/');
        }}
      />
      <ImageLightbox tour={tour} lightboxIndex={lightboxIndex} onSetLightboxIndex={setLightboxIndex} />
    </>
  );
}
