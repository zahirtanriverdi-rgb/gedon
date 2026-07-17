'use client';

import React, { useState } from 'react';
import type { Tour, TourSlot, Booking, Review, User } from '@/types';
import { TourDetailPage } from '@/components/customer/TourDetailPage';
import { ImageLightbox } from '@/components/customer/ImageLightbox';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNotification } from '@/lib/notification';
import { getWishlist, toggleWishlist } from '@/utils/wishlist';
import { useRouter } from 'next/navigation';

interface TourDetailClientProps {
  tour: Tour;
  tours: Tour[];
  slots: TourSlot[];
  reviews: Review[];
  users: User[];
}

// Client wrapper for the (server-fetched) tour. It reconstitutes the interactive glue the old
// CustomerPortal used to prop-drill into TourDetailPage: price conversion, wishlist, packing
// AI, booking POST, lightbox, and navigation. The tour data itself arrives as a prop from the
// server component, so the initial HTML is fully rendered (SEO) — no client fetch to see content.
export function TourDetailClient({ tour, tours, slots, reviews, users }: TourDetailClientProps) {
  const { t } = useLanguage();
  const { showNotification } = useNotification();
  const router = useRouter();

  // Guest customer — the public booking flow verifies identity via WhatsApp OTP, not a login.
  const guestUser = { id: 'guest', name: '', phone: '', balance: 0, email: '' };

  // Default CBAR-ish rates; the old app fetched /api/exchange-rates/cbar but AZN display (the
  // default) needs no conversion, so static fallbacks are fine here.
  const exchangeRates = { USD: 1.7, EUR: 1.85 };
  const displayCurrency = 'AZN' as 'AZN' | 'USD' | 'EUR';

  const getConvertedPriceInfo = (price: number, currency?: 'AZN' | 'USD' | 'EUR') => {
    const usdRate = exchangeRates.USD;
    const eurRate = exchangeRates.EUR;
    let aznPrice = price;
    if (currency === 'USD') aznPrice = price * usdRate;
    if (currency === 'EUR') aznPrice = price * eurRate;

    let displayPrice = aznPrice;
    let symbol = '₼';
    let code = 'AZN';
    if (displayCurrency === 'USD') {
      displayPrice = aznPrice / usdRate;
      symbol = '$';
      code = 'USD';
    } else if (displayCurrency === 'EUR') {
      displayPrice = aznPrice / eurRate;
      symbol = '€';
      code = 'EUR';
    }
    const finalPrice = Math.round(displayPrice);
    return {
      azn: aznPrice,
      currencySymbol: symbol,
      currencyCode: code,
      original: `${finalPrice} ${symbol}`,
      both: `${finalPrice} ${symbol}`,
      detailed: `${finalPrice} ${symbol}`,
    };
  };

  const getReviewsCount = (tourId: string) => {
    const tourReviews = reviews.filter((r) => r.tourId === tourId);
    if (tourReviews.length > 0) return tourReviews.length;
    const t2 = tours.find((tt) => tt.id === tourId);
    return t2?.reviewsCount ?? 0;
  };

  const [wishlist, setWishlist] = useState<string[]>(() => getWishlist());
  const handleToggleWishlist = (tourId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist(toggleWishlist(tourId));
  };

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Packing AI (Gemini) — same behavior as CustomerPortal, keyed per tour.
  const [packingExperienceMap, setPackingExperienceMap] = useState<Record<string, 'beginner' | 'pro' | null>>({});
  const [packingAnalyzingMap, setPackingAnalyzingMap] = useState<Record<string, boolean>>({});
  const [checkedPackingItems, setCheckedPackingItems] = useState<Record<string, boolean>>({});
  const [packingAiResultMap, setPackingAiResultMap] = useState<Record<string, { basics: string[]; pro_gear: string[] } | null>>({});

  const handlePackingExperienceSelect = async (tourId: string, choice: 'beginner' | 'pro') => {
    setPackingExperienceMap((prev) => ({ ...prev, [tourId]: choice }));
    if (packingAiResultMap[tourId] !== undefined) return;
    setPackingAnalyzingMap((prev) => ({ ...prev, [tourId]: true }));
    try {
      const t2 = tours.find((tt) => tt.id === tourId);
      const res = await fetch('/api/gemini/packing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourDetails: {
            name: t2?.name,
            region: t2?.region,
            difficulty: t2?.difficulty,
            category: t2?.category,
            durationDays: t2?.durationDays,
          },
        }),
      });
      const data = await res.json().catch(() => null);
      setPackingAiResultMap((prev) => ({ ...prev, [tourId]: res.ok && data?.packing_advice ? data.packing_advice : null }));
    } catch {
      setPackingAiResultMap((prev) => ({ ...prev, [tourId]: null }));
    } finally {
      setPackingAnalyzingMap((prev) => ({ ...prev, [tourId]: false }));
    }
  };

  const togglePackingItemChecked = (key: string) => {
    setCheckedPackingItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddBooking = async (newBooking: Booking) => {
    const res = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBooking),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || 'Rezervasiya yaradıla bilmədi.';
      showNotification(msg, 'error');
      throw new Error(msg);
    }
    showNotification(t('app.notifications.bookingConfirmed', { id: data.booking?.id }), 'success');
  };

  return (
    <>
      <TourDetailPage
        key={tour.id}
        selectedTour={tour}
        tours={tours}
        slots={slots}
        reviews={reviews}
        users={users}
        wishlist={wishlist}
        currentUser={guestUser}
        onAddBooking={handleAddBooking}
        onShowNotification={showNotification}
        getConvertedPriceInfo={getConvertedPriceInfo}
        getReviewsCount={getReviewsCount}
        handleToggleWishlist={handleToggleWishlist}
        setLightboxIndex={setLightboxIndex}
        packingExperienceMap={packingExperienceMap}
        packingAnalyzingMap={packingAnalyzingMap}
        packingAiResultMap={packingAiResultMap}
        checkedPackingItems={checkedPackingItems}
        handlePackingExperienceSelect={handlePackingExperienceSelect}
        togglePackingItemChecked={togglePackingItemChecked}
        setSelectedOrganizer={(organizer) => {
          if (organizer) router.push(`/organizer/${organizer.id}`);
        }}
        setSelectedTour={(nextTour) => {
          if (nextTour) router.push(`/tours/${nextTour.slug || nextTour.id}`);
          else router.push('/');
        }}
      />
      <ImageLightbox tour={tour} lightboxIndex={lightboxIndex} onSetLightboxIndex={setLightboxIndex} />
    </>
  );
}
