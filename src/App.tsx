import React, { useState, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Tour, TourSlot, Booking, Review, User, PlatformConfig, PriceCalculatorConfig, UserRole } from './types';
import { seedUsers } from './data/toursData';
// Lazy-loaded: each portal pulls in its own heavy dependency tree (vendor forms, jspdf/
// html5-qrcode ticket generation, maplibre-gl GPS visualizer, etc.) that a visitor sitting in
// only one role never needs — splitting them keeps the initial bundle to just the shell + the
// role picker instead of shipping all three portals' code to every single visitor.
const CustomerPortal = lazy(() => import('./components/CustomerPortal'));
const VendorPortal = lazy(() => import('./components/VendorPortal'));
const AdminPortal = lazy(() => import('./components/AdminPortal'));
import OperatorLogin from './components/OperatorLogin';
import AdminLogin from './components/AdminLogin';
import ResetPasswordPage from './components/ResetPasswordPage';
import { SearchDropdown } from './components/SearchDropdown';
import { getRecentSearches, addRecentSearch } from './utils/recentSearches';
import { getWishlist, WISHLIST_CHANGED_EVENT } from './utils/wishlist';
import { getCompareList, COMPARE_CHANGED_EVENT } from './utils/compare';
import { useLanguage } from './i18n/LanguageContext';
import LanguageSwitcher from './components/LanguageSwitcher';
import { useExpandingMenu } from './hooks/useExpandingMenu';
import { UrgentDealsBell } from './components/customer/UrgentDealsBell';
import {
  ShieldAlert,
  RefreshCw,
  X,
  Heart,
  Scale,
  Globe,
  Calculator,
  Tent,
  BookOpen,
  Menu
} from 'lucide-react';

