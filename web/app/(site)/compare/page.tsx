'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tour, TourSlot } from '@/types';
import { CompareView } from '@/components/customer/CompareView';
import { clientFetch } from '@/lib/api';
import { getCompareList, toggleCompareList } from '@/utils/compare';

const CURRENCY_SYMBOL: Record<string, string> = { AZN: '₼', USD: '$', EUR: '€' };

export default function CompareRoute() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [slots, setSlots] = useState<TourSlot[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);

  useEffect(() => {
    setCompareList(getCompareList());
    clientFetch<{ tours: Tour[] }>('/api/tours').then((d) => setTours(d.tours || [])).catch(() => {});
    clientFetch<{ slots: TourSlot[] }>('/api/slots').then((d) => setSlots(d.slots || [])).catch(() => {});
  }, []);

  const compareTours = tours.filter((t) => compareList.includes(t.id));

  const getConvertedPriceInfo = (price: number) => {
    const symbol = '₼';
    const finalPrice = Math.round(price);
    return {
      azn: price,
      currencySymbol: symbol,
      currencyCode: 'AZN',
      original: `${finalPrice} ${symbol}`,
      both: `${finalPrice} ${symbol}`,
      detailed: `${finalPrice} ${symbol}`,
    };
  };
  const getAverageRating = (tourId: string) => {
    const t = tours.find((x) => x.id === tourId);
    return t?.rating ? t.rating.toFixed(1) : null;
  };
  const getReviewsCount = (tourId: string) => tours.find((t) => t.id === tourId)?.reviewsCount ?? 0;

  return (
    <CompareView
      compareTours={compareTours}
      slots={slots}
      onBack={() => router.push('/')}
      onSelectTour={(tour) => router.push(`/tours/${tour.slug || tour.id}`)}
      onRemoveFromCompare={(tourId) => setCompareList(toggleCompareList(tourId).list)}
      getConvertedPriceInfo={getConvertedPriceInfo}
      getAverageRating={getAverageRating}
      getReviewsCount={getReviewsCount}
    />
  );
}
