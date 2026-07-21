'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Tour, TourSlot, Booking, Review, User } from '@/types';
import { ToursHomeView } from '@/components/customer/ToursHomeView';
import { TourDetailPage } from '@/components/customer/TourDetailPage';
import { ImageLightbox } from '@/components/customer/ImageLightbox';
import { CompareSwapModal } from '@/components/tours/CompareSwapModal';
import { getRecentSearches, addRecentSearch } from '@/utils/recentSearches';
import { getWishlist, toggleWishlist } from '@/utils/wishlist';
import { getCompareList, toggleCompareList, replaceInCompareList } from '@/utils/compare';
import { useLanguage } from '@/i18n/LanguageContext';
import { useNotification } from '@/lib/notification';
import { useCurrency, makeConvertedPriceInfo } from '@/lib/currency';
import { computeFeaturedTourIds } from '@/utils/featuredTours';
import { normalizeAzText } from '@/utils/searchNormalize';
import { useGlobalSearch } from '@/components/site/GlobalSearchContext';

// Automatic rating boost applied to tours currently flagged as this month's bestseller
// (computeFeaturedTourIds), on top of whichever base rating (vendor-set or review average) applies.
const BESTSELLER_RATING_BOOST = 0.3;

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

// Local nav/home strings — same inline dictionary the old CustomerPortal carried (these never
// lived in the global i18n files).
const TRANSLATIONS = {
  az: {
    searchPlaceholder: "Məkanları və ya fəaliyyətləri kəşf et...",
    searchButton: "Axtar",
    discoverTours: "Xəyalınızdakı Turları Kəşf Edin",
    upcomingTours: "Yaxınlaşan Turlar",
    recommendedTours: "Sizə tövsiyə olunan turlar",
    soon: "Tezliklə",
    slide: "Sürüşdür",
    allRegions: "Bütün Bölgələr",
    allDifficulties: "Bütün Çətinliklər",
    allCategories: "Bütün Kateqoriyalar",
    all: "Bütün",
    allLevels: "Bütün dərəcələr",
    everywhere: "Hər yer (Bütün)",
    noToursFound: "Axtarışa uyğun tur tapılmadı",
    noToursDesc: "Zəhmət olmasa filtrləri dəyişdirin və ya fərqli açar sözlərlə yenidən cəhd edin.",
    navDiscover: "Kəşf et",
    navWishlist: "İstəklər",
    navCompare: "Müqayisə",
    navCampSites: "Kamp yerləri",
    navMenu: "Menyu",
    navGuide: "Bələdçi",
    navCalculator: "Qrup hesabla"
  },
  en: {
    searchPlaceholder: "Explore destinations and experiences...",
    searchButton: "Search",
    discoverTours: "Discover Your Dream Tours",
    upcomingTours: "Upcoming Tours",
    recommendedTours: "Recommended tours for you",
    soon: "Soon",
    slide: "Slide",
    allRegions: "All Regions",
    allDifficulties: "All Difficulties",
    allCategories: "All Categories",
    all: "All",
    allLevels: "All levels",
    everywhere: "Everywhere",
    noToursFound: "No tours found",
    noToursDesc: "Please change your filters or try with different keywords.",
    navDiscover: "Discover",
    navWishlist: "Wishlist",
    navCompare: "Compare",
    navCampSites: "Camp sites",
    navMenu: "Menu",
    navGuide: "Guide",
    navCalculator: "Group calculator"
  },
  ru: {
    searchPlaceholder: "Откройте для себя места и впечатления...",
    searchButton: "Поиск",
    discoverTours: "Откройте для себя туры вашей мечты",
    upcomingTours: "Ближайшие туры",
    recommendedTours: "Рекомендуемые туры для вас",
    soon: "Скоро",
    slide: "Проведите",
    allRegions: "Все регионы",
    allDifficulties: "Все сложности",
    allCategories: "Все категории",
    all: "Все",
    allLevels: "Все уровни",
    everywhere: "Везде",
    noToursFound: "Туры не найдены",
    noToursDesc: "Пожалуйста, измените фильтры или попробуйте другие ключевые слова.",
    navDiscover: "Обзор",
    navWishlist: "Избранное",
    navCompare: "Сравнить",
    navCampSites: "Кемпинги",
    navMenu: "Меню",
    navGuide: "Гид",
    navCalculator: "Групповой калькулятор"
  }
} as const;

interface HomeClientProps {
  tours: Tour[];
  slots: TourSlot[];
  reviews: Review[];
  users: User[];
  bookings: Booking[];
}

/**
 * Client state layer for the home page — the full port of the old CustomerPortal's home-view
 * logic (search, filters, calendar, sorting, upcoming carousel, wishlist/compare, quick-book
 * modal). Data arrives SSR'd from the server page, so the initial HTML already contains the
 * crawlable tour list; everything here is interactive enhancement on top.
 *
 * SEO daxili linkləmə (SiteFooter): /?region=Quba, /?category=hiking və /?q=şəlalə query
 * param-ları müvafiq filtri tətbiq edir — footer-dəki destinasiya/kateqoriya linkləri həqiqi,
 * paylaşıla bilən URL-lərdir.
 */
export function HomeClient({ tours, slots, reviews, users, bookings }: HomeClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t: tGlobal, language } = useLanguage();
  const { showNotification } = useNotification();
  const { displayCurrency, exchangeRates } = useCurrency();

  const appLanguage = (language as 'az' | 'en' | 'ru') || 'az';
  const t = (key: keyof typeof TRANSLATIONS.az) =>
    TRANSLATIONS[appLanguage]?.[key] || TRANSLATIONS.az[key];

  const getConvertedPriceInfo = makeConvertedPriceInfo(displayCurrency, exchangeRates);

  // Guest customer — the public booking flow verifies identity via WhatsApp OTP, not a login.
  const guestUser = { id: 'guest', name: '', phone: '', balance: 0, email: '' };

  // Wishlist ("İstəklərim") — localStorage-backed, no login required.
  const [wishlist, setWishlist] = useState<string[]>([]);
  React.useEffect(() => setWishlist(getWishlist()), []);
  const handleToggleWishlist = (tourId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist(toggleWishlist(tourId));
  };

  // Tour comparison ("Müqayisə") — localStorage-backed, max 3 tours at once (utils/compare.ts).
  const [compareList, setCompareList] = useState<string[]>([]);
  React.useEffect(() => setCompareList(getCompareList()), []);
  const [pendingCompareTourId, setPendingCompareTourId] = useState<string | null>(null);
  const handleToggleCompare = (tourId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const result = toggleCompareList(tourId);
    if (result.status === 'full') {
      setPendingCompareTourId(tourId);
      return;
    }
    setCompareList(result.list);
  };
  const handleCompareSwapSelect = (tourIdToRemove: string) => {
    if (!pendingCompareTourId) return;
    setCompareList(replaceInCompareList(tourIdToRemove, pendingCompareTourId));
    setPendingCompareTourId(null);
  };

  // Search query lives in the (site) layout's GlobalSearchProvider, not local state — the
  // header's inline search bar (shown on desktop once scrolled) binds to the same value, so
  // both boxes always stay in sync, exactly like the old SPA's App.tsx globalSearchQuery.
  const { query: localSearchQuery, setQuery: setLocalSearchQuery } = useGlobalSearch();
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null!);

  // Real search history, persisted to localStorage (shared with recentSearches util).
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  React.useEffect(() => setRecentSearches(getRecentSearches()), []);
  const recordSearch = (term: string) => setRecentSearches(addRecentSearch(term));

  React.useEffect(() => {
    function handleClickOutsideSearch(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideSearch);
    return () => document.removeEventListener('mousedown', handleClickOutsideSearch);
  }, []);

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(3000);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('default');
  const [calendarDateStart, setCalendarDateStart] = useState<string>('');
  const [calendarDateEnd, setCalendarDateEnd] = useState<string>('');
  // 'dates' = istənilən sayda ayrı tarix (multi-select), 'range' = başlanğıc→son aralığı.
  const [calendarMode, setCalendarMode] = useState<'dates' | 'range'>('dates');
  const [calendarSelectedDates, setCalendarSelectedDates] = useState<string[]>([]);
  const [showCalendarWidget, setShowCalendarWidget] = useState<boolean>(false);
  const [currentMonthView, setCurrentMonthView] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const calendarContainerRef = React.useRef<HTMLDivElement>(null!);

  // Dynamic maximum price range limit depending on the selected category.
  const maxPriceLimit = selectedCategory === 'international' || selectedCategory === 'all' ? 3000 : 250;
  React.useEffect(() => {
    if (selectedCategory === 'international' || selectedCategory === 'all') {
      setMaxPrice(3000);
    } else {
      setMaxPrice(250);
    }
  }, [selectedCategory]);

  // URL-driven filters (SiteFooter internal links): /?region=, /?category=, /?q=. Re-fires on
  // every query-string change so footer links applied from within the home page work too.
  React.useEffect(() => {
    const regionParam = searchParams.get('region')?.trim() || 'all';
    const rawCategory = searchParams.get('category')?.trim() || 'all';
    // Naməlum kateqoriya dəyəri (köhnə link, əl ilə yazılmış URL) "boş nəticə" ekranına
    // yox, adi "hamısı" görünüşünə düşsün.
    const categoryParam = ['peak', 'camp', 'hiking', 'active', 'international'].includes(rawCategory)
      ? rawCategory
      : 'all';
    const qParam = searchParams.get('q')?.trim() || '';
    setLocalSearchQuery(qParam);
    setIsSearchFocused(false);
    setSelectedCategory(categoryParam);
    setSelectedDifficulty('all');
    setSelectedRegion(regionParam);
    setSelectedMonth('');
    setSortBy('default');
    setCalendarDateStart('');
    setCalendarDateEnd('');
    setCalendarSelectedDates([]);
    setShowCalendarWidget(false);
    setIsFiltersExpanded(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showCalendarWidget &&
        calendarContainerRef.current &&
        !calendarContainerRef.current.contains(event.target as Node)
      ) {
        const toggleBtn = document.getElementById('calendar-toggle-btn');
        if (toggleBtn && toggleBtn.contains(event.target as Node)) return;
        setShowCalendarWidget(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendarWidget]);

  // Lightbox for the quick-book modal's gallery.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Tour opened via the home page's quick "WhatsApp ilə Rezerv et" card button — shown as a
  // popup over the current page and jumps straight to the booking/OTP step.
  const [quickBookTour, setQuickBookTour] = useState<Tour | null>(null);

  // AI Smart packing states (Gemini), keyed per tour.
  const [packingExperienceMap, setPackingExperienceMap] = useState<Record<string, 'beginner' | 'pro' | null>>({});
  const [packingAnalyzingMap, setPackingAnalyzingMap] = useState<Record<string, boolean>>({});
  const [checkedPackingItems, setCheckedPackingItems] = useState<Record<string, boolean>>({});
  const [packingAiResultMap, setPackingAiResultMap] = useState<Record<string, { basics: string[]; pro_gear: string[] } | null>>({});

  const handleQuickWhatsApp = (tour: Tour, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickBookTour(tour);
  };

  const handlePackingExperienceSelect = async (tourId: string, choice: 'beginner' | 'pro') => {
    setPackingExperienceMap((prev) => ({ ...prev, [tourId]: choice }));
    if (packingAiResultMap[tourId] !== undefined) return;
    setPackingAnalyzingMap((prev) => ({ ...prev, [tourId]: true }));
    try {
      const tour = tours.find((tt) => tt.id === tourId);
      const res = await fetch('/api/gemini/packing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tourDetails: {
            name: tour?.name,
            region: tour?.region,
            difficulty: tour?.difficulty,
            category: tour?.category,
            durationDays: tour?.durationDays,
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
    showNotification(tGlobal('app.notifications.bookingConfirmed', { id: data.booking?.id }), 'success');
  };

  const handleAddReview = async (newReview: Review) => {
    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newReview),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error || 'Rəy əlavə edilə bilmədi.';
      showNotification(msg, 'error');
      throw new Error(msg);
    }
    showNotification(tGlobal('app.notifications.reviewAdded'), 'success');
  };

  // Extract unique regions for the filter dropdown.
  const uniqueRegions = Array.from(new Set(tours.map((tt) => tt.region.split(' ')[0].replace('(', ''))));

  // Month names localized to the active language (falls back to AZ inside tGlobal()).
  const monthNames: Record<string, string> = React.useMemo(() => {
    const entries = MONTH_KEYS.map(
      (key, index) =>
        [String(index + 1).padStart(2, '0'), tGlobal(`miscWidgets.tourWeatherForecast.months.${key}`)] as const,
    );
    return Object.fromEntries(entries);
  }, [tGlobal]);

  // Filter logic — normalizeAzText lives in utils/searchNormalize so the suggestions dropdown
  // folds diacritics exactly the same way as this main grid filter.
  const filteredTours = tours.filter((tour) => {
    // Approval status — belt-and-suspenders alongside the server-side filter. A pending or
    // rejected tour must never render on the customer marketplace, full stop.
    if (tour.status !== 'approved') return false;

    const searchNormalized = normalizeAzText(localSearchQuery);
    const localizedName = tour.translations?.[language]?.name || '';
    const localizedDescription = tour.translations?.[language]?.description || '';
    const matchesSearch =
      normalizeAzText(tour.name).includes(searchNormalized) ||
      normalizeAzText(tour.region).includes(searchNormalized) ||
      normalizeAzText(tour.description || '').includes(searchNormalized) ||
      normalizeAzText(localizedName).includes(searchNormalized) ||
      normalizeAzText(localizedDescription).includes(searchNormalized);

    let matchesCategory = selectedCategory === 'all' || tour.category === selectedCategory;
    if (selectedCategory === 'active') {
      matchesCategory = tour.category === 'active' || tour.isActiveLife === true;
    }

    const matchesDifficulty = selectedDifficulty === 'all' || tour.difficulty === selectedDifficulty;
    const matchesRegion = selectedRegion === 'all' || tour.region.toLowerCase().includes(selectedRegion.toLowerCase());

    // Price filter based on available slots (using original converted prices).
    const tourSlots = slots.filter((s) => s.tourId === tour.id);
    let minSlotPriceAzn = 0;
    if (tourSlots.length > 0) {
      const minOriginalPrice = Math.min(...tourSlots.map((s) => s.price));
      minSlotPriceAzn = getConvertedPriceInfo(minOriginalPrice, tour.priceCurrency).azn;
    }
    const matchesPrice = minSlotPriceAzn <= maxPrice;

    const matchesActive = tour.isActive !== false;
    const matchesMonth = !selectedMonth || tourSlots.some((s) => s.startDate.startsWith(selectedMonth));

    let matchesCalendar = true;
    if (calendarMode === 'dates' && calendarSelectedDates.length > 0) {
      matchesCalendar = tourSlots.some((s) => calendarSelectedDates.includes(s.startDate));
    } else if (calendarDateStart && calendarDateEnd) {
      matchesCalendar = tourSlots.some((s) => s.startDate >= calendarDateStart && s.startDate <= calendarDateEnd);
    } else if (calendarDateStart) {
      matchesCalendar = tourSlots.some((s) => s.startDate === calendarDateStart);
    }

    return matchesSearch && matchesCategory && matchesDifficulty && matchesRegion && matchesPrice && matchesActive && matchesMonth && matchesCalendar;
  });

  // Sort the filtered results.
  const sortedAndFilteredTours = React.useMemo(() => {
    return [...filteredTours].sort((a, b) => {
      const aSlots = slots.filter((s) => s.tourId === a.id);
      const bSlots = slots.filter((s) => s.tourId === b.id);

      const aMinPrice = aSlots.length > 0 ? Math.min(...aSlots.map((s) => s.price)) : 25;
      const bMinPrice = bSlots.length > 0 ? Math.min(...bSlots.map((s) => s.price)) : 25;

      const diffScore: Record<string, number> = { easy: 1, medium: 2, hard: 3, extreme: 4 };

      const getMinDateStr = (tourSlotsList: TourSlot[]) => {
        if (tourSlotsList.length === 0) return '9999-12-31';
        const dates = tourSlotsList.map((s) => s.startDate).filter(Boolean);
        if (dates.length === 0) return '9999-12-31';
        return dates.sort()[0];
      };

      if (sortBy === 'price-asc') return aMinPrice - bMinPrice;
      if (sortBy === 'price-desc') return bMinPrice - aMinPrice;
      if (sortBy === 'diff-asc') return (diffScore[a.difficulty] || 0) - (diffScore[b.difficulty] || 0);
      if (sortBy === 'diff-desc') return (diffScore[b.difficulty] || 0) - (diffScore[a.difficulty] || 0);
      if (sortBy === 'date-asc') return getMinDateStr(aSlots).localeCompare(getMinDateStr(bSlots));
      if (sortBy === 'date-desc') return getMinDateStr(bSlots).localeCompare(getMinDateStr(aSlots));

      // default: nearest upcoming slot date first; tours with no upcoming slots sink to the end
      const todayStr = new Date().toISOString().slice(0, 10);
      const getMinUpcomingDateStr = (tourSlotsList: TourSlot[]) => {
        const dates = tourSlotsList.map((s) => s.startDate).filter((d) => d && d >= todayStr);
        if (dates.length === 0) return '9999-12-31';
        return dates.sort()[0];
      };
      return getMinUpcomingDateStr(aSlots).localeCompare(getMinUpcomingDateStr(bSlots));
    });
  }, [filteredTours, sortBy, slots]);

  // Upcoming tours for the horizontal slider, one slot per tour (nearest date). The old SPA
  // shuffled inline with Math.random(); here the deterministic date order is what SSR + the
  // first client render agree on (no hydration mismatch), and the fairness shuffle — giving
  // different vendors' tours an equal chance of appearing first — happens after mount.
  const upcomingToursBase = React.useMemo(() => {
    const upcomingSlots = [...slots]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .filter((s) => {
        const parts = s.startDate.split('-');
        if (parts.length < 3) return false;
        const slotDate = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return slotDate >= today;
      });

    const picked: { tour: Tour; slot: TourSlot }[] = [];
    const seenTourIds = new Set();
    for (const slot of upcomingSlots) {
      if (!seenTourIds.has(slot.tourId)) {
        const tour = tours.find((tt) => tt.id === slot.tourId && tt.status === 'approved' && tt.isActive !== false);
        if (tour) {
          picked.push({ tour, slot });
          seenTourIds.add(slot.tourId);
        }
      }
      if (picked.length >= 8) break;
    }
    return picked;
  }, [slots, tours]);

  const [uniqueUpcomingTours, setUniqueUpcomingTours] = useState(upcomingToursBase);
  React.useEffect(() => {
    const shuffled = [...upcomingToursBase];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    setUniqueUpcomingTours(shuffled);
  }, [upcomingToursBase]);

  const [upcomingScrollLeft, setUpcomingScrollLeft] = useState(0);

  const featuredTourIds = React.useMemo(() => computeFeaturedTourIds(tours, slots), [tours, slots]);

  // Vendor-set tour.rating acts as the base while there are no real reviews yet; once real
  // reviews come in they take over. Bestseller-of-the-month tours get a small automatic boost.
  // Returns null when there's no data at all — callers render a "Yeni" badge instead.
  const getAverageRating = (tourId: string): string | null => {
    const tour = tours.find((tt) => tt.id === tourId);
    const tourReviews = reviews.filter((r) => r.tourId === tourId);

    let base: number;
    if (tourReviews.length > 0) {
      base = tourReviews.reduce((sum, r) => sum + r.rating, 0) / tourReviews.length;
    } else if (tour && tour.rating !== undefined && tour.rating !== null) {
      base = tour.rating;
    } else {
      return null;
    }

    if (featuredTourIds.has(tourId)) {
      base = Math.min(5, base + BESTSELLER_RATING_BOOST);
    }
    return base.toFixed(1);
  };

  const getReviewsCount = (tourId: string) => {
    const tourReviews = reviews.filter((r) => r.tourId === tourId);
    if (tourReviews.length > 0) return tourReviews.length;
    const tour = tours.find((tt) => tt.id === tourId);
    if (tour && tour.reviewsCount !== undefined) return tour.reviewsCount;
    return 0;
  };

  // Calendar navigation helpers.
  const handleCalendarPrevMonth = () => {
    const [yearStr, monthStr] = currentMonthView.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) - 1;
    if (month < 1) {
      month = 12;
      year--;
    }
    setCurrentMonthView(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleCalendarNextMonth = () => {
    const [yearStr, monthStr] = currentMonthView.split('-');
    let year = parseInt(yearStr, 10);
    let month = parseInt(monthStr, 10) + 1;
    if (month > 12) {
      month = 1;
      year++;
    }
    setCurrentMonthView(`${year}-${String(month).padStart(2, '0')}`);
  };

  const handleCalendarDayClick = (dayStr: string) => {
    if (calendarMode === 'dates') {
      setCalendarSelectedDates((prev) =>
        prev.includes(dayStr) ? prev.filter((d) => d !== dayStr) : [...prev, dayStr].sort(),
      );
      return;
    }
    if (!calendarDateStart || (calendarDateStart && calendarDateEnd)) {
      setCalendarDateStart(dayStr);
      setCalendarDateEnd('');
    } else {
      if (dayStr >= calendarDateStart) {
        setCalendarDateEnd(dayStr);
      } else {
        setCalendarDateStart(dayStr);
        setCalendarDateEnd('');
      }
    }
  };

  // Rejim dəyişəndə o biri rejimin seçimi təmizlənir — yoxsa görünməyən filter qalır.
  const handleCalendarModeChange = (mode: 'dates' | 'range') => {
    if (mode === calendarMode) return;
    setCalendarMode(mode);
    setCalendarDateStart('');
    setCalendarDateEnd('');
    setCalendarSelectedDates([]);
  };

  const handleCalendarReset = () => {
    setCalendarDateStart('');
    setCalendarDateEnd('');
    setCalendarSelectedDates([]);
  };

  const getTourMonths = (tourId: string) => {
    const tourSlots = slots.filter((s) => s.tourId === tourId);
    const uniqueMonths = new Set<string>();
    tourSlots.forEach((slot) => {
      try {
        const parts = slot.startDate.split('-');
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            uniqueMonths.add(tGlobal(`miscWidgets.tourWeatherForecast.months.${MONTH_KEYS[monthNum - 1]}`));
          }
        }
      } catch {
        // ignore
      }
    });
    return Array.from(uniqueMonths);
  };

  const pendingCompareCurrentTours = React.useMemo(() => {
    if (!pendingCompareTourId) return [];
    return compareList
      .map((id) => tours.find((tour) => tour.id === id))
      .filter((tour): tour is Tour => Boolean(tour));
  }, [tours, compareList, pendingCompareTourId]);

  return (
    // Same workspace frame the old App.tsx <main> gave the customer home: ToursHomeView's
    // root cancels this px-5 with -mx-5 to apply its own per-breakpoint side padding, so
    // without this exact frame the mobile layout shifts off-canvas. Deliberately no
    // transform/filter/animation here — that would silently break the search bar's
    // position:sticky on mobile (the old SPA hit this exact gotcha).
    // Bottom padding for the mobile nav lives on the (site) layout's <main>, not here.
    <div className="max-w-[var(--global-max-width)] mx-auto px-5 py-8 w-full">
      <ToursHomeView
        tours={tours}
        slots={slots}
        bookings={bookings}
        reviews={reviews}
        currentUser={guestUser}
        onAddReview={handleAddReview}
        wishlist={wishlist}
        compareList={compareList}
        handleToggleCompare={handleToggleCompare}
        t={t as (key: string) => string}
        currentSearchQuery={localSearchQuery}
        handleSearchChange={setLocalSearchQuery}
        isSearchFocused={isSearchFocused}
        setIsSearchFocused={setIsSearchFocused}
        searchContainerRef={searchContainerRef}
        recentSearches={recentSearches}
        recordSearch={recordSearch}
        appLanguage={appLanguage}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        selectedDifficulty={selectedDifficulty}
        setSelectedDifficulty={setSelectedDifficulty}
        selectedRegion={selectedRegion}
        setSelectedRegion={setSelectedRegion}
        maxPrice={maxPrice}
        setMaxPrice={setMaxPrice}
        maxPriceLimit={maxPriceLimit}
        isFiltersExpanded={isFiltersExpanded}
        setIsFiltersExpanded={setIsFiltersExpanded}
        uniqueRegions={uniqueRegions}
        showCalendarWidget={showCalendarWidget}
        setShowCalendarWidget={setShowCalendarWidget}
        calendarDateStart={calendarDateStart}
        calendarDateEnd={calendarDateEnd}
        calendarMode={calendarMode}
        handleCalendarModeChange={handleCalendarModeChange}
        calendarSelectedDates={calendarSelectedDates}
        handleCalendarReset={handleCalendarReset}
        calendarContainerRef={calendarContainerRef}
        currentMonthView={currentMonthView}
        monthNames={monthNames}
        handleCalendarPrevMonth={handleCalendarPrevMonth}
        handleCalendarNextMonth={handleCalendarNextMonth}
        handleCalendarDayClick={handleCalendarDayClick}
        sortBy={sortBy}
        setSortBy={setSortBy}
        uniqueUpcomingTours={uniqueUpcomingTours}
        upcomingScrollLeft={upcomingScrollLeft}
        setUpcomingScrollLeft={setUpcomingScrollLeft}
        handleToggleWishlist={handleToggleWishlist}
        getConvertedPriceInfo={getConvertedPriceInfo}
        sortedAndFilteredTours={sortedAndFilteredTours}
        getTourMonths={getTourMonths}
        getAverageRating={getAverageRating}
        getReviewsCount={getReviewsCount}
        handleQuickWhatsApp={handleQuickWhatsApp}
        onSelectTour={(tour) => router.push(`/tours/${tour.slug || tour.id}`)}
        setActiveView={() => {}}
        onShowNotification={showNotification}
      />

      {pendingCompareTourId && (
        <CompareSwapModal
          currentTours={pendingCompareCurrentTours}
          onSelectReplace={handleCompareSwapSelect}
          onCancel={() => setPendingCompareTourId(null)}
        />
      )}

      {/* Quick "WhatsApp ilə Rezerv et" popup — same TourDetailPage/booking/OTP flow as the full
          page, just opened as an overlay so the home page underneath stays put. */}
      {quickBookTour && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center overflow-y-auto py-6 px-3">
          <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl relative my-auto">
            <button
              type="button"
              onClick={() => setQuickBookTour(null)}
              className="absolute -top-3 -right-3 z-10 bg-slate-900 text-white rounded-full w-9 h-9 flex items-center justify-center shadow-lg hover:bg-slate-700 cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
            <div className="max-h-[90vh] overflow-y-auto rounded-2xl">
              <TourDetailPage
                key={quickBookTour.id}
                selectedTour={quickBookTour}
                tours={tours}
                slots={slots}
                reviews={reviews}
                users={users}
                wishlist={wishlist}
                compareList={compareList}
                handleToggleCompare={handleToggleCompare}
                currentUser={guestUser}
                onAddBooking={handleAddBooking}
                onShowNotification={showNotification}
                getConvertedPriceInfo={getConvertedPriceInfo}
                getReviewsCount={getReviewsCount}
                handleToggleWishlist={handleToggleWishlist}
                setSelectedOrganizer={(organizer) => {
                  if (organizer) {
                    setQuickBookTour(null);
                    router.push(`/organizer/${organizer.id}`);
                  }
                }}
                setSelectedTour={() => setQuickBookTour(null)}
                setLightboxIndex={setLightboxIndex}
                packingExperienceMap={packingExperienceMap}
                packingAnalyzingMap={packingAnalyzingMap}
                packingAiResultMap={packingAiResultMap}
                checkedPackingItems={checkedPackingItems}
                handlePackingExperienceSelect={handlePackingExperienceSelect}
                togglePackingItemChecked={togglePackingItemChecked}
                autoOpenBooking
              />
            </div>
          </div>
          <ImageLightbox tour={quickBookTour} lightboxIndex={lightboxIndex} onSetLightboxIndex={setLightboxIndex} />
        </div>
      )}
    </div>
  );
}