// The API always responds with JSON, but if a request slips past Express (e.g. a 413
// "payload too large" or a proxy/500 error), the body comes back as an HTML error page
// instead — response.json() would then throw a cryptic "Unexpected token '<'" error.
// Parsing as text first lets us surface a message that actually points at the problem.
async function parseApiResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Server düzgün cavab qaytarmadı (HTTP ${response.status}). Backend loglarını yoxlayın.`);
  }
}

// Shown briefly while a lazy-loaded portal's own chunk (and its heavy dependencies — vendor
// form components, jspdf, maplibre-gl, etc.) is fetched on first navigation into that role.
function PortalLoadingFallback() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <RefreshCw className="w-8 h-8 text-brand-primary animate-spin" />
    </div>
  );
}

export default function App() {
  // Custom notification state for elegant user feedback without browser alerts
  const [notification, setNotification] = useState<{
    message: string;
    type: 'success' | 'info' | 'error' | 'warning';
  } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setNotification({ message, type });
    // auto-hide after 4 seconds
    setTimeout(() => {
      setNotification(prev => {
        if (prev?.message === message) return null;
        return prev;
      });
    }, 4500);
  };

  const navigate = useNavigate();
  const location = useLocation();

  // Controls the mobile-only "more" dropdown that groups guide/calculator/language
  // behind a single burger icon, since mobile header space only fits compare + wishlist
  // plus this one extra button.
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);

  // Admin-controlled feature flag (settings table, camp_sites_enabled): when off, the camp
  // sites nav buttons disappear entirely. Defaults to false until the config loads so the
  // button never flashes visible on installs where the admin has switched it off.
  const [campSitesEnabled, setCampSitesEnabled] = useState<boolean>(false);
  React.useEffect(() => {
    fetch('/api/camp-sites/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setCampSitesEnabled(!!data && data.enabled !== false))
      .catch(() => setCampSitesEnabled(true)); // config endpoint down — don't hide the feature
  }, []);

  // Same admin-controlled feature flag pattern (settings table, group_calculator_enabled) for
  // the "Qrup hesabla" price calculator nav button. Defaults to visible so the button doesn't
  // flash away on the common case (feature left on) while the config request is in flight.
  const [groupCalculatorEnabled, setGroupCalculatorEnabled] = useState<boolean>(true);
  React.useEffect(() => {
    fetch('/api/group-calculator/config')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setGroupCalculatorEnabled(!!data && data.enabled !== false))
      .catch(() => setGroupCalculatorEnabled(true)); // config endpoint down — don't hide the feature
  }, []);

  const [loggedInVendor, setLoggedInVendor] = useState<User | null>(null);
  // JWT from /api/auth/operator/login — kept in memory only (not localStorage), matches
  // the token's own short lifetime and is cleared on logout.
  const [operatorToken, setOperatorToken] = useState<string | null>(null);
  const handleOperatorLogin = (user: User, token: string) => {
    setLoggedInVendor(user);
    setOperatorToken(token);
  };
  const handleOperatorLogout = () => {
    setLoggedInVendor(null);
    setOperatorToken(null);
  };

  const [loggedInAdmin, setLoggedInAdmin] = useState<User | null>(null);
  // JWT from /api/auth/admin/login — kept in memory only (not localStorage), matches
  // the token's own short lifetime and is cleared on logout.
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const handleAdminLogin = (user: User, token: string) => {
    setLoggedInAdmin(user);
    setAdminToken(token);
  };
  const handleAdminLogout = () => {
    setLoggedInAdmin(null);
    setAdminToken(null);
  };

  // Legacy entry points from before real routing existed (?portal=vendor / ?portal=admin
  // query params) — redirect them to the equivalent path-based route once, on mount, so old
  // bookmarks/links keep working instead of just landing on the plain customer homepage.
  React.useEffect(() => {
    const portal = new URLSearchParams(location.search).get('portal');
    if (portal === 'vendor') {
      navigate(loggedInVendor ? '/vendor/dashboard' : '/vendor/login', { replace: true });
    } else if (portal === 'admin') {
      navigate(loggedInAdmin ? '/admin/dashboard' : '/admin/login', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Whichever role is currently logged in — server-side mutation endpoints for
  // tours/slots/bookings now require this as a Bearer token (see server.ts's
  // authenticateUser middleware + per-resource ownership checks). GET /api/tours and
  // GET /api/bookings also read it: with a vendor token they scope the response to that
  // vendor's own rows server-side (not just in the UI), with an admin token they return
  // everything, and with no token they keep the public/unfiltered shape the customer
  // marketplace relies on.
  const authToken = operatorToken || adminToken;
  const authHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    return headers;
  };

  // Marketplace core data (tours, slots, bookings, reviews) is served from Postgres/SQLite
  // (server/db.ts) through the REST API in server.ts — these just hold the client-side copy.
  const [tours, setTours] = useState<Tour[]>([]);
  const [slots, setSlots] = useState<TourSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [isMarketplaceDataLoading, setIsMarketplaceDataLoading] = useState(true);
  const [marketplaceDataError, setMarketplaceDataError] = useState<string | null>(null);

  const loadMarketplaceData = React.useCallback(async () => {
    setIsMarketplaceDataLoading(true);
    setMarketplaceDataError(null);
    try {
      // /api/tours scopes its response server-side when an Authorization header is present:
      // a vendor token gets only that vendor's own rows, an admin token gets everything, no
      // token (public/customer) keeps the existing unfiltered shape the marketplace browsing
      // relies on. /api/bookings carries customer names/phone numbers, so it now requires a
      // session — only fetched when one exists; anonymous browsing just has no bookings data.
      const authedGet = (url: string) => authToken ? fetch(url, { headers: { Authorization: `Bearer ${authToken}` } }) : fetch(url);
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
        toursRes.json(), slotsRes.json(), bookingsRes ? bookingsRes.json() : Promise.resolve({ bookings: [] }), reviewsRes.json(),
      ]);
      setTours(toursData.tours || []);
      setSlots(slotsData.slots || []);
      setBookings(bookingsData.bookings || []);
      setReviews(reviewsData.reviews || []);
    } catch (e: any) {
      setMarketplaceDataError(e.message || 'Bazar məlumatlarını yükləmək mümkün olmadı. Backend serverin işlədiyini yoxlayın.');
    } finally {
      setIsMarketplaceDataLoading(false);
    }
  }, [authToken]);

  // Re-runs on mount and again whenever a vendor/admin logs in or out, so the tours/
  // bookings scope (own-vendor-only vs. everything vs. public) matches the current session.
  React.useEffect(() => {
    loadMarketplaceData();
  }, [loadMarketplaceData]);

  const [users, setUsers] = useState<User[]>(() => {
    try {
      const saved = localStorage.getItem('turlar_users');
      if (saved) {
         const parsed: User[] = JSON.parse(saved);
         return parsed.map(user => {
            // Older builds shipped seed passwords inside this localStorage blob; strip them on
            // load so they disappear from existing visitors' browsers on the next save (real
            // auth is server-side, nothing client-side reads this field).
            delete (user as any).password;
            // Older builds also shipped a random Unsplash portrait as the vendor's public
            // avatar — drop it so the organizer page falls back to the brand-initial badge.
            if (user.avatar && user.avatar.includes('photo-1534528741775')) user.avatar = '';
            const seed = seedUsers.find(su => su.id === user.id);
            if (seed) {
               return {
                 ...seed,
                 ...user,
                 guides: user.guides && user.guides.length > 0 ? user.guides : seed.guides,
                 about: user.about || seed.about || ''
               };
            }
            return user;
         });
      }
      return seedUsers;
    } catch (e) {
      return seedUsers;
    }
  });

  // Sync the vendor list from the real backend whenever an admin session is active. Without
  // this, `users` only ever reflects localStorage/bundled seed data — an admin from another
  // session (or the DB directly) archiving/reactivating a vendor would never show up here, so
  // AdminPortal's "Tərəfdaşlar" list kept displaying archived vendors as fully active/editable.
  // Server data wins for the real fields (isArchived, subscriptionValidUntil, username, etc.);
  // local-only extras (guides, about) are preserved via the same merge pattern used above.
  React.useEffect(() => {
    if (!loggedInAdmin || !adminToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/users', { headers: { Authorization: `Bearer ${adminToken}` } });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const serverVendors: User[] = (data.users || []).filter((u: User) => u.role === 'vendor');
        setUsers(prev => {
          const prevById = new Map<string, User>(prev.map(u => [u.id, u]));
          const mergedVendors = serverVendors.map(sv => {
            const local = prevById.get(sv.id);
            return local ? { ...local, ...sv } : sv;
          });
          const nonVendors = prev.filter(u => u.role !== 'vendor');
          return [...nonVendors, ...mergedVendors];
        });
      } catch {
        // Non-fatal — Tərəfdaşlar just keeps showing the last-known (possibly stale) list.
      }
    })();
    return () => { cancelled = true; };
  }, [loggedInAdmin, adminToken]);

  // Default "Qrup üçün qiymət hesabla" cost elements — matches the values that used to be
  // hardcoded directly in PriceCalculator.tsx. Admins can now edit these from AdminPortal;
  // existing localStorage data saved before this field existed gets backfilled with these
  // defaults rather than crashing the calculator with an undefined config.
  const DEFAULT_PRICE_CALCULATOR_CONFIG: PriceCalculatorConfig = {
    destinations: { "İsmayıllı": 175, "Nabran": 220, "Şəki": 350, "Qəbələ": 225, "Şamaxı": 122, "Quba": 168, "Qusar": 185 },
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

  // Platform configuration state
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(() => {
    try {
      const saved = localStorage.getItem('turlar_platform_config');
      const parsed = saved ? JSON.parse(saved) : {};
      return {
        priceCalculatorConfig: { ...DEFAULT_PRICE_CALCULATOR_CONFIG, ...(parsed.priceCalculatorConfig || {}) },
      };
    } catch (e) {
      return { priceCalculatorConfig: DEFAULT_PRICE_CALCULATOR_CONFIG };
    }
  });

  // Exchange rate config state
  const [exchangeRates, setExchangeRates] = useState<{ USD: number; EUR: number }>(() => {
    try {
      const saved = localStorage.getItem('turlar_exchange_rates');
      if (saved) return JSON.parse(saved);
    } catch {
      // Corrupt/missing cache — fall through to the hardcoded defaults below.
    }
    return { USD: 1.70, EUR: 1.85 };
  });

  // Automatically fetch live CBAR rates on startup so admin never has to manually type them
  React.useEffect(() => {
    const fetchLiveRates = async () => {
      try {
        const response = await fetch('/api/exchange-rates/cbar');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.USD && data.EUR) {
            setExchangeRates({ USD: data.USD, EUR: data.EUR });
            localStorage.setItem('turlar_exchange_rates', JSON.stringify({ USD: data.USD, EUR: data.EUR }));
            console.log('[CBAR Auto] Loaded live rates successfully:', data);
          }
        }
      } catch (err) {
        console.error('[CBAR Auto] Failed to fetch live exchange rates:', err);
      }
    };
    fetchLiveRates();
  }, []);

  const handleUpdateExchangeRates = (newRates: { USD: number; EUR: number }) => {
    setExchangeRates(newRates);
    try {
      localStorage.setItem('turlar_exchange_rates', JSON.stringify(newRates));
    } catch {
      // localStorage unavailable — the in-memory rate is still updated above.
    }
    showNotification(t('app.notifications.ratesUpdated'), 'success');
  };

  // Global search query — shared with CustomerPortal/ToursHomeView so the search term
  // persists across route changes and stays in sync between the home page's own search
  // box and the inline copy that appears in the header on desktop once scrolled.
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchFocused, setIsGlobalSearchFocused] = useState(false);
  const globalSearchRef = React.useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const recordSearch = (term: string) => setRecentSearches(addRecentSearch(term));
  // isScrolled: past the point where the home page's own search box has scrolled out of
  // view — used only to reveal the inline search bar in the header on desktop (sm+); on
  // mobile the header never shows it, since there the home page's own search bar handles
  // sticking to the top itself.
  const [isScrolled, setIsScrolled] = useState(false);
  // Tracks whether the page has scrolled at all — drives the header's border/shadow so
  // it stays flush with the page background at the very top and only separates once the
  // user starts scrolling.
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<'AZN' | 'USD' | 'EUR'>('AZN');
  // Language selection lives in the global LanguageContext (src/i18n/LanguageContext.tsx) so
  // it's shared/persisted across the whole app, not just the customer marketplace header.
  const { language: appLanguage, setLanguage: setAppLanguage, t } = useLanguage();
  // Fixed 192px panel, right-aligned to the button (the language list is wider than the
  // trigger itself, unlike the tour share menu where the panel matches the button's width).
  const langMenu = useExpandingMenu((rect) => ({ 
  left: rect.right - 140, 
  width: 140 
}));

  // Wishlist ids live in localStorage (see utils/wishlist.ts); we mirror them here so the
  // header badge can react instantly when a tour is added/removed elsewhere, without a reload.
  const [wishlistIds, setWishlistIds] = useState<string[]>(() => getWishlist());
  React.useEffect(() => {
    const syncWishlist = () => setWishlistIds(getWishlist());
    window.addEventListener(WISHLIST_CHANGED_EVENT, syncWishlist);
    return () => window.removeEventListener(WISHLIST_CHANGED_EVENT, syncWishlist);
  }, []);
  const wishlistCount = React.useMemo(
    () => tours.filter(tour => wishlistIds.includes(tour.id) && tour.status === 'approved').length,
    [tours, wishlistIds]
  );

  // Compare list ids live in localStorage (see utils/compare.ts); mirrored here for the same
  // reason as wishlistIds above — instant header badge updates without a reload.
  const [compareIds, setCompareIds] = useState<string[]>(() => getCompareList());
  React.useEffect(() => {
    const syncCompare = () => setCompareIds(getCompareList());
    window.addEventListener(COMPARE_CHANGED_EVENT, syncCompare);
    return () => window.removeEventListener(COMPARE_CHANGED_EVENT, syncCompare);
  }, []);
  const compareCount = React.useMemo(
    () => tours.filter(tour => compareIds.includes(tour.id) && tour.status === 'approved').length,
    [tours, compareIds]
  );

  React.useEffect(() => {
    function handleClickOutsideSearch(event: MouseEvent) {
      if (globalSearchRef.current && !globalSearchRef.current.contains(event.target as Node)) {
        setIsGlobalSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideSearch);
    return () => document.removeEventListener('mousedown', handleClickOutsideSearch);
  }, []);

  // Closes the mobile "more" dropdown (guide/calculator/language) on outside click,
  // same pattern as the search dropdown above.
  const mobileMoreRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function handleClickOutsideMobileMore(event: MouseEvent) {
      if (mobileMoreRef.current && !mobileMoreRef.current.contains(event.target as Node)) {
        setMobileMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideMobileMore);
    return () => document.removeEventListener('mousedown', handleClickOutsideMobileMore);
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 300);
      setIsHeaderScrolled(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Active Simulated User — resolved per role rather than off a single global "selectedRole"
  // now that vendor/admin/customer are separate routes rendered independently.
  const getActiveUserForRole = (role: UserRole): User => {
    if (role === 'vendor' && loggedInVendor) return loggedInVendor;
    if (role === 'admin' && loggedInAdmin) return loggedInAdmin;
    const safeUsers = Array.isArray(users) && users.length > 0 ? users : seedUsers;
    const found = safeUsers.find(u => u.role === role);
    if (found) return found;
    return safeUsers[0] || seedUsers[0];
  };

  // Tours/slots/bookings/reviews are persisted server-side now (see loadMarketplaceData
  // above and the API-backed handlers below), so there's nothing to mirror to localStorage
  // for those anymore. Users/platformConfig stay on localStorage — out of scope for this pass.
  React.useEffect(() => {
    try {
      // Belt-and-braces: never let a password field (e.g. one injected by other client code)
      // reach localStorage, where any visitor can read it.
      const sanitized = users.map(({ password: _password, ...rest }: any) => rest);
      localStorage.setItem('turlar_users', JSON.stringify(sanitized));
    } catch (e) {
      console.error('Failed to save users', e);
    }
  }, [users]);

  React.useEffect(() => {
    try {
      localStorage.setItem('turlar_platform_config', JSON.stringify(platformConfig));
    } catch (e) {
      console.error('Failed to save platform config', e);
    }
  }, [platformConfig]);

  // Callback functions to maintain reactive states across all portals.
  // Tours/slots/bookings/reviews mutations now call the REST API (server.ts, backed by
  // server/db.ts) and sync local state from the server's response.
  const handleAddBooking = async (newBooking: Booking) => {
    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBooking),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Rezervasiya yaradıla bilmədi.');

      setBookings(prev => [data.booking, ...prev]);
      // Mirror the server-side slot capacity increment locally so the UI stays in sync.
      setSlots(prev => prev.map(s => s.id === data.booking.slotId ? { ...s, bookedCount: s.bookedCount + data.booking.participantsCount } : s));
      showNotification(t('app.notifications.bookingConfirmed', { id: data.booking.id }), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.bookingError'), 'error');
      throw e; // let the caller (e.g. CustomerPortal's booking form) know the create failed too
    }
  };

  const handleAddReview = async (newReview: Review) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Rəy əlavə edilə bilmədi.');

      setReviews(prev => [data.review, ...prev]);
      // The API recomputes the tour's aggregate rating/reviewsCount server-side; pull the
      // refreshed tour so the UI reflects the new average immediately.
      const tourResponse = await fetch(`/api/tours/${newReview.tourId}`);
      if (tourResponse.ok) {
        const tourData = await tourResponse.json();
        setTours(prev => prev.map(t => t.id === tourData.tour.id ? tourData.tour : t));
      }
      showNotification(t('app.notifications.reviewAdded'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.reviewError'), 'error');
      throw e; // let the caller (e.g. CustomerPortal's review form) know the create failed too
    }
  };

  // Local-only slot capacity nudge, kept for callers that adjust bookedCount without going
  // through a dedicated API call (booking status changes now do this server-side instead).
  const handleUpdateSlotBookedCount = (slotId: string, qty: number) => {
    setSlots(prev => prev.map(s => {
      if (s.id === slotId) {
        return { ...s, bookedCount: s.bookedCount + qty };
      }
      return s;
    }));
  };

  const handleUpdateUserBalance = (amount: number) => {
    const customerUserId = getActiveUserForRole('customer').id;
    setUsers(prev => prev.map(u => {
      if (u.id === customerUserId) {
        return { ...u, balance: Math.max(0, u.balance + amount) };
      }
      return u;
    }));
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

      setUsers(prev => [...prev, parsed.user]);
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

      setUsers(prev => prev.map(u => u.id === vendorId ? { ...u, isArchived: true } : u));
      showNotification(t('app.notifications.vendorArchived'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.vendorArchiveError'), 'error');
      throw e;
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
      setTours(prev => prev.map(t => {
        if (t.id === updatedTour.id) return updatedTour;
        // Mirror the backend's "only one manually-featured tour per vendor" rule locally too,
        // so the previous pick's badge disappears immediately without a second round-trip.
        if (isManuallyFeatured && t.vendorId === updatedTour.vendorId && t.isManuallyFeatured) {
          return { ...t, isManuallyFeatured: false, manuallyFeaturedAt: undefined };
        }
        return t;
      }));
      showNotification(
        isManuallyFeatured ? t('app.notifications.featuredSelected') : t('app.notifications.featuredCleared'),
        'success'
      );
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.planUpdateError'), 'error');
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

      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...parsed.user } : u));
      showNotification(t('app.notifications.operatorUpdated'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.operatorUpdateError'), 'error');
    }
  };

  // ProfileTab (vendor self-service profile edit) does its own PUT /api/users/:id call so it
  // can show its own success/error copy, but it must feed the result back through this so the
  // shared `users` state (and thus the public OrganizerProfile, which reads from this same
  // array) actually picks up the change — otherwise the edit only mutates ProfileTab's local
  // `currentUser` object in place and every other view keeps showing the old value.
  const handleVendorProfileUpdated = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
    // `currentUser` inside VendorPortal comes from `loggedInVendor`, a separate piece of state
    // set once at login — without this, a vendor's own profile/rate edits save correctly to the
    // server but never show up in their own session until they log out and back in.
    setLoggedInVendor(prev => (prev && prev.id === updatedUser.id ? { ...prev, ...updatedUser } : prev));
  };

  const handleAddSlot = async (newSlot: TourSlot) => {
    try {
      const response = await fetch(`/api/tours/${newSlot.tourId}/slots`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(newSlot),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) throw new Error(data.error || 'Tarix əlavə edilə bilmədi.');

      setSlots(prev => [...prev, data.slot]);
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
      setSlots(prev => prev.filter(s => s.id !== slotId));
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

      setTours(prev => [data.tour, ...prev]);
      showNotification(t('app.notifications.tourCreated'), 'info');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourCreateError'), 'error');
      throw e;
    }
  };

  const handleUpdatePriceCalculatorConfig = (newConfig: PriceCalculatorConfig) => {
    setPlatformConfig(prev => ({ ...prev, priceCalculatorConfig: newConfig }));
    showNotification(t('app.notifications.calculatorUpdated'), 'success');
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

      setTours(prev => prev.map(t => t.id === tourId ? data.tour : t));
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

      setTours(prev => prev.map(t => t.id === tourId ? data.tour : t));
      showNotification(t('app.notifications.tourRejected'), 'info');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourRejectError'), 'error');
      throw e;
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

      setBookings(prev => prev.map(b => b.id === bookingId ? data.booking : b));
      showNotification(t('app.notifications.paymentConfirmed'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.bookingConfirmError'), 'error');
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

      setTours(prev => prev.map(t => t.id === updatedTour.id ? data.tour : t));
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

      setTours(prev => prev.filter(t => t.id !== tourId));
      setSlots(prev => prev.filter(s => s.tourId !== tourId));
      setBookings(prev => prev.filter(b => b.tourId !== tourId));
      setReviews(prev => prev.filter(r => r.tourId !== tourId));
      showNotification(t('app.notifications.tourDeleted'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourDeleteError'), 'error');
      throw e;
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

      // The API adjusts tour_slots.booked_count itself when status moves to/from
      // 'cancelled', so refresh slots from the server instead of nudging local state.
      setBookings(prev => prev.map(b => b.id === updatedBooking.id ? data.booking : b));
      const slotsResponse = await fetch(`/api/slots?tourId=${updatedBooking.tourId}`);
      if (slotsResponse.ok) {
        const slotsData = await slotsResponse.json();
        setSlots(prev => prev.map(s => {
          const refreshed = slotsData.slots.find((rs: TourSlot) => rs.id === s.id);
          return refreshed || s;
        }));
      }
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.bookingUpdateError'), 'error');
      throw e; // let the caller (e.g. VendorPortal's CRM table) know the update failed too
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, { method: 'DELETE', headers: authHeaders() });
      if (!response.ok) {
        const data = await parseApiResponse(response);
        throw new Error(data.error || 'Rezervasiya silinə bilmədi.');
      }

      const deleted = bookings.find(b => b.id === bookingId);
      setBookings(prev => prev.filter(b => b.id !== bookingId));
      if (deleted) {
        const slotsResponse = await fetch(`/api/slots?tourId=${deleted.tourId}`);
        if (slotsResponse.ok) {
          const slotsData = await slotsResponse.json();
          setSlots(prev => prev.map(s => {
            const refreshed = slotsData.slots.find((rs: TourSlot) => rs.id === s.id);
            return refreshed || s;
          }));
        }
      }
      showNotification(t('app.notifications.bookingDeleted'), 'success');
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.bookingDeleteError'), 'error');
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

      setTours(prev => prev.map(t => t.id === tourId ? data.tour : t));
    } catch (e: any) {
      showNotification(e.message || t('app.notifications.tourStatusError'), 'error');
    }
  };

  // handleResetData and handleGenerateRandomOutboundTour (unused dev/demo helpers that
  // reset to in-memory seed constants) were removed — they referenced localStorage/seed
  // data that no longer exists now that tours/slots/bookings/reviews are server-backed,
  // and neither was wired up to any button in the UI.

  // Wraps a route's content with the site's marketing header/footer chrome — shared by the
  // customer marketplace and the pre-login vendor/admin screens (matches previous behavior:
  // only the actual logged-in dashboards go full-viewport with no header/footer). `showCustomerNav`
  // toggles between the full customer nav (wishlist/guide/calculator/lang) and the bare
  // language switcher shown on the vendor/admin login screens.
  const renderChrome = (content: React.ReactNode, showCustomerNav: boolean) => (
    <>
      {/* Main Elegant Header — sticky only from the sm breakpoint up: on desktop it (and
          the logo) stays pinned at the top while scrolling, and once scrolled far enough
          shows an inline search bar on the SAME line as the logo and the icons — logo,
          search bar and icons all in one row, glued together at the top. On mobile the
          header itself isn't sticky (it scrolls away with the logo); only the real search
          bar living on the home page (ToursHomeView) sticks there instead. */}
      <header className={`bg-white relative sm:sticky sm:top-0 z-40 min-h-[var(--header-height)] border-b transition-shadow duration-200 ${
        isHeaderScrolled ? 'border-border-primary shadow-sm' : 'border-transparent'
      }`}>
        <div className="relative max-w-[var(--global-max-width)] mx-auto min-h-[var(--header-height)] px-8 py-2 md:py-0 flex flex-wrap md:flex-nowrap items-center justify-center sm:justify-between gap-4">

          {/* Logo Brand */}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => {
            setGlobalSearchQuery('');
            setIsGlobalSearchFocused(false);
            navigate('/');
          }}>
            <div className="flex flex-col font-black text-brand-primary leading-tight text-xl tracking-tight">
              <span>GedəkGörək</span>
              <span className="hidden sm:block text-[12px] uppercase tracking-widest text-brand-primary font-bold">Marketplace</span>
            </div>
          </div>

          {/* Inline Search Bar — desktop only, shown once scrolled past the home page's
              own search box. Bound to the same globalSearchQuery state as that box, so
              they always stay in sync — this is effectively that same search reflected
              here once its own copy has scrolled out of view. */}
          {showCustomerNav && isScrolled && (
            <div ref={globalSearchRef} className="hidden sm:flex sm:flex-1 sm:max-w-xl sm:mx-8 relative animate-fadeIn">
              <div className="relative w-full bg-white shadow-sm rounded-full p-1.5 border border-slate-200 flex items-center">
                <div className="pl-4 pr-2 flex items-center flex-1">
                   <input
                     type="text"
                     placeholder={t('app.search.placeholder')}
                     value={globalSearchQuery}
                     onChange={(e) => setGlobalSearchQuery(e.target.value)}
                     onFocus={() => setIsGlobalSearchFocused(true)}
                     onKeyDown={(e) => {
                       if (e.key === 'Enter') {
                         recordSearch(globalSearchQuery);
                         setIsGlobalSearchFocused(false);
                         window.scrollTo({ top: 300, behavior: 'smooth' });
                       }
                     }}
                     className="w-full py-2 bg-transparent text-brand-text-main text-sm focus:outline-none placeholder-brand-text-muted font-medium"
                   />
                </div>
                <button
                  onClick={() => {
                    recordSearch(globalSearchQuery);
                    setIsGlobalSearchFocused(false);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold py-2 px-5 rounded-full transition-colors flex-shrink-0 text-sm shadow-sm cursor-pointer"
                >
                  {t('app.search.button')}
                </button>
              </div>

              {/* Suggestions Dropdown */}
              {isGlobalSearchFocused && (
                <SearchDropdown
                  query={globalSearchQuery}
                  tours={tours}
                  recentSearches={recentSearches}
                  onSelect={(val) => {
                    setGlobalSearchQuery(val);
                    recordSearch(val);
                    setIsGlobalSearchFocused(false);
                  }}
                  appLanguage={appLanguage}
                />
              )}
            </div>
          )}

          {/* Right Section — hidden on mobile when in customer mode: compare, wishlist,
              guide, calculator, language and the burger dropdown are all already available
              from CustomerPortal's own bottom mobile nav bar, so showing them here too just
              duplicated the same icons in two places. Desktop has no bottom nav, so it keeps
              them here as before. */}
          <div className={`items-center gap-1 sm:gap-2 ${showCustomerNav ? 'hidden sm:flex' : 'flex'}`}>
            {showCustomerNav ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => navigate('/compare')}
                  className="relative w-11 sm:w-auto sm:min-w-0 sm:px-2 h-16 sm:h-14 flex flex-col items-center justify-center gap-0.5 hover:text-emerald-600 transition group cursor-pointer bg-transparent border-none p-0"
                >
                  <span className="relative w-11 h-8 sm:w-9 sm:h-7 flex items-center justify-center">
                    <Scale className="w-6 h-6 sm:w-5 sm:h-5 stroke-[2px] transition-colors group-hover:stroke-emerald-500" />
                    {compareCount > 0 && (
                      <span className="absolute -top-1 right-1 bg-rose-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {compareCount}
                      </span>
                    )}
                  </span>
                  <span className="hidden sm:block text-xs text-brand-text-main font-semibold">{t('app.nav.compare')}</span>
                </button>
                <button
                  onClick={() => navigate('/wishlist')}
                  className="relative w-11 sm:w-auto sm:min-w-0 sm:px-2 h-16 sm:h-14 flex flex-col items-center justify-center gap-0.5 hover:text-emerald-600 transition group cursor-pointer bg-transparent border-none p-0"
                >
                  <span className="relative w-11 h-8 sm:w-9 sm:h-7 flex items-center justify-center rounded-full transition-colors group-hover:bg-emerald-50">
                    <Heart className="w-6 h-6 sm:w-5 sm:h-5 stroke-[2px] transition-all duration-150 group-hover:fill-emerald-500 group-hover:stroke-emerald-500 group-hover:scale-110" />
                    {wishlistCount > 0 && (
                      <span className="absolute -top-1 right-1 bg-rose-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                        {wishlistCount}
                      </span>
                    )}
                  </span>
                  <span className="hidden sm:block text-xs text-brand-text-main font-semibold">{t('app.nav.wishlist')}</span>
                </button>

                {/* "Təcili fürsətlər" — rings + shows an amber badge whenever any approved tour
                    has an upcoming departure with fewer than 5 seats left; opens a popup listing
                    them with direct "Bilet al" links. Derived live from tours/slots, so it
                    self-refreshes as soon as the marketplace data loads or changes. */}
                <UrgentDealsBell tours={tours} slots={slots} appLanguage={appLanguage} />

                {/* Guide/Calculator/Language stay inline on desktop; on mobile they move
                    into the single burger dropdown below so the header only ever shows
                    compare + wishlist + one more button. */}
                <div className="hidden sm:flex sm:items-center sm:gap-2">
                  <button
                    onClick={() => navigate('/faq')}
                    className="relative w-11 sm:w-auto sm:min-w-0 sm:px-2 h-16 sm:h-14 flex flex-col items-center justify-center gap-0.5 hover:text-emerald-600 transition group cursor-pointer bg-transparent border-none p-0"
                    title={t('app.nav.guideTitle')}
                  >
                    <span className="w-11 h-8 sm:w-9 sm:h-7 flex items-center justify-center rounded-full transition-colors group-hover:bg-emerald-50">
                      <BookOpen className="w-6 h-6 sm:w-5 sm:h-5 stroke-[2px] transition-all duration-150 group-hover:stroke-emerald-500 group-hover:scale-110" />
                    </span>
                    <span className="hidden sm:block text-xs text-brand-text-main font-semibold whitespace-nowrap">{t('app.nav.guide')}</span>
                  </button>
                  {groupCalculatorEnabled && (
                    <button
                      onClick={() => navigate('/calculator')}
                      className="w-11 sm:w-auto sm:min-w-0 sm:px-2 h-16 sm:h-14 flex flex-col items-center justify-center gap-0.5 hover:text-emerald-600 transition group cursor-pointer bg-transparent border-none p-0"
                    >
                      <span className="w-11 h-8 sm:w-9 sm:h-7 flex items-center justify-center rounded-full transition-colors group-hover:bg-emerald-50">
                        <Calculator className="w-6 h-6 sm:w-5 sm:h-5 stroke-[2px] transition-all duration-150 group-hover:stroke-emerald-500 group-hover:scale-110" />
                      </span>
                      <span className="hidden sm:block text-xs text-brand-text-main font-semibold whitespace-nowrap">{t('app.nav.calculator')}</span>
                    </button>
                  )}
                  {campSitesEnabled && (
                    <button
                      onClick={() => navigate('/camp-sites')}
                      className="w-11 sm:w-auto sm:min-w-0 sm:px-2 h-16 sm:h-14 flex flex-col items-center justify-center gap-0.5 hover:text-emerald-600 transition group cursor-pointer bg-transparent border-none p-0"
                    >
                      <span className="w-11 h-8 sm:w-9 sm:h-7 flex items-center justify-center rounded-full transition-colors group-hover:bg-emerald-50">
                        <Tent className="w-6 h-6 sm:w-5 sm:h-5 stroke-[2px] transition-all duration-150 group-hover:stroke-emerald-500 group-hover:scale-110" />
                      </span>
                      <span className="hidden sm:block text-xs text-brand-text-main font-semibold whitespace-nowrap">{t('app.nav.campSites')}</span>
                    </button>
                  )}
                  <div className="relative">
                    <button
                      ref={langMenu.buttonRef}
                      onClick={() => langMenu.setOpen((v) => !v)}
                      className="w-11 sm:w-auto sm:min-w-0 sm:px-2 h-16 sm:h-14 flex flex-col items-center justify-center gap-0.5 hover:text-emerald-600 transition group cursor-pointer bg-transparent border-none p-0"
                      title={t('app.nav.changeLangCurrency')}
                    >
                      <span className={`w-11 h-8 sm:w-9 sm:h-7 flex items-center justify-center rounded-full transition-colors group-hover:bg-emerald-50 ${langMenu.open ? 'bg-emerald-50 text-emerald-600' : 'text-brand-text-muted'}`}>
                        <span className="relative inline-block w-6 h-6 sm:w-5 sm:h-5">
                          <Globe
                            className={`absolute inset-0 w-full h-full stroke-[2px] transition-all duration-300 ease-out group-hover:stroke-emerald-500 group-hover:scale-110 ${
                              langMenu.open ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
                            }`}
                          />
                          <X
                            className={`absolute inset-0 w-full h-full stroke-[2px] text-emerald-600 transition-all duration-300 ease-out ${
                              langMenu.open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
                            }`}
                          />
                        </span>
                      </span>
                      <span className="hidden sm:block text-xs text-brand-text-muted font-semibold">
                        {appLanguage === 'az' && displayCurrency === 'AZN' ? 'AZ / AZN ₼' :
                         appLanguage === 'ru' && displayCurrency === 'AZN' ? 'RU / AZN ₼' :
                         appLanguage === 'en' && displayCurrency === 'USD' ? 'EN / USD $' :
                         appLanguage === 'en' && displayCurrency === 'EUR' ? 'EN / EUR €' :
                         `${appLanguage.toUpperCase()} / ${displayCurrency}`}
                      </span>
                    </button>
                    {langMenu.hasOpenedOnce && langMenu.coords && createPortal(
                      <div
                        ref={langMenu.panelRef}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          top: langMenu.coords.top,
                          left: langMenu.coords.left,
                          width: langMenu.coords.width,
                          maxHeight: langMenu.panelVisible ? langMenu.expandedHeight : 0,
                        }}
                        className={`fixed z-50 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                          langMenu.panelVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
                        }`}
                      >
                        <button
                          className="w-full text-left px-4 py-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center gap-2"
                          onClick={() => { setAppLanguage('az'); setDisplayCurrency('AZN'); langMenu.setOpen(false); }}
                        >
                          🇦🇿 AZ (AZN)
                        </button>
                        <button
                          className="w-full text-left px-4 py-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center gap-2"
                          onClick={() => { setAppLanguage('ru'); setDisplayCurrency('AZN'); langMenu.setOpen(false); }}
                        >
                          🇷🇺 RU (AZN)
                        </button>
                        <button
                          className="w-full text-left px-4 py-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center gap-2"
                          onClick={() => { setAppLanguage('en'); setDisplayCurrency('USD'); langMenu.setOpen(false); }}
                        >
                          🇬🇧 EN (USD)
                        </button>
                        <button
                          className="w-full text-left px-4 py-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                          onClick={() => { setAppLanguage('en'); setDisplayCurrency('EUR'); langMenu.setOpen(false); }}
                        >
                          🇪🇺 EN (EUR)
                        </button>
                      </div>,
                      document.body
                    )}
                  </div>
                </div>

                {/* Mobile-only burger: groups guide/calculator/language behind one icon */}
                <div className="relative sm:hidden" ref={mobileMoreRef}>
                  <button
                    onClick={() => setMobileMoreOpen((v) => !v)}
                    className="w-11 h-16 flex flex-col items-center justify-center gap-0.5 hover:text-emerald-600 transition group cursor-pointer bg-transparent border-none p-0"
                  >
                    <span className={`w-11 h-8 flex items-center justify-center rounded-full transition-colors group-hover:bg-emerald-50 ${mobileMoreOpen ? 'bg-emerald-50 text-emerald-600' : ''}`}>
                      {mobileMoreOpen ? (
                        <X className="w-6 h-6 stroke-[2px]" />
                      ) : (
                        <Menu className="w-6 h-6 stroke-[2px]" />
                      )}
                    </span>
                  </button>

                  {mobileMoreOpen && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-16 z-50 w-56 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden"
                    >
                      <button
                        className="w-full text-left px-4 py-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center gap-2"
                        onClick={() => { navigate('/faq'); setMobileMoreOpen(false); }}
                      >
                        <BookOpen className="w-4 h-4" /> {t('app.nav.guide')}
                      </button>
                      {groupCalculatorEnabled && (
                        <button
                          className="w-full text-left px-4 py-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center gap-2"
                          onClick={() => { navigate('/calculator'); setMobileMoreOpen(false); }}
                        >
                          <Calculator className="w-4 h-4" /> {t('app.nav.calculator')}
                        </button>
                      )}
                      {campSitesEnabled && (
                        <button
                          className="w-full text-left px-4 py-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center gap-2"
                          onClick={() => { navigate('/camp-sites'); setMobileMoreOpen(false); }}
                        >
                          <Tent className="w-4 h-4" /> {t('app.nav.campSites')}
                        </button>
                      )}
                      <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wide font-bold text-slate-400">
                        {t('app.nav.changeLangCurrency')}
                      </div>
                      <button
                        className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        onClick={() => { setAppLanguage('az'); setDisplayCurrency('AZN'); setMobileMoreOpen(false); }}
                      >
                        🇦🇿 AZ (AZN)
                      </button>
                      <button
                        className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        onClick={() => { setAppLanguage('ru'); setDisplayCurrency('AZN'); setMobileMoreOpen(false); }}
                      >
                        🇷🇺 RU (AZN)
                      </button>
                      <button
                        className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        onClick={() => { setAppLanguage('en'); setDisplayCurrency('USD'); setMobileMoreOpen(false); }}
                      >
                        🇬🇧 EN (USD)
                      </button>
                      <button
                        className="w-full text-left px-4 py-2.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        onClick={() => { setAppLanguage('en'); setDisplayCurrency('EUR'); setMobileMoreOpen(false); }}
                      >
                        🇪🇺 EN (EUR)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              // Reached only on the pre-login vendor/admin screens — once logged in, those
              // routes render VendorPortal/AdminPortal full-viewport with no header at all.
              <nav className="flex items-center gap-4">
                <LanguageSwitcher />
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame — the customer home page (ToursHomeView) now sticks its
          own real search bar to the top of the viewport as the user scrolls past it,
          so there's no separate duplicate search bar living in the header anymore.
          NOTE: no animate-fadeIn wrapper here anymore — a transform-based fade
          animation on an ancestor silently breaks position:sticky for descendants
          (a well-known CSS gotcha), which was why the search bar wasn't sticking
          on mobile. */}
      <main className="max-w-[var(--global-max-width)] mx-auto px-5 py-8 flex-1 w-full space-y-6">
        <div className="space-y-6">
          {content}
        </div>
      </main>

      {/* Modern High Quality Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-850 text-xs">
        <div className="max-w-[var(--global-max-width)] mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-slate-500 mt-1">{t('app.footer.tagline')}</p>
          </div>
          <div className="flex gap-4">
            <a href="/faq" className="hover:text-white transition">{t('app.footer.faqLink')}</a>
            <span className="text-slate-750">|</span>
            <a href="https://wa.me/994706717804" target="_blank" rel="noopener noreferrer" className="hover:text-white transition">{t('app.footer.supportLink')}</a>
          </div>
        </div>
      </footer>
    </>
  );

  // Loading/error state shown in place of a route's real content while marketplace data
  // (tours/slots/bookings/reviews) is still being fetched or failed to load — 'chrome' is the
  // compact in-page version used inside the customer/login layout, 'dashboard' is the
  // full-viewport version used for the logged-in vendor/admin dashboards.
  const marketplaceLoadingOrError = (variant: 'chrome' | 'dashboard'): React.ReactNode => {
    if (isMarketplaceDataLoading) {
      return variant === 'dashboard' ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4">
          <RefreshCw className="w-8 h-8 text-brand-primary animate-spin" />
          <p className="text-sm font-semibold text-slate-500">{t('app.state.marketplaceLoading')}</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
          <p className="text-sm font-semibold text-slate-500">{t('app.state.marketplaceLoading')}</p>
        </div>
      );
    }
    if (marketplaceDataError) {
      return variant === 'dashboard' ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-rose-50">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700 text-center max-w-md px-4">{marketplaceDataError}</p>
          <button onClick={loadMarketplaceData} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition">
            {t('app.state.retry')}
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 gap-4 bg-rose-50 border border-rose-200 rounded-xl">
          <ShieldAlert className="w-8 h-8 text-rose-500" />
          <p className="text-sm font-semibold text-rose-700 text-center max-w-md px-4">{marketplaceDataError}</p>
          <button onClick={loadMarketplaceData} className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition">
            {t('app.state.retry')}
          </button>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      className="min-h-screen font-sans text-slate-700 flex flex-col justify-between"
      id="app_root"
      style={{
        // Flat, uniform brand page background (--color-bg-page) — same color everywhere,
        // not a gradient.
        backgroundColor: 'var(--color-bg-page)',
      }}
    >
      <Routes>
        {/* Logged-in vendor/admin dashboards take over the full viewport with their own
            sidebar+topbar chrome (DashboardSidebarLayout) instead of the site's marketing
            header/footer — matches the old isDashboardMode behavior. */}
        <Route
          path="/vendor/dashboard/*"
          element={
            marketplaceLoadingOrError('dashboard') || (
              loggedInVendor ? (
                <Suspense fallback={<PortalLoadingFallback />}>
                  <VendorPortal
                    tours={tours}
                    slots={slots}
                    bookings={bookings}
                    currentUser={getActiveUserForRole('vendor')}
                    operatorToken={operatorToken}
                    onAddSlot={handleAddSlot}
                    onDeleteSlot={handleDeleteSlot}
                    onAddTour={handleAddTour}
                    onEditTour={handleEditTour}
                    onDeleteTour={handleDeleteTour}
                    onShowNotification={showNotification}
                    onApproveBooking={handleApproveBooking}
                    onEditBooking={handleEditBooking}
                    onDeleteBooking={handleDeleteBooking}
                    onAddBooking={handleAddBooking}
                    onUpdateSlotBookedCount={handleUpdateSlotBookedCount}
                    exchangeRates={exchangeRates}
                    onUpdateExchangeRates={handleUpdateExchangeRates}
                    onToggleFeatured={handleToggleFeatured}
                    onUserUpdated={handleVendorProfileUpdated}
                    onLogout={handleOperatorLogout}
                  />
                </Suspense>
              ) : (
                <Navigate to="/vendor/login" replace />
              )
            )
          }
        />

        <Route
          path="/admin/dashboard/*"
          element={
            marketplaceLoadingOrError('dashboard') || (
              loggedInAdmin ? (
                <Suspense fallback={<PortalLoadingFallback />}>
                  <AdminPortal
                    tours={tours}
                    slots={slots}
                    bookings={bookings}
                    users={users}
                    currentUser={getActiveUserForRole('admin')}
                    platformConfig={platformConfig}
                    onUpdatePriceCalculatorConfig={handleUpdatePriceCalculatorConfig}
                    onApproveTour={handleApproveTour}
                    onRejectTour={handleRejectTour}
                    onEditTour={handleEditTour}
                    onDeleteTour={handleDeleteTour}
                    onAddSlot={handleAddSlot}
                    onDeleteSlot={handleDeleteSlot}
                    onShowNotification={showNotification}
                    exchangeRates={exchangeRates}
                    onUpdateExchangeRates={handleUpdateExchangeRates}
                    onUpdateUser={handleUpdateUser}
                    onCreateVendor={handleCreateVendor}
                    onDeleteVendor={handleDeleteVendor}
                    onUpdateTourStatus={handleUpdateTourStatus}
                    authToken={authToken}
                    onLogout={handleAdminLogout}
                  />
                </Suspense>
              ) : (
                <Navigate to="/admin/login" replace />
              )
            )
          }
        />

        <Route
          path="/vendor/login"
          element={renderChrome(
            marketplaceLoadingOrError('chrome') || (
              loggedInVendor ? <Navigate to="/vendor/dashboard" replace /> : <OperatorLogin onLogin={handleOperatorLogin} />
            ),
            false
          )}
        />

        <Route
          path="/reset-password"
          element={renderChrome(marketplaceLoadingOrError('chrome') || <ResetPasswordPage />, false)}
        />

        <Route
          path="/admin/login"
          element={renderChrome(
            marketplaceLoadingOrError('chrome') || (
              loggedInAdmin ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin onLogin={handleAdminLogin} />
            ),
            false
          )}
        />

        <Route
          path="/*"
          element={renderChrome(
            marketplaceLoadingOrError('chrome') || (
              <Suspense fallback={<PortalLoadingFallback />}>
                <CustomerPortal
                  tours={tours}
                  slots={slots}
                  bookings={bookings}
                  reviews={reviews}
                  users={users}
                  onAddBooking={handleAddBooking}
                  onAddReview={handleAddReview}
                  onUpdateSlotBookedCount={handleUpdateSlotBookedCount}
                  currentUser={getActiveUserForRole('customer')}
                  onUpdateUserBalance={handleUpdateUserBalance}
                  onShowNotification={showNotification}
                  exchangeRates={exchangeRates}
                  searchQuery={globalSearchQuery}
                  onSearchChange={setGlobalSearchQuery}
                  displayCurrency={displayCurrency}
                  appLanguage={appLanguage}
                  onDisplayCurrencyChange={setDisplayCurrency}
                  priceCalculatorConfig={platformConfig.priceCalculatorConfig}
                />
              </Suspense>
            ),
            true
          )}
        />
      </Routes>

      {/* Floating Alert Toast Notification overlay */}
      {notification && (
        <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 border p-4 rounded-xl shadow-2xl max-w-sm transition-all duration-300 transform translate-y-0 scale-100 ${
          notification.type === 'success' ? 'bg-slate-900 border-emerald-800 text-slate-100' :
          notification.type === 'error' ? 'bg-rose-950 border-rose-900 text-rose-100' :
          notification.type === 'warning' ? 'bg-slate-900 border-amber-500 text-amber-200' :
          'bg-slate-900 border-sky-850 text-slate-100'
        }`}>
          <div className={`w-2 h-2 rounded-full shrink-0 ${
            notification.type === 'success' ? 'bg-emerald-400 animate-pulse' :
            notification.type === 'error' ? 'bg-rose-400 animate-ping' :
            notification.type === 'warning' ? 'bg-amber-400 animate-pulse' :
            'bg-sky-400 animate-pulse'
          }`} />
          <div className="flex-1 text-xs font-semibold leading-relaxed">
            {notification.message}
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-white transition cursor-pointer p-1 hover:bg-white/10 rounded"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

    </div>
  );
}
