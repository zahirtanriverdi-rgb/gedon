import React from 'react';
import { Tour, TourSlot, TourCategory, TourDifficulty, Booking, Review } from '../../types';
import { REVIEWS_ENABLED } from '../../config/features';
import {
  Search,
  MapPin,
  Compass,
  Calendar,
  AlertCircle,
  MessageCircle,
  Share2,
  ChevronLeft,
  ChevronRight,
  Plane,
  Heart,
  Star
} from 'lucide-react';
import { SearchDropdown } from '../SearchDropdown';
import { TourWeatherForecast } from '../TourWeatherForecast';
import { ReviewSubmissionPanel } from './ReviewSubmissionPanel';
import { computeFeaturedTourIds } from '../../utils/featuredTours';

type ConvertedPriceInfo = {
  azn: number;
  currencySymbol: string;
  currencyCode: string;
  original: string;
  both: string;
  detailed: string;
};

interface ToursHomeViewProps {
  tours: Tour[];
  slots: TourSlot[];
  bookings: Booking[];
  reviews: Review[];
  currentUser: { id: string; name: string; phone: string; balance: number; email: string };
  onAddReview: (newReview: Review) => Promise<void>;
  wishlist: string[];
  t: (key: string) => string;
  currentSearchQuery: string;
  handleSearchChange: (val: string) => void;
  isSearchFocused: boolean;
  setIsSearchFocused: (val: boolean) => void;
  searchContainerRef: React.RefObject<HTMLDivElement>;
  recentSearches: string[];
  recordSearch: (term: string) => void;
  appLanguage: 'az' | 'en' | 'ru';
  selectedCategory: string;
  setSelectedCategory: (val: string) => void;
  selectedDifficulty: string;
  setSelectedDifficulty: (val: string) => void;
  selectedRegion: string;
  setSelectedRegion: (val: string) => void;
  maxPrice: number;
  setMaxPrice: (val: number) => void;
  maxPriceLimit: number;
  isFiltersExpanded: boolean;
  setIsFiltersExpanded: (val: boolean) => void;
  uniqueRegions: string[];
  showCalendarWidget: boolean;
  setShowCalendarWidget: (val: boolean) => void;
  calendarDateStart: string;
  calendarDateEnd: string;
  setCalendarDateStart: (val: string) => void;
  setCalendarDateEnd: (val: string) => void;
  calendarContainerRef: React.RefObject<HTMLDivElement>;
  currentMonthView: string;
  AZ_MONTHS: Record<string, string>;
  handleCalendarPrevMonth: () => void;
  handleCalendarNextMonth: () => void;
  handleCalendarDayClick: (dayStr: string) => void;
  sortBy: string;
  setSortBy: (val: string) => void;
  uniqueUpcomingTours: { tour: Tour; slot: TourSlot }[];
  upcomingScrollLeft: number;
  setUpcomingScrollLeft: (val: number) => void;
  handleToggleWishlist: (tourId: string, e?: React.MouseEvent) => void;
  getConvertedPriceInfo: (price: number, currency?: 'AZN' | 'USD' | 'EUR') => ConvertedPriceInfo;
  sortedAndFilteredTours: Tour[];
  getTourMonths: (tourId: string) => string[];
  getAverageRating: (tourId: string) => string;
  getReviewsCount: (tourId: string) => number;
  handleShareTour: (tour: Tour, e?: React.MouseEvent) => void;
  handleQuickWhatsApp: (tour: Tour, e: React.MouseEvent) => void;
  onSelectTour: (tour: Tour) => void;
  setActiveView: (view: 'home' | 'faq' | 'organizer' | 'calculator' | 'wishlist') => void;
}

export function ToursHomeView({
  tours,
  slots,
  bookings,
  reviews,
  currentUser,
  onAddReview,
  wishlist,
  t,
  currentSearchQuery,
  handleSearchChange,
  isSearchFocused,
  setIsSearchFocused,
  searchContainerRef,
  recentSearches,
  recordSearch,
  appLanguage,
  selectedCategory,
  setSelectedCategory,
  selectedDifficulty,
  setSelectedDifficulty,
  selectedRegion,
  setSelectedRegion,
  maxPrice,
  setMaxPrice,
  maxPriceLimit,
  isFiltersExpanded,
  setIsFiltersExpanded,
  uniqueRegions,
  showCalendarWidget,
  setShowCalendarWidget,
  calendarDateStart,
  calendarDateEnd,
  setCalendarDateStart,
  setCalendarDateEnd,
  calendarContainerRef,
  currentMonthView,
  AZ_MONTHS,
  handleCalendarPrevMonth,
  handleCalendarNextMonth,
  handleCalendarDayClick,
  sortBy,
  setSortBy,
  uniqueUpcomingTours,
  upcomingScrollLeft,
  setUpcomingScrollLeft,
  handleToggleWishlist,
  getConvertedPriceInfo,
  sortedAndFilteredTours,
  getTourMonths,
  getAverageRating,
  getReviewsCount,
  handleShareTour,
  handleQuickWhatsApp,
  onSelectTour,
  setActiveView
}: ToursHomeViewProps) {
  const featuredTourIds = React.useMemo(() => computeFeaturedTourIds(tours, slots), [tours, slots]);
  return (
        <div className="space-y-4">

          {/* Search & Filters (Clean Minimalism Style) */}
          {/* z-30 (not z-10): this wrapper's z-index caps the stacking context for the
              suggestions dropdown inside it, so it must outrank the tour cards' own
              z-10 share buttons below or the dropdown gets painted underneath them. */}
          <div className="flex flex-col items-center justify-center -mx-5 px-5 lg:px-24 pt-[38px] pb-[88px] min-h-[294px] relative z-30 w-full animate-fadeIn">
            <h2 className="text-[36px] font-bold text-label-primary mb-6 tracking-tight text-center">{t('discoverTours')}</h2>

            {/* Main Pill Search Box */}
            <div className="w-full max-w-[1208px] h-[68px] mx-auto mt-8 flex items-center justify-center relative">
              <div ref={searchContainerRef} className="relative w-full max-w-[706px] h-14 bg-white border border-border-primary rounded-lg p-1 flex items-center">
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
                  className="h-11 bg-interactive-primary hover:opacity-90 text-white font-bold px-6 rounded-md transition-colors flex-shrink-0 text-xs cursor-pointer"
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
            </div>

            {/* Segmented Category Pill Selectors directly below */}
            <div className="flex flex-wrap justify-center items-center gap-2 max-w-3xl mt-6 mb-4">
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
                <span className="absolute -top-2 -right-1 bg-white border border-border-primary text-label-secondary text-[9px] px-1.5 py-0.5 rounded-full font-black scale-90 shadow-sm">YENİ</span>
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
              className="mt-2 text-xs font-bold text-label-secondary hover:text-label-primary flex items-center gap-1 transition-colors"
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
              <div className="mb-8 w-full max-w-[var(--global-max-width)] mx-auto animate-fadeIn relative">
                <div className="flex items-center justify-between mb-6 px-1">
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
                      className="absolute left-0 top-1/2 -translate-y-1/2 -ml-3 md:-ml-4 z-10 w-11 h-11 bg-white text-label-secondary rounded-full shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center border border-border-primary"
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
                        onClick={() => onSelectTour(tour)}
                        className="w-[410.66px] h-[150px] flex-shrink-0 bg-white border border-border-primary rounded-[var(--card-radius)] p-3 flex items-center gap-4 snap-start cursor-pointer hover:shadow-lg transition-all duration-300 group"
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
                          <h4 className="text-[14px] font-black text-label-primary truncate mb-1" title={tour.name}>{tour.name}</h4>
                          <div className="text-[12px] font-bold text-label-secondary mb-2 flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate">{tour.region}</span>
                          </div>
                          <div className="flex items-center justify-between mt-auto">
                            <span className="text-[11px] font-black text-label-secondary bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md tracking-tight">
                              {slot.startDate}
                          </span>
                          {tour.discountPrice && tour.discountPrice > 0 && tour.discountPrice < (tour.price ?? slot.price) ? (
                            <span className="flex items-baseline gap-1">
                              <span className="line-through text-label-tertiary text-[10px]">
                                {getConvertedPriceInfo(tour.price ?? slot.price, tour.priceCurrency).both}
                              </span>
                              <span className="text-[13px] font-black text-label-critical bg-surface-critical-weak px-1 rounded tracking-tight">
                                {getConvertedPriceInfo(tour.discountPrice, tour.priceCurrency).both}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[13px] font-black text-label-primary tracking-tight">
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
                      className="absolute right-0 top-1/2 -translate-y-1/2 -mr-3 md:-mr-4 z-10 w-11 h-11 bg-white text-label-secondary rounded-full shadow-sm hover:bg-slate-50 transition-colors flex items-center justify-center border border-border-primary"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                className={`bg-white rounded-[var(--card-radius)] border min-h-[398.5px] overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer ${tour.isInternational ? 'border-amber-200 ring-1 ring-amber-100/50 bg-gradient-to-b from-amber-500/2 to-transparent' : 'border-border-primary'} ${isSportActive ? 'border-amber-300 bg-gradient-to-tr from-amber-50/10 to-transparent' : ''}`}
                onClick={() => onSelectTour(tour)}
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
                    {featuredTourIds.has(tour.id) && (
                      <span className="text-[10px] font-extrabold tracking-tight px-2 py-0.5 rounded-md shadow-xs bg-amber-500 text-white">
                        🔥 Ayın Ən Çox Satılanı
                      </span>
                    )}
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
                  <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-xs text-label-secondary px-2 py-0.5 rounded border border-slate-250 text-[10px] font-semibold">
                    📍 {tour.region.split(',')[0]}
                  </div>
                </div>

                {/* Tour Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-[10px] text-label-tertiary font-bold tracking-wider">
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

                    <h3 className="font-bold text-label-primary text-sm leading-snug group-hover:text-emerald-700 transition tracking-tight flex items-center gap-1">
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
                      <span className="text-[9px] text-label-tertiary block tracking-wider font-semibold">QİYMƏT</span>
                      {tour.discountPrice && tour.discountPrice > 0 && tour.discountPrice < (tour.price ?? minPrice) ? (
                        <div className="flex flex-col items-end">
                          <span className="line-through text-label-tertiary text-xs">
                            {getConvertedPriceInfo(tour.price ?? minPrice, tour.priceCurrency).both}
                          </span>
                          <span className="text-2xl font-extrabold text-label-critical bg-surface-critical-weak px-1.5 rounded-md leading-tight">
                            {getConvertedPriceInfo(tour.discountPrice, tour.priceCurrency).both}
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <strong className="text-label-primary text-2xl font-extrabold leading-tight">
                            {getConvertedPriceInfo(tour.price ?? minPrice, tour.priceCurrency).both}
                          </strong>
                          <span className="text-label-tertiary text-[10px] font-medium">/ nəfər</span>
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
        <ReviewSubmissionPanel
          tours={tours}
          bookings={bookings}
          reviews={reviews}
          currentUser={currentUser}
          onAddReview={onAddReview}
        />
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
  );
}
