import React, { useState } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Compass, Heart, Scale, Menu, X, BookOpen, Calculator, Tent } from 'lucide-react';
import { Tour, TourSlot, Booking, Review, User, PriceCalculatorConfig } from '../types';
import FAQPage from './FAQPage';
import { PriceCalculator } from './PriceCalculator';
import { ImageLightbox } from './customer/ImageLightbox';
import { WishlistView } from './customer/WishlistView';
import { CompareView } from './customer/CompareView';
import { CampSitesPage } from './customer/CampSitesPage';
import { CampSiteAddPage } from './customer/CampSiteAddPage';
import { CompareSwapModal } from './tours/CompareSwapModal';
import { ReviewSubmissionPanel } from './customer/ReviewSubmissionPanel';
import { ToursHomeView } from './customer/ToursHomeView';
import { PackingListSection } from './customer/PackingListSection';
import { TourReviewsList } from './customer/TourReviewsList';
import { TourDetailPage } from './customer/TourDetailPage';
import { TourDetailRoute } from './customer/TourDetailRoute';
import { OrganizerRoute } from './customer/OrganizerRoute';
import { SiteFooter } from './customer/SiteFooter';
import NotFoundPage from './NotFoundPage';
import { getRecentSearches, addRecentSearch } from '../utils/recentSearches';
import { getWishlist, toggleWishlist } from '../utils/wishlist';
import { getCompareList, toggleCompareList, replaceInCompareList } from '../utils/compare';
import { useLanguage } from '../i18n/LanguageContext';
import { computeFeaturedTourIds } from '../utils/featuredTours';
import { UrgentDealsBell } from './customer/UrgentDealsBell';
import { normalizeAzText } from '../utils/searchNormalize';
import { useEffect, useRef } from 'react';

