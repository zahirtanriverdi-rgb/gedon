'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Tour } from '@/types';
import { WishlistView } from '@/components/customer/WishlistView';
import { clientFetch } from '@/lib/api';
import { getWishlist, toggleWishlist } from '@/utils/wishlist';
import { getCompareList, toggleCompareList } from '@/utils/compare';

export default function WishlistRoute() {
  const router = useRouter();
  const [tours, setTours] = useState<Tour[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [compareList, setCompareList] = useState<string[]>([]);

  useEffect(() => {
    setWishlist(getWishlist());
    setCompareList(getCompareList());
    clientFetch<{ tours: Tour[] }>('/api/tours')
      .then((d) => setTours(d.tours || []))
      .catch(() => setTours([]));
  }, []);

  const wishlistTours = tours.filter((t) => wishlist.includes(t.id));

  return (
    <WishlistView
      wishlistTours={wishlistTours}
      compareList={compareList}
      onBack={() => router.push('/')}
      onSelectTour={(tour) => router.push(`/tours/${tour.slug || tour.id}`)}
      onToggleWishlist={(tourId, e) => {
        if (e) e.stopPropagation();
        setWishlist(toggleWishlist(tourId));
      }}
      onToggleCompare={(tourId, e) => {
        if (e) e.stopPropagation();
        setCompareList(toggleCompareList(tourId).list);
      }}
    />
  );
}
