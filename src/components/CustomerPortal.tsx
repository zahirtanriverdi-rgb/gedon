import React, { useState } from 'react';
import { Tour, TourSlot, Booking, Review, TourCategory, TourDifficulty, User } from '../types';
import { TourWeatherForecast } from './TourWeatherForecast';
import { GpsTrackVisualizer } from './GpsTrackVisualizer';
import FAQPage from './FAQPage';
import OrganizerProfile from './OrganizerProfile';
import { SearchDropdown } from './SearchDropdown';
import { PriceCalculator } from './PriceCalculator';
import { getRecentSearches, addRecentSearch } from '../utils/recentSearches';
import { getWishlist, toggleWishlist } from '../utils/wishlist';
import { REVIEWS_ENABLED } from '../config/features';
import { 
  Search, 
  MapPin, 
  Compass, 
  Calendar, 
  User as UserIcon, 
  Activity, 
  CheckCircle, 
  Star, 
  X, 
  Check, 
  CreditCard,
  AlertCircle,
  MessageCircle,
  Copy,
  Share2,
  ChevronLeft,
  ChevronRight,
  Play,
  Plane,
  Heart,
  Clock,
  Users,
  Grid2X2,
  ChevronDown,
  Globe,
  Minus,
  Loader2
} from 'lucide-react';

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
}