// Automatic rating boost applied to tours currently flagged as this month's bestseller
// (computeFeaturedTourIds), on top of whichever base rating (vendor-set or review average) applies.
const BESTSELLER_RATING_BOOST = 0.3;


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
  onDisplayCurrencyChange?: (currency: 'AZN' | 'USD' | 'EUR') => void;
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
  onDisplayCurrencyChange,
  priceCalculatorConfig
}: CustomerPortalProps) {
  const { t: tGlobal, language: currentLang, setLanguage } = useLanguage();
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
  };
  const t = (key: keyof typeof translations.az) => translations[appLanguage]?.[key] || translations.az[key];

  const location = useLocation();
  const navigate = useNavigate();

  // Wishlist ("İstəklərim") — localStorage-backed, no login required.
  const [wishlist, setWishlist] = useState<string[]>(() => getWishlist());
  const handleToggleWishlist = (tourId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setWishlist(toggleWishlist(tourId));
  };

  // Tour comparison ("Müqayisə") — localStorage-backed, max 3 tours at once (see utils/compare.ts).
  const [compareList, setCompareList] = useState<string[]>(() => getCompareList());
  // Set when the customer tries to add a 4th tour while 3 are already selected — holds the
  // tour they were trying to add so the swap modal knows what to insert once they pick a slot.
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

  const [localSearchQuery, setLocalSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const searchContainerRef = React.useRef<HTMLDivElement>(null);

  // Bottom mobile nav's burger dropdown (Bələdçi / Qrup hesabla) — mirrors the header's
  // existing mobile "more" menu in App.tsx, scoped locally since this nav lives here.
  const [mobileNavMenuOpen, setMobileNavMenuOpen] = useState(false);
  const mobileNavMenuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileNavMenuRef.current && !mobileNavMenuRef.current.contains(event.target as Node)) {
        setMobileNavMenuOpen(false);
      }
    };
    if (mobileNavMenuOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileNavMenuOpen]);

  // Admin-controlled feature flag (settings table, camp_sites_enabled) — mirrors the same
  // check in App.tsx's header nav, fetched independently here since the mobile bottom nav
  // bar lives in this component instead. Defaults to hidden until the config loads so the
  // icon never flashes visible on installs where the admin has switched it off.
  const [campSitesEnabled, setCampSitesEnabled] = useState<boolean>(false);
  React.useEffect(() => {
    fetch('/api/camp-sites/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCampSitesEnabled(!!data && data.enabled !== false))
      .catch(() => setCampSitesEnabled(true)); // config endpoint down — don't hide the feature
  }, []);

  // Same admin-controlled feature flag pattern (settings table, group_calculator_enabled) for
  // the "Qrup hesabla" button in this bottom nav's burger menu. Defaults to visible so the
  // button doesn't flash away on the common case (feature left on) while the request is in flight.
  const [groupCalculatorEnabled, setGroupCalculatorEnabled] = useState<boolean>(true);
  React.useEffect(() => {
    fetch('/api/group-calculator/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setGroupCalculatorEnabled(!!data && data.enabled !== false))
      .catch(() => setGroupCalculatorEnabled(true)); // config endpoint down — don't hide the feature
  }, []);

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

  // Route-driven replacement for the old "nav-home" custom event: whenever the user actually
  // lands back on the home route (logo click -> navigate('/'), or the browser back button),
  // fully reset search + filters so it's a genuinely blank homepage state, not just the view —
  // otherwise a stale query/filter combo from before stays applied to the tour list underneath.
  // Keyed on pathname+search so it re-fires when the route changes to '/' OR the query string
  // changes (footer internal links), not on every render while already there.
  //
  // SEO daxili linkləmə (SiteFooter): /?region=Quba, /?category=hiking və /?q=şəlalə query
  // param-ları boş sıfırlama əvəzinə müvafiq filtri tətbiq edir — beləliklə footer-dəki
  // destinasiya/kateqoriya linkləri həqiqi, paylaşıla bilən URL-lərdir.
  const isHomeRoute = location.pathname === '/';
  React.useEffect(() => {
    if (!isHomeRoute) return;
    const params = new URLSearchParams(location.search);
    const regionParam = params.get('region')?.trim() || 'all';
    const rawCategory = params.get('category')?.trim() || 'all';
    // Naməlum kateqoriya dəyəri (köhnə link, əl ilə yazılmış URL) "boş nəticə" ekranına
    // yox, adi "hamısı" görünüşünə düşsün.
    const categoryParam = ['peak', 'camp', 'hiking', 'active', 'international'].includes(rawCategory) ? rawCategory : 'all';
    const qParam = params.get('q')?.trim() || '';
    setLocalSearchQuery(qParam);
    if (onSearchChange) onSearchChange(qParam);
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
  }, [location.pathname, location.search]);

  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

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
  // 'dates' = istənilən sayda ayrı tarix (multi-select), 'range' = başlanğıc→son aralığı.
  // Two explicit modes because a single click-handler that silently switched between
  // "single date" and "range end" confused users about what their second tap did.
  const [calendarMode, setCalendarMode] = useState<'dates' | 'range'>('dates');
  const [calendarSelectedDates, setCalendarSelectedDates] = useState<string[]>([]);
  const [showCalendarWidget, setShowCalendarWidget] = useState<boolean>(false);
  const [currentMonthView, setCurrentMonthView] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

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

  // Lightbox index is shared across whichever TourDetailPage instance is currently mounted
  // (the routed /tours/:slug page or the quick-book modal below) — each owns its own
  // ImageLightbox render fed with its own known tour.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Tour opened via the home page's quick "WhatsApp ilə Rezerv et" card button — shown as a
  // popup over the current page (unlike navigating to /tours/:slug, which replaces it) and
  // jumps straight to the booking/OTP step instead of the gallery/description view.
  const [quickBookTour, setQuickBookTour] = useState<Tour | null>(null);

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

  // Filter logic — normalizeAzText lives in utils/searchNormalize so the suggestions dropdown
  // folds diacritics exactly the same way as this main grid filter.
  const filteredTours = tours.filter((tour) => {
    // 0. Approval status — belt-and-suspenders alongside the server-side filter (GET /api/tours
    // only returns status = 'approved' to anonymous/customer requests). A pending or rejected
    // tour must never render on the customer marketplace, full stop.
    if (tour.status !== 'approved') return false;

    // 1. Text Search — also matches the localized EN/RU name/description, so a suggestion
    // picked from the dropdown (which shows localized titles) round-trips into a hit here.
    const searchNormalized = normalizeAzText(currentSearchQuery);
    const localizedName = tour.translations?.[currentLang]?.name || '';
    const localizedDescription = tour.translations?.[currentLang]?.description || '';
    const matchesSearch = normalizeAzText(tour.name).includes(searchNormalized) ||
                          normalizeAzText(tour.region).includes(searchNormalized) ||
                          normalizeAzText(tour.description || '').includes(searchNormalized) ||
                          normalizeAzText(localizedName).includes(searchNormalized) ||
                          normalizeAzText(localizedDescription).includes(searchNormalized);
    
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

    // 8. Təqvim Date Filter (ayrı tarixlər və ya aralıq)
    let matchesCalendar = true;
    if (calendarMode === 'dates' && calendarSelectedDates.length > 0) {
      matchesCalendar = tourSlots.some(s => calendarSelectedDates.includes(s.startDate));
    } else if (calendarDateStart && calendarDateEnd) {
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
      // default: nearest upcoming slot date first; tours with no upcoming slots sink to the end
      const todayStr = new Date().toISOString().slice(0, 10);
      const getMinUpcomingDateStr = (tourSlotsList: TourSlot[]) => {
        const dates = tourSlotsList.map(s => s.startDate).filter(d => d && d >= todayStr);
        if (dates.length === 0) return '9999-12-31';
        return dates.sort()[0];
      };
      return getMinUpcomingDateStr(aSlots).localeCompare(getMinUpcomingDateStr(bSlots));
    });
  }, [filteredTours, sortBy, slots]);

  // Tours saved to the wishlist — filtered so a tour the vendor later deactivated or an
  // admin un-approved doesn't leave a broken/inaccessible card in the customer's list.
  const wishlistTours = React.useMemo(() => {
    return tours.filter(tour => wishlist.includes(tour.id) && tour.isActive !== false && tour.status === 'approved');
  }, [tours, wishlist]);

  // Tours currently selected for comparison, kept in the order they were added to compareList.
  const compareTours = React.useMemo(() => {
    return compareList
      .map(id => tours.find(tour => tour.id === id && tour.isActive !== false && tour.status === 'approved'))
      .filter((tour): tour is Tour => Boolean(tour));
  }, [tours, compareList]);
  const pendingCompareCurrentTours = React.useMemo(() => {
    if (!pendingCompareTourId) return [];
    return compareList
      .map(id => tours.find(tour => tour.id === id))
      .filter((tour): tour is Tour => Boolean(tour));
  }, [tours, compareList, pendingCompareTourId]);

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

  const featuredTourIds = React.useMemo(() => computeFeaturedTourIds(tours, slots), [tours, slots]);

  // Calculate Average rating - vendor-set tour.rating acts as the base while there are no real
  // reviews yet; once real reviews come in they take over. Bestseller-of-the-month tours get a
  // small automatic boost on top of whichever base applies. Returns null when there's no data
  // at all — a fabricated "4.5 (0 rəy)" reads as fake and erodes trust, so callers render a
  // "Yeni" (new) badge instead.
  const getAverageRating = (tourId: string): string | null => {
    const tour = tours.find(t => t.id === tourId);
    const tourReviews = reviews.filter(r => r.tourId === tourId);

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
    const tourReviews = reviews.filter(r => r.tourId === tourId);
    if (tourReviews.length > 0) return tourReviews.length;
    const tour = tours.find(t => t.id === tourId);
    if (tour && tour.reviewsCount !== undefined) return tour.reviewsCount;
    return 0;
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
    if (calendarMode === 'dates') {
      // Toggle: klik olunan tarix seçilibsə çıxarılır, seçilməyibsə əlavə olunur.
      setCalendarSelectedDates(prev =>
        prev.includes(dayStr) ? prev.filter(d => d !== dayStr) : [...prev, dayStr].sort()
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

  return (
    <div className="pb-16 sm:pb-0">
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Helmet>
                <title>{
                  appLanguage === 'en' ? 'GedəkGörək Marketplace | Tours and Active Recreation in Azerbaijan'
                  : appLanguage === 'ru' ? 'GedəkGörək Marketplace | Туры и активный отдых в Азербайджане'
                  : 'GedəkGörək Marketplace | Azərbaycanda Turlar və Aktiv İstirahət'
                }</title>
                <meta
                  name="description"
                  content={
                    appLanguage === 'en' ? 'Discover the best hiking, camping, peak and international tours in Azerbaijan — book easily with GedəkGörək.'
                    : appLanguage === 'ru' ? 'Откройте для себя лучшие походы, кемпинги, восхождения и зарубежные туры Азербайджана — бронируйте легко с GedəkGörək.'
                    : 'Azərbaycanın ən yaxşı hiking, kamp, zirvə və xarici turlarını kəşf edin — GedəkGörək ilə asanlıqla rezerv edin.'
                  }
                />
              </Helmet>
              <ToursHomeView
                tours={tours}
                slots={slots}
                bookings={bookings}
                reviews={reviews}
                currentUser={currentUser}
                onAddReview={onAddReview}
                wishlist={wishlist}
                compareList={compareList}
                handleToggleCompare={handleToggleCompare}
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
                onSelectTour={(tour) => navigate(`/tours/${tour.slug || tour.id}`)}
                setActiveView={() => {}}
                onShowNotification={onShowNotification}
              />
            </>
          }
        />

        <Route
          path="/tours/:slug"
          element={
            <TourDetailRoute
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
              handleToggleWishlist={handleToggleWishlist}
              lightboxIndex={lightboxIndex}
              setLightboxIndex={setLightboxIndex}
              packingExperienceMap={packingExperienceMap}
              packingAnalyzingMap={packingAnalyzingMap}
              packingAiResultMap={packingAiResultMap}
              checkedPackingItems={checkedPackingItems}
              handlePackingExperienceSelect={handlePackingExperienceSelect}
              togglePackingItemChecked={togglePackingItemChecked}
            />
          }
        />

        <Route path="/faq" element={<FAQPage onBack={() => navigate('/')} />} />

        <Route
          path="/camp-sites"
          element={<CampSitesPage onBack={() => navigate('/')} onAddSite={() => navigate('/camp-sites/add')} />}
        />

        <Route
          path="/camp-sites/add"
          element={<CampSiteAddPage onBack={() => navigate('/camp-sites')} />}
        />

        <Route
          path="/calculator"
          element={
            <div className="bg-slate-50 min-h-screen">
              <PriceCalculator onBack={() => navigate('/')} config={priceCalculatorConfig} displayCurrency={displayCurrency} exchangeRates={exchangeRates} />
            </div>
          }
        />

        <Route
          path="/wishlist"
          element={
            <WishlistView
              wishlistTours={wishlistTours}
              onBack={() => navigate('/')}
              onSelectTour={(tour) => navigate(`/tours/${tour.slug || tour.id}`)}
              onToggleWishlist={handleToggleWishlist}
              compareList={compareList}
              onToggleCompare={handleToggleCompare}
            />
          }
        />

        <Route
          path="/compare"
          element={
            <CompareView
              compareTours={compareTours}
              slots={slots}
              onBack={() => navigate('/')}
              onSelectTour={(tour) => navigate(`/tours/${tour.slug || tour.id}`)}
              onRemoveFromCompare={(tourId) => handleToggleCompare(tourId)}
              getConvertedPriceInfo={getConvertedPriceInfo}
              getAverageRating={getAverageRating}
              getReviewsCount={getReviewsCount}
            />
          }
        />

        <Route path="/organizer/:vendorId" element={<OrganizerRoute users={users} tours={tours} />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* SEO daxili linkləmə footer-i — bütün müştəri səhifələrində görünür (vendor/admin
          panellərində yox: onlar App.tsx-də ayrıca route-lardır və bu komponentə girmir). */}
      <SiteFooter tours={tours} />

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
                currentUser={currentUser}
                onAddBooking={onAddBooking}
                onShowNotification={onShowNotification}
                getConvertedPriceInfo={getConvertedPriceInfo}
                getReviewsCount={getReviewsCount}
                handleToggleWishlist={handleToggleWishlist}
                setSelectedOrganizer={(organizer) => {
                  if (organizer) {
                    setQuickBookTour(null);
                    navigate(`/organizer/${organizer.id}`);
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

   {/* Mobile Bottom Navigation Bar */}
<nav className="sm:hidden fixed bottom-0 left-0 right-0 w-full z-[100] bg-white border-t border-slate-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)] pb-[env(safe-area-inset-bottom)] overflow-visible">        <div className="flex flex-row items-center justify-between w-full h-16 px-1">
          
          <button
            type="button"
            onClick={() => {
              setMobileNavMenuOpen(false);
              // Always a hard return to a clean homepage: if we're already on '/' a plain
              // navigate('/') wouldn't re-trigger the route-change reset effect above (the
              // pathname never actually changes), so search/filters/scroll would stay stuck
              // as they were. A full reload guarantees the same "fresh home" result every
              // time, whichever page the customer is currently on.
              window.location.href = '/';
            }}
            className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
              location.pathname === '/' ? 'text-brand-primary' : 'text-brand-text-muted'
            }`}
          >
            <Compass className="w-5 h-5" strokeWidth={location.pathname === '/' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">{t('navDiscover')}</span>
          </button>

          <button
            type="button"
            onClick={() => { setMobileNavMenuOpen(false); navigate('/wishlist'); }}
            className={`flex-1 relative flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
              location.pathname === '/wishlist' ? 'text-brand-primary' : 'text-brand-text-muted'
            }`}
          >
            <span className="relative flex justify-center">
              <Heart className="w-5 h-5" strokeWidth={location.pathname === '/wishlist' ? 2.5 : 2} fill={location.pathname === '/wishlist' ? 'currentColor' : 'none'} />
              {wishlist.length > 0 && (
                <span className="absolute -top-1.5 -right-3 min-w-[15px] h-[15px] px-0.5 bg-rose-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </span>
            <span className="text-[10px] font-bold">{t('navWishlist')}</span>
          </button>

          <button
            type="button"
            onClick={() => { setMobileNavMenuOpen(false); navigate('/compare'); }}
            className={`flex-1 relative flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
              location.pathname === '/compare' ? 'text-brand-primary' : 'text-brand-text-muted'
            }`}
          >
            <span className="relative flex justify-center">
              <Scale className="w-5 h-5" strokeWidth={location.pathname === '/compare' ? 2.5 : 2} />
              {compareList.length > 0 && (
                <span className="absolute -top-1.5 -right-3 min-w-[15px] h-[15px] px-0.5 bg-brand-cta text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {compareList.length}
                </span>
              )}
            </span>
            <span className="text-[10px] font-bold">{t('navCompare')}</span>
          </button>

          {/* "Təcili fürsətlər" — mirrors the desktop header's UrgentDealsBell (App.tsx), which
              is hidden on mobile along with the rest of that icon row; this is the mobile-only
              equivalent, opening a bottom sheet instead of a header-anchored dropdown since a
              small popup wouldn't fit hanging off a bottom-fixed nav icon. */}
          <UrgentDealsBell tours={tours} slots={slots} appLanguage={appLanguage} variant="mobileNav" />

          {campSitesEnabled && (
            <button
              type="button"
              onClick={() => { setMobileNavMenuOpen(false); navigate('/camp-sites'); }}
              className={`flex-1 flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
                location.pathname.startsWith('/camp-sites') ? 'text-brand-primary' : 'text-brand-text-muted'
              }`}
            >
              <Tent className="w-5 h-5" strokeWidth={location.pathname.startsWith('/camp-sites') ? 2.5 : 2} />
              <span className="text-[10px] font-bold">{t('navCampSites')}</span>
            </button>
          )}

          <div className="flex-1 relative h-full flex" ref={mobileNavMenuRef}>
            <button
              type="button"
              onClick={() => setMobileNavMenuOpen((v) => !v)}
              className={`w-full h-full flex flex-col items-center justify-center gap-0.5 transition-colors ${
                mobileNavMenuOpen || location.pathname === '/faq' || location.pathname === '/calculator'
                  ? 'text-brand-primary'
                  : 'text-brand-text-muted'
              }`}
            >
              {mobileNavMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" strokeWidth={2} />}
              <span className="text-[10px] font-bold">{t('navMenu')}</span>
            </button>

            {/* Menyunun kəsilməməsi üçün right-0 və z-[110] tənzimləndi */}
            {mobileNavMenuOpen && (
              <div className="absolute bottom-[calc(100%+12px)] right-0 w-48 bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden z-[110] animate-in fade-in slide-in-from-bottom-2 duration-200">
                <button
                  type="button"
                  onClick={() => { setMobileNavMenuOpen(false); navigate('/faq'); }}
                  className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-brand-text-main hover:bg-slate-50 transition-colors border-b border-slate-100"
                >
                  <BookOpen className="w-5 h-5 text-brand-text-muted" />
                  {t('navGuide')}
                </button>
                {groupCalculatorEnabled && (
                  <button
                    type="button"
                    onClick={() => { setMobileNavMenuOpen(false); navigate('/calculator'); }}
                    className="w-full flex items-center gap-3 px-5 py-4 text-sm font-medium text-brand-text-main hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    <Calculator className="w-5 h-5 text-brand-text-muted" />
                    {t('navCalculator')}
                  </button>
                )}

                {/* Dil + valyuta seçimi — header-dəki desktop menyusu ilə eyni 4 cüt seçim
                    (AZ/AZN, RU/AZN, EN/USD, EN/EUR). Əvvəllər burada yalnız dil dəyişirdi,
                    valyuta bu menyudan heç dəyişmirdi — desktopla uyğunlaşdırıldı. */}
                <div className="px-5 pt-3 pb-1 text-[10px] uppercase tracking-wide font-bold text-slate-400">
                  {appLanguage === 'ru' ? 'Язык / Валюта' : appLanguage === 'en' ? 'Language / Currency' : 'Dil / Valyuta'}
                </div>
                <button
                  type="button"
                  onClick={() => { setLanguage('az'); onDisplayCurrencyChange?.('AZN'); setMobileNavMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                    currentLang === 'az' && displayCurrency === 'AZN' ? 'text-brand-primary bg-emerald-50' : 'text-brand-text-main hover:bg-slate-50'
                  }`}
                >
                  🇦🇿 AZ (AZN)
                </button>
                <button
                  type="button"
                  onClick={() => { setLanguage('ru'); onDisplayCurrencyChange?.('AZN'); setMobileNavMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                    currentLang === 'ru' && displayCurrency === 'AZN' ? 'text-brand-primary bg-emerald-50' : 'text-brand-text-main hover:bg-slate-50'
                  }`}
                >
                  🇷🇺 RU (AZN)
                </button>
                <button
                  type="button"
                  onClick={() => { setLanguage('en'); onDisplayCurrencyChange?.('USD'); setMobileNavMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                    currentLang === 'en' && displayCurrency === 'USD' ? 'text-brand-primary bg-emerald-50' : 'text-brand-text-main hover:bg-slate-50'
                  }`}
                >
                  🇬🇧 EN (USD)
                </button>
                <button
                  type="button"
                  onClick={() => { setLanguage('en'); onDisplayCurrencyChange?.('EUR'); setMobileNavMenuOpen(false); }}
                  className={`w-full flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors ${
                    currentLang === 'en' && displayCurrency === 'EUR' ? 'text-brand-primary bg-emerald-50' : 'text-brand-text-main hover:bg-slate-50'
                  }`}
                >
                  🇪🇺 EN (EUR)
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}