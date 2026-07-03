import React, { useState } from 'react';
import { Tour, TourSlot, Booking, Review, User, PlatformConfig, UserRole } from './types';
import { seedUsers } from './data/toursData';
import CustomerPortal from './components/CustomerPortal';
import VendorPortal from './components/VendorPortal';
import AdminPortal from './components/AdminPortal';
import OperatorLogin from './components/OperatorLogin';
import AdminLogin from './components/AdminLogin';
import { SearchDropdown } from './components/SearchDropdown';
import { getRecentSearches, addRecentSearch } from './utils/recentSearches';
import {
  ShieldAlert,
  RefreshCw,
  X,
  Heart,
  Globe
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

  // Active Role State (Customer, Vendor, Admin) inside the Marketplace simulation.
  // No client-side router is set up, so entry into the vendor/admin portals is via a
  // `?portal=vendor` or `?portal=admin` query param read once on initial load.
  const [selectedRole] = useState<UserRole>(() => {
    const portal = new URLSearchParams(window.location.search).get('portal');
    return portal === 'vendor' || portal === 'admin' ? portal : 'customer';
  });
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
      // /api/tours and /api/bookings scope their response server-side when an
      // Authorization header is present: a vendor token gets only that vendor's own
      // rows, an admin token gets everything. No token (public/customer) keeps the
      // existing unfiltered shape the marketplace browsing relies on.
      const authedGet = (url: string) => authToken ? fetch(url, { headers: { Authorization: `Bearer ${authToken}` } }) : fetch(url);
      const [toursRes, slotsRes, bookingsRes, reviewsRes] = await Promise.all([
        authedGet('/api/tours'),
        fetch('/api/slots'),
        authedGet('/api/bookings'),
        fetch('/api/reviews'),
      ]);
      if (!toursRes.ok || !slotsRes.ok || !bookingsRes.ok || !reviewsRes.ok) {
        throw new Error('Server məlumatları qaytara bilmədi.');
      }
      const [toursData, slotsData, bookingsData, reviewsData] = await Promise.all([
        toursRes.json(), slotsRes.json(), bookingsRes.json(), reviewsRes.json(),
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
  
  // Platform configuration state
  const [platformConfig, setPlatformConfig] = useState<PlatformConfig>(() => {
    try {
      const saved = localStorage.getItem('turlar_platform_config');
      return saved ? JSON.parse(saved) : { commissionPercentage: 15 };
    } catch (e) {
      return { commissionPercentage: 15 };
    }
  });

  // Exchange rate config state
  const [exchangeRates, setExchangeRates] = useState<{ USD: number; EUR: number }>(() => {
    try {
      const saved = localStorage.getItem('turlar_exchange_rates');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
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
    } catch (e) {}
    showNotification('Valyuta məzənnələri uğurla yeniləndi! 💱✨', 'success');
  };

  // Global search and scroll state for sticky header
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [isGlobalSearchFocused, setIsGlobalSearchFocused] = useState(false);
  const globalSearchRef = React.useRef<HTMLDivElement>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => getRecentSearches());
  const recordSearch = (term: string) => setRecentSearches(addRecentSearch(term));
  const [isScrolled, setIsScrolled] = useState(false);
  const [displayCurrency, setDisplayCurrency] = useState<'AZN' | 'USD' | 'EUR'>('AZN');
  const [appLanguage, setAppLanguage] = useState<'az' | 'en' | 'ru'>('az');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  React.useEffect(() => {
    function handleClickOutsideSearch(event: MouseEvent) {
      if (globalSearchRef.current && !globalSearchRef.current.contains(event.target as Node)) {
        setIsGlobalSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideSearch);
    return () => document.removeEventListener('mousedown', handleClickOutsideSearch);
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Active Simulated User
  const getActiveUser = (): User => {
    if (selectedRole === 'vendor' && loggedInVendor) return loggedInVendor;
    if (selectedRole === 'admin' && loggedInAdmin) return loggedInAdmin;
    const safeUsers = Array.isArray(users) && users.length > 0 ? users : seedUsers;
    const found = safeUsers.find(u => u.role === selectedRole);
    if (found) return found;
    return safeUsers[0] || seedUsers[0];
  };
  const activeUser = getActiveUser();

  // Tours/slots/bookings/reviews are persisted server-side now (see loadMarketplaceData
  // above and the API-backed handlers below), so there's nothing to mirror to localStorage
  // for those anymore. Users/platformConfig stay on localStorage — out of scope for this pass.
  React.useEffect(() => {
    try {
      localStorage.setItem('turlar_users', JSON.stringify(users));
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
      showNotification(`Rezervasiya uğurla tamamlandı! Bilet ID: #${data.booking.id}`, 'success');
    } catch (e: any) {
      showNotification(e.message || 'Rezervasiya zamanı xəta baş verdi.', 'error');
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
      showNotification('Rəyiniz uğurla əlavə olundu və İştirakçı statusu ilə təsdiqləndi!', 'success');
    } catch (e: any) {
      showNotification(e.message || 'Rəy əlavə edilərkən xəta baş verdi.', 'error');
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
    setUsers(prev => prev.map(u => {
      if (u.id === activeUser.id) {
        return { ...u, balance: Math.max(0, u.balance + amount) };
      }
      return u;
    }));
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
      showNotification('İstifadəçi məlumatları (operator) uğurla yeniləndi!', 'success');
    } catch (e: any) {
      showNotification(e.message || 'İstifadəçi yenilənərkən xəta baş verdi.', 'error');
    }
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
      showNotification('Yeni təqvim slotu (satış tərifi) uğurla daxil edildi!', 'success');
    } catch (e: any) {
      showNotification(e.message || 'Tarix əlavə edilərkən xəta baş verdi.', 'error');
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
      showNotification(e.message || 'Tarix silinərkən xəta baş verdi.', 'error');
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
      showNotification('Yeni tur marşrutu tərtib olundu və təsdiq gözləmə siyahısına əlavə edildi! Admin panelindən bunu təsdiqləyə bilərsiniz. ⏳✨', 'info');
    } catch (e: any) {
      showNotification(e.message || 'Tur yaradılarkən xəta baş verdi.', 'error');
      throw e;
    }
  };

  const handleUpdateCommissionPercent = (newValue: number) => {
    setPlatformConfig(prev => ({ ...prev, commissionPercentage: newValue }));
    showNotification(`SaaS Komissiyası ${newValue}% olaraq tənzimləndi!`, 'info');
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
      showNotification('Tur marşrutu admin tərəfindən uğurla təsdiqləndi və satışa buraxıldı!', 'success');
    } catch (e: any) {
      showNotification(e.message || 'Tur təsdiqlənərkən xəta baş verdi.', 'error');
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
      showNotification('Tur rədd edildi.', 'info');
    } catch (e: any) {
      showNotification(e.message || 'Tur rədd edilərkən xəta baş verdi.', 'error');
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
      showNotification('WhatsApp Ödəniş qəbzi təsdiqləndi! Müştəriyə bilet təsdiqi və SMS bildiriş göndərildi.', 'success');
    } catch (e: any) {
      showNotification(e.message || 'Rezervasiya təsdiqlənərkən xəta baş verdi.', 'error');
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
      showNotification('Tur marşrutu uğurla yeniləndi! 📝✨', 'success');
    } catch (e: any) {
      showNotification(e.message || 'Tur yenilənərkən xəta baş verdi.', 'error');
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
      showNotification('Tur marşrutu sistemdən birdəfəlik silindi! 🗑️✨', 'success');
    } catch (e: any) {
      showNotification(e.message || 'Tur silinərkən xəta baş verdi.', 'error');
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
      showNotification(e.message || 'Rezervasiya yenilənərkən xəta baş verdi.', 'error');
      throw e; // let the caller (e.g. VendorPortal's CRM table) know the update failed too
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
      showNotification(e.message || 'Tur statusu dəyişdirilərkən xəta baş verdi.', 'error');
    }
  };

  // handleResetData and handleGenerateRandomOutboundTour (unused dev/demo helpers that
  // reset to in-memory seed constants) were removed — they referenced localStorage/seed
  // data that no longer exists now that tours/slots/bookings/reviews are server-backed,
  // and neither was wired up to any button in the UI.

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-700 flex flex-col justify-between" id="app_root">
      {/* Main Elegant Header */}
      <header className={`bg-white border-b border-slate-200 sticky top-0 z-40 transition-shadow ${isScrolled ? 'shadow-md' : ''}`}>
        <div className="max-w-[1400px] mx-auto px-6 sm:px-8 py-3 flex flex-wrap md:flex-nowrap items-center justify-between gap-4">
          
          {/* Logo Brand */}
          <div className="flex items-center gap-2 cursor-pointer order-1" onClick={() => {
            setGlobalSearchQuery('');
            setIsGlobalSearchFocused(false);
            window.dispatchEvent(new CustomEvent('nav-home'));
          }}>
            <div className="flex flex-col font-black text-black leading-tight text-xl tracking-tight">
              <span>GedəkGörək</span>
              <span className="text-[12px] uppercase tracking-widest text-slate-500 font-bold">Marketplace</span>
            </div>
          </div>

          {/* Sticky Search Bar (Only visible when scrolled in Customer mode) */}
          {selectedRole === 'customer' && isScrolled && (
            <div ref={globalSearchRef} className="flex flex-1 w-full md:max-w-xl mx-auto md:mx-8 animate-fadeIn order-3 md:order-2 mt-2 md:mt-0 relative">
              <div className="relative w-full bg-white shadow-sm rounded-full p-1.5 border border-slate-200 flex items-center">
                <div className="pl-4 pr-2 flex items-center flex-1">
                   <input
                     type="text"
                     placeholder={
                       appLanguage === 'az' ? "Tur adı, region və ya açar söz axtar..." :
                       appLanguage === 'ru' ? "Поиск названия тура, региона..." :
                       "Search tour name, region or keyword..."
                     }
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
                     className="w-full py-2 bg-transparent text-slate-800 text-sm focus:outline-none placeholder-slate-500 font-medium"
                   />
                </div>
                <button
                  onClick={() => {
                    recordSearch(globalSearchQuery);
                    setIsGlobalSearchFocused(false);
                    window.scrollTo({ top: 300, behavior: 'smooth' });
                  }}
                  className="bg-[#2dd4bf] hover:bg-[#14b8a6] text-white font-bold py-2 px-5 rounded-full transition-colors flex-shrink-0 text-sm shadow-sm cursor-pointer"
                >
                  Axtar
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

          {/* Right Section */}
          <div className="flex items-center gap-6 order-2 md:order-3">
            {selectedRole === 'customer' ? (
              <div className="flex items-center gap-5 text-slate-700">
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('nav-wishlist'))}
                  className="flex flex-col items-center justify-center gap-1 hover:text-emerald-600 transition group cursor-pointer bg-transparent border-none p-0"
                >
                  <Heart className="w-5 h-5 stroke-[2px] transition-colors group-hover:fill-emerald-500 group-hover:stroke-emerald-500" />
                  <span className="text-[11px] font-semibold">İstəklər</span>
                </button>
                <div className="relative">
                  <button 
                    onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                    className="flex flex-col items-center justify-center gap-1 hover:text-emerald-600 transition group cursor-pointer bg-transparent border-none p-0"
                    title="Valyutanı / Dilini dəyiş"
                  >
                    <Globe className="w-5 h-5 stroke-[2px]" />
                    <span className="text-[11px] font-semibold">
                      {appLanguage === 'az' && displayCurrency === 'AZN' ? 'AZ / AZN ₼' : 
                       appLanguage === 'ru' && displayCurrency === 'AZN' ? 'RU / AZN ₼' : 
                       appLanguage === 'en' && displayCurrency === 'USD' ? 'EN / USD $' : 
                       appLanguage === 'en' && displayCurrency === 'EUR' ? 'EN / EUR €' : 
                       `${appLanguage.toUpperCase()} / ${displayCurrency}`}
                    </span>
                  </button>
                  {isLangMenuOpen && (
                    <div className="absolute top-12 -right-4 w-44 bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-50 animate-fadeIn">
                      <button 
                        className="w-full text-left px-4 py-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center gap-2"
                        onClick={() => { setAppLanguage('az'); setDisplayCurrency('AZN'); setIsLangMenuOpen(false); }}
                      >
                        🇦🇿 Azərbaycanca (AZN)
                      </button>
                      <button 
                        className="w-full text-left px-4 py-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center gap-2"
                        onClick={() => { setAppLanguage('ru'); setDisplayCurrency('AZN'); setIsLangMenuOpen(false); }}
                      >
                        🇷🇺 Русский (AZN)
                      </button>
                      <button 
                        className="w-full text-left px-4 py-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors border-b border-slate-100 flex items-center gap-2"
                        onClick={() => { setAppLanguage('en'); setDisplayCurrency('USD'); setIsLangMenuOpen(false); }}
                      >
                        🇬🇧 English (USD)
                      </button>
                      <button 
                        className="w-full text-left px-4 py-3 text-[12px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
                        onClick={() => { setAppLanguage('en'); setDisplayCurrency('EUR'); setIsLangMenuOpen(false); }}
                      >
                        🇪🇺 English (EUR)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <nav className="flex items-center gap-6">
                {loggedInVendor && (
                  <button
                    onClick={handleOperatorLogout}
                    className="text-xs font-semibold py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all ml-4"
                  >
                    Çıxış
                  </button>
                )}
                {loggedInAdmin && (
                  <button
                    onClick={handleAdminLogout}
                    className="text-xs font-semibold py-1 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all ml-4"
                  >
                    Çıxış
                  </button>
                )}
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace Frame */}
      <main className="max-w-7xl mx-auto px-6 sm:px-8 py-8 flex-1 w-full space-y-6">
        
        <div className="space-y-6 animate-fadeIn">

            {isMarketplaceDataLoading && (
              <div className="flex flex-col items-center justify-center py-24 gap-4">
                <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin" />
                <p className="text-sm font-semibold text-slate-500">Bazar məlumatları yüklənir...</p>
              </div>
            )}

            {!isMarketplaceDataLoading && marketplaceDataError && (
              <div className="flex flex-col items-center justify-center py-24 gap-4 bg-rose-50 border border-rose-200 rounded-xl">
                <ShieldAlert className="w-8 h-8 text-rose-500" />
                <p className="text-sm font-semibold text-rose-700 text-center max-w-md px-4">{marketplaceDataError}</p>
                <button
                  onClick={loadMarketplaceData}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition"
                >
                  Yenidən cəhd et
                </button>
              </div>
            )}

            {!isMarketplaceDataLoading && !marketplaceDataError && (
            <>

            {/* Directing to respective Portal */}
            {selectedRole === 'customer' && (
              <CustomerPortal 
                tours={tours}
                slots={slots}
                bookings={bookings}
                reviews={reviews}
                users={users}
                onAddBooking={handleAddBooking}
                onAddReview={handleAddReview}
                onUpdateSlotBookedCount={handleUpdateSlotBookedCount}
                currentUser={activeUser}
                onUpdateUserBalance={handleUpdateUserBalance}
                onShowNotification={showNotification}
                exchangeRates={exchangeRates}
                searchQuery={globalSearchQuery}
                onSearchChange={setGlobalSearchQuery}
                displayCurrency={displayCurrency}
                appLanguage={appLanguage}
              />
            )}

            {selectedRole === 'vendor' && !loggedInVendor && (
              <OperatorLogin onLogin={handleOperatorLogin} />
            )}

            {selectedRole === 'vendor' && loggedInVendor && (
              <VendorPortal
                tours={tours}
                slots={slots}
                bookings={bookings}
                currentUser={activeUser}
                operatorToken={operatorToken}
                onAddSlot={handleAddSlot}
                onDeleteSlot={handleDeleteSlot}
                onAddTour={handleAddTour}
                onEditTour={handleEditTour}
                onDeleteTour={handleDeleteTour}
                platformCommission={platformConfig.commissionPercentage}
                onShowNotification={showNotification}
                onApproveBooking={handleApproveBooking}
                onEditBooking={handleEditBooking}
                onAddBooking={handleAddBooking}
                onUpdateSlotBookedCount={handleUpdateSlotBookedCount}
                exchangeRates={exchangeRates}
                onUpdateExchangeRates={handleUpdateExchangeRates}
              />
            )}

            {selectedRole === 'admin' && !loggedInAdmin && (
              <AdminLogin onLogin={handleAdminLogin} />
            )}

            {selectedRole === 'admin' && loggedInAdmin && (
              <AdminPortal
                tours={tours}
                slots={slots}
                bookings={bookings}
                users={users}
                currentUser={activeUser}
                platformConfig={platformConfig}
                onUpdateCommissionPercent={handleUpdateCommissionPercent}
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
                onUpdateTourStatus={handleUpdateTourStatus}
              />
            )}

            </>
            )}

          </div>

      </main>

      {/* Modern High Quality Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-850 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-slate-500 mt-1">Azərbaycan daxili turlar ekosistemi SaaS arxitektura sənədləşməsi və simulyator paneli.</p>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-white transition">Privacy Policy</span>
            <span className="text-slate-750">|</span>
            <span className="hover:text-white transition">Technical Support</span>
          </div>
        </div>
      </footer>

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