// Curated packing lists shown after the simulated AI "thinking" delay, keyed by hiking experience level
const PACKING_LISTS: Record<'beginner' | 'pro', string[]> = {
  beginner: [
    'Yoxuş və enişlərdə dizlərə düşən yükü azaltmaq üçün teleskopik yürüş çubuqları',
    'Relyefə uyğun, topuğu tutan və sürüşməyən Gore-Tex membranlı peşəkar yürüş botları',
    'Cığır kənarlarındakı tikanlardan, kiçik daşlardan və nəm otlardan qorunmaq üçün yürüş qamaşları',
    'Tərləmənin qarşısını alan və tez quruyan sintetik idman geyimləri və ya yüngül termal alt paltarı',
    'Hər ehtimala qarşı, yürüşün gec saatlara qalma ehtimalı üçün alın fənəri (ehtiyat batareyaları ilə)',
    'Zirvə küləyinə qarşı boyunluq (buff) və yüngül küləkkeçirməz membran əlcəklər'
  ],
  pro: [
    'Eniş və yoxuşlarda dizləri qorumaq üçün cüt teleskopik yürüş çubuqları (baston).',
    'Daşlıq və torpaq relyefdə ayaq biləyini möhkəm saxlayan, sukeçirməyən yarımboğaz trekking botları.',
    'Zirvədəki güclü küləyə qarşı nəfəs ala bilən membran materialdan (Windstopper və ya Gore-Tex) küləklik.',
    'Nəmi bədədndən uzaqlaşdıran sürətlə quruyan sintetik idman köynəkləri və ya termal altlıq.',
    'Hər ehtimala qarşı qəfil duman və ya ləngimələr üçün ehtiyat batareyalı alın fənəri.',
    'Boynu və üzü küləkdən qorumaq üçün yüngül baf (buff) və fərdi ilk yardım dəsti.'
  ]
};

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
  appLanguage = 'az'
}: CustomerPortalProps) {
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

  // Helper calculation for Volleyball & Adventure sports
  const getActiveCalculatedPrice = () => {
    if (!selectedSlot || !selectedTour) return { perPerson: 0, total: 0, qty: 1, desc: '' };
    
    let perPerson = selectedSlot.price;
    const descParts: string[] = [];
    
    if (selectedTour.category === 'active' || selectedTour.isActiveLife) {
      if (selectedTour.equipmentIncluded && usingOwnEquipment) {
        const discount = selectedTour.equipmentRentalPrice || 10;
        perPerson = Math.max(0, perPerson - discount);
        descParts.push(`Öz avadanlığı endirimi (-${discount} ${selectedTour.priceCurrency || 'AZN'})`);
      } else if (!selectedTour.equipmentIncluded && rentEquipment) {
        const rental = selectedTour.equipmentRentalPrice || 15;
        perPerson = perPerson + rental;
        descParts.push(`Avadanlıq kirayəsi (+${rental} ${selectedTour.priceCurrency || 'AZN'})`);
      }
    }
    
    const qty = bookingRegType === 'team' ? 6 : bookingQty;
    const total = perPerson * qty;
    
    return {
      perPerson,
      total,
      qty,
      desc: descParts.join(', ')
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
  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

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

  // Use this function to navigate to a tour or reset back to home
  // (booking flow state itself is reset by the effect below whenever selectedTour changes)
  const handleTourClick = (tour: Tour | null) => {
    if (tour) {
      window.history.pushState({}, '', `/tours/${tour.id}`);
      setSelectedTour(tour);
    } else {
      window.history.pushState({}, '', '/');
      setSelectedTour(null);
    }
  };

  React.useEffect(() => {
    if (selectedTour) {
      setActivePreviewImage(selectedTour.image);
    } else {
      setActivePreviewImage(null);
    }
  }, [selectedTour]);
  const [isDescExpanded, setIsDescExpanded] = useState<boolean>(false);
  const [selectedSlot, setSelectedSlot] = useState<TourSlot | null>(null);
  const [bookingQty, setBookingQty] = useState<number>(1);
  const [showParticipantsDropdown, setShowParticipantsDropdown] = useState<boolean>(false);
  const [showDateDropdown, setShowDateDropdown] = useState<boolean>(false);
  const [showTourSlots, setShowTourSlots] = useState<boolean>(false);

  // Keep participant count within the capacity of whichever slot is currently selected,
  // so the sticky sidebar and the booking form below always agree on the same numbers.
  React.useEffect(() => {
    if (selectedSlot) {
      const availableCapacity = Math.max(1, selectedSlot.capacity - selectedSlot.bookedCount);
      setBookingQty(prev => Math.min(Math.max(1, prev), availableCapacity));
    }
  }, [selectedSlot]);
  const [paymentGateway, setPaymentGateway] = useState<string>('whatsapp');
  const [isBookingStep, setIsBookingStep] = useState<boolean>(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState<boolean>(false);

  // Scroll to the booking form once it actually exists in the DOM. Doing this in the click
  // handler that opens it doesn't work — setIsBookingStep(true) is an async state update, so
  // the #booking-form-section node isn't rendered yet at the time of that click.
  React.useEffect(() => {
    if (isBookingStep) {
      const formEl = document.getElementById('booking-form-section');
      if (formEl) formEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isBookingStep]);

  // Same DOM-timing reasoning as above: scroll to the tour-slots-calendar section only after
  // showTourSlots flips to true and React has actually rendered it.
  React.useEffect(() => {
    if (showTourSlots) {
      const el = document.getElementById('tour-slots-calendar');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [showTourSlots]);
  const [bookingSubmitError, setBookingSubmitError] = useState<string | null>(null);
  const [bookingSuccessData, setBookingSuccessData] = useState<any>(null);

   // Guest booking details (replacing previous registration requirement)
  const [bookingCustomerName, setBookingCustomerName] = useState<string>('');
  const [bookingCustomerPhone, setBookingCustomerPhone] = useState<string>('');
  const [verificationOtpCode, setVerificationOtpCode] = useState<string>('');
  const [userInputOtp, setUserInputOtp] = useState<string>('');
  const [isOtpSent, setIsOtpSent] = useState<boolean>(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState<boolean>(false);
  const [showIncomingOtpBanner, setShowIncomingOtpBanner] = useState<boolean>(false);

  // New Active Lifestyle Booking States
  const [usingOwnEquipment, setUsingOwnEquipment] = useState<boolean>(false);
  const [rentEquipment, setRentEquipment] = useState<boolean>(false);
  const [bookingRegType, setBookingRegType] = useState<'individual' | 'team'>('individual');
  const [bookingTeamName, setBookingTeamName] = useState<string>('');
  const [bookingTeamMembers, setBookingTeamMembers] = useState<Array<{ name: string; phone: string }>>([
    { name: '', phone: '' },
    { name: '', phone: '' },
    { name: '', phone: '' },
    { name: '', phone: '' },
    { name: '', phone: '' }
  ]);
  const [safetyAcknowledged, setSafetyAcknowledged] = useState<boolean>(false);

  // Reset the whole booking flow whenever the user switches to a different tour (or closes one),
  // so leftover participant counts / selected dates / form fields don't leak between tours.
  React.useEffect(() => {
    setSelectedSlot(null);
    setBookingQty(1);
    setShowParticipantsDropdown(false);
    setShowDateDropdown(false);
    setShowTourSlots(false);
    setIsBookingStep(false);
    setBookingSuccessData(null);
    setBookingCustomerName('');
    setBookingCustomerPhone('');
    setVerificationOtpCode('');
    setUserInputOtp('');
    setIsOtpSent(false);
    setIsPhoneVerified(false);
    setShowIncomingOtpBanner(false);
    setUsingOwnEquipment(false);
    setRentEquipment(false);
    setBookingRegType('individual');
    setBookingTeamName('');
    setBookingTeamMembers([
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' }
    ]);
    setSafetyAcknowledged(false);
  }, [selectedTour?.id]);

  // New review state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [selectedBookingForReview, setSelectedBookingForReview] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSubmitError, setReviewSubmitError] = useState<string | null>(null);

  // AI Smart packing states
  const [packingExperienceMap, setPackingExperienceMap] = useState<Record<string, 'beginner' | 'pro' | null>>({});
  const [packingAnalyzingMap, setPackingAnalyzingMap] = useState<Record<string, boolean>>({});
  const [checkedPackingItems, setCheckedPackingItems] = useState<Record<string, boolean>>({});

  // Quick WhatsApp opening helper
  const handleQuickWhatsApp = (tour: Tour, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Quick lead metrics integration
    fetch('/api/bookings/whatsapp-click', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tourId: tour.id,
        startDate: (slots.filter(s => s.tourId === tour.id)[0]?.startDate) || "Tezliklə",
        participantsCount: 1,
        vendorId: tour.vendorId || "vendor-default",
        booking_reference: `QL-${Math.floor(1000 + Math.random() * 9000)}`
      })
    }).catch(err => console.warn('Lead metrics offline:', err));

    const targetWa = tour.whatsapp_number 
      ? tour.whatsapp_number.replace(/[\s\+]+/g, '') 
      : '994706717804';
    const text = `Salam! GedəkGörək saytından '${tour.name}' turu haqqında məlumat və rezervasiya daxil etmək istəyirəm. Zəhmət olmasa köməklik edərdiniz.`;
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${targetWa}&text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Simulate an AI "thinking" delay before revealing the packing list for the chosen experience level
  const handlePackingExperienceSelect = (tourId: string, choice: 'beginner' | 'pro') => {
    setPackingExperienceMap(prev => ({ ...prev, [tourId]: choice }));
    setPackingAnalyzingMap(prev => ({ ...prev, [tourId]: true }));
    setTimeout(() => {
      setPackingAnalyzingMap(prev => ({ ...prev, [tourId]: false }));
    }, 1200);
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

  // Azerbaijani months names dictionary with correct letters (İyun, İyul)
  const AZ_MONTHS: Record<string, string> = React.useMemo(() => ({
    '01': 'Yanvar',
    '02': 'Fevral',
    '03': 'Mart',
    '04': 'Aprel',
    '05': 'May',
    '06': 'İyun',
    '07': 'İyul',
    '08': 'Avqust',
    '09': 'Sentyabr',
    '10': 'Oktyabr',
    '11': 'Noyabr',
    '12': 'Dekabr'
  }), []);

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
    let subscriptionValid = true;

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
    const monthNames = [
      'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun', 
      'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
    ];
    const uniqueMonths = new Set<string>();
    tourSlots.forEach(slot => {
      try {
        const parts = slot.startDate.split('-');
        if (parts.length >= 2) {
          const monthNum = parseInt(parts[1], 10);
          if (monthNum >= 1 && monthNum <= 12) {
            uniqueMonths.add(monthNames[monthNum - 1]);
          }
        }
      } catch (e) {
        // ignore
      }
    });
    return Array.from(uniqueMonths);
  };

  // Open booking sub-section
  const handleOpenBooking = (slot: TourSlot) => {
    setSelectedSlot(slot);
    setIsBookingStep(true);
    setBookingCustomerName('');
    setBookingCustomerPhone('');
    setVerificationOtpCode('');
    setUserInputOtp('');
    setIsOtpSent(false);
    setIsPhoneVerified(false);
    setShowIncomingOtpBanner(false);
    
    // Active Lifestyle States Reset
    setUsingOwnEquipment(false);
    setRentEquipment(false);
    setBookingRegType('individual');
    setBookingTeamName('');
    setBookingTeamMembers([
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' },
      { name: '', phone: '' }
    ]);
    setSafetyAcknowledged(false);
  };

  // Share Tour layout helper
  const handleShareTour = (tour: Tour, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation(); // prevent opening details when clicking share on the card
    }
    const tourSlots = slots.filter(s => s.tourId === tour.id);
    const minPrice = tourSlots.length > 0 ? Math.min(...tourSlots.map(s => s.price)) : 25;
    
    const text = `*GEDƏKGÖRƏK - TUR PAYLAŞIMI*\n\n- *Turun adi:* ${tour.name}\n- *Region:* ${tour.region}\n- *Muddet:* ${tour.durationDays} Gun\n- *Qiymet:* ${minPrice} AZN-den\n- *Kateqoriya:* ${tour.category === 'hiking' ? 'Yurus / Hiking' : tour.category === 'camp' ? 'Kamp' : 'Zirve'}\n- *Teskilatci:* ${tour.vendorName}\n\n*Tur haqqinda:* ${tour.description.slice(0, 180)}...\n\n*Etrafli melumat ve bilet sifarisi ucun platformani ziyaret edin:* ${window.location.origin}\n\nTebietde unudulmaz anlar kecirmek ucun biletinizi derhal platforma uzerinden elde edin!`;

    navigator.clipboard.writeText(text).then(() => {
      if (onShowNotification) {
        onShowNotification('Möhtəşəm tur məlumatları panoya kopyalandı! Eyni zamanda paylaşım üçün WhatsApp yönləndirilir. 📋✨', 'success');
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
        onShowNotification('WhatsApp paylaşım pəncərəsi uğurla aktivləşdirildi! 🌿', 'success');
      }
    });
  };

  // Generate and send code to WhatsApp simulated logic
  const handleSendVerificationCode = () => {
    if (!bookingCustomerName.trim()) {
      if (onShowNotification) onShowNotification('Sifarişi tamamlamaq üçün Ad və Soyadınızı daxil edin.', 'warning');
      return;
    }
    if (!bookingCustomerPhone.trim()) {
      if (onShowNotification) onShowNotification('Sifarişi tamamlamaq üçün WhatsApp əlaqə nömrənizi daxil edin.', 'warning');
      return;
    }

    // Clean Phone value
    const cleanPhone = bookingCustomerPhone.replace(/\D/g, '');
    if (cleanPhone.length < 7) {
      if (onShowNotification) onShowNotification('Mötəbər bir WhatsApp nömrəsi daxil edin (məsələn: +994 50 123 45 67).', 'warning');
      return;
    }

    const generatedCode = String(Math.floor(1000 + Math.random() * 9000));
    setVerificationOtpCode(generatedCode);
    setIsOtpSent(true);
    setUserInputOtp('');
    setIsPhoneVerified(false);
    setShowIncomingOtpBanner(true);

    if (onShowNotification) {
      onShowNotification(`Təsdiq kodu (${generatedCode}) WhatsApp nömrənizə göndərildi!`, 'success');
    }
  };

  const handleVerifyOtp = () => {
    if (!userInputOtp.trim()) {
      if (onShowNotification) onShowNotification('Zəhmət olmasa daxil olan 4 rəqəmli kodu yazın.', 'warning');
      return;
    }
    if (userInputOtp === verificationOtpCode) {
      setIsPhoneVerified(true);
      setShowIncomingOtpBanner(false);
      if (onShowNotification) {
        onShowNotification('Əla! WhatsApp nömrəniz uğurla təsdiqləndi. İndi rezervasiyanı tamamlaya bilərsiniz! ✅', 'success');
      }
    } else {
      setIsPhoneVerified(false);
      if (onShowNotification) {
        onShowNotification('Təsdiq kodu yanlışdır! Zəhmət olmasa yenidən yoxlayın.', 'error');
      }
    }
  };

  // Check which user bookings are eligible for leaving a review (must be Paid and not reviewed yet)
  const userEligibleBookings = bookings.filter(b => {
    const alreadyReviewed = reviews.some(r => r.bookingId === b.id);
    return b.customerId === currentUser.id && b.status === 'paid' && !alreadyReviewed;
  });

  // State for WhatsApp redirection status
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);

  // WhatsApp click & lead tracking plus auto-redirection with exactly 1-second delay
  const handleProceedBookingSimulate = async () => {
    if (!selectedSlot || !selectedTour) return;

    // Generate custom unique booking_reference of format TUR-XXXX
    const randomRefNum = Math.floor(Math.random() * 9000 + 1000); // 1000 to 9999
    const bookingRef = `TUR-${randomRefNum}`;
    
    // Dynamic price calculation
    const priceDetails = getActiveCalculatedPrice();
    const finalQty = priceDetails.qty;
    const totalCost = getConvertedPriceInfo(priceDetails.total, selectedTour.priceCurrency).azn;

    setIsProcessingPayment(true);
    setIsRedirecting(true);
    setBookingSubmitError(null);

    // 1. Submit Click Metrics & Lead Stats to backend `/api/bookings/whatsapp-click`
    try {
      await fetch('/api/bookings/whatsapp-click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          tourId: selectedTour.id,
          startDate: selectedSlot.startDate,
          participantsCount: finalQty,
          vendorId: selectedTour.vendorId,
          booking_reference: bookingRef
        })
      });
      console.log(`Backend Lead Tracking logged successfully for #${bookingRef}`);
    } catch (e) {
      console.error('Click tracking API error:', e);
    }

    // 2. Create the real booking record via the API (server/db.ts — Postgres or SQLite)
    const bId = 'book-' + Math.floor(Math.random() * 90000 + 10000);
    const newBooking: Booking = {
      id: bId,
      slotId: selectedSlot.id,
      tourId: selectedTour.id,
      customerId: 'guest-' + Math.floor(Math.random() * 90000 + 10000),
      customerName: bookingCustomerName.trim() || currentUser.name,
      customerPhone: bookingCustomerPhone.trim() || currentUser.phone,
      bookingDate: new Date().toISOString().split('T')[0],
      participantsCount: finalQty,
      totalAmount: totalCost,
      status: 'pending', // Stored as Pending status until operator confirms
      paymentMethod: 'whatsapp',
      booking_reference: bookingRef,
      smsNotificationSent: false,

      // Active Lifestyle custom properties
      isTeamBooking: (selectedTour.category === 'active' || selectedTour.isActiveLife) && bookingRegType === 'team',
      teamName: bookingRegType === 'team' ? bookingTeamName : undefined,
      teamMembers: bookingRegType === 'team' ? bookingTeamMembers.filter(m => m.name.trim() !== '') : undefined,
      usingOwnEquipment: usingOwnEquipment
    };

    try {
      // onAddBooking POSTs to /api/bookings and already updates the slot's bookedCount
      // locally from the server's response, so there's no separate increment call here.
      await onAddBooking(newBooking);
    } catch (e: any) {
      setIsProcessingPayment(false);
      setIsRedirecting(false);
      setBookingSubmitError(e?.message || 'Rezervasiya göndərilərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
      return;
    }

    if (onShowNotification) {
      onShowNotification('Statistika qeydə alındı! WhatsApp-a yönləndirilirsiniz...', 'info');
    }

    // 3. Exactly 1-second wait before auto-direction: "Müştəri WhatsApp-a yönləndirilməzdən tam bir saniyə öncə arxa planda klik statistikasını tutmalıyq."
    setTimeout(() => {
      setIsProcessingPayment(false);
      setIsRedirecting(false);

      // Raw message formatting
      let msgText = `Salam, mən saytınızdan '${selectedTour.name}' üçün rezervasiya etmək istəyirəm.\nTarix: ${selectedSlot.startDate}.\nYer sayı: ${finalQty} nəfər.\nSifariş ID: #${bookingRef}.\nAd Soyad: ${bookingCustomerName.trim() || currentUser.name}.\nƏlaqə nömrəsi: ${bookingCustomerPhone.trim() || currentUser.phone}`;
      
      if (selectedTour.category === 'active' || selectedTour.isActiveLife) {
        msgText += `\n\n📌 *İdman Qeydiyyat Növü:* ${bookingRegType === 'team' ? `Komandalı qeydiyyat (Komanda adı: ${bookingTeamName || 'Göstərilməyib'})` : 'Fərdi qeydiyyat'}`;
        
        if (bookingRegType === 'team') {
          const filledMembers = bookingTeamMembers.filter(m => m.name.trim());
          if (filledMembers.length > 0) {
            msgText += `\n👥 *Komanda Üzvləri:*`;
            filledMembers.forEach((m, i) => {
              msgText += `\n  - ${i + 2}. ${m.name} (${m.phone})`;
            });
          }
        }
        
        if (selectedTour.equipmentIncluded) {
          msgText += `\n🎒 *Avadanlıq:* ${usingOwnEquipment ? 'Öz şəxsi avadanlığım var (Endirimli)' : 'Təşkilatçının daxil etdiyi pulsuz avadanlıq'}`;
        } else {
          msgText += `\n🎒 *Avadanlıq:* ${rentEquipment ? 'Kirayə etmək istəyirəm (Ödənişli)' : 'Öz şəxsi avadanlığım var'}`;
        }
        
        msgText += `\n⚖️ *Təhlükəsizlik razılığı:* Təsdiq edildi ✅`;
      }

      // Driver/Guide specific direct whatsapp number or fallback +994706717804
      const targetWa = selectedTour.whatsapp_number 
        ? selectedTour.whatsapp_number.replace(/\s+/g, '') 
        : '+994706717804';

      const waUrl = `https://wa.me/${targetWa}?text=${encodeURIComponent(msgText)}`;
      
      // Safe external routing
      window.open(waUrl, '_blank');

      // Set success visuals
      setBookingSuccessData({
        bookingId: bId,
        bookingRef: bookingRef,
        tourName: selectedTour.name,
        date: selectedSlot.startDate,
        amount: totalCost,
        method: 'whatsapp',
        waNumber: targetWa,
        waMessage: msgText
      });
    }, 1000);
  };

  // Write review linked with paid booking ID
  const handleAddReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBookingForReview || !reviewComment.trim()) return;

    const targetBooking = bookings.find(b => b.id === selectedBookingForReview);
    if (!targetBooking) return;

    const newRev: Review = {
      id: 'rev-' + Math.floor(Math.random() * 90000 + 10000),
      tourId: targetBooking.tourId,
      bookingId: targetBooking.id,
      customerId: currentUser.id,
      customerName: currentUser.name,
      rating: reviewRating,
      comment: reviewComment,
      createdAt: new Date().toISOString(),
      verifiedAttendee: true // Guaranteed because it links to a PAID booking id
    };

    setIsSubmittingReview(true);
    setReviewSubmitError(null);
    try {
      await onAddReview(newRev);
      setReviewComment('');
      setSelectedBookingForReview('');
    } catch (e: any) {
      setReviewSubmitError(e?.message || 'Rəy göndərilərkən xəta baş verdi. Zəhmət olmasa yenidən cəhd edin.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  return (
    <>
      {activeView === 'calculator' && (
        <div className="bg-slate-50 min-h-screen">
          <PriceCalculator onBack={() => setActiveView('home')} />
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
          onTourClick={(tour) => {
            setSelectedTour(tour);
            setIsDescExpanded(false);
          }} 
        />
      )}

      {activeView === 'wishlist' && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
              <Heart className="w-5 h-5 text-rose-600 fill-rose-600" /> İstəklərim
            </h2>
            <button
              type="button"
              onClick={() => setActiveView('home')}
              className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              ← Turlara qayıt
            </button>
          </div>

          {wishlistTours.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
              <Heart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
              <p className="text-sm text-slate-500 font-medium">Hələ heç bir tur istəklərinizə əlavə etməmisiniz.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistTours.map(tour => (
                <div
                  key={tour.id}
                  onClick={() => { setSelectedTour(tour); setActiveView('home'); setIsDescExpanded(false); }}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group"
                >
                  <div className="relative h-40">
                    <img src={tour.image || undefined} className="w-full h-full object-cover" alt={tour.name} referrerPolicy="no-referrer" />
                    <button
                      type="button"
                      onClick={(e) => handleToggleWishlist(tour.id, e)}
                      className="absolute top-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-md transition cursor-pointer"
                      title="İstəklərdən çıxar"
                    >
                      <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
                    </button>
                  </div>
                  <div className="p-4 space-y-1">
                    <h4 className="font-bold text-sm text-slate-800 truncate">{tour.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-emerald-500" /> {tour.region}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeView === 'home' && !selectedTour && (
        <div className="space-y-4">

          {/* Search & Filters (Clean Minimalism Style) */}
          {/* z-30 (not z-10): this wrapper's z-index caps the stacking context for the
              suggestions dropdown inside it, so it must outrank the tour cards' own
              z-10 share buttons below or the dropdown gets painted underneath them. */}
          <div className="flex flex-col items-center justify-center py-2 mb-2 relative z-30 w-full animate-fadeIn">
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-800 mb-4 tracking-tight text-center">{t('discoverTours')}</h2>
            
            {/* Main Pill Search Box & Budget Calculator */}
            <div className="flex flex-col sm:flex-row items-center w-full max-w-3xl gap-2 mb-4 relative">
              <div ref={searchContainerRef} className="relative w-full bg-white shadow-md rounded-full p-1 border border-slate-200 flex items-center flex-1">
                <div className="pl-4 pr-2 flex items-center flex-1">
                   <Search className="text-slate-400 w-4 h-4 mr-3 flex-shrink-0" />
                   <input
                     type="text"
                     placeholder={t('searchPlaceholder')}
                     value={currentSearchQuery}
                     onChange={(e) => handleSearchChange(e.target.value)}
                     onFocus={() => setIsSearchFocused(true)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         recordSearch(currentSearchQuery);
                         setIsSearchFocused(false);
                       }
                     }}
                     className="w-full py-2.5 bg-transparent text-slate-700 text-[13px] focus:outline-none font-medium placeholder-slate-400"
                   />
                </div>
                <button
                  onClick={() => {
                    recordSearch(currentSearchQuery);
                    setIsSearchFocused(false);
                    const toursSection = document.getElementById('tours-list');
                    if(toursSection) {
                      const yOffset = -100;
                      const y = toursSection.getBoundingClientRect().top + window.pageYOffset + yOffset;
                      window.scrollTo({top: y, behavior: 'smooth'});
                    }
                  }}
                  className="bg-primary-500 hover:bg-primary-600 text-white font-bold py-2.5 px-6 rounded-full transition-colors flex-shrink-0 text-xs shadow-md"
                >
                  {t('searchButton')}
                </button>

                {/* Suggestions Dropdown */}
                {isSearchFocused && (
                  <SearchDropdown
                    query={currentSearchQuery}
                    tours={tours}
                    recentSearches={recentSearches}
                    onSelect={(val) => {
                      handleSearchChange(val);
                      recordSearch(val);
                      setIsSearchFocused(false);
                    }}
                    appLanguage={appLanguage}
                  />
                )}
              </div>

              {/* Budget Calculator Button */}
              <button
                onClick={() => {
                  setActiveView('calculator');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="bg-white hover:bg-slate-50 text-slate-800 font-bold py-3.5 px-5 rounded-full transition-colors flex-shrink-0 text-sm shadow-sm flex items-center justify-center gap-2 border border-slate-300 w-full sm:w-auto"
              >
                <span>🧮</span>
                <span className="whitespace-nowrap">Qrup üçün qiymət hesabla</span>
              </button>
            </div>

            {/* Segmented Category Pill Selectors directly below */}
            <div className="flex flex-wrap justify-center items-center gap-2 max-w-3xl mb-4">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                  selectedCategory === 'all' 
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                🌍 Bütün Turlar
              </button>
              <button
                onClick={() => setSelectedCategory('peak')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  selectedCategory === 'peak' 
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                🏔️ Zirvə
              </button>
              <button
                onClick={() => setSelectedCategory('camp')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  selectedCategory === 'camp' 
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                ⛺ Kamp
              </button>
              <button
                onClick={() => setSelectedCategory('hiking')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5 ${
                  selectedCategory === 'hiking' 
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                🥾 Hiking
              </button>
              <button
                onClick={() => setSelectedCategory('active')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border relative flex items-center gap-1.5 ${
                  selectedCategory === 'active' 
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                🏃‍♂️ Aktiv Həyat
                <span className="absolute -top-2 -right-1 bg-primary-100 text-primary-700 text-[9px] px-1.5 py-0.5 rounded-full font-black scale-90 shadow-sm">YENİ</span>
              </button>
              <button
                onClick={() => setSelectedCategory('international')}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border relative flex items-center gap-1.5 ${
                  selectedCategory === 'international' 
                    ? 'bg-primary-500 text-white border-primary-500 shadow-sm' 
                    : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                ✈️ Xarici Turlar
                <span className="absolute -top-2 -right-1 bg-accent-orange-100 text-accent-orange-700 text-[9px] px-1.5 py-0.5 rounded-full font-black scale-90 shadow-sm">HOT</span>
              </button>
            </div>

            {/* Expandable Advanced Filters Toggle Button */}
            <button 
              onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
              className="mt-2 text-xs font-bold text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            >
              {isFiltersExpanded ? 'Gizlət' : 'Geniş Axtarış Filtrləri'} 
              <svg className={`w-3 h-3 transition-transform ${isFiltersExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Expandable Extra Filters */}
            {isFiltersExpanded && (
              <div className="w-full max-w-4xl bg-white p-5 rounded-2xl border border-slate-200 shadow-lg mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-fadeIn">
                {/* Difficulty Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Çətinlik dərəcəsi</label>
                  <select
                    value={selectedDifficulty}
                    onChange={(e) => setSelectedDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="all">{t('allLevels')}</option>
                    <option value="easy">Asan (Easy)</option>
                    <option value="medium">Orta (Medium)</option>
                    <option value="hard">Çətin (Hard)</option>
                    <option value="extreme">Ekstremal (Extreme)</option>
                  </select>
                </div>

                {/* Region Filter */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Regionlar</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="all">{t('everywhere')}</option>
                    {uniqueRegions.map(reg => (
                      <option key={reg} value={reg}>{reg}</option>
                    ))}
                  </select>
                </div>

                {/* Tarix Filtri (Təqvim) */}
                <div className="relative">
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Tarix seçimi (Təqvim)</label>
                  <button
                    type="button"
                    id="calendar-toggle-btn"
                    onClick={() => setShowCalendarWidget(!showCalendarWidget)}
                    className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold text-left flex items-center justify-between transition-colors focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer ${
                      showCalendarWidget || calendarDateStart 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-300' 
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">
                      {calendarDateStart 
                        ? `${calendarDateStart}${calendarDateEnd ? ` ➡️ ${calendarDateEnd}` : ''}`
                        : 'Müəyyən tarix'
                      }
                    </span>
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                  </button>

                  {/* Absolute positioning for visual monthly calendar so it pops out of grid */}
                  {showCalendarWidget && (
                    <div ref={calendarContainerRef} className="absolute z-50 left-0 mt-1 top-full bg-white px-5 py-4 rounded-xl border border-slate-200 shadow-xl w-72 animate-fade-in font-sans">
                      <div className="flex items-center justify-between mb-4">
                        <button 
                          type="button"
                          onClick={handleCalendarPrevMonth}
                          className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          &larr;
                        </button>
                        <h4 className="text-xs font-extrabold text-slate-850 tracking-wider">
                          {(() => {
                            const [y, m] = currentMonthView.split('-');
                            return `${AZ_MONTHS[m] || m} ${y}`;
                          })()}
                        </h4>
                        <div className="flex items-center gap-1.5">
                          <button 
                            type="button"
                            onClick={handleCalendarNextMonth}
                            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            &rarr;
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-bold text-slate-400">
                        {['B.e','Ç.a','Ç','C.a','C','Ş','B'].map(day => (
                          <div key={day}>{day}</div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold">
                        {(() => {
                          const [yearStr, monthStr] = currentMonthView.split('-');
                          const year = parseInt(yearStr, 10);
                          const month = parseInt(monthStr, 10) - 1;

                          const firstDayOfMonth = new Date(year, month, 1);
                          let startOffset = firstDayOfMonth.getDay() - 1;
                          if (startOffset < 0) startOffset = 6; 

                          const lastDayOfMonth = new Date(year, month + 1, 0);
                          const totalDays = lastDayOfMonth.getDate();

                          const totalCells = [];
                          for (let i = 0; i < startOffset; i++) {
                            totalCells.push(<div key={`empty-${i}`} className="py-2 text-transparent">.</div>);
                          }
                          for (let d = 1; d <= totalDays; d++) {
                            const dayStr = String(d).padStart(2, '0');
                            const fullDayStr = `${currentMonthView}-${dayStr}`;
                            const hasActiveSlots = slots.some(s => s.tourId && s.startDate === fullDayStr && tours.some(t => t.id === s.tourId && t.isActive !== false));
                            const isStart = calendarDateStart === fullDayStr;
                            const isEnd = calendarDateEnd === fullDayStr;
                            const isWithinRange = calendarDateStart && calendarDateEnd && fullDayStr > calendarDateStart && fullDayStr < calendarDateEnd;

                            let cellClass = "py-1.5 rounded-lg cursor-pointer transition select-none ";
                            if (isStart || isEnd) {
                              cellClass += "bg-emerald-600 text-white font-bold scale-102 shadow-xs";
                            } else if (isWithinRange) {
                              cellClass += "bg-emerald-100 text-emerald-800 font-bold";
                            } else if (hasActiveSlots) {
                              cellClass += "bg-emerald-50 hover:bg-emerald-100 text-slate-800 border border-emerald-250 font-bold";
                            } else {
                              cellClass += "text-slate-400 hover:bg-slate-50";
                            }

                            totalCells.push(
                              <div 
                                key={fullDayStr} 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCalendarDayClick(fullDayStr);
                                }}
                                className={cellClass}
                                title={hasActiveSlots ? 'Aktiv Səfərlər var 🌿' : 'Səfər yoxdur'}
                              >
                                <div className="relative flex flex-col items-center">
                                  <span>{d}</span>
                                  {hasActiveSlots && !isStart && !isEnd && !isWithinRange && (
                                    <span className="w-1 h-1 bg-emerald-600 rounded-full mt-0.5 animate-pulse"></span>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          return totalCells;
                        })()}
                      </div>
                      
                      {calendarDateStart && (
                        <button
                           type="button"
                           onClick={(e) => {
                             e.stopPropagation();
                             setCalendarDateStart('');
                             setCalendarDateEnd('');
                           }}
                           className="w-full mt-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[10px] rounded-lg transition"
                        >
                          Sıfırla
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Sıralama Dropdown Menu */}
                <div>
                  <label className="block text-[10px] font-black text-slate-500 tracking-wider mb-1">SIRALAMA</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-600 cursor-pointer"
                  >
                    <option value="default">Varsayılan Sıralama</option>
                    <option value="price-asc">Qiymətə: Ucuzdan bahaya</option>
                    <option value="price-desc">Qiymətə: Bahadan ucuza</option>
                    <option value="diff-asc">Çətinliyə: Asandan çətinə</option>
                    <option value="diff-desc">Çətinliyə: Çətindən asana</option>
                    <option value="date-asc">Tarixə: Ən yaxın tarix</option>
                    <option value="date-desc">Tarixə: Ən uzaq tarix</option>
                  </select>
                </div>

                {/* Max Price Range Slider */}
                <div className="flex flex-col justify-end">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1.5">
                    <span>Maksimum Qiymət</span>
                    <span className="text-blue-700 font-extrabold">{maxPrice} ₼</span>
                  </div>
                  <div className="py-1">
                    <input 
                      type="range" 
                      min="20" 
                      max={maxPriceLimit} 
                      value={maxPrice} 
                      onChange={(e) => setMaxPrice(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer h-1 bg-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Horizontal Slider for Upcoming Tours (Minimal) */}
          {uniqueUpcomingTours.length > 0 && (
              <div className="mb-2 w-full max-w-[1400px] mx-auto animate-fadeIn relative">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h3 className="text-sm font-extrabold text-slate-800 tracking-tight flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    {t('upcomingTours')}
                  </h3>
                </div>

                <div className="relative group">
                  {uniqueUpcomingTours.length > 3 && upcomingScrollLeft > 5 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const slider = document.getElementById('upcoming-tours-slider');
                        if(slider) slider.scrollBy({ left: -300, behavior: 'smooth' });
                      }}
                      className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 md:-ml-4 z-10 bg-primary-500 text-white p-2.5 rounded-full shadow-lg hover:bg-primary-600 transition-colors flex items-center justify-center border-2 border-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                  )}
                  {/* Horizontal slider container */}
                  <div
                    id="upcoming-tours-slider"
                    onScroll={(e) => setUpcomingScrollLeft(e.currentTarget.scrollLeft)}
                    className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scroll-smooth w-full pr-4 md:pr-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                    {uniqueUpcomingTours.map(({ tour, slot }) => (
                      <div 
                        key={tour.id}
                        onClick={() => { setSelectedTour(tour); setIsDescExpanded(false); }}
                        className="w-[85%] sm:w-[calc(50%-8px)] md:w-[calc(33.333%-12px)] flex-shrink-0 bg-white border border-slate-200 rounded-[20px] p-3 flex items-center gap-4 snap-start cursor-pointer hover:border-emerald-300 hover:shadow-xl transition-all duration-300 group shadow-sm hover:-translate-y-1"
                      >
                        <div className="w-[84px] h-[84px] rounded-xl overflow-hidden flex-shrink-0 relative shadow-sm border border-slate-100">
                          <img
                            src={tour.image || `https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&q=80&w=200`}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                            alt=""
                          />
                          <button
                            type="button"
                            onClick={(e) => handleToggleWishlist(tour.id, e)}
                            className="absolute top-1 right-1 bg-white/90 hover:bg-white p-1 rounded-full shadow-sm transition cursor-pointer"
                            title={wishlist.includes(tour.id) ? 'İstəklərdən çıxar' : 'İstəklərə əlavə et'}
                          >
                            <Heart className={`w-2.5 h-2.5 ${wishlist.includes(tour.id) ? 'fill-rose-600 text-rose-600' : 'text-slate-600'}`} />
                          </button>
                        </div>
                        <div className="flex flex-col flex-1 justify-center overflow-hidden h-full py-1">
                          <h4 className="text-[14px] font-black text-slate-800 truncate mb-1" title={tour.name}>{tour.name}</h4>
                          <div className="text-[12px] font-bold text-slate-500 mb-2 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{tour.region}</span>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-[11px] font-black text-emerald-800 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md tracking-tight">
                              {slot.startDate}
                          </span>
                          {tour.discountPrice && tour.discountPrice > 0 && tour.discountPrice < (tour.price ?? slot.price) ? (
                            <span className="flex items-baseline gap-1">
                              <span className="line-through text-gray-400 text-[10px]">
                                {getConvertedPriceInfo(tour.price ?? slot.price, tour.priceCurrency).both}
                              </span>
                              <span className="text-[13px] font-black text-rose-600 tracking-tight">
                                {getConvertedPriceInfo(tour.discountPrice, tour.priceCurrency).both}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[13px] font-black text-slate-900 tracking-tight">
                              {getConvertedPriceInfo(slot.price, tour.priceCurrency).both}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                  {uniqueUpcomingTours.length > 3 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        const slider = document.getElementById('upcoming-tours-slider');
                        if(slider) slider.scrollBy({ left: 300, behavior: 'smooth' });
                      }}
                      className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 md:-mr-4 z-10 bg-primary-500 text-white p-2.5 rounded-full shadow-lg hover:bg-primary-600 transition-colors flex items-center justify-center border-2 border-white"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
          )}



        {/* Calendar widget is now embedded inside the expanded filters section. */}


      {/* Grid of Tours */}
      <div id="tours-list">
      {sortedAndFilteredTours.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-200 p-8 space-y-3 shadow-xs">
          <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">{t('noToursFound')}</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {t('noToursDesc')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedAndFilteredTours.map((tour) => {
            const tourSlots = slots.filter(s => s.tourId === tour.id);
            const priceList = tourSlots.map(s => s.price);
            const minPrice = priceList.length > 0 ? Math.min(...priceList) : 25;
            const isSportActive = tour.category === 'active' || tour.isActiveLife;
            const diffColors: Record<TourDifficulty, { bg: string, text: string, label: string }> = {
              easy: { bg: 'bg-emerald-50 text-emerald-850 border border-emerald-100', text: 'text-emerald-800', label: 'Asan' },
              medium: { bg: 'bg-slate-100 text-slate-800 border border-slate-200', text: 'text-slate-800', label: 'Orta' },
              hard: { bg: 'bg-orange-50 text-orange-850 border border-orange-100', text: 'text-orange-800', label: 'Çətin' },
              extreme: { bg: 'bg-red-50 text-red-850 border border-red-100', text: 'text-red-800', label: 'Ekstremal' }
            };

            const badges: Record<TourCategory, { emoji: string, label: string }> = {
              peak: { emoji: '🏔️', label: 'Zirvə' },
              camp: { emoji: '⛺', label: 'Kamp' },
              hiking: { emoji: '🥾', label: 'Hiking' },
              international: { emoji: '✈️', label: 'Xarici' },
              active: { emoji: '🏃‍♂️', label: 'Aktiv Həyat' }
            };

            // Dynamic Active Lifestyle Difficulty override with color codes
            let difficultyBg = diffColors[tour.difficulty]?.bg || 'bg-slate-100 text-slate-800';
            let difficultyLabel = diffColors[tour.difficulty]?.label || 'Orta';

            if (isSportActive) {
              const activeDiff = tour.activeDifficulty || (tour.difficulty === 'easy' ? 'beginner' : tour.difficulty === 'hard' || tour.difficulty === 'extreme' ? 'professional' : 'medium');
              if (activeDiff === 'beginner' || activeDiff === 'easy') {
                difficultyBg = 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold';
                difficultyLabel = '🟢 Başlanğıc';
              } else if (activeDiff === 'medium') {
                difficultyBg = 'bg-yellow-100 text-amber-800 border border-yellow-300 font-bold';
                difficultyLabel = '🟡 Orta';
              } else {
                difficultyBg = 'bg-red-150 bg-red-100 text-red-700 border border-red-200 font-extrabold';
                difficultyLabel = '🔴 Professional';
              }
              
              // Dynamic Sports badge
              if (tour.category === 'active' || tour.isActiveLife) {
                 const tBadge = { emoji: '🏃‍♂️', label: 'Aktiv İdman' };
                 if (tour.activityType === 'volleyball') { tBadge.emoji = '🏐'; tBadge.label = 'Voleybol Turniri'; }
                 else if (tour.activityType === 'running') { tBadge.emoji = '🏃‍♂️'; tBadge.label = 'Qaçış Marafonu'; }
                 else if (tour.activityType === 'ski' || tour.activityType === 'skiing') { tBadge.emoji = '⛷️'; tBadge.label = 'Xizək'; }
                 else if (tour.activityType === 'rafting') { tBadge.emoji = '🚣‍♂️'; tBadge.label = 'Rafting'; }
                 else if (tour.activityType === 'bike' || tour.activityType === 'cycling') { tBadge.emoji = '🚴‍♂️'; tBadge.label = 'Velo-Tur'; }
                 else if (tour.activityType === 'canyon') { tBadge.emoji = '🧗‍♂️'; tBadge.label = 'Kanyoninq'; }
                 else if (tour.activityType === 'other') { tBadge.emoji = '🏆'; tBadge.label = 'İdman Festivalı'; }
                 badges['active'] = tBadge;
              }
            }

            return (
              <div 
                key={tour.id}
                className={`bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer ${tour.isInternational ? 'border-amber-200 ring-1 ring-amber-100/50 bg-gradient-to-b from-amber-500/2 to-transparent' : 'border-slate-200'} ${isSportActive ? 'border-amber-300 bg-gradient-to-tr from-amber-50/10 to-transparent' : ''}`}
                onClick={() => {
                  setSelectedTour(tour);
                  setIsBookingStep(false);
                  setBookingSuccessData(null);
                  setSelectedSlot(null);
                }}
              >
                {/* Tour Image */}
                <div className="relative h-44 overflow-hidden bg-slate-100">
                  <img 
                    src={tour.image || undefined} 
                    alt={tour.name}
                    className="w-full h-full object-cover group-hover:scale-102 transition duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
                    <span className={`text-[10px] font-bold tracking-tight px-2 py-0.5 rounded-md shadow-xs ${tour.isInternational ? 'bg-accent-orange-100 text-accent-orange-800' : 'bg-slate-900/90 text-white'}`}>
                      {badges[tour.category]?.emoji || '✈️'} {badges[tour.category]?.label || 'Xarici'}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs ${difficultyBg}`}>
                      {difficultyLabel}
                    </span>
                  </div>
                  {/* Wishlist + Share button overlay */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <button
                      type="button"
                      onClick={(e) => handleToggleWishlist(tour.id, e)}
                      className="bg-white hover:bg-slate-50 p-1.5 rounded-full shadow-md transition-all hover:scale-110 flex items-center justify-center border border-slate-100 cursor-pointer"
                      title={wishlist.includes(tour.id) ? 'İstəklərdən çıxar' : 'İstəklərə əlavə et'}
                    >
                      <Heart className={`w-3.5 h-3.5 ${wishlist.includes(tour.id) ? 'fill-rose-600 text-rose-600' : 'text-slate-700'}`} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleShareTour(tour, e)}
                      className="bg-white hover:bg-slate-50 text-slate-700 hover:text-emerald-700 p-1.5 rounded-full shadow-md transition-all hover:scale-110 flex items-center justify-center border border-slate-100 cursor-pointer"
                      title="Dostlarınla Paylaş"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {tour.isInternational && (
                    <div className="absolute bottom-10 right-3 bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm">
                      ✈️ Aviabilet {tour.flightIncluded ? 'Daxildir' : 'Daxil deyil'}
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs text-slate-800 px-2 py-0.5 rounded border border-slate-250 text-[10px] font-semibold">
                    📍 {tour.region.split(',')[0]}
                  </div>
                </div>

                {/* Tour Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold tracking-wider">
                      {isSportActive ? (
                        <>
                          <span className="text-amber-600 font-bold">🏅</span>
                          <span>Aktiv İdman • {tour.activityType === 'volleyball' ? 'Voleybol 🏐' : tour.activityType === 'ski' ? 'Xizəkçilik ⛷️' : tour.activityType === 'rafting' ? 'Rafting 🚣‍♂️' : tour.activityType === 'running' ? 'Marafon 🏃‍♂️' : tour.activityType === 'bike' ? 'Velosiped 🚴‍♂️' : 'Macəra 🏆'}</span>
                        </>
                      ) : tour.isInternational ? (
                        <>
                          <Plane className="w-3 h-3 text-amber-500 animate-pulse" />
                          <span>{tour.durationNights || Number(tour.durationDays) - 1} Gecə / {tour.durationDays} Gündüz xarici paket</span>
                        </>
                      ) : (
                        <>
                          <Compass className="w-3 h-3 text-emerald-700" />
                          <span>{tour.durationDays} Günlük yürüş</span>
                        </>
                      )}
                      <span className="text-slate-300">•</span>
                      <span>{tourSlots.length} Aktiv Tarix</span>
                    </div>

                    <h3 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-emerald-700 transition tracking-tight flex items-center gap-1">
                      {isSportActive && (
                        <span className="text-base shrink-0 select-none">
                          {tour.activityType === 'volleyball' ? '🏐' : tour.activityType === 'ski' ? '⛷️' : tour.activityType === 'rafting' ? '🚣‍♂️' : tour.activityType === 'running' ? '🏃‍♂️' : tour.activityType === 'bike' ? '🚴‍♂️' : '🏆'}
                        </span>
                      )}
                      {tour.name}
                    </h3>

                    {isSportActive && (
                      <div className="bg-amber-50/60 border border-amber-100 p-2.5 rounded-xl text-[10px] text-slate-700 flex flex-col gap-1 my-1">
                        <div className="flex justify-between font-bold text-slate-800">
                          <span>🔞 Yaş: <span className="text-amber-800 font-black">{tour.ageLimit || '18-45 yaş'}</span></span>
                          <span className="text-emerald-800 font-extrabold">{tour.equipmentIncluded ? '🎒 Təchizat pulsuz' : '🎒 Təchizat kirayəsi'}</span>
                        </div>
                        {tour.requiredEquipment && (
                          <div className="text-[9px] text-slate-500 truncate">
                            🎒 Lazımdır: <strong className="text-slate-700 font-semibold">{tour.requiredEquipment}</strong>
                          </div>
                        )}
                        {tour.meetingPoint && (
                          <div className="text-[9px] text-slate-500 truncate">
                            📍 Görüş: <strong className="text-slate-700 font-semibold">{tour.meetingPoint}</strong>
                          </div>
                        )}
                      </div>
                    )}

                    {tour.isInternational && (
                      <div className="bg-gradient-to-r from-amber-50/70 to-teal-50/50 border border-amber-200/50 p-2.5 rounded-lg text-[10px] text-slate-650 flex flex-col gap-1 my-1 shadow-4xs">
                        <div className="flex items-center gap-1 leading-none font-bold text-slate-800">
                          🏨 <span className="text-emerald-900 font-black">{tour.hotelName}</span> 
                          <span className="text-amber-500 font-black text-[10px]">
                            {Array(Number(tour.hotelStars || 5)).fill('★').join('')}
                          </span>
                        </div>
                        <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                          <span>🍽️ Qidalanma: {tour.mealType || 'Səhər yeməyi'}</span>
                          <span className="text-emerald-800">✈️ {tour.flightIncluded ? 'Uçuş daxildir' : 'Uçuş daxil deyil'}</span>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {tour.description}
                    </p>

                    {/* Integrated Automatic Online Weather Forecasting */}
                    {tourSlots.length > 0 && (
                      <TourWeatherForecast 
                        dates={tourSlots.map(s => s.startDate)} 
                        region={tour.region} 
                        variant="compact" 
                      />
                    )}
                  </div>

                  {/* Rating & Price row — price is the primary signal, rating secondary, badge tertiary */}
                  <div className="flex items-stretch justify-between gap-3 mt-4 pt-3 border-t border-slate-100">
                    {(() => {
                      const tourMonths = getTourMonths(tour.id);
                      const isTopSeller = Number(getAverageRating(tour.id)) >= 4.5 || getReviewsCount(tour.id) >= 1 || tour.name.toLowerCase().includes('kəpəz') || tour.name.toLowerCase().includes('kuzun');
                      const selectedMonth = tourMonths.length > 0 ? tourMonths[0] : 'May';
                      const starRating = Math.round(Number(getAverageRating(tour.id)));
                      return (
                        <div className="flex flex-col justify-center gap-1.5 min-w-0">
                          {REVIEWS_ENABLED && (
                            <div className="flex items-center gap-0.5" title={`${getAverageRating(tour.id)} rəy xalı`}>
                              {[1, 2, 3, 4, 5].map((starIdx) => {
                                const isFilled = starIdx <= starRating;
                                return (
                                  <Star
                                    key={starIdx}
                                    className={`w-3.5 h-3.5 ${isFilled ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                                  />
                                );
                              })}
                              <span className="text-xs font-bold text-slate-700 ml-1">{getAverageRating(tour.id)}</span>
                              <span className="text-slate-400 text-[10px] font-medium">({getReviewsCount(tour.id)} rəy)</span>
                            </div>
                          )}
                          {isTopSeller && (
                            <span className="bg-amber-50/70 text-amber-700 border border-amber-100 text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-0.5 w-fit" title="Bu ayın ən çox bilet satılan turu!">
                              🔥 {selectedMonth} ayının ən çox satılanı
                            </span>
                          )}
                        </div>
                      );
                    })()}

                    <div className="text-right shrink-0 border-l border-slate-100 pl-4 flex flex-col justify-center">
                      <span className="text-[9px] text-slate-400 block tracking-wider font-semibold">QİYMƏT</span>
                      {tour.discountPrice && tour.discountPrice > 0 && tour.discountPrice < (tour.price ?? minPrice) ? (
                        <div className="flex flex-col items-end">
                          <span className="line-through text-gray-400 text-xs">
                            {getConvertedPriceInfo(tour.price ?? minPrice, tour.priceCurrency).both}
                          </span>
                          <span className="text-2xl font-extrabold text-rose-600 leading-tight">
                            {getConvertedPriceInfo(tour.discountPrice, tour.priceCurrency).both}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <strong className="text-slate-900 text-2xl font-extrabold leading-tight">
                            {getConvertedPriceInfo(tour.price ?? minPrice, tour.priceCurrency).both}
                          </strong>
                          <span className="text-slate-400 text-[10px] font-medium">/ nəfər</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Elegant Hover Action Bar - Slides down nicely without breaking the initial card layout flow */}
                  <div className="max-h-0 opacity-0 overflow-hidden group-hover:max-h-24 group-hover:opacity-100 transition-all duration-350 ease-in-out">
                    <div className="mt-3.5 pt-3.5 border-t border-dashed border-slate-200/80 flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleQuickWhatsApp(tour, e)}
                        className="flex-1 bg-whatsapp-500 hover:bg-whatsapp-600 text-white font-black text-[10px] py-2 px-2.5 rounded-lg transition-all hover:shadow-2xs tracking-wider flex items-center justify-center gap-1 cursor-pointer"
                        title="Bələdçinin nömrəsinə WhatsApp ilə birbaşa keçid et"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        WhatsApp Rezerv
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      </div>

      {/* Verified Reviews Section (Anti-Fake System demonstration in UI) */}
      {/* Ödəniş sistemi olmadığı üçün müvəqqəti söndürülüb, bax: REVIEWS_ENABLED */}
      {REVIEWS_ENABLED && (
      <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <CheckCircle className="text-emerald-500 w-5 h-5" />
            Təhlükəsiz Rəy Yazma Paneli (Anti-Fake System)
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Bizim sistemdə yalnız turlarda həqiqətən iştirak edib, ödənişi təsdiqlənmiş şəxslər rəy yaza bilərlər. Bu, saxta reytinqlərin qarşısını alır.
          </p>
        </div>

        {userEligibleBookings.length === 0 ? (
          <div className="bg-slate-50 p-4 rounded-lg text-slate-500 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            <span>Hazırda rəy yaza biləcəyiniz tamamlanmış / ödənilmiş aktiv rezervasiyanız yoxdur. Rəy yazmaq üçün yandakı turlardan birinə bilet alıb ödənişi tamamlayın.</span>
          </div>
        ) : (
          <form onSubmit={handleAddReviewSubmit} className="space-y-4 bg-slate-50/50 p-4 rounded-xl border border-slate-150">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Dəyərləndirilməli Rezervasiya ID-si (Booking):</label>
                <select
                  required
                  value={selectedBookingForReview}
                  onChange={(e) => setSelectedBookingForReview(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="">Rezervasiya seçin</option>
                  {userEligibleBookings.map(b => {
                    const tour = tours.find(t => t.id === b.tourId);
                    return (
                      <option key={b.id} value={b.id}>
                        {tour?.name} ({b.bookingDate}) - {b.totalAmount} AZN (Bilet #{b.id})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Xal (Rating):</label>
                <div className="flex items-center gap-2 py-1.5">
                  {[1, 2, 3, 4, 5].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setReviewRating(num)}
                      className={`p-1 rounded transition ${reviewRating >= num ? 'text-amber-500 scale-110' : 'text-slate-300'}`}
                    >
                      <Star className="w-5 h-5 fill-current" />
                    </button>
                  ))}
                  <span className="text-xs text-slate-600 font-bold ml-1">({reviewRating}/5 ulduz)</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Rəyiniz / Şərhiniz:</label>
              <textarea
                required
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Rəhbər professional idimi? Marşrut xoşunuza gəldimi? Təcrübənizi bizimlə bölüşün..."
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {reviewSubmitError && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2">
                ⚠️ {reviewSubmitError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmittingReview}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmittingReview && (
                <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {isSubmittingReview ? 'Göndərilir...' : 'Yalnız Həqiqi İştirakçı Rəyini Göndər'}
            </button>
          </form>
        )}
      </div>
      )}

      {/* Info Banner at the bottom of the page */}
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100 flex items-center justify-between mt-8">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
            <AlertCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-emerald-800 text-sm">Turdan əvvəl bilməli olduqlarınız</h4>
            <p className="text-emerald-700 text-xs mt-0.5">Avadanlıq, geyim və çətinlik dərəcələri haqqında tam bələdçi</p>
          </div>
        </div>
        <button 
          onClick={() => setActiveView('faq')}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition"
        >
          Oxu
        </button>
      </div>
        </div>
      )}

      {/* DETAILED TOUR PAGE (Full Page Dynamic Route) */}
      {activeView === 'home' && selectedTour && (
        <div className="animate-fadeIn bg-white min-h-screen pb-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Header Section */}
            <div className="mb-8 space-y-4">
              <div className="flex space-x-2 text-xs text-slate-500 font-medium">
                <span className="uppercase tracking-wider">{selectedTour.category}</span>
                <span>•</span>
                <span>Fəaliyyət provayderi: <strong className="text-slate-800 cursor-pointer pointer-events-auto hover:underline" onClick={(e) => { e.stopPropagation(); const org = users.find(u => u.id === selectedTour.vendorId); if (org) { setSelectedOrganizer(org); setActiveView('organizer'); setSelectedTour(null); } }}>{selectedTour.vendorName}</strong></span>
              </div>
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
                {selectedTour.name}
              </h1>
              <div className="flex flex-wrap items-center justify-between gap-4 mt-2">
                <div className="flex items-center gap-4">
                  <div className="bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold px-2 py-1 rounded shadow-sm shrink-0">Ən çox satılan</div>
                  {REVIEWS_ENABLED && (
                    <div className="flex items-center gap-1 font-bold text-slate-800 text-sm shrink-0">
                      <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                      4.9 <span className="text-slate-500 font-normal underline decoration-slate-300">({getReviewsCount(selectedTour.id)} rəy)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 font-bold text-slate-800 text-sm shrink-0">
                     • <span className="text-slate-500 font-normal">{selectedTour.region}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleWishlist(selectedTour.id)}
                    className={`flex items-center gap-2 border rounded-full px-4 py-2 font-extrabold text-sm transition cursor-pointer shadow-sm ${
                      wishlist.includes(selectedTour.id)
                        ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${wishlist.includes(selectedTour.id) ? 'fill-rose-600 text-rose-600' : ''}`} />
                    {wishlist.includes(selectedTour.id) ? 'İstəklərdə' : 'İstəklərə əlavə et'}
                  </button>
                  <button onClick={() => handleShareTour(selectedTour)} className="flex items-center gap-2 border border-slate-200 rounded-full px-4 py-2 hover:bg-slate-50 text-slate-700 font-extrabold text-sm transition cursor-pointer shadow-sm">
                    <Share2 className="w-4 h-4" /> Paylaş
                  </button>
                </div>
              </div>
            </div>

            {/* TWO COLUMN WRAPPER — items-stretch (default) so the right column wrapper is as tall as the
                left column's content; without that, the sticky sidebar's own container is only as tall as
                the sidebar itself, leaving no scroll room for position:sticky to actually stick. */}
            <div className="flex flex-col lg:flex-row gap-10 relative items-stretch">
              
              {/* LEFT COLUMN: Gallery & Info */}
              <div className="w-full lg:w-[65%] shrink-0 space-y-10">
                
                {/* Asymmetric Gallery (Bento) */}
                {(() => {
                  const allMedia = [selectedTour.image, ...(selectedTour.images || []), ...(selectedTour.videos || [])].filter(Boolean);
                  return (
                    <>
                      <div className="hidden md:grid grid-cols-3 grid-rows-2 gap-2 h-[450px] relative rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                        <div className="col-span-2 row-span-2 cursor-pointer relative group" onClick={() => setLightboxIndex(0)}>
                          <img src={allMedia[0]} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                        </div>
                        <div className="col-span-1 row-span-1 cursor-pointer relative overflow-hidden group" onClick={() => setLightboxIndex(1)}>
                          <img src={allMedia[1] || allMedia[0]} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                        </div>
                        <div className="col-span-1 row-span-1 cursor-pointer relative overflow-hidden group" onClick={() => setLightboxIndex(2)}>
                          <img src={allMedia[2] || allMedia[0]} className="w-full h-full object-cover transition duration-500 group-hover:scale-105" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition duration-300 pointer-events-none" />
                          
                          <div className="absolute inset-x-0 bottom-0 top-0 flex items-end justify-end p-4 pointer-events-none">
                            <button className="bg-white/95 text-slate-900 px-4 py-2 border border-slate-200 rounded-lg shadow-sm text-sm font-extrabold flex items-center gap-2 pointer-events-auto hover:bg-slate-50 transition cursor-pointer">
                              <Grid2X2 className="w-4 h-4" /> Hamısına bax
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile Gallery (Carousel) */}
                      <div className="md:hidden relative h-[300px] rounded-2xl overflow-hidden shadow-sm block bg-slate-100">
                         <img src={allMedia[0]} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                         <div className="absolute bottom-3 right-3 pointer-events-auto">
                           <button onClick={() => setLightboxIndex(0)} className="bg-white/95 text-slate-900 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm flex items-center gap-1.5 cursor-pointer border border-slate-200">
                             <Grid2X2 className="w-3.5 h-3.5" /> Bütün şəkillərə bax
                           </button>
                         </div>
                      </div>
                    </>
                  );
                })()}

                {/* Quick Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-6 border-b border-slate-200">
                  <div className="flex flex-col gap-1.5">
                    <Calendar className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">Ödənişsiz ləğv</span>
                    <span className="text-xs text-slate-500 leading-snug">24 saat əvvələ qədər ləğv et</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Clock className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">Müddət: {selectedTour.durationHours ?? (selectedTour.durationDays * 8)} saat</span>
                    <span className="text-xs text-slate-500 leading-snug">Başlama vaxtlarını görmək üçün yoxlayın.</span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Globe className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">Canlı tur bələdçisi</span>
                    <span className="text-xs text-slate-500 leading-snug">
                      {selectedTour.languages && selectedTour.languages.length > 0 ? selectedTour.languages.join(', ') : 'Azərbaycanca'}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Users className="w-6 h-6 text-slate-700 mb-1" />
                    <span className="text-sm font-extrabold text-slate-900">Özəl qrup turları</span>
                    <span className="text-xs text-slate-500 leading-snug">Sifariş zamanı seçilə bilər</span>
                  </div>
                </div>

                {/* ACTIVE Tour Slots List — hidden until "Yerləri yoxla" is clicked in the sidebar */}
                {showTourSlots && (
                  <div id="tour-slots-calendar" className="scroll-mt-32 animate-fadeIn">
                    <h4 className="text-sm font-bold text-slate-800 tracking-wide flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-slate-500" />
                      Yürüş Təqvimi və Qiymətlər
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 mb-2">
                      Bələdçi tərəfindən müəyyən edilmiş tarixlər və boş yer limitləri.
                    </p>

                    <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {slots.filter(s => s.tourId === selectedTour.id).map((slot) => {
                        const remainingSpots = Math.max(0, slot.capacity - slot.bookedCount);
                        const isFull = remainingSpots <= 0;
                        return (
                          <div
                            key={slot.id}
                            className={`flex items-center justify-between p-3 rounded-lg border text-xs transition ${
                              isFull
                                ? 'bg-slate-50 border-slate-200 opacity-60'
                                : 'bg-white border-slate-150 shadow-sm hover:border-emerald-300'
                            }`}
                          >
                            <div className="space-y-1">
                              <span className="font-bold text-slate-700 block">📅 Tarix: {slot.startDate}</span>
                              <span className="text-slate-400 block text-[10px]">
                                {slot.startDate !== slot.endDate && `Bitmə Tarixi: ${slot.endDate}`}
                              </span>
                            </div>

                            <div className="text-center">
                              <span className="text-[10px] text-slate-400 block">Boş Yer</span>
                              <strong className={`${isFull ? 'text-red-500' : 'text-slate-700'}`}>
                                {remainingSpots} / {slot.capacity}
                              </strong>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="text-base font-extrabold text-sky-705">
                                {getConvertedPriceInfo(slot.price, selectedTour.priceCurrency).both} / nəfər
                              </span>
                              {!isFull ? (
                                <button
                                  type="button"
                                  onClick={() => handleOpenBooking(slot)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded transition"
                                >
                                  Rezerv et
                                </button>
                              ) : (
                                <span className="text-[11px] text-red-500 font-bold tracking-wider">DOLUB</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* STEP 2 registration form — rendered right below the tour-slots-calendar
                    section instead of far down the page, so it opens exactly where the user
                    just clicked "Rezerv et". */}
                {isBookingStep && (
                /* STEP 2: BOOKING FLOW INTELLIGENCE / SIMULATION */
                <div id="booking-form-section" className="space-y-6">
                  {bookingSuccessData ? (
                    // Success View
                    <div className="text-center py-6 space-y-4">
                      {bookingSuccessData.method === 'whatsapp' ? (
                        <>
                          <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                            <MessageCircle className="w-8 h-8 fill-current" />
                          </div>
                          <h3 className="text-lg font-extrabold text-slate-800">WhatsApp Rezervasiyası Yaradıldı!</h3>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                            Biletiniz sistemdə müvəqqəti qeydiyyata alındı <strong>(Gözləmədə)</strong>. İştirakınızı tam təsdiqləmək üçün aşağıdakı düyməyə basaraq operatora yazın və ödəniş qəbzini (m10/Kart) göndərin.
                          </p>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left max-w-sm mx-auto space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Sifariş ID:</span>
                              <strong className="font-mono text-slate-705 text-slate-800">#{bookingSuccessData.bookingRef}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tur marşrutu:</span>
                              <strong className="text-slate-700 text-right">{bookingSuccessData.tourName}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tarix:</span>
                              <strong className="text-slate-700">{bookingSuccessData.date}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ödəniləcək Məbləğ:</span>
                              <strong className="text-emerald-650 text-sm font-extrabold text-emerald-600">{bookingSuccessData.amount} AZN</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Sistem qeydiyyat növü:</span>
                              <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded">GÖZLƏYİR (WHATSAPP)</span>
                            </div>
                          </div>

                          {/* Action Button: Open WhatsApp pre-drafted message */}
                          <div className="flex flex-col gap-2 max-w-sm mx-auto pt-2">
                            <a 
                              href={`https://wa.me/${bookingSuccessData.waNumber}?text=${encodeURIComponent(bookingSuccessData.waMessage)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full py-3 bg-whatsapp-500 hover:bg-whatsapp-600 hover:scale-[1.02] transform transition-all text-white font-extrabold text-xs rounded-xl shadow-lg shadow-whatsapp-500/20 flex items-center justify-center gap-2 cursor-pointer no-underline"
                            >
                              <MessageCircle className="w-4 h-4 fill-current" />
                              WhatsApp ilə Mesajı Göndər ↗
                            </a>

                            {/* Copy to clipboard fallback button */}
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(bookingSuccessData.waMessage);
                                if (onShowNotification) onShowNotification('Sifariş mətni buferə kopyalandı! WhatsApp-da bəhs etdiyiniz nömrəyə asanlıqla yapışdıra bilərsiniz.', 'success');
                              }}
                              className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] rounded-lg transition flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                            >
                              <Copy className="w-3.5 h-3.5" /> Mətni Kopyala & WhatsApp-a Keç
                            </button>
                          </div>

                          {/* WhatsApp dispatch simulation console */}
                          <div className="bg-slate-950 p-4 rounded-lg text-left max-w-sm mx-auto border border-emerald-950 font-mono text-[10px] space-y-1 text-slate-450 text-slate-400 shadow-inner">
                            <div className="text-emerald-400">// WHATSAPP DISPATCH HANDLES READY</div>
                            <div>Bələdçi Nömrəsi: {bookingSuccessData.waNumber}</div>
                            <div className="text-amber-400">Status: Awaiting Receipt validation via WhatsApp / SMS</div>
                            <div className="text-slate-500">// Ödəniş qəbzi alındıqdan sonra dərhal "Təsdiqləndi" biletiniz və SMS gələcəkdir.</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-xl">
                            ✓
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">Uğurlu Satınalma!</h3>
                          <p className="text-xs text-slate-500 max-w-sm mx-auto">
                            Təbriklər, ödənişiniz uğurla tamamlandı. Dağ yürüşünə biletiniz və SMS bildiriş təsdiqi göndərildi!
                          </p>

                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left max-w-sm mx-auto space-y-2 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">Bilet nömrəsi:</span>
                              <strong className="font-mono text-slate-700">#{bookingSuccessData.bookingId}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Turun adı:</span>
                              <strong className="text-slate-700 text-right">{bookingSuccessData.tourName}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Tarix:</span>
                              <strong className="text-slate-700">{bookingSuccessData.date}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ödənilən Məbləğ:</span>
                              <strong className="text-emerald-600">{bookingSuccessData.amount} AZN</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">Ödəniş Metodu:</span>
                              <span className="font-mono text-xs text-slate-700 font-bold">{bookingSuccessData.method}</span>
                            </div>
                          </div>

                          {/* Live SMS dispatch terminal visual log */}
                          <div className="bg-slate-950 p-4 rounded text-left max-w-sm mx-auto border border-slate-800 font-mono text-[10px] space-y-1 text-slate-400">
                            <div className="text-emerald-400">// SMS INTEGRATION TRANSMISSION OK</div>
                            <div>To: {currentUser.phone}</div>
                            <div>Sender: GEDƏKGÖRƏK</div>
                            <div className="text-slate-300">"Hörmətli {currentUser.name}, {bookingSuccessData.tourName} turuna olan {bookingQty} ədəd biletiniz uğurla alındı. Bilet ID: {bookingSuccessData.bookingId}. Çıxış tarixində iştirakınız təsdiqlənmişdir."</div>
                          </div>
                        </>
                      )}

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedTour(null);
                            setBookingSuccessData(null);
                          }}
                          className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-4 py-2 rounded-lg transition cursor-pointer"
                        >
                          Bağla
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Payment Checkout inputs
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs">
                          <span className="text-slate-400 block">Seçilən Tarix</span>
                          <strong className="text-slate-700">{selectedSlot?.startDate}</strong>
                        </div>
                        <div className="text-xs text-right">
                          <span className="text-slate-400 block">Tur Qiyməti</span>
                          <strong className="text-emerald-600 font-bold">{getConvertedPriceInfo(selectedSlot?.price || 0, selectedTour.priceCurrency).both} / nəfər</strong>
                        </div>
                      </div>

                      {/* Participant quantity wrapper */}
                      {bookingRegType !== 'team' ? (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">İştirakçı sayı:</label>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              disabled={bookingQty <= 1}
                              onClick={() => setBookingQty(prev => prev - 1)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-40"
                            >
                              -
                            </button>
                            <span className="font-bold text-slate-800 text-sm tracking-widest">{bookingQty}</span>
                            <button
                              type="button"
                              disabled={selectedSlot ? bookingQty >= (selectedSlot.capacity - selectedSlot.bookedCount) : true}
                              onClick={() => setBookingQty(prev => prev + 1)}
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-40"
                            >
                              +
                            </button>
                            <span className="text-[10px] text-slate-400 italic">
                              (Maksimum {selectedSlot ? Math.max(0, selectedSlot.capacity - selectedSlot.bookedCount) : 0} yer mövcuddur)
                            </span>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-amber-50 text-amber-900 text-xs p-3 rounded-xl border border-amber-200 font-bold flex items-center justify-between">
                          <span>📋 Komandalı Qeydiyyat Kontingenti:</span>
                          <span className="text-xs font-black text-amber-800 bg-white px-2 py-0.5 rounded shadow-sm">6 Nəfərlik Komanda (Sabit)</span>
                        </div>
                      )}

                      {/* ACTIVE LIFESTYLE PORTAL: REGISTRATION STYLE & EQUIPMENT CHOICES */}
                      {(selectedTour.category === 'active' || selectedTour.isActiveLife) && (
                        <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4.5 space-y-4 shadow-sm animate-fadeIn">
                          <h4 className="text-xs font-bold text-amber-900 tracking-wider flex items-center gap-1.5 border-b border-amber-200 pb-2">
                            🏅 Aktiv İdman Qeydiyyat Seçimləri
                          </h4>

                          {/* Individual vs Team Registration (Volleyball specific or other dynamic games) */}
                          {selectedTour.allowTeamRegistration && (
                            <div className="space-y-2">
                              <label className="block text-[10px] font-bold text-slate-500 tracking-wider">Qeydiyyat Tipi:</label>
                              <div className="grid grid-cols-2 gap-2.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBookingRegType('individual');
                                    setBookingQty(1);
                                  }}
                                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                    bookingRegType === 'individual'
                                      ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200/50 shadow-xs'
                                      : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="font-extrabold text-xs text-slate-800">👤 Fərdi Gəlirəm</span>
                                  <span className="text-[9px] text-slate-400 mt-1 block">Tək qeydiyyat. Sistem sizi boş komanda yerlərinə yerləşdirəcək.</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBookingRegType('team');
                                    setBookingQty(6);
                                  }}
                                  className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                                    bookingRegType === 'team'
                                      ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-200/50 shadow-xs'
                                      : 'bg-white border-slate-200 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="font-extrabold text-xs text-slate-800">🏐 Komandamla Gəlirəm</span>
                                  <span className="text-[9px] text-slate-400 mt-1 block">Siz daxil olmaqla cəmi 6 nəfərlik tam komanda qeydiyyatı.</span>
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Dynamically expanding team sub-form */}
                          {bookingRegType === 'team' && (
                            <div className="bg-white/95 border border-amber-200 p-4 rounded-xl space-y-3.5 shadow-xs animate-fadeIn">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                  Komandanızın Adı: <span className="text-red-500">*</span>
                                </label>
                                <input
                                  type="text"
                                  placeholder="Məsələn: Gəncə Qartalları"
                                  value={bookingTeamName}
                                  onChange={(e) => setBookingTeamName(e.target.value)}
                                  className="w-full px-3 py-1.5 text-xs border border-slate-250 bg-white rounded-lg text-slate-800 focus:ring-1 focus:ring-amber-500 outline-none font-medium"
                                />
                              </div>

                              <div className="space-y-2">
                                <label className="block text-[10px] font-black text-slate-500 tracking-widest border-b border-slate-100 pb-1.5">
                                  Digər 5 Komanda Üzvünün Məlumatları:
                                </label>
                                {bookingTeamMembers.map((member, idx) => (
                                  <div key={idx} className="grid grid-cols-2 gap-2 pb-2 border-b border-dashed border-slate-100 last:border-0 last:pb-0">
                                    <div>
                                      <input
                                        type="text"
                                        placeholder={`${idx + 2}. Üzvün Ad Soyadı`}
                                        value={member.name}
                                        onChange={(e) => {
                                          const next = [...bookingTeamMembers];
                                          next[idx].name = e.target.value;
                                          setBookingTeamMembers(next);
                                        }}
                                        className="w-full px-2.5 py-1 text-[11px] border border-slate-200 rounded text-slate-800 bg-white placeholder-slate-400"
                                      />
                                    </div>
                                    <div>
                                      <input
                                        type="tel"
                                        placeholder="Telefon Nömrəsi"
                                        value={member.phone}
                                        onChange={(e) => {
                                          const next = [...bookingTeamMembers];
                                          next[idx].phone = e.target.value;
                                          setBookingTeamMembers(next);
                                        }}
                                        className="w-full px-2.5 py-1 text-[11px] border border-slate-200 rounded text-slate-800 bg-white placeholder-slate-400"
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Dynamic Equipment Checkbox Options */}
                          <div className="bg-white/90 p-3.5 rounded-xl border border-amber-100 space-y-3">
                            <span className="block text-[10px] font-bold text-slate-500">Avadanlıq & Təchizat Seçimi:</span>
                            
                            {selectedTour.equipmentIncluded ? (
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  id="usingOwnEquipment"
                                  checked={usingOwnEquipment}
                                  onChange={(e) => setUsingOwnEquipment(e.target.checked)}
                                  className="mt-1 w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="usingOwnEquipment" className="text-xs text-slate-705 text-slate-700 leading-normal cursor-pointer select-none">
                                  <strong>💼 Öz şəxsi avadanlığım var.</strong> {selectedTour.equipmentRentalPrice ? `Təşkilatçının daxil etdiyi pulsuz avadanlıqlara ehtiyac duymuram. Bununla da bilet başına -${selectedTour.equipmentRentalPrice} ${selectedTour.priceCurrency || 'AZN'} iştirak haqqı endirimi tətbiq olunacaqdır.` : 'Təşkilatçının avadanlığına ehtiyac duymuram.'}
                                </label>
                              </div>
                            ) : (
                              <div className="flex items-start gap-2.5">
                                <input
                                  type="checkbox"
                                  id="rentEquipment"
                                  checked={rentEquipment}
                                  onChange={(e) => setRentEquipment(e.target.checked)}
                                  className="mt-1 w-4.5 h-4.5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500 cursor-pointer"
                                />
                                <label htmlFor="rentEquipment" className="text-xs text-slate-705 text-slate-700 leading-normal cursor-pointer select-none">
                                  <strong>🎒 Avadanlıq qanuni kirayələmək istəyirəm.</strong> Təşkilatçı mənə zəruri avadanlıq dəstini ({selectedTour.requiredEquipment || 'Xizək, kaska və s.'}) təmin edəcəkdir (+{selectedTour.equipmentRentalPrice || 15} {selectedTour.priceCurrency || 'AZN'} / kişi başı əlavə edilir).
                                </label>
                              </div>
                            )}
                          </div>

                          {/* Safety Waiver Section with active checkbox requirement */}
                          <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-100 flex items-start gap-2.5">
                            <input
                              type="checkbox"
                              id="safetyWaiverInputCheck"
                              checked={safetyAcknowledged}
                              onChange={(e) => setSafetyAcknowledged(e.target.checked)}
                              className="mt-1 w-4.5 h-4.5 text-rose-600 border-rose-300 rounded cursor-pointer shrink-0"
                            />
                            <div className="text-xs text-slate-700 leading-normal">
                              <label htmlFor="safetyWaiverInputCheck" className="font-extrabold block text-rose-900 cursor-pointer select-none mb-0.5">
                                ⚖️ Təhlükəsizlik və Tibbi Öhudəlik Bəyannaməsi <span className="text-red-500 font-extrabold">*</span>
                              </label>
                              <span className="text-[10px] leading-relaxed block text-rose-950/85">
                                Macəra idman növü zamanı yarana biləcək xüsusi fiziki risk və gərginliklərlə tanış oldum. Xroniki xəstəliyimin olmadığını, fiziki hazırlığımın ({selectedTour.difficulty === 'beginner' || selectedTour.difficulty === 'easy' ? 'Başlanğıc' : selectedTour.difficulty === 'hard' ? 'Professional' : 'Orta'}) idman turu tələblərinə cavab verdiyimi təsdiq edirəm. Təşkilati qaydalara və bələdçinin təlimatlarına tam tabe olacağıma bəyan edirəm.
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Guest Passenger Details (No Registration required!) */}
                      <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-100 tracking-wide">
                            Qeydiyyatsız Sürətli Rezervasiya
                          </span>
                          <span className="text-slate-400 font-medium text-[11px]">Bilet Alışı</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Adınız və Soyadınız: <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="Məsələn: Zahir Tanrıverdi"
                              value={bookingCustomerName}
                              onChange={(e) => setBookingCustomerName(e.target.value)}
                              disabled={isPhoneVerified}
                              className="w-full px-3 py-2 text-xs border border-slate-250 bg-white rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              WhatsApp Əlaqə Nömrəniz: <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="Məsələn: +994 50 123 45 67"
                              value={bookingCustomerPhone}
                              onChange={(e) => setBookingCustomerPhone(e.target.value)}
                              disabled={isPhoneVerified}
                              className="w-full px-3 py-2 text-xs border border-slate-250 bg-white rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-500"
                            />
                          </div>
                        </div>

                        {/* WhatsApp Verification Code Box */}
                        <div className="border-t border-slate-200/60 pt-3.5 mt-2 space-y-3">
                          {!isOtpSent ? (
                            <button
                              type="button"
                              onClick={handleSendVerificationCode}
                              className="w-full py-2 bg-slate-900 text-white hover:bg-slate-800 font-extrabold text-[11px] rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current text-white" />
                              WhatsApp-a Təsdiq Kodu Göndər
                            </button>
                          ) : (
                            <div className="space-y-3">
                              {showIncomingOtpBanner && (
                                <div className="bg-slate-900 border-l-4 border-emerald-550 border-emerald-500 rounded-xl p-3.5 shadow-xl text-white max-w-sm mx-auto mb-1 animate-pulse">
                                  <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold mb-1 tracking-wider">
                                    <div className="flex items-center gap-1">
                                      <span className="bg-emerald-600 text-white rounded p-0.5 px-1 font-extrabold text-[8px]">WA</span>
                                      <span>WhatsApp Göndərildi</span>
                                    </div>
                                    <span>İndi</span>
                                  </div>
                                  <div className="text-[11px] leading-relaxed text-slate-105 text-slate-100">
                                    <span className="font-normal text-slate-350">Hörmətli müştəri, bilet sifarişi üçün WhatsApp təsdiq kodunuz:</span> <strong className="text-emerald-400 font-mono text-sm tracking-widest">{verificationOtpCode}</strong>
                                  </div>
                                </div>
                              )}

                              {!isPhoneVerified ? (
                                <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2.5">
                                  <div className="text-[11px] text-slate-500 leading-normal">
                                    Kod WhatsApp ilə nömrənizə göndərildi. Zəhmət olmasa daxil edin:
                                  </div>
                                  <div className="flex gap-2.5">
                                    <input
                                      type="text"
                                      maxLength={4}
                                      placeholder="4 Rəqəmli Kod"
                                      value={userInputOtp}
                                      onChange={(e) => setUserInputOtp(e.target.value.replace(/\D/g, ''))}
                                      className="flex-1 px-3 py-2 text-xs text-center font-bold font-mono tracking-widest border border-slate-200 bg-slate-50 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <button
                                      type="button"
                                      onClick={handleVerifyOtp}
                                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-lg transition-all cursor-pointer"
                                    >
                                      Kodu Təsdiqlə
                                    </button>
                                  </div>
                                  <div className="text-right">
                                    <button
                                      type="button"
                                      onClick={handleSendVerificationCode}
                                      className="text-[10px] text-sky-600 hover:underline font-bold cursor-pointer"
                                    >
                                      Kodu yenidən göndər
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-emerald-50 border border-emerald-150 rounded-lg p-3 flex items-center justify-between text-xs text-emerald-800">
                                  <div className="flex items-center gap-1.5 font-bold">
                                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                                    <span>Nömrəniz təsdiqləndi! ({bookingCustomerPhone})</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsPhoneVerified(false);
                                      setIsOtpSent(false);
                                    }}
                                    className="text-[10px] text-slate-400 hover:text-red-500 underline cursor-pointer"
                                  >
                                    Nömrəni dəyişdir
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Dedicated WhatsApp explanation instead of old cards */}
                      <div className="bg-emerald-50 border border-emerald-150/60 rounded-xl p-4 space-y-2 text-slate-750">
                        <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs">
                          <MessageCircle className="w-4 h-4 text-emerald-600 fill-current animate-pulse" />
                          <span>WhatsApp Rezervasiya Sistemi</span>
                          <span className="bg-emerald-600 text-white text-[8px] font-extrabold px-1.5 py-0.5 rounded tracking-wider">AKTİVDİR</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          Qeydiyyat və bilet təsdiqi birbaşa bələdçinin <strong>WhatsApp</strong> nömrəsi üzərindən həyata keçirilir. Rezervasiya tamamlandıqda unikal sifariş kodunuz generasya olunacaq və bələdçinin {selectedTour.whatsapp_number || '+994706717804'} nömrəli WhatsApp hesabına yönləndiriləcəksiniz.
                        </p>
                      </div>

                      {/* Dynamic Total Cost calculator */}
                      {(() => {
                        const priceDetails = getActiveCalculatedPrice();
                        const currency = selectedTour.priceCurrency || 'AZN';
                        const isAzn = currency === 'AZN';
                        
                        const singleOriginal = getConvertedPriceInfo(priceDetails.perPerson, currency).original;
                        const totalOriginal = getConvertedPriceInfo(priceDetails.total, currency).original;
                        const totalAzn = getConvertedPriceInfo(priceDetails.total, currency).azn;
                        
                        return (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center justify-between">
                            <div>
                              <span className="text-xs text-slate-400 block font-medium tracking-tight">Cəmi Məbləğ</span>
                              <span className="text-slate-500 text-[10px] font-mono block">
                                {priceDetails.qty} nəfər x {singleOriginal}
                              </span>
                              {priceDetails.desc && (
                                <span className="text-[10px] text-amber-600 block mt-0.5 font-bold">
                                  💡 {priceDetails.desc}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-col items-end">
                              <span className="text-xl font-extrabold text-emerald-600 font-mono">
                                {totalOriginal}
                              </span>
                              {!isAzn && (
                                <span className="text-[10px] text-slate-400 font-bold font-mono">
                                  (~ {totalAzn} ₼)
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}

                      {bookingSubmitError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-lg px-3 py-2 flex items-center gap-2">
                          ⚠️ {bookingSubmitError}
                        </div>
                      )}

                      {/* Checkout Action Buttons */}
                      <div className="flex gap-3 justify-end items-center pt-4 border-t border-slate-100">
                        {!isPhoneVerified && (
                          <span className="text-[10px] text-red-500 font-bold bg-red-50 px-2 py-1 rounded">
                            ⚠️ Rezerv üçün əvvəlcə nömrəni təsdiqləyin
                          </span>
                        )}

                        {((selectedTour.category === 'active' || selectedTour.isActiveLife) && !safetyAcknowledged) && (
                          <span className="text-[10px] text-red-500 font-bold bg-rose-50 px-2 py-1 rounded">
                            ⚠️ Sazişi bəyan edin
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            setIsBookingStep(false);
                            setBookingSuccessData(null);
                          }}
                          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium text-xs rounded-lg transition"
                        >
                          Geri
                        </button>

                        <button
                          type="button"
                          disabled={isProcessingPayment || !isPhoneVerified || (((selectedTour.category === 'active' || selectedTour.isActiveLife)) && !safetyAcknowledged)}
                          onClick={handleProceedBookingSimulate}
                          className="px-5 py-2.5 bg-whatsapp-500 hover:bg-whatsapp-600 text-white font-extrabold text-xs rounded-lg shadow-md transition flex items-center gap-2 disabled:opacity-40 hover:scale-[1.02] cursor-pointer"
                        >
                          {isProcessingPayment ? (
                            <>
                              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              <span>Qeydə alınır (1s)...</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle className="w-4 h-4 text-white fill-current animate-pulse" />
                              <span>WhatsApp ilə Rezervasiya et</span>
                            </>
                          )}
                        </button>
                      </div>

                    </div>
                  )}
                </div>
                )}

                {/* Qiymətə daxildir / daxil deyil (Modern Grid) — turun dəyərini istifadəçi ilk açılışda görsün deyə ən yuxarıda */}
                <div className="space-y-4 py-4">
                  <h2 className="text-xl font-extrabold text-slate-900">Qiymətə daxildir</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Daxildir */}
                    <div className="bg-emerald-50/40 border border-emerald-100 rounded-2xl p-5 space-y-3.5">
                      <h3 className="text-xs font-black text-emerald-700 tracking-wider uppercase">Daxildir</h3>
                      <div className="space-y-3">
                        {(selectedTour.includes && selectedTour.includes.length > 0
                          ? selectedTour.includes
                          : ['Peşəkar canlı tur bələdçisi', 'Yerli vergilər və xərclər']
                        ).map((item, idx) => (
                          <div key={`inc-${idx}`} className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">{item}</span>
                          </div>
                        ))}
                        {selectedTour.mealType && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">Qida: {selectedTour.mealType}</span>
                          </div>
                        )}
                        {selectedTour.flightIncluded && (
                          <div className="flex items-start gap-3">
                            <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                            <span className="text-slate-700 text-sm font-medium">Aviabilet və transfer daxildir</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Daxil deyil */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3.5">
                      <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase">Daxil deyil</h3>
                      <div className="space-y-3">
                        {(selectedTour.notIncluded && selectedTour.notIncluded.length > 0
                          ? selectedTour.notIncluded
                          : ['Şəxsi suvenirlər']
                        ).map((item, idx) => (
                          <div key={`exc-${idx}`} className="flex items-start gap-3">
                            <Minus className="w-5 h-5 text-slate-300 shrink-0" />
                            <span className="text-slate-500 text-sm font-medium">{item}</span>
                          </div>
                        ))}
                        {!selectedTour.flightIncluded && selectedTour.isInternational && (
                          <div className="flex items-start gap-3">
                            <Minus className="w-5 h-5 text-slate-300 shrink-0" />
                            <span className="text-slate-500 text-sm font-medium">Aviabiletlər (Ayrı alınmalıdır)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Highlights */}
                <div className="space-y-4 py-4 border-t border-slate-200">
                  <h2 className="text-xl font-extrabold text-slate-900">Önə Çıxanlar</h2>
                  <div className="flex flex-col gap-4">
                    {(selectedTour.highlights && selectedTour.highlights.length > 0
                      ? selectedTour.highlights
                      : [
                          `Peşəkar bələdçilərlə ${selectedTour.region} regionunun nəfəskəsici təbiətini kəşf edin.`,
                          `Seçilmiş səviyyənizə uyğun ${selectedTour.difficulty} çətinlikdə macəra yaşayın.`,
                          ...(selectedTour.isInternational ? [`${selectedTour.destinationCity} şəhərində gündəlik istiqamətinizi izləyən ağıllı marşrut proqramı.`] : [])
                        ]
                    ).map((highlight, idx) => (
                      <div key={idx} className="flex items-start gap-4">
                        <div className="mt-0.5"><Check className="w-5 h-5 text-emerald-600" /></div>
                        <span className="text-slate-700 leading-relaxed font-medium">{highlight}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Full description */}
                <div className="space-y-4 py-4 border-t border-slate-200">
                  <h2 className="text-xl font-extrabold text-slate-900">Tam təsvir</h2>
                  <div className="relative">
                    <div
                      className={`overflow-hidden transition-all duration-300 ease-in-out ${
                        isDescExpanded || selectedTour.description.length <= 320 ? 'max-h-[1000px]' : 'max-h-[150px]'
                      }`}
                    >
                      <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-medium antialiased">
                        {selectedTour.description}
                      </p>
                    </div>
                    {!isDescExpanded && selectedTour.description.length > 320 && (
                      <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
                    )}
                  </div>
                  {selectedTour.description.length > 320 && (
                    <button
                      type="button"
                      onClick={() => setIsDescExpanded(!isDescExpanded)}
                      className="group inline-flex items-center gap-1.5 text-sm font-extrabold text-slate-900 hover:text-emerald-700 cursor-pointer transition-colors mt-1"
                    >
                      <span className="transition-transform duration-300 group-hover:translate-y-0.5">
                        {isDescExpanded ? 'Daha az oxu' : 'Daha çox oxu'}
                      </span>
                      <ChevronDown
                        className={`w-4 h-4 transition-transform duration-300 group-hover:translate-y-0.5 ${
                          isDescExpanded ? 'rotate-180' : ''
                        }`}
                      />
                    </button>
                  )}
                </div>

                {/* Meeting Point */}
                {selectedTour.meetingPoint && (
                  <div className="space-y-4 py-4 border-t border-slate-200">
                    <h2 className="text-xl font-extrabold text-slate-900">Görüş yeri</h2>
                    <p className="text-sm font-medium text-slate-700 leading-relaxed">
                      {selectedTour.meetingPoint}
                    </p>
                  </div>
                )}

                {/* Important Information */}
                <div className="space-y-4 py-4 border-t border-slate-200">
                  <h2 className="text-xl font-extrabold text-slate-900">Mühüm məlumatlar</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mt-4">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-3">Özünüzlə gətirin</h3>
                      <ul className="space-y-2">
                        {(selectedTour.importantInfo?.bring && selectedTour.importantInfo.bring.length > 0
                          ? selectedTour.importantInfo.bring
                          : [selectedTour.requiredEquipment || 'Rahat ayaqqabı', 'Pasport və ya şəxsiyyət vəsiqəsi', 'Hava şəraitinə uyğun geyim']
                        ).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                            <Check className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm mb-3">İcazə verilmir</h3>
                      <ul className="space-y-2">
                        {(selectedTour.importantInfo?.notAllowed && selectedTour.importantInfo.notAllowed.length > 0
                          ? selectedTour.importantInfo.notAllowed
                          : ['Böyük çamadanlar və çantalar', 'Müşayiətsiz yetkinlik yaşına çatmayanlar']
                        ).map((item, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                            <X className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" /> {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Extra dynamic details (Weather, GPT assistant) */}
                <div className="space-y-6 pt-4 border-t border-slate-200">

              {/* Tabs Info / Scheduling */}
                <div className="space-y-6">
                  {/* Dynamic Integrations */}

                  {/* High fidelity Weather Integration */}
                  {slots.filter(s => s.tourId === selectedTour.id).length > 0 && (
                    <TourWeatherForecast 
                      dates={slots.filter(s => s.tourId === selectedTour.id).map(s => s.startDate)} 
                      region={selectedTour.region} 
                      variant="detailed" 
                    />
                  )}

                  {/* Stunning Interactive 3D/2D GPX Trail Explorer Map */}
                  {selectedTour.gpxData && (
                    <GpsTrackVisualizer gpxDataString={selectedTour.gpxData} />
                  )}

                  {(() => {
                    const organizer = users.find(u => u.id === selectedTour.vendorId);
                    if (organizer && organizer.guides && organizer.guides.length > 0) {
                      return (
                        <div className="mt-6 mb-2 border border-slate-200 rounded-2xl p-5 bg-gradient-to-r from-slate-50 to-white shadow-sm">
                          <h4 className="font-extrabold text-slate-800 mb-4 text-sm flex items-center gap-2">
                            👥 Təşkilatçının Komandası
                          </h4>
                          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-none sm:scrollbar-thin">
                            {organizer.guides.map((g, i) => (
                              <div key={i} className="flex flex-col items-start flex-shrink-0 w-[260px] snap-start bg-white p-4 rounded-xl border border-slate-200 shadow-sm transition hover:shadow-md">
                                <div className="flex items-center gap-4 mb-3 w-full">
                                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border-2 border-emerald-50 flex-shrink-0">
                                    {g.avatar ? <img src={g.avatar} className="w-full h-full object-cover"/> : <span className="flex items-center justify-center font-bold text-slate-400 w-full h-full text-sm">{g.name.charAt(0)}</span>}
                                  </div>
                                  <div className="flex-1 overflow-hidden">
                                     <span className="text-sm font-bold text-slate-800 block truncate" title={g.name}>{g.name}</span>
                                     <span className="text-[10px] text-emerald-600 font-bold block line-clamp-2 tracking-wide mt-0.5" title={g.specialty}>{g.specialty || 'Bələdçi'}</span>
                                  </div>
                                </div>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed line-clamp-3" title={g.bio}>{g.bio}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  })()}

                  {/* Smart Pack Assistant vs. International Travel Agent Integration */}
                  {selectedTour.isInternational ? (
                    <div className="bg-gradient-to-br from-indigo-900/10 to-teal-900/5 border border-indigo-200/60 rounded-2xl p-6 space-y-5 shadow-3xs hover:border-indigo-300 transition duration-300">
                      <div className="flex items-start justify-between flex-wrap gap-3 border-b border-indigo-200/40 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">✈️</span>
                          <div>
                            <h4 className="text-xs font-black text-indigo-950 tracking-widest leading-none">
                              XARİCİ SƏYAHƏTİN SEHRLİ PLANLAŞDIRICISI
                            </h4>
                            <p className="text-[10px] text-slate-500 font-bold mt-1.5 leading-none">
                              {selectedTour.destinationCountry} və {selectedTour.destinationCity} üçün rəqəmsal bələdçi paneli
                            </p>
                          </div>
                        </div>
                        <span className="text-[9px] font-black text-white bg-indigo-600 px-2.5 py-1 rounded tracking-widest">
                          AĞILLI BƏLƏDÇİ
                        </span>
                      </div>

                      {/* PART 1: WEATHER FORECAST SPECIALLY INTEGRATED FOR DESTINATION */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black text-indigo-900 tracking-wider flex items-center gap-1">
                          ☀️ Təyinat Məntəqəsinin Gündəlik Hava Proqnozu
                        </h5>
                        
                        <div className="bg-white p-3.5 rounded-xl border border-slate-150 shadow-4xs grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          {selectedTour.itinerary && selectedTour.itinerary.map((it, idx) => {
                            const weathers = [
                              { temp: '24°C', tag: 'Açıq Səma', emoji: '☀️' },
                              { temp: '22°C', tag: 'Parlaq Gün', emoji: '🌤️' },
                              { temp: '25°C', tag: 'Az buludlu', emoji: '⛅' },
                              { temp: '21°C', tag: 'Möhtəşəm hava', emoji: '☀️' },
                              { temp: '23°C', tag: 'Sərin meh', emoji: '🌬️' },
                              { temp: '24°C', tag: 'Gözəl hava', emoji: '☀️' },
                            ];
                            const w = weathers[idx % weathers.length];
                            return (
                              <div key={idx} className="bg-slate-50/50 p-2 rounded-lg border border-slate-100 flex flex-col items-center">
                                <span className="text-[9px] font-extrabold text-slate-400 block tracking-tight">GÜN {it.day}</span>
                                <span className="text-xl my-1">{w.emoji}</span>
                                <span className="text-xs font-black text-slate-800 leading-none">{w.temp}</span>
                                <span className="text-[9px] text-slate-500 font-medium block truncate mt-0.5 max-w-[90px]">{w.tag}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* PART 2: THE SPOTS COVERED IN THESE DAYS */}
                      <div className="space-y-2">
                        <h5 className="text-[10px] font-black text-indigo-900 tracking-wider flex items-center gap-1.5">
                          📍 Günlərə Görə Baş Çəkəcəyiniz Məkanlar (Gəzməli Yerlər)
                        </h5>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {selectedTour.itinerary && selectedTour.itinerary.map((day, di) => {
                            let mainPlace = selectedTour.destinationCity;
                            if (day.title.includes('Kilsə') || day.title.includes('Kolizey') || day.title.includes('Məbəd') || day.title.includes('Vadi') || day.title.includes('Ubud')) {
                              mainPlace = day.title.split(':')[0] || selectedTour.destinationCity;
                            }
                            return (
                              <div
                                key={di}
                                className="bg-white p-3 rounded-xl border border-slate-150 flex items-start gap-2.5"
                              >
                                <div className="w-6 h-6 rounded-full bg-indigo-50 border border-indigo-150 text-[10px] font-bold text-indigo-700 flex items-center justify-center shrink-0 mt-0.5">
                                  {day.day}
                                </div>
                                <div className="space-y-1 overflow-hidden">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="text-[9px] font-extrabold text-indigo-805 bg-indigo-55/75 px-1.5 py-0.5 rounded leading-none truncate">
                                      🗺️ {mainPlace}
                                    </span>
                                  </div>
                                  <h6 className="text-[10px] font-extrabold text-ink-800 leading-tight truncate">{day.title}</h6>
                                  <p className="text-[9.5px] text-slate-500 leading-snug line-clamp-2">{day.description}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-amber-50/45 border border-amber-200/60 rounded-2xl p-5 space-y-4 hover:border-amber-300/85 transition duration-300">
                      <div className="flex items-start justify-between flex-wrap gap-3 border-b border-amber-200/40 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">🎒</span>
                          <div>
                            <h4 className="text-xs font-black text-amber-900 tracking-widest leading-none border-b border-amber-200/20 pb-0.5">
                              Ağıllı Çanta & İlkin Hazırlıq
                            </h4>
                            <p className="text-[10px] text-amber-800/80 font-bold mt-1">
                              Sizin fərdi təcrübənizə uyğun çanta və yürüş tövsiyələri
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* INTERACTIVE QUESTION SECTION */}
                      <div className="bg-white/95 border border-amber-150 p-4 rounded-xl space-y-3.5 shadow-4xs">
                        <p className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                          <span className="animate-pulse">❓</span> Bundan öncə neçə yürüşdə (hiking-də) olmusunuz?
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => handlePackingExperienceSelect(selectedTour.id, 'beginner')}
                            className={`p-3.5 rounded-xl border text-left transition duration-200 cursor-pointer flex flex-col justify-between ${
                              packingExperienceMap[selectedTour.id] === 'beginner'
                                ? 'border-emerald-500 bg-emerald-50/30 ring-1 ring-emerald-500'
                                : 'border-slate-200 bg-white hover:border-amber-300'
                            }`}
                          >
                            <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                              <span className="text-xs">🟢</span> 0 - 2 dəfə (Yeni başlayan)
                            </span>
                            <span className="text-[9px] text-slate-500 mt-1.5 font-medium leading-normal">
                              Evdə olan rahat əşyalarla sadə hazırlıq. Bahalı avadanlığa ehtiyac yoxdur!
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePackingExperienceSelect(selectedTour.id, 'pro')}
                            className={`p-3.5 rounded-xl border text-left transition duration-200 cursor-pointer flex flex-col justify-between ${
                              packingExperienceMap[selectedTour.id] === 'pro'
                                ? 'border-indigo-500 bg-indigo-50/10 ring-1 ring-indigo-500'
                                : 'border-slate-200 bg-white hover:border-amber-300'
                            }`}
                          >
                            <span className="text-[11px] font-black text-slate-800 flex items-center gap-1">
                              <span className="text-xs">⚡</span> 3 və ya daha çox (Təcrübəli)
                            </span>
                            <span className="text-[9px] text-slate-500 mt-1.5 font-medium leading-normal">
                              Relyefə və çətinliyə xüsusi texniki səviyyə avadanlığı və qoruyucu geyim.
                            </span>
                          </button>
                        </div>
                      </div>

                      {/* PACKING LIST DISPLAY AREA */}
                      {packingAnalyzingMap[selectedTour.id] ? (
                        <div className="bg-white border border-amber-200/60 p-6 rounded-xl text-center space-y-2.5 shadow-5xs">
                          <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 text-amber-600 animate-spin" />
                            <p className="text-[10px] text-slate-500 font-bold tracking-wider">
                              Təcrübəniz analiz edilir və sizə özəl çanta siyahısı hazırlanır...
                            </p>
                          </div>
                        </div>
                      ) : packingExperienceMap[selectedTour.id] ? (
                        (() => {
                          const userChoice = packingExperienceMap[selectedTour.id] as 'beginner' | 'pro';
                          const items = PACKING_LISTS[userChoice];

                          return (
                            <div className="bg-white border border-amber-200/80 p-4.5 rounded-xl text-xs space-y-3 shadow-xs text-slate-850 animate-fadeIn">
                              {userChoice === 'beginner' ? (
                                <div className="space-y-3 bg-emerald-50/20 border border-emerald-100/70 p-4 rounded-lg">
                                  <div className="flex items-center justify-between border-b border-emerald-100/40 pb-2 mb-1">
                                    <span className="flex items-center gap-1.5 text-xs font-black text-emerald-800 tracking-widest">
                                      <span>🟢</span> Sizə Uyğun: Yeni Başlayan Çantası
                                    </span>
                                    <span className="bg-emerald-100 text-emerald-800 font-bold text-[9px] px-1.5 py-0.5 rounded leading-none select-none">
                                      Məsləhət Görülür
                                    </span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {items.map((item, index) => {
                                      const key = `${selectedTour.id}:beginner:${index}`;
                                      const checked = !!checkedPackingItems[key];
                                      return (
                                        <li key={index} className="flex items-start gap-2 text-[11px] font-medium">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => togglePackingItemChecked(key)}
                                            className="mt-0.5 accent-emerald-600 rounded cursor-pointer shrink-0"
                                          />
                                          <span className={checked ? 'line-through text-gray-400' : 'text-slate-700'}>{item}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              ) : (
                                <div className="space-y-3 bg-indigo-50/15 border border-indigo-100/60 p-4 rounded-lg">
                                  <div className="flex items-center justify-between border-b border-indigo-150/40 pb-2 mb-1">
                                    <span className="flex items-center gap-1.5 text-xs font-black text-indigo-800 tracking-widest">
                                      <span>⚡</span> Sizə Uyğun: Texniki Peşəkar Siyahı
                                    </span>
                                  </div>
                                  <ul className="space-y-1.5">
                                    {items.map((item, index) => {
                                      const key = `${selectedTour.id}:pro:${index}`;
                                      const checked = !!checkedPackingItems[key];
                                      return (
                                        <li key={index} className="flex items-start gap-2 text-[11px] font-medium">
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => togglePackingItemChecked(key)}
                                            className="mt-0.5 accent-indigo-600 rounded cursor-pointer shrink-0"
                                          />
                                          <span className={checked ? 'line-through text-gray-400' : 'text-slate-700'}>{item}</span>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                </div>
                              )}

                              <div className="pt-2 text-[9px] text-emerald-700 font-bold border-t border-slate-100 flex items-center justify-between gap-1 leading-normal">
                                <span>💚 <strong>Bələdçi Rəyi:</strong> Sizə hər zaman rahat olacaq geyim və ayaqqabılar seçin; yürüşün, fəslin ləzzətini hiss edin!</span>
                                <button
                                  type="button"
                                  onClick={() => handlePackingExperienceSelect(selectedTour.id, userChoice === 'beginner' ? 'pro' : 'beginner')}
                                  className="text-[9px] text-indigo-700 font-black underline hover:text-indigo-800 cursor-pointer select-none whitespace-nowrap"
                                >
                                  {userChoice === 'beginner' ? "Təcrübəli siyahısına keç" : "Başlayanlar üçün keç"}
                                </button>
                              </div>
                            </div>
                          );
                        })()
                      ) : (
                        <div className="text-center p-4 bg-white/70 border border-dashed border-slate-200 rounded-xl text-[11px] text-slate-500 font-medium">
                          💡 Yuxarıdakı suala cavab seçərək sizə özəl olan ağıllı bələdçi tövsiyələrini dərhal açın!
                        </div>
                      )}
                    </div>
                  )}

                  {/* Mehmanxana və Nəqliyyat Loqistikası */}
                  {selectedTour.isInternational && (
                    <div className="bg-gradient-to-r from-amber-500/10 to-teal-800/5 border border-amber-200 p-5 rounded-xl space-y-4">
                      <h4 className="text-xs font-black text-amber-900 tracking-wider flex items-center gap-1.5 border-b pb-1.5 border-amber-200">
                        🏨 Səyahət, Mehmanxana və VIP Rezervasiya Təfərrüatları
                      </h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">MEHMANXANA NÖVÜ</span>
                          <span className="text-slate-900 font-bold block">{selectedTour.hotelName}</span>
                          <span className="text-amber-500 text-xs tracking-widest font-bold block">
                            {Array(Number(selectedTour.hotelStars || 5)).fill('★').join('')}
                          </span>
                        </div>
                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">QİDALANMA TƏMİNATI</span>
                          <span className="text-primary-900 font-extrabold block">🍽️ {selectedTour.mealType || 'Səhər yeməyi'}</span>
                        </div>

                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">UÇUŞ BİLETLƏRİ</span>
                          <span className="text-slate-700 block text-[11px] font-medium leading-relaxed">
                            {selectedTour.flightIncluded ? '✈️ Aviabilet ümumi qiymətə daxildir' : '❌ Aviabilet müştəri tərəfindən ayrıca alınmalıdır'}
                          </span>
                          {selectedTour.flightDetails && (
                            <span className="text-[10px] text-slate-500 italic block mt-0.5">{selectedTour.flightDetails}</span>
                          )}
                        </div>

                        <div className="space-y-1 text-xs">
                          <span className="text-slate-400 block font-bold text-[9px]">YERDAXİLİ TRANSFER</span>
                          <span className="text-slate-700 block text-[11px] font-medium leading-relaxed">🚍 {selectedTour.transferDetails || 'Hava limanından otelə komfortlu transfer daxildir.'}</span>
                        </div>
                      </div>

                      {/* Room options pricing */}
                      {selectedTour.roomTypes && selectedTour.roomTypes.length > 0 && (
                        <div className="bg-white p-3 rounded-lg border border-amber-150 space-y-2 mt-2">
                          <span className="text-[10px] text-amber-900 font-extrabold block tracking-wide">
                            🏨 Otaq Tiplərinə görə qiymət tənzimləməsi (Əlavələr):
                          </span>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {selectedTour.roomTypes.map((room, ri) => (
                              <div key={ri} className="bg-slate-50 p-2 rounded border border-slate-100 text-[10px]">
                                <span className="block text-slate-500 font-bold">{room.name}</span>
                                <strong className="block text-emerald-800 font-black">
                                  +{room.priceDiff} {selectedTour.priceCurrency || '₼'}
                                </strong>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Gündəlik Səyahət Proqramı (Itinerary Map) */}
                  {selectedTour.isInternational && selectedTour.itinerary && selectedTour.itinerary.length > 0 && (
                    <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-500 tracking-widest border-b pb-1.5 flex items-center gap-1.5">
                        ⏳ Günbəgün Ətraflı Səyahət Proqramı
                      </h4>

                      <div className="space-y-5">
                        {selectedTour.itinerary.map((day, di) => (
                          <div key={di} className="relative pl-6 border-l-2 border-amber-500/40 space-y-2">
                            {/* Marker */}
                            <div className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full bg-amber-500 border-2 border-white ring-2 ring-amber-500/20" />
                            
                            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                              <span className="text-xs font-black text-amber-900 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-sm">
                                📅 {day.day}-ci GÜN
                              </span>
                              <h5 className="text-xs font-extrabold text-ink-900 flex-1 sm:ml-3">
                                {day.title}
                              </h5>
                            </div>

                            <p className="text-xs text-slate-600 leading-relaxed pl-1">
                              {day.description}
                            </p>

                            {day.image ? (
                              <div className="mt-2 h-36 max-w-md rounded-lg overflow-hidden bg-slate-100 border border-slate-150 shadow-sm relative group">
                                <img
                                  src={day.image}
                                  alt={day.title}
                                  className="w-full h-full object-cover transition duration-350 group-hover:scale-101"
                                  referrerPolicy="no-referrer"
                                />
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Historical verified feedbacks inside detailed modals */}
                  {/* Ödəniş sistemi olmadığı üçün müvəqqəti söndürülüb, bax: REVIEWS_ENABLED */}
                  {REVIEWS_ENABLED && (
                  <div>
                    <h4 className="text-xs font-bold text-slate-500 tracking-widest">İştirakçı Rəyləri ({getReviewsCount(selectedTour.id)})</h4>
                    <div className="space-y-2.5 mt-2">
                      {reviews.filter(r => r.tourId === selectedTour.id).length === 0 ? (
                        <div className="text-slate-400 text-xs italic">Hələ ki rəy yazılmayıb. İlk yazan siz olun!</div>
                      ) : (
                        reviews.filter(r => r.tourId === selectedTour.id).map((rev) => (
                          <div key={rev.id} className="bg-slate-50 p-3 rounded-lg space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <strong className="text-slate-700 font-bold">{rev.customerName}</strong>
                              <div className="flex items-center text-amber-500">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                <span className="font-bold ml-0.5">{rev.rating}</span>
                              </div>
                            </div>
                            <p className="text-[11px] text-slate-600">{rev.comment}</p>
                            {rev.verifiedAttendee && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mt-1">
                                <CheckCircle className="w-2.5 h-2.5" /> Real İştirakçı
                              </span>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  )}
                </div>

            </div> {/* Closes Extra dynamic details */}
          </div> {/* Closes Left Column */}
            
          {/* RIGHT COLUMN: Sticky Booking Widget (GYG Style) */}
            <div className="w-full lg:w-[35%] relative" id="booking-widget-container">
              <div className="sticky top-24 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200">
                <div className="p-6 space-y-6">
                  {/* Pricing Header */}
                  <div className="flex flex-col gap-1">
                    {slots.filter(s => s.tourId === selectedTour.id).length > 0 ? (
                      (() => {
                        const basePrice = selectedTour.price ?? slots.filter(s => s.tourId === selectedTour.id)[0].price;
                        const hasDiscount = !!selectedTour.discountPrice && selectedTour.discountPrice > 0 && selectedTour.discountPrice < basePrice;
                        return hasDiscount ? (
                          <>
                            <span className="line-through text-gray-400 text-sm">
                              {getConvertedPriceInfo(basePrice, selectedTour.priceCurrency).both}
                            </span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xl font-extrabold text-rose-600">
                                {getConvertedPriceInfo(selectedTour.discountPrice!, selectedTour.priceCurrency).both}
                              </span>
                              <span className="text-slate-500 font-medium text-sm">adam başı</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-extrabold text-slate-900">
                              {getConvertedPriceInfo(basePrice, selectedTour.priceCurrency).both}
                            </span>
                            <span className="text-slate-500 font-medium text-sm">adam başı</span>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-slate-400">Məlumat yoxdur</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Selectors */}
                  <div className="space-y-4">
                    <div className="flex flex-col border border-slate-300 rounded-xl shadow-xs hover:border-slate-400 transition-colors">
                      {/* Participants Dropdown — bound to the same bookingQty used by the reservation form below */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowParticipantsDropdown(prev => !prev)}
                          className="w-full flex items-center justify-between bg-white px-4 py-3 border-b border-slate-200 text-left cursor-pointer hover:bg-slate-50 rounded-t-xl"
                        >
                          <div className="flex items-center gap-3">
                            <Users className="w-5 h-5 text-emerald-700" />
                            <span className="text-sm font-extrabold text-slate-800">Böyük × {bookingQty}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showParticipantsDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showParticipantsDropdown && (() => {
                          const maxParticipants = selectedSlot ? Math.max(1, selectedSlot.capacity - selectedSlot.bookedCount) : 20;
                          return (
                            <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowParticipantsDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-4 mt-1">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-slate-700">Böyük</span>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    disabled={bookingQty <= 1}
                                    onClick={() => setBookingQty(prev => Math.max(1, prev - 1))}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-40"
                                  >
                                    -
                                  </button>
                                  <span className="font-bold text-slate-800 text-sm w-4 text-center">{bookingQty}</span>
                                  <button
                                    type="button"
                                    disabled={bookingQty >= maxParticipants}
                                    onClick={() => setBookingQty(prev => Math.min(maxParticipants, prev + 1))}
                                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-40"
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                              {selectedSlot && (
                                <p className="text-[10px] text-slate-400 italic mt-2">
                                  (Maksimum {maxParticipants} yer mövcuddur)
                                </p>
                              )}
                              <button
                                type="button"
                                onClick={() => setShowParticipantsDropdown(false)}
                                className="mt-3 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-lg transition-colors"
                              >
                                Təsdiqlə
                              </button>
                            </div>
                            </>
                          );
                        })()}
                      </div>

                      {/* Date Dropdown — lists only this tour's real slots; full/expired dates are disabled */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowDateDropdown(prev => !prev)}
                          className="w-full flex items-center justify-between bg-white px-4 py-3 text-left cursor-pointer hover:bg-slate-50 rounded-b-xl"
                        >
                          <div className="flex items-center gap-3">
                            <Calendar className="w-5 h-5 text-emerald-700" />
                            <span className="text-sm font-extrabold text-slate-800">{selectedSlot ? `Tarix: ${selectedSlot.startDate}` : 'Tarix seçin'}</span>
                          </div>
                          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showDateDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showDateDropdown && (
                          <>
                          <div className="fixed inset-0 z-10" onClick={() => setShowDateDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full z-20 bg-white border border-slate-200 rounded-xl shadow-lg p-2 mt-1 max-h-64 overflow-y-auto">
                            {slots.filter(s => s.tourId === selectedTour.id).length === 0 ? (
                              <p className="text-xs text-slate-400 font-medium p-3 text-center">Hazırda aktiv tarix yoxdur.</p>
                            ) : (
                              [...slots.filter(s => s.tourId === selectedTour.id)]
                                .sort((a, b) => a.startDate.localeCompare(b.startDate))
                                .map((slot) => {
                                  const remainingSpots = Math.max(0, slot.capacity - slot.bookedCount);
                                  const dateParts = slot.startDate.split('-');
                                  const slotDate = dateParts.length >= 3
                                    ? new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]))
                                    : null;
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const isPast = slotDate ? slotDate < today : false;
                                  const isDisabled = remainingSpots <= 0 || isPast;
                                  return (
                                    <button
                                      key={slot.id}
                                      type="button"
                                      disabled={isDisabled}
                                      onClick={() => {
                                        setSelectedSlot(slot);
                                        setShowDateDropdown(false);
                                      }}
                                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition ${
                                        isDisabled
                                          ? 'opacity-40 cursor-not-allowed'
                                          : selectedSlot?.id === slot.id
                                            ? 'bg-emerald-50 border border-emerald-300'
                                            : 'hover:bg-slate-50 cursor-pointer'
                                      }`}
                                    >
                                      <span className="text-xs font-bold text-slate-700">📅 {slot.startDate}</span>
                                      <span className={`text-[10px] font-bold ${isDisabled ? 'text-red-400' : 'text-slate-400'}`}>
                                        {isPast ? 'Bitib' : remainingSpots <= 0 ? 'Dolub' : `${remainingSpots} yer`}
                                      </span>
                                    </button>
                                  );
                                })
                            )}
                          </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Primary CTA Action — just reveals the tour-slots-calendar section (moved up next to the
                      Quick Info Grid). Once that section is open there's nothing left for this button to do,
                      so it's hidden entirely instead of switching label/behavior. */}
                  {!showTourSlots && (
                    <button
                      type="button"
                      disabled={slots.filter(s => s.tourId === selectedTour.id).length === 0}
                      onClick={() => setShowTourSlots(true)}
                      className="w-full bg-primary-500 hover:bg-primary-600 text-white text-base md:text-lg font-black py-3.5 rounded-full shadow-md transition-all active:scale-95 cursor-pointer block text-center disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      Yerləri yoxla
                    </button>
                  )}

                  {/* Guarantees */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-full p-0.5 shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-extrabold text-slate-800">Ödənişsiz ləğv</h4>
                        <p className="text-xs text-slate-500 font-medium leading-snug">Tam geri ödəmə üçün 24 saat əvvələ qədər ləğv edin</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="bg-emerald-100 rounded-full p-0.5 shrink-0 mt-0.5">
                        <Check className="w-3.5 h-3.5 text-emerald-700" />
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-sm font-extrabold text-slate-800">İndi rezerv et, sonra ödə</h4>
                        <p className="text-xs text-slate-500 font-medium leading-snug">Səyahət planlarınızı çevik saxlayın — yerinizi bron edin və bu gün heç nə ödəməyin.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div> {/* Closes TWO COLUMN WRAPPER */}
            
          {/* YOU MIGHT ALSO LIKE SECTION */}
          <div className="mt-16 pt-16 border-t border-slate-200">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-8">Bunlar da maraqlı ola bilər...</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
                {tours
                  .filter(t => t.id !== selectedTour.id)
                  .sort(() => 0.5 - Math.random()) // Randomize for varied suggestions
                  .slice(0, 4)
                  .map(tour => {
                    const priceList = slots.filter(s => s.tourId === tour.id).map(s => s.price);
                    const minPrice = priceList.length > 0 ? Math.min(...priceList) : null;
                    return (
                      <div 
                        key={tour.id} 
                        className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer h-full"
                        onClick={() => {
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                          setSelectedTour(tour);
                          setIsBookingStep(false);
                          setBookingSuccessData(null);
                          setSelectedSlot(null);
                        }}
                      >
                        <div className="relative h-48 sm:h-56 overflow-hidden">
                          <img 
                            src={tour.image} 
                            alt={tour.name} 
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <button className="absolute top-3 right-3 bg-white/90 p-2 rounded-full text-slate-700 hover:text-rose-600 transition shadow-sm" onClick={(e) => { e.stopPropagation(); }}>
                            <Heart className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="p-4 flex flex-col flex-grow">
                          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                            <span>{tour.category}</span>
                            <span>•</span>
                            <span>{tour.region}</span>
                          </div>
                          <h3 className="font-extrabold text-slate-900 text-sm mb-3 line-clamp-2 leading-snug group-hover:text-emerald-700 transition">
                            {tour.name}
                          </h3>
                          {REVIEWS_ENABLED && (
                            <div className="flex items-center gap-1 text-xs font-bold text-slate-700 mb-4">
                               <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                               4.9 <span className="text-slate-500 font-normal">({getReviewsCount(tour.id)})</span>
                            </div>
                          )}

                          <div className="mt-auto pt-4 border-t border-slate-100 flex items-end justify-between">
                            <span className="text-xs text-slate-500 font-medium">{tour.durationHours ?? (tour.durationDays * 8)} saat</span>
                            {minPrice ? (
                              <div className="flex flex-col items-end">
                                <span className="text-[10px] text-slate-500 font-medium">Başlayan qiymətlər</span>
                                <span className="text-base font-extrabold text-slate-900">{getConvertedPriceInfo(minPrice, tour.priceCurrency).both}</span>
                              </div>
                            ) : (
                               <span className="text-xs font-bold text-slate-400">Satılıb qurtarıb</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

        </div>
      </div>
      )}

      {/* IMMERSIVE FULL-SCREEN GALLERY LIGHTBOX POPUP */}
      {selectedTour && lightboxIndex !== null && (() => {
        const allMedia: {type: 'image' | 'video', url: string}[] = [];
        if (selectedTour.image) {
          allMedia.push({ type: 'image', url: selectedTour.image });
        }
        if (selectedTour.images && selectedTour.images.length > 0) {
          selectedTour.images.filter(Boolean).forEach(img => {
            allMedia.push({ type: 'image', url: img });
          });
        }
        if (selectedTour.videos && selectedTour.videos.length > 0) {
          selectedTour.videos.filter(Boolean).forEach(vid => {
            allMedia.push({ type: 'video', url: vid });
          });
        }

        const currentMedia = allMedia[lightboxIndex];
        if (!currentMedia) return null;

        const handlePrev = (e?: React.MouseEvent) => {
          e?.stopPropagation();
          setLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : allMedia.length - 1));
        };

        const handleNext = (e?: React.MouseEvent) => {
          e?.stopPropagation();
          setLightboxIndex(prev => (prev !== null && prev < allMedia.length - 1 ? prev + 1 : 0));
        };

        return (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-8 select-none"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Lightbox Header Controls */}
            <div className="flex items-center justify-between text-white w-full max-w-5xl mx-auto z-10 p-2">
              <div className="flex flex-col">
                <span className="text-xs text-slate-400 font-semibold tracking-wider font-mono">QALEREYA VİZUALİTOR ({lightboxIndex + 1} / {allMedia.length})</span>
                <span className="text-sm font-bold truncate max-w-[200px] xs:max-w-xs">{selectedTour.name}</span>
              </div>
              <button
                type="button"
                className="bg-slate-800 hover:bg-slate-700 text-white p-2.5 rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center border border-white/10"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(null);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lightbox Media Body */}
            <div className="flex-1 flex items-center justify-center relative w-full max-w-5xl mx-auto my-4 overflow-hidden">
              
              {/* Left Arrow Button */}
              {allMedia.length > 1 && (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 md:left-4 z-10 bg-black/60 hover:bg-black text-white p-3 rounded-full hover:scale-110 active:scale-95 transition-all border border-white/10 cursor-pointer"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
              )}

              {/* Main Media Core */}
              <div 
                className="relative max-h-[70vh] max-w-full flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                {currentMedia.type === 'image' ? (
                  <img 
                    src={currentMedia.url || undefined} 
                    alt={`Full view ${lightboxIndex}`} 
                    className="max-h-[70vh] max-w-full object-contain rounded-xl shadow-2xl transition-all duration-300" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="relative max-h-[70vh] rounded-xl overflow-hidden shadow-2xl bg-black flex items-center justify-center">
                    <video 
                      src={currentMedia.url || undefined} 
                      className="max-h-[70vh] max-w-full object-contain" 
                      controls 
                      autoPlay 
                      playsInline
                    />
                  </div>
                )}
              </div>

              {/* Right Arrow Button */}
              {allMedia.length > 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 md:right-4 z-10 bg-black/60 hover:bg-black text-white p-3 rounded-full hover:scale-110 active:scale-95 transition-all border border-white/10 cursor-pointer"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              )}

            </div>

            {/* Lightbox Thumbnails Navigation Bar */}
            {allMedia.length > 1 && (
              <div 
                className="w-full max-w-2xl mx-auto flex gap-2 overflow-x-auto py-3 px-4 bg-slate-900/60 border border-white/10 rounded-2xl shrink-0 justify-start sm:justify-center scrollbar-thin scrollbar-thumb-white/20 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                {allMedia.map((m, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setLightboxIndex(i)}
                    className={`relative h-10 w-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                      lightboxIndex === i 
                        ? 'border-emerald-500 scale-105 shadow-md ring-2 ring-emerald-500/30' 
                        : 'border-white/10 opacity-65 hover:opacity-100'
                    }`}
                  >
                    {m.type === 'image' ? (
                      <img src={m.url || undefined} alt={`Thumb ${i}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-950 flex items-center justify-center relative">
                        <video src={m.url || undefined} className="w-full h-full object-cover opacity-60" muted playsInline />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                          <Play className="w-3 h-3 text-white fill-white" />
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </>
  );
}
