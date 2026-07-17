'use client';

/**
 * Ported from the data + handler layer of the old App.tsx (the god-component). Centralizes the
 * marketplace client state (tours/slots/bookings/reviews/users/config/rates) and every CRUD
 * handler the vendor & admin dashboards call. Parameterized by the session token so the same
 * hook scopes data correctly: a vendor token → own rows, an admin token → everything.
 *
 * The public SSR pages do NOT use this — they fetch server-side (src/lib/api.ts). This hook is
 * only for the authenticated, client-only dashboards.
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  Tour,
  TourSlot,
  Booking,
  Review,
  User,
  PlatformConfig,
  PriceCalculatorConfig,
} from '@/types';
import { seedUsers } from '@/data/toursData';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNotification } from '@/lib/notification';

const DEFAULT_PRICE_CALCULATOR_CONFIG: PriceCalculatorConfig = {
  destinations: { İsmayıllı: 175, Nabran: 220, Şəki: 350, Qəbələ: 225, Şamaxı: 122, Quba: 168, Qusar: 185 },
  busRatePerKm: 2.5,
  busCampSurcharge: 100,
  guideDailyBase: 50,
  guideCampBase: 70,
  guidePerParticipant: 1.5,
  foodDailyKendPrice: 15,
  foodDailySendvicPrice: 4,
  campBreakfastPrice: 2,
  campLunchPrice: 10,
  tentRentalPrice: 9,
  sleepingBagRentalPrice: 6,
  matRentalPrice: 2,
};

async function parseApiResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server düzgün cavab qaytarmadı (HTTP ${response.status}).`);
  }
}

export interface UseMarketplaceResult {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  reviews: Review[];
  users: User[];
  platformConfig: PlatformConfig;
  exchangeRates: { USD: number; EUR: number };
  isLoading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  // handlers
  handleAddSlot: (newSlot: TourSlot) => Promise<void>;
  handleDeleteSlot: (slotId: string) => Promise<void>;
  handleAddTour: (newTour: Tour) => Promise<void>;
  handleEditTour: (updatedTour: Tour) => Promise<void>;
  handleDeleteTour: (tourId: string) => Promise<void>;
  handleApproveTour: (tourId: string) => Promise<void>;
  handleRejectTour: (tourId: string, rejectionReason: string) => Promise<void>;
  handleUpdateTourStatus: (tourId: string, isActive: boolean) => Promise<void>;
  handleToggleFeatured: (tourId: string, isManuallyFeatured: boolean) => Promise<void>;
  handleApproveBooking: (bookingId: string) => Promise<void>;
  handleEditBooking: (updatedBooking: Booking) => Promise<void>;
  handleDeleteBooking: (bookingId: string) => Promise<void>;
  handleAddBooking: (newBooking: Booking) => Promise<void>;
  handleUpdateSlotBookedCount: (slotId: string, qty: number) => void;
  handleCreateVendor: (data: { companyName: string; login: string; password: string }) => Promise<void>;
  handleDeleteVendor: (vendorId: string, adminPassword: string) => Promise<void>;
  handleUpdateUser: (userId: string, data: Partial<User>) => Promise<void>;
  handleVendorProfileUpdated: (updatedUser: User) => void;
  handleUpdateExchangeRates: (newRates: { USD: number; EUR: number }) => void;
  handleUpdatePriceCalculatorConfig: (newConfig: PriceCalculatorConfig) => void;
}

export function useMarketplace(authToken: string | null): UseMarketplaceResult {
  const { t } = useLanguage();
  const { showNotification } = useNotification();

  const [tours, setTours] = useState<Tour[]>([]);
  const [slots, setSlots] = useState<TourSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<User[]>(seedUsers);
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>({
    priceCalculatorConfig: DEFAULT_PRICE_CALCULATOR_CONFIG,
  });
  const [exchangeRates, setExchangeRates] = useState<{ USD: number; EUR: number }>({ USD: 1.7, EUR: 1.85 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  }, [authToken]);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const authedGet = (url: string) =>
        authToken ? fetch(url, { headers: { Authorization: `Bearer ${authToken}` } }) : fetch(url);
      const [toursRes, slotsRes, bookingsRes, reviewsRes] = await Promise.all([
        authedGet('/api/tours'),
        fetch('/api/slots'),
        authToken ? authedGet('/api/bookings') : Promise.resolve(null),
        fetch('/api/reviews'),
      ]);
      if (!toursRes.ok || !slotsRes.ok || (bookingsRes && !bookingsRes.ok) || !reviewsRes.ok) {
        throw new Error('Server məlumatları qaytara bilmədi.');
      }
      const [toursData, slotsData, bookingsData, reviewsData] = await Promise.all([
        toursRes.json(),
        slotsRes.json(),
        bookingsRes ? bookingsRes.json() : Promise.resolve({ bookings: [] }),
        reviewsRes.json(),
      ]);
      setTours(toursData.tours || []);
      setSlots(slotsData.slots || []);
      setBookings(bookingsData.bookings || []);
      setReviews(reviewsData.reviews || []);
    } catch (e: any) {
      setError(e.message || 'Bazar məlumatlarını yükləmək mümkün olmadı.');
    } finally {
      setIsLoading(false);
    }
  }, [authToken]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Live CBAR exchange rates (best-effort).
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/exchange-rates/cbar');
        if (res.ok) {
          const data = await res.json();
          if (data?.USD && data?.EUR) setExchangeRates({ USD: data.USD, EUR: data.EUR });
        }
      } catch {
        /* keep fallback rates */
      }
    })();
  }, []);

  // Admin: merge server-side vendor list once authenticated as admin.
  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${authToken}` } });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const serverVendors: User[] = (data.users || []).filter((u: User) => u.role === 'vendor');
        setUsers((prev) => {
          const prevById = new Map<string, User>(prev.map((u) => [u.id, u]));
          const mergedVendors = serverVendors.map((sv) => {
            const local = prevById.get(sv.id);
            return local ? { ...local, ...sv } : sv;
          });
          const nonVendors = prev.filter((u) => u.role !== 'vendor');
          return [...nonVendors, ...mergedVendors];
        });
      } catch {
        /* admin-only enrichment; ignore for non-admin tokens */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  // ─── Handlers (ported from App.tsx) ───────────────────────────────────────────
  const handleAddSlot = async (newSlot: TourSlot) => {
    try {
      const response = await fetch(`/api/tours/${newSlot.tourId}/slots`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newSlot),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Tarix əlavə edilə bilmədi.');
      setSlots((prev) => [...prev, data.slot]);
      showNotification(t('app.notifications.slotAdded'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.slotAddError'), 'error');
      throw e;
    }
  };

  const handleDeleteSlot = async (slotId: string) => {
    try {
      const response = await fetch(`/api/slots/${slotId}`, { method: 'DELETE', headers: authHeaders() });
      if (!response.ok) {
        const data = await parseApiResponse(response);
        throw new Error(data.error || 'Tarix silinə bilmədi.');
      }
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.slotDeleteError'), 'error');
      throw e;
    }
  };

  const handleAddTour = async (newTour: Tour) => {
    try {
      const response = await fetch('/api/tours', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newTour),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Tur yaradıla bilmədi.');
      setTours((prev) => [data.tour, ...prev]);
      showNotification(t('app.notifications.tourCreated'), 'info');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourCreateError'), 'error');
      throw e;
    }
  };

  const handleEditTour = async (updatedTour: Tour) => {
    try {
      const response = await fetch(`/api/tours/${updatedTour.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updatedTour),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Tur yenilənə bilmədi.');
      setTours((prev) => prev.map((tt) => (tt.id === updatedTour.id ? data.tour : tt)));
      showNotification(t('app.notifications.tourUpdated'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourUpdateError'), 'error');
      throw e;
    }
  };

  const handleDeleteTour = async (tourId: string) => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, { method: 'DELETE', headers: authHeaders() });
      if (!response.ok) {
        const data = await parseApiResponse(response);
        throw new Error(data.error || 'Tur silinə bilmədi.');
      }
      setTours((prev) => prev.filter((tt) => tt.id !== tourId));
      setSlots((prev) => prev.filter((s) => s.tourId !== tourId));
      setBookings((prev) => prev.filter((b) => b.tourId !== tourId));
      setReviews((prev) => prev.filter((r) => r.tourId !== tourId));
      showNotification(t('app.notifications.tourDeleted'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourDeleteError'), 'error');
      throw e;
    }
  };

  const handleApproveTour = async (tourId: string) => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'approved' }),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Tur təsdiqlənə bilmədi.');
      setTours((prev) => prev.map((tt) => (tt.id === tourId ? data.tour : tt)));
      showNotification(t('app.notifications.tourApproved'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourApproveError'), 'error');
      throw e;
    }
  };

  const handleRejectTour = async (tourId: string, rejectionReason: string) => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'rejected', rejectionReason }),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Tur rədd edilə bilmədi.');
      setTours((prev) => prev.map((tt) => (tt.id === tourId ? data.tour : tt)));
      showNotification(t('app.notifications.tourRejected'), 'info');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourRejectError'), 'error');
      throw e;
    }
  };

  const handleUpdateTourStatus = async (tourId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isActive }),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Tur statusu dəyişdirilə bilmədi.');
      setTours((prev) => prev.map((tt) => (tt.id === tourId ? data.tour : tt)));
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourStatusError'), 'error');
    }
  };

  const handleToggleFeatured = async (tourId: string, isManuallyFeatured: boolean) => {
    try {
      const response = await fetch(`/api/tours/${tourId}/featured`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ isManuallyFeatured }),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Seçim yenilənə bilmədi.');
      const updatedTour: Tour = data.tour;
      setTours((prev) =>
        prev.map((tt) => {
          if (tt.id === updatedTour.id) return updatedTour;
          if (isManuallyFeatured && tt.vendorId === updatedTour.vendorId && tt.isManuallyFeatured) {
            return { ...tt, isManuallyFeatured: false, manuallyFeaturedAt: undefined };
          }
          return tt;
        }),
      );
      showNotification(
        isManuallyFeatured ? t('app.notifications.featuredSelected') : t('app.notifications.featuredCleared'),
        'success',
      );
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.planUpdateError'), 'error');
    }
  };

  const handleApproveBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ status: 'paid' }),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Rezervasiya təsdiqlənə bilmədi.');
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? data.booking : b)));
      showNotification(t('app.notifications.paymentConfirmed'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.bookingConfirmError'), 'error');
      throw e;
    }
  };

  const refreshSlotsForTour = async (tourId: string) => {
    const slotsResponse = await fetch(`/api/slots?tourId=${tourId}`);
    if (slotsResponse.ok) {
      const slotsData = await slotsResponse.json();
      setSlots((prev) =>
        prev.map((s) => slotsData.slots.find((rs: TourSlot) => rs.id === s.id) || s),
      );
    }
  };

  const handleEditBooking = async (updatedBooking: Booking) => {
    try {
      const response = await fetch(`/api/bookings/${updatedBooking.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(updatedBooking),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Rezervasiya yenilənə bilmədi.');
      setBookings((prev) => prev.map((b) => (b.id === updatedBooking.id ? data.booking : b)));
      await refreshSlotsForTour(updatedBooking.tourId);
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.bookingUpdateError'), 'error');
      throw e;
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE', headers: authHeaders() });
      if (!response.ok) {
        const data = await parseApiResponse(response);
        throw new Error(data.error || 'Rezervasiya silinə bilmədi.');
      }
      const deleted = bookings.find((b) => b.id === bookingId);
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
      if (deleted) await refreshSlotsForTour(deleted.tourId);
      showNotification(t('app.notifications.bookingDeleted'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.bookingDeleteError'), 'error');
      throw e;
    }
  };

  const handleAddBooking = async (newBooking: Booking) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newBooking),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Rezervasiya yaradıla bilmədi.');
      setBookings((prev) => [data.booking, ...prev]);
      setSlots((prev) =>
        prev.map((s) =>
          s.id === data.booking.slotId
            ? { ...s, bookedCount: s.bookedCount + data.booking.participantsCount }
            : s,
        ),
      );
      showNotification(t('app.notifications.bookingConfirmed', { id: data.booking.id }), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.bookingError'), 'error');
      throw e;
    }
  };

  const handleUpdateSlotBookedCount = (slotId: string, qty: number) => {
    setSlots((prev) => prev.map((s) => (s.id === slotId ? { ...s, bookedCount: s.bookedCount + qty } : s)));
  };

  const handleCreateVendor = async (data: { companyName: string; login: string; password: string }) => {
    try {
      const response = await fetch('/api/admin/vendors', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      const parsed = await parseApiResponse(response);
      if (!response.ok) throw new Error(parsed.error || 'Vendor hesabı yaradıla bilmədi.');
      setUsers((prev) => [...prev, parsed.user]);
      showNotification(t('app.notifications.vendorCreated', { name: data.companyName }), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.vendorCreateError'), 'error');
      throw e;
    }
  };

  const handleDeleteVendor = async (vendorId: string, adminPassword: string) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}`, {
        method: 'DELETE',
        headers: authHeaders(),
        body: JSON.stringify({ adminPassword }),
      });
      const parsed = await parseApiResponse(response);
      if (!response.ok) throw new Error(parsed.error || 'Operator arxivləşdirilə bilmədi.');
      setUsers((prev) => prev.map((u) => (u.id === vendorId ? { ...u, isArchived: true } : u)));
      showNotification(t('app.notifications.vendorArchived'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.vendorArchiveError'), 'error');
      throw e;
    }
  };

  const handleUpdateUser = async (userId: string, data: Partial<User>) => {
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify(data),
      });
      const parsed = await parseApiResponse(response);
      if (!response.ok) throw new Error(parsed.error || 'İstifadəçi yenilənə bilmədi.');
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...parsed.user } : u)));
      showNotification(t('app.notifications.operatorUpdated'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.operatorUpdateError'), 'error');
    }
  };

  const handleVendorProfileUpdated = (updatedUser: User) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? { ...u, ...updatedUser } : u)));
  };

  const handleUpdateExchangeRates = (newRates: { USD: number; EUR: number }) => {
    setExchangeRates(newRates);
  };

  const handleUpdatePriceCalculatorConfig = (newConfig: PriceCalculatorConfig) => {
    setPlatformConfig((prev) => ({ ...prev, priceCalculatorConfig: newConfig }));
    showNotification(t('app.notifications.calculatorUpdated'), 'success');
  };

  return {
    tours,
    slots,
    bookings,
    reviews,
    users,
    platformConfig,
    exchangeRates,
    isLoading,
    error,
    reload,
    handleAddSlot,
    handleDeleteSlot,
    handleAddTour,
    handleEditTour,
    handleDeleteTour,
    handleApproveTour,
    handleRejectTour,
    handleUpdateTourStatus,
    handleToggleFeatured,
    handleApproveBooking,
    handleEditBooking,
    handleDeleteBooking,
    handleAddBooking,
    handleUpdateSlotBookedCount,
    handleCreateVendor,
    handleDeleteVendor,
    handleUpdateUser,
    handleVendorProfileUpdated,
    handleUpdateExchangeRates,
    handleUpdatePriceCalculatorConfig,
  };
}

// Re-export for pages that need the default config directly.
export { DEFAULT_PRICE_CALCULATOR_CONFIG };
