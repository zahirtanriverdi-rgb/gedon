import React, { useState } from 'react';
import { Tour, TourSlot, Booking, Review, User, PriceCalculatorConfig } from '../types';
import FAQPage from './FAQPage';
import OrganizerProfile from './OrganizerProfile';
import { PriceCalculator } from './PriceCalculator';
import { ImageLightbox } from './customer/ImageLightbox';
import { WishlistView } from './customer/WishlistView';
import { ReviewSubmissionPanel } from './customer/ReviewSubmissionPanel';
import { ToursHomeView } from './customer/ToursHomeView';
import { PackingListSection } from './customer/PackingListSection';
import { TourReviewsList } from './customer/TourReviewsList';
import { TourDetailPage } from './customer/TourDetailPage';
import { getRecentSearches, addRecentSearch } from '../utils/recentSearches';
import { getWishlist, toggleWishlist } from '../utils/wishlist';
import { useLanguage } from '../i18n/LanguageContext';

const MONTH_KEYS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

interface CustomerPortalProps {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  reviews: Review[];
  users: User[];
  onAddBooking: (newBooking: Booking) => Promise<void>;
  onAddReview: (newReview: Review) => Promise<void>;
  onUpdateSlotBookedCount: (slotId: string, qty: number) => void;
  currentUser: { id: string; name: string; phone: string; balance: number; email: string };
  onUpdateUserBalance: (amount: number) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  exchangeRates: { USD: number; EUR: number };
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  displayCurrency?: 'AZN' | 'USD' | 'EUR';
  appLanguage?: 'az' | 'en' | 'ru';
  priceCalculatorConfig?: PriceCalculatorConfig;
}

export default function CustomerPortal({
  tours,
  slots,
  bookings,
  reviews,
  users,
  onAddBooking,
  onAddReview,
  onUpdateSlotBookedCount,
  currentUser,
  onUpdateUserBalance,
  onShowNotification,
  exchangeRates,
  searchQuery = '',
  onSearchChange,
  displayCurrency = 'AZN',
  appLanguage = 'az',
  priceCalculatorConfig
}: CustomerPortalProps) {
  const { t: tGlobal } = useLanguage();
  // Helper for currency conversion based on central exchange rates
  const getConvertedPriceInfo = (price: number, currency?: 'AZN' | 'USD' | 'EUR') => {
    const usdRate = exchangeRates?.USD || 1.70;
    const eurRate = exchangeRates?.EUR || 1.85;
    
    // First, convert the original price to AZN base
    let aznPrice = price;
    if (currency === 'USD') aznPrice = price * usdRate;
    if (currency === 'EUR') aznPrice = price * eurRate;
    
    // Now, determine the display price based on the selected displayCurrency
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
      detailed: `${finalPrice} ${symbol}`
    };
  };

  // Translations
  const translations = {
    az: {
      searchPlaceholder: "Tur adı, region və ya açar söz axtar...",
      searchButton: "Axtar",
      discoverTours: "Xəyalınızdakı Turları Kəşf Edin",
      upcomingTours: "Yaxınlaşan Turlar",
      soon: "Tezliklə",
      slide: "Sürüşdür",
      allRegions: "Bütün Bölgələr",
      allDifficulties: "Bütün Çətinliklər",
      allCategories: "Bütün Kateqoriyalar",
      all: "Bütün",
      allLevels: "Bütün dərəcələr",
      everywhere: "Hər yer (Bütün)",
      noToursFound: "Axtarışa uyğun tur tapılmadı",
      noToursDesc: "Zəhmət olmasa filtrləri dəyişdirin və ya fərqli açar sözlərlə yenidən cəhd edin."
    },
    en: {
      searchPlaceholder: "Search tour name, region or keyword...",
      searchButton: "Search",
      discoverTours: "Discover Your Dream Tours",
      upcomingTours: "Upcoming Tours",
      soon: "Soon",
      slide: "Slide",
      allRegions: "All Regions",
      allDifficulties: "All Difficulties",
      allCategories: "All Categories",
      all: "All",
      allLevels: "All levels",
      everywhere: "Everywhere",
      noToursFound: "No tours found",
      noToursDesc: "Please change your filters or try with different keywords."
    },
    ru: {
      searchPlaceholder: "Поиск названия тура, региона или ключевого слова...",
      searchButton: "Поиск",
      discoverTours: "Откройте для себя туры вашей мечты",
      upcomingTours: "Ближайшие туры",
      soon: "Скоро",
      slide: "Проведите",
      allRegions: "Все регионы",
      allDifficulties: "Все сложности",
      allCategories: "Все категории",
      all: "Все",
      allLevels: "Все уровни",
      everywhere: "Везде",
      noToursFound: "Туры не найдены",
      noToursDesc: "Пожалуйста, измените фильтры или попробуйте другие ключевые слова."
    }
  };
  const t = (key: keyof typeof translations.az) => translations[appLanguage]?.[key] || translations.az[key];

  // Search & Filters State
  const [activeView, setActiveView] = useState<'home' | 'faq' | 'organizer' | 'calculator' | 'wishlist'>('home');
  const [selectedOrganizer, setSelectedOrganizer] = useState<User | null>(null);

  // Wishlist ("İstəklərim") — localStorage-backed, no login required.
  const [wishlist, setWishlist] = useState<string[]>(() => getWishlist());
  const handleToggleWishlist = (tourId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist(toggleWishlist(tourId));
  };

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);
  
  // Real search history, persisted to localStorage (shared with the header's search bar)
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
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

  React.useEffect(() => {
    const handleNavHome = () => {
      setActiveView('home');
      setSelectedTour(null);
      setSelectedOrganizer(null);

      // Fully reset search + filters so the logo click returns to a genuinely blank
      // homepage state, not just the view — otherwise a stale query/filter combo from
      // before stays applied to the (now invisible) tour list underneath.
      setLocalSearchQuery('');
      if (onSearchChange) onSearchChange('');
      setIsSearchFocused(false);
      setSelectedCategory('all');
      setSelectedDifficulty('all');
      setSelectedRegion('all');
      setSelectedMonth('');
      setSortBy('default');
      setCalendarDateStart('');
      setCalendarDateEnd('');
      setShowCalendarWidget(false);
      setIsFiltersExpanded(false);

      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('nav-home', handleNavHome);
    return () => window.removeEventListener('nav-home', handleNavHome);
  }, []);

  React.useEffect(() => {
    const handleNavWishlist = () => {
      setActiveView('wishlist');
      setSelectedTour(null);
      setSelectedOrganizer(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('nav-wishlist', handleNavWishlist);
    return () => window.removeEventListener('nav-wishlist', handleNavWishlist);
  }, []);

  React.useEffect(() => {
    const handleNavCalculator = () => {
      setActiveView('calculator');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('nav-calculator', handleNavCalculator);
    return () => window.removeEventListener('nav-calculator', handleNavCalculator);
  }, []);

  React.useEffect(() => {
    const handleNavFaq = () => {
      setActiveView('faq');
      setSelectedTour(null);
      setSelectedOrganizer(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    window.addEventListener('nav-faq', handleNavFaq);
    return () => window.removeEventListener('nav-faq', handleNavFaq);
  }, []);

  // Use prop if provided, else use local state
  const currentSearchQuery = onSearchChange ? searchQuery : localSearchQuery;
  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setLocalSearchQuery(val);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [maxPrice, setMaxPrice] = useState<number>(3000);
  const [isFiltersExpanded, setIsFiltersExpanded] = useState<boolean>(false);

  // Dynamic maximum price range limit depending on the selected category
  const maxPriceLimit = (selectedCategory === 'international' || selectedCategory === 'all') ? 3000 : 250;

  React.useEffect(() => {
    if (selectedCategory === 'international' || selectedCategory === 'all') {
      setMaxPrice(3000);
    } else {
      setMaxPrice(250);
    }
  }, [selectedCategory]);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('default');
  const [calendarDateStart, setCalendarDateStart] = useState<string>('');
  const [calendarDateEnd, setCalendarDateEnd] = useState<string>('');
  const [showCalendarWidget, setShowCalendarWidget] = useState<boolean>(false);
  const [currentMonthView, setCurrentMonthView] = useState<string>('2026-05');

  const calendarContainerRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        showCalendarWidget &&
        calendarContainerRef.current &&
        !calendarContainerRef.current.contains(event.target as Node)
      ) {
        // If clicking on toggle button itself, do nothing since it handles its own click
        const toggleBtn = document.getElementById('calendar-toggle-btn');
        if (toggleBtn && toggleBtn.contains(event.target as Node)) {
          return;
        }
        setShowCalendarWidget(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCalendarWidget]);

  // Selected Tour for details modal
  const [selectedTour, setSelectedTour] = useState<Tour | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Tour opened via the home page's quick "WhatsApp ilə Rezerv et" card button — shown as a
  // popup over the current page (unlike selectedTour, which replaces it) and jumps straight
  // to the booking/OTP step instead of the gallery/description view.
  const [quickBookTour, setQuickBookTour] = useState<Tour | null>(null);

  // Handle dynamic routing for tours based on URL
  React.useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path.startsWith('/tours/')) {
        const id = path.split('/tours/')[1];
        const tour = tours.find(t => t.id === id && t.status === 'approved');
        if (tour) {
          setSelectedTour(tour);
        } else {
          setSelectedTour(null);
        }
      } else {
        setSelectedTour(null);
      }
    };

    // Check path on initial mount
    // Note: Due to React strict mode this might fire twice, but that's harmless.
    const _initialCheck = setTimeout(handlePopState, 0);

    window.addEventListener('popstate', handlePopState);
    return () => {
      clearTimeout(_initialCheck);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [tours]);

  // AI Smart packing states
  const [packingExperienceMap, setPackingExperienceMap] = useState<Record<string, 'beginner' | 'pro' | null>>({});
  const [packingAnalyzingMap, setPackingAnalyzingMap] = useState<Record<string, boolean>>({});
  const [checkedPackingItems, setCheckedPackingItems] = useState<Record<string, boolean>>({});
  // Real Gemini packing advice per tour, keyed by tourId — null/absent means the AI call hasn't
  // completed (or failed), in which case PackingListSection falls back to its static lists.
  const [packingAiResultMap, setPackingAiResultMap] = useState<Record<string, { basics: string[]; pro_gear: string[] } | null>>({});

  // Quick WhatsApp reserve helper — opens the same guest-booking/OTP popup as the full tour
  // page (see quickBookTour below) instead of redirecting straight to a wa.me link, so the
  // number gets verified through the real WhatsApp check before anything is sent.
  const handleQuickWhatsApp = (tour: Tour, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickBookTour(tour);
  };

  // Calls the real Gemini packing-advice endpoint for this tour (once per tour, cached in
  // packingAiResultMap) while showing the "analyzing" state; falls back to the static curated
  // lists in PackingListSection if the call fails or GEMINI_API_KEY isn't configured.
  const handlePackingExperienceSelect = async (tourId: string, choice: 'beginner' | 'pro') => {
    setPackingExperienceMap(prev => ({ ...prev, [tourId]: choice }));

    if (packingAiResultMap[tourId] !== undefined) return; // already fetched (or already failed) for this tour

    setPackingAnalyzingMap(prev => ({ ...prev, [tourId]: true }));
    try {
      const tour = tours.find(t => t.id === tourId);
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
      setPackingAiResultMap(prev => ({ ...prev, [tourId]: (res.ok && data?.packing_advice) ? data.packing_advice : null }));
    } catch {
      setPackingAiResultMap(prev => ({ ...prev, [tourId]: null }));
    } finally {
      setPackingAnalyzingMap(prev => ({ ...prev, [tourId]: false }));
    }
  };

  const togglePackingItemChecked = (key: string) => {
    setCheckedPackingItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Extract unique regions for the filter dropdown
  const uniqueRegions = Array.from(new Set(tours.map(t => t.region.split(' ')[0].replace('(', ''))));

  // Extract unique sorted start dates that have active slots
  const availableTourDates = React.useMemo(() => {
    const approvedTourIds = new Set(tours.filter(t => t.status === 'approved' && t.isActive !== false).map(t => t.id));
    const dates = slots
      .filter(s => approvedTourIds.has(s.tourId) && s.startDate)
      .map(s => s.startDate);
    return Array.from(new Set(dates)).sort();
  }, [slots, tours]);

  // Month names localized to the active language (falls back to AZ inside t()).
  const monthNames: Record<string, string> = React.useMemo(() => {
    const entries = MONTH_KEYS.map((key, index) => [
      String(index + 1).padStart(2, '0'),
      tGlobal(`miscWidgets.tourWeatherForecast.months.${key}`),
    ] as const);
    return Object.fromEntries(entries);
  }, [tGlobal]);

  // Extract unique months (YYYY-MM) that have active slots
  const availableMonths = React.useMemo(() => {
    const months = availableTourDates.map(d => d.slice(0, 7));
    return Array.from(new Set(months)).sort();
  }, [availableTourDates]);

  // Filter logic
  const normalizeAzText = (text: string) => {
    return text.toLowerCase()
      .replace(/ə/g, 'e')
      .replace(/ö/g, 'o')
      .replace(/ğ/g, 'g')
      .replace(/ü/g, 'u')
      .replace(/ş/g, 's')
      .replace(/ç/g, 'c')
      .replace(/ı/g, 'i')
      .replace(/i̇/g, 'i');
  };

  const filteredTours = tours.filter((tour) => {
    // 0. Approval status — belt-and-suspenders alongside the server-side filter (GET /api/tours
    // only returns status = 'approved' to anonymous/customer requests). A pending or rejected
    // tour must never render on the customer marketplace, full stop.
    if (tour.status !== 'approved') return false;

    // 1. Text Search
    const searchNormalized = normalizeAzText(currentSearchQuery);
    const matchesSearch = normalizeAzText(tour.name).includes(searchNormalized) || 
                          normalizeAzText(tour.region).includes(searchNormalized) ||
                          normalizeAzText(tour.description || '').includes(searchNormalized);
    
    // 2. Category
    let matchesCategory = selectedCategory === 'all' || tour.category === selectedCategory;
    if (selectedCategory === 'active') {
       matchesCategory = tour.category === 'active' || tour.isActiveLife === true;
    }

    // 3. Difficulty
    const matchesDifficulty = selectedDifficulty === 'all' || tour.difficulty === selectedDifficulty;

    // 4. Region dropdown
    const matchesRegion = selectedRegion === 'all' || tour.region.toLowerCase().includes(selectedRegion.toLowerCase());

    // 5. Price filter based on available slots (using original converted prices)
    const tourSlots = slots.filter(s => s.tourId === tour.id);
    let minSlotPriceAzn = 0;
    if (tourSlots.length > 0) {
      const minOriginalPrice = Math.min(...tourSlots.map(s => s.price));
      minSlotPriceAzn = getConvertedPriceInfo(minOriginalPrice, tour.priceCurrency).azn;
    }
    const matchesPrice = minSlotPriceAzn <= maxPrice;

    // 6. Active check — the vendor's own active/deactivated toggle, on top of the approval
    // status gate above.
    const matchesActive = tour.isActive !== false;

    // 6b. Subscription check (bypassed for now to prevent tours from disappearing)
    const subscriptionValid = true;

    // 7. Month Filter (matches if any tour slot starts with selectedMonth)
    const matchesMonth = !selectedMonth || tourSlots.some(s => s.startDate.startsWith(selectedMonth));

    // 8. Təqvim Date Filter (specific date or range)
    let matchesCalendar = true;
    if (calendarDateStart && calendarDateEnd) {
      matchesCalendar = tourSlots.some(s => s.startDate >= calendarDateStart && s.startDate <= calendarDateEnd);
    } else if (calendarDateStart) {
      matchesCalendar = tourSlots.some(s => s.startDate === calendarDateStart);
    }

    return matchesSearch && matchesCategory && matchesDifficulty && matchesRegion && matchesPrice && matchesActive && subscriptionValid && matchesMonth && matchesCalendar;
  });

  // Sort the filtered results
  const sortedAndFilteredTours = React.useMemo(() => {
    return [...filteredTours].sort((a, b) => {
      const aSlots = slots.filter(s => s.tourId === a.id);
      const bSlots = slots.filter(s => s.tourId === b.id);
      
      const aMinPrice = aSlots.length > 0 ? Math.min(...aSlots.map(s => s.price)) : 25;
      const bMinPrice = bSlots.length > 0 ? Math.min(...bSlots.map(s => s.price)) : 25;

      const diffScore: Record<string, number> = { easy: 1, medium: 2, hard: 3, extreme: 4 };

      const getMinDateStr = (tourId: string, tourSlotsList: TourSlot[]) => {
        if (tourSlotsList.length === 0) return '9999-12-31';
        const dates = tourSlotsList.map(s => s.startDate).filter(Boolean);
        if (dates.length === 0) return '9999-12-31';
        return dates.sort()[0];
      };

      if (sortBy === 'price-asc') {
        return aMinPrice - bMinPrice;
      }
      if (sortBy === 'price-desc') {
        return bMinPrice - aMinPrice;
      }
      if (sortBy === 'diff-asc') {
        return (diffScore[a.difficulty] || 0) - (diffScore[b.difficulty] || 0);
      }
      if (sortBy === 'diff-desc') {
        return (diffScore[b.difficulty] || 0) - (diffScore[a.difficulty] || 0);
      }
      if (sortBy === 'date-asc') {
        const dateA = getMinDateStr(a.id, aSlots);
        const dateB = getMinDateStr(b.id, bSlots);
        return dateA.localeCompare(dateB);
      }
      if (sortBy === 'date-desc') {
        const dateA = getMinDateStr(a.id, aSlots);
        const dateB = getMinDateStr(b.id, bSlots);
        return dateB.localeCompare(dateA);
      }
      return 0; // default / unsorted
    });
  }, [filteredTours, sortBy, slots]);

  // Tours saved to the wishlist — filtered so a tour the vendor later deactivated or an
  // admin un-approved doesn't leave a broken/inaccessible card in the customer's list.
  const wishlistTours = React.useMemo(() => {
    return tours.filter(tour => wishlist.includes(tour.id) && tour.isActive !== false && tour.status === 'approved');
  }, [tours, wishlist]);

  // Upcoming tours for the horizontal slider, one slot per tour (nearest date), shuffled
  // so different vendors' tours get an equal chance of appearing first.
  const uniqueUpcomingTours = React.useMemo(() => {
    const upcomingSlots = [...slots]
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .filter(s => {
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
        const t = tours.find(t => t.id === slot.tourId && t.status === 'approved' && t.isActive !== false);
        if (t) {
          picked.push({ tour: t, slot: slot });
          seenTourIds.add(slot.tourId);
        }
      }
      if (picked.length >= 8) break;
    }

    const shuffled = [...picked];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [slots, tours]);

  const [upcomingScrollLeft, setUpcomingScrollLeft] = useState(0);

  // Calculate Average rating - Supports manual back-office rating override if specified in tour.rating
  const getAverageRating = (tourId: string) => {
    const tour = tours.find(t => t.id === tourId);
    if (tour && tour.rating !== undefined && tour.rating !== null) {
      return tour.rating.toFixed(1);
    }
    const tourReviews = reviews.filter(r => r.tourId === tourId);
    if (tourReviews.length === 0) return "4.5"; // default fallback if none
    const total = tourReviews.reduce((sum, r) => sum + r.rating, 0);
    return (total / tourReviews.length).toFixed(1);
  };

  const getReviewsCount = (tourId: string) => {
    const tour = tours.find(t => t.id === tourId);
    if (tour && tour.rating !== undefined && tour.rating !== null && tour.reviewsCount !== undefined) {
      return tour.reviewsCount;
    }
    return reviews.filter(r => r.tourId === tourId).length;
  };

  // Calendar event navigation logic helper
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

  const getTourMonths = (tourId: string) => {
    const tourSlots = slots.filter(s => s.tourId === tourId);
    const uniqueMonths = new Set<string>();
    tourSlots.forEach(slot => {
      try {
        const parts = slot.startDate.split('-');
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            uniqueMonths.add(tGlobal(`miscWidgets.tourWeatherForecast.months.${MONTH_KEYS[monthNum - 1]}`));
          }
        }
      } catch (e) {
        // ignore
      }
    });
    return Array.from(uniqueMonths);
  };

  // Share Tour layout helper
  const handleShareTour = (tour: Tour, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // prevent opening details when clicking share on the card
    }
    const tourSlots = slots.filter(s => s.tourId === tour.id);
    const minPrice = tourSlots.length > 0 ? Math.min(...tourSlots.map(s => s.price)) : 25;
    
    const shareUrl = window.location.origin;
    const categoryLabel = tour.category === 'hiking' ? 'Yurus / Hiking' : tour.category === 'camp' ? 'Kamp' : 'Zirve';
    const text = tGlobal('customerMisc.customerPortal.shareTourTemplate', {
      tourName: tour.name,
      region: tour.region,
      durationDays: tour.durationDays,
      minPrice,
      category: categoryLabel,
      vendorName: tour.vendorName,
      descriptionExcerpt: tour.description.slice(0, 180),
      shareUrl,
    });

    const shareViaWhatsApp = () => {
      navigator.clipboard.writeText(text).then(() => {
        if (onShowNotification) {
          onShowNotification(tGlobal('customerMisc.customerPortal.shareCopiedNotification'), 'success');
        }
        setTimeout(() => {
          const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
          const win = window.open(whatsappUrl, '_blank');
          if (win) win.focus();
        }, 500);
      }).catch(() => {
        const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        const win = window.open(whatsappUrl, '_blank');
        if (win) win.focus();
        if (onShowNotification) {
          onShowNotification(tGlobal('customerMisc.customerPortal.shareWhatsAppActivatedNotification'), 'success');
        }
      });
    };

    if (navigator.share) {
      navigator.share({
        title: `GədəkGörək - ${tour.name}`,
        text,
        url: shareUrl,
      }).catch((err) => {
        // User cancelled the native share sheet — do nothing
        if (err?.name === 'AbortError') return;
        // Native share failed for another reason — fall back to WhatsApp
        shareViaWhatsApp();
      });
      return;
    }

    shareViaWhatsApp();
  };

  return (
    <>
      {activeView === 'calculator' && (
        <div className="bg-slate-50 min-h-screen">
          <PriceCalculator onBack={() => setActiveView('home')} config={priceCalculatorConfig} />
        </div>
      )}

      {activeView === 'faq' && (
        <FAQPage onBack={() => setActiveView('home')} />
      )}
      
      {activeView === 'organizer' && selectedOrganizer && (
        <OrganizerProfile 
          organizer={selectedOrganizer} 
          tours={tours} 
          onBack={() => {
            setActiveView('home');
            setSelectedOrganizer(null);
          }} 
          onTourClick={(tour) => setSelectedTour(tour)}
        />
      )}

      {activeView === 'wishlist' && (
        <WishlistView
          wishlistTours={wishlistTours}
          onBack={() => setActiveView('home')}
          onSelectTour={(tour) => { setSelectedTour(tour); setActiveView('home'); }}
          onToggleWishlist={handleToggleWishlist}
        />
      )}

      {activeView === 'home' && !selectedTour && (
        <ToursHomeView
          tours={tours}
          slots={slots}
          bookings={bookings}
          reviews={reviews}
          currentUser={currentUser}
          onAddReview={onAddReview}
          wishlist={wishlist}
          t={t}
          currentSearchQuery={currentSearchQuery}
          handleSearchChange={handleSearchChange}
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
          setCalendarDateStart={setCalendarDateStart}
          setCalendarDateEnd={setCalendarDateEnd}
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
          handleShareTour={handleShareTour}
          handleQuickWhatsApp={handleQuickWhatsApp}
          onSelectTour={(tour) => setSelectedTour(tour)}
          setActiveView={setActiveView}
        />
      )}

      {/* DETAILED TOUR PAGE (Full Page Dynamic Route) */}
      {activeView === 'home' && selectedTour && (
        <TourDetailPage
          key={selectedTour.id}
          selectedTour={selectedTour}
          tours={tours}
          slots={slots}
          reviews={reviews}
          users={users}
          wishlist={wishlist}
          currentUser={currentUser}
          onAddBooking={onAddBooking}
          onShowNotification={onShowNotification}
          getConvertedPriceInfo={getConvertedPriceInfo}
          getReviewsCount={getReviewsCount}
          handleShareTour={handleShareTour}
          handleToggleWishlist={handleToggleWishlist}
          setActiveView={setActiveView}
          setSelectedOrganizer={setSelectedOrganizer}
          setSelectedTour={setSelectedTour}
          setLightboxIndex={setLightboxIndex}
          packingExperienceMap={packingExperienceMap}
          packingAnalyzingMap={packingAnalyzingMap}
          packingAiResultMap={packingAiResultMap}
          checkedPackingItems={checkedPackingItems}
          handlePackingExperienceSelect={handlePackingExperienceSelect}
          togglePackingItemChecked={togglePackingItemChecked}
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
                currentUser={currentUser}
                onAddBooking={onAddBooking}
                onShowNotification={onShowNotification}
                getConvertedPriceInfo={getConvertedPriceInfo}
                getReviewsCount={getReviewsCount}
                handleShareTour={handleShareTour}
                handleToggleWishlist={handleToggleWishlist}
                setActiveView={setActiveView}
                setSelectedOrganizer={setSelectedOrganizer}
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
        </div>
      )}

      <ImageLightbox tour={selectedTour} lightboxIndex={lightboxIndex} onSetLightboxIndex={setLightboxIndex} />
    </>
  );
}
