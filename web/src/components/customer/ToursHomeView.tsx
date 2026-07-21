'use client';
import React from 'react';
import { Tour, TourSlot, TourCategory, TourDifficulty, Booking, Review } from '../../types';
import { REVIEWS_ENABLED } from '../../config/features';
import {
  Search, MapPin, Compass, Calendar, AlertCircle, MessageCircle,
  ChevronLeft, ChevronRight, Plane, Heart, Scale, Clock, Star,
  SlidersHorizontal, X
} from 'lucide-react';
import { SearchDropdown } from '../SearchDropdown';
import { ReviewSubmissionPanel } from './ReviewSubmissionPanel';
import { computeFeaturedTourIds } from '../../utils/featuredTours';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedTourName, getLocalizedTourDescription } from '../../i18n/tourLocalization';
import { parseStoredGpxData, getRouteDurationHours } from '../../utils/gpxParser';
import { TourStatsRow } from '../tours/TourStatsRow';
import { ShareMenuButton } from '../tours/ShareMenuButton';
import { RouteSparkline } from '../tours/RouteSparkline';
import { matchesHikingSubcategory, HIKING_SUBCATEGORIES, HikingSubcategory } from '../../utils/hikingSubcategories';

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
  compareList: string[];
  handleToggleCompare: (tourId: string, e?: React.MouseEvent) => void;
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
  // When provided, the category chips navigate to the dedicated per-category pages
  // (/category/peak, …) instead of only toggling local filter state.
  onCategoryChange?: (val: string) => void;
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
  calendarMode: 'dates' | 'range';
  handleCalendarModeChange: (mode: 'dates' | 'range') => void;
  calendarSelectedDates: string[];
  handleCalendarReset: () => void;
  calendarContainerRef: React.RefObject<HTMLDivElement>;
  currentMonthView: string;
  monthNames: Record<string, string>;
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
  getAverageRating: (tourId: string) => string | null;
  getReviewsCount: (tourId: string) => number;
  handleQuickWhatsApp: (tour: Tour, e: React.MouseEvent) => void;
  onSelectTour: (tour: Tour) => void;
  setActiveView: (view: 'home' | 'faq' | 'organizer' | 'calculator' | 'wishlist') => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
}

export function ToursHomeView({
  tours, slots, bookings, reviews, currentUser, onAddReview, wishlist, compareList,
  handleToggleCompare, t, currentSearchQuery, handleSearchChange, isSearchFocused,
  setIsSearchFocused, searchContainerRef, recentSearches, recordSearch, appLanguage,
  selectedCategory, setSelectedCategory, onCategoryChange, selectedDifficulty, setSelectedDifficulty,
  selectedRegion, setSelectedRegion, maxPrice, setMaxPrice, maxPriceLimit,
  isFiltersExpanded, setIsFiltersExpanded, uniqueRegions, showCalendarWidget,
  setShowCalendarWidget, calendarDateStart, calendarDateEnd, calendarMode,
  handleCalendarModeChange, calendarSelectedDates, handleCalendarReset,
  calendarContainerRef, currentMonthView, monthNames, handleCalendarPrevMonth,
  handleCalendarNextMonth, handleCalendarDayClick, sortBy, setSortBy,
  uniqueUpcomingTours, upcomingScrollLeft, setUpcomingScrollLeft, handleToggleWishlist,
  getConvertedPriceInfo, sortedAndFilteredTours, getTourMonths, getAverageRating,
  getReviewsCount, handleQuickWhatsApp, onSelectTour, setActiveView, onShowNotification
}: ToursHomeViewProps) {
  const { t: tt, language } = useLanguage();
  const featuredTourIds = React.useMemo(() => computeFeaturedTourIds(tours, slots), [tours, slots]);
  const [hikingSubcategory, setHikingSubcategory] = React.useState<HikingSubcategory>('all');

  // A category chip either navigates to that category's dedicated page (home + category pages,
  // via onCategoryChange) or, as a fallback, just toggles the local filter state.
  const selectCategory = (cat: string) =>
    onCategoryChange ? onCategoryChange(cat) : setSelectedCategory(cat);

  const visibleTours = React.useMemo(() => {
    if (selectedCategory !== 'hiking' || hikingSubcategory === 'all') return sortedAndFilteredTours;
    return sortedAndFilteredTours.filter((tour) => matchesHikingSubcategory(tour, hikingSubcategory));
  }, [sortedAndFilteredTours, selectedCategory, hikingSubcategory]);

  const hasCalendarSelection = !!calendarDateStart || calendarSelectedDates.length > 0;
  const hasActiveFilters = selectedDifficulty !== 'all' || selectedRegion !== 'all' || hasCalendarSelection || maxPrice < maxPriceLimit || sortBy !== 'default';

  const filterChipCls = (active: boolean) =>
    `px-4 py-2 rounded-full text-xs font-bold border transition-all cursor-pointer ${active ? 'bg-emerald-50 text-brand-primary border-brand-primary' : 'bg-white text-brand-text-main border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`;

  return (
    <div className="space-y-4 -mx-5 px-4 sm:px-5 md:px-8 lg:px-12 xl:px-14 min-[1440px]:px-[72px]">
      <div className="max-sm:contents flex flex-col items-center justify-center pt-[20px] pb-[28px] sm:pt-[38px] sm:pb-[50px] min-h-[220px] sm:min-h-[294px] mb-3 relative z-30 w-full">
       <h2 className="max-sm:pt-[20px] text-2xl sm:text-3xl md:text-4xl leading-tight md:leading-[1.22] font-extrabold text-brand-text-main mb-4 sm:mb-6 tracking-tight text-center" suppressHydrationWarning>
  {t('discoverTours')}
</h2>
        <div className="sticky top-0 sm:static z-30 sm:w-full -mx-4 px-4 sm:mx-0 sm:px-0 md:mx-0 md:px-0 lg:mx-0 lg:px-0 xl:mx-0 xl:px-0 min-[1440px]:mx-0 min-[1440px]:px-0 bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none">
          <div className="w-full max-w-[706px] mx-auto mt-2 sm:mt-8 pb-3 sm:pb-4 flex items-center justify-center relative">
            <div ref={searchContainerRef} className="relative w-full h-12 sm:h-14 bg-white shadow-sm sm:shadow-md rounded-full px-5 border border-slate-200 flex items-center">
              <div className="flex items-center flex-1 min-w-0">
                <Search className="text-brand-text-muted w-5 h-5 sm:w-[22px] sm:h-[22px] mr-3 flex-shrink-0" />
                <input
                  type="text"
                  placeholder={t('searchPlaceholderShort')}
                  value={currentSearchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      recordSearch(currentSearchQuery);
                      setIsSearchFocused(false);
                      e.currentTarget.blur();
                      const toursSection = document.getElementById('tours-list');
                      if (toursSection) {
                        const y = toursSection.getBoundingClientRect().top + window.pageYOffset - 100;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }
                  }}
                  className="sm:hidden w-full min-w-0 py-2.5 bg-transparent text-brand-text-main text-base leading-[1.38] focus:outline-none font-normal placeholder-brand-text-muted truncate"
                />
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
                      const toursSection = document.getElementById('tours-list');
                      if (toursSection) {
                        const y = toursSection.getBoundingClientRect().top + window.pageYOffset - 100;
                        window.scrollTo({ top: y, behavior: 'smooth' });
                      }
                    }
                  }}
                  className="hidden sm:block w-full min-w-0 py-2.5 bg-transparent text-brand-text-main text-base leading-[1.38] focus:outline-none font-normal placeholder-brand-text-muted truncate"
                />
              </div>
              {currentSearchQuery && (
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleSearchChange('')}
                  aria-label={tt('customerHome.toursHomeView.filters.resetAll')}
                  className="flex-shrink-0 ml-1 w-8 h-8 flex items-center justify-center rounded-full text-brand-text-muted hover:bg-slate-100 hover:text-brand-text-main transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
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
                  onSelectTour={(tour) => {
                    // "Did you mean … this tour?" — open the tour's own page directly instead of
                    // just filtering the grid down to it.
                    recordSearch(tour.name);
                    setIsSearchFocused(false);
                    onSelectTour(tour);
                  }}
                  appLanguage={appLanguage}
                />
              )}
            </div>
            <div className="relative ml-2 sm:ml-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsFiltersExpanded(true)}
                aria-label={tt('customerHome.toursHomeView.filters.showAdvanced')}
                className="w-12 h-12 sm:w-14 sm:h-14 bg-brand-primary hover:bg-brand-primary-hover shadow-md rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <SlidersHorizontal className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
              </button>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDifficulty('all');
                    setSelectedRegion('all');
                    handleCalendarReset();
                    setSortBy('default');
                    setMaxPrice(maxPriceLimit);
                  }}
                  aria-label={tt('customerHome.toursHomeView.filters.resetAll')}
                  title={tt('customerHome.toursHomeView.filters.resetAll')}
                  className="absolute -top-0.5 -right-0.5 z-10 w-5 h-5 bg-rose-500 hover:bg-rose-600 text-white rounded-full ring-2 ring-white shadow-sm flex items-center justify-center transition-colors cursor-pointer before:absolute before:-inset-2 before:content-[''] before:rounded-full"
                >
                  <X className="w-3 h-3" strokeWidth={3} />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="w-full max-w-3xl overflow-x-auto [&::-webkit-scrollbar]:hidden max-sm:mb-14" style={{ scrollbarWidth: 'none' }}>
          <div className="flex items-center gap-2 mt-4 sm:mt-6 mb-3 sm:mb-4 px-4 -mx-4 sm:px-0 sm:mx-0 sm:justify-center snap-x snap-mandatory w-max sm:w-full mx-auto">
            <button onClick={() => selectCategory('all')} className={`shrink-0 snap-start px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all border ${selectedCategory === 'all' ? 'bg-emerald-50 text-brand-primary border-brand-primary' : 'bg-white text-brand-text-main border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
               {tt('customerHome.toursHomeView.categories.all')}
            </button>
            <button onClick={() => selectCategory('peak')} className={`shrink-0 snap-start px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedCategory === 'peak' ? 'bg-emerald-50 text-brand-primary border-brand-primary' : 'bg-white text-brand-text-main border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
              🏔️ {tt('customerHome.toursHomeView.categories.peak')}
            </button>
            <button onClick={() => selectCategory('camp')} className={`shrink-0 snap-start px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedCategory === 'camp' ? 'bg-emerald-50 text-brand-primary border-brand-primary' : 'bg-white text-brand-text-main border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
              ⛺ {tt('customerHome.toursHomeView.categories.camp')}
            </button>
            <button onClick={() => selectCategory('hiking')} className={`shrink-0 snap-start px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all border flex items-center gap-1.5 ${selectedCategory === 'hiking' ? 'bg-emerald-50 text-brand-primary border-brand-primary' : 'bg-white text-brand-text-main border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
              🥾 {tt('customerHome.toursHomeView.categories.hiking')}
            </button>
            <button onClick={() => selectCategory('active')} className={`shrink-0 snap-start px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all border relative flex items-center gap-1.5 ${selectedCategory === 'active' ? 'bg-emerald-50 text-brand-primary border-brand-primary' : 'bg-white text-brand-text-main border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
              🏃‍♂️ {tt('customerHome.toursHomeView.categories.active')}
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-sky-500 rounded-full ring-2 ring-white" title={tt('customerHome.toursHomeView.categories.newBadge')} />
            </button>
            <button onClick={() => selectCategory('international')} className={`shrink-0 snap-start px-3 py-2 sm:px-4 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold transition-all border relative flex items-center gap-1.5 ${selectedCategory === 'international' ? 'bg-emerald-50 text-brand-primary border-brand-primary' : 'bg-white text-brand-text-main border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
              ✈️ {tt('customerHome.toursHomeView.categories.international')}
              <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white" title={tt('customerHome.toursHomeView.categories.hotBadge')} />
            </button>
          </div>
        </div>

        {isFiltersExpanded && (
          <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/40 animate-fadeIn" onClick={() => setIsFiltersExpanded(false)} />
            <div className="relative w-full sm:max-w-2xl max-h-[85vh] bg-white rounded-t-3xl sm:rounded-2xl border border-slate-200 shadow-lg flex flex-col overflow-hidden animate-fadeIn">
              <div className="shrink-0 sticky top-0 z-10 bg-white px-6 sm:px-10 pt-4 sm:pt-8 pb-3 border-b border-slate-100">
                <div className="sm:hidden -mt-1 mb-2 flex justify-center">
                  <div className="w-10 h-1 bg-slate-200 rounded-full" />
                </div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-extrabold text-brand-text-main">{tt('customerHome.toursHomeView.filters.showAdvanced')}</h3>
                  <button type="button" onClick={() => setIsFiltersExpanded(false)} aria-label={tt('customerHome.toursHomeView.filters.hide')} className="w-8 h-8 flex items-center justify-center rounded-full text-brand-text-muted hover:bg-slate-100 hover:text-brand-text-main transition-colors cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 sm:px-10 py-6 space-y-6">
                <div>
                  <label className="block text-[13px] font-extrabold text-brand-text-main mb-3">{tt('customerHome.toursHomeView.filters.difficultyLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: 'all', label: t('allLevels') },
                      { v: 'easy', label: tt('customerHome.toursHomeView.filters.difficultyOptions.easy') },
                      { v: 'medium', label: tt('customerHome.toursHomeView.filters.difficultyOptions.medium') },
                      { v: 'hard', label: tt('customerHome.toursHomeView.filters.difficultyOptions.hard') },
                      { v: 'extreme', label: tt('customerHome.toursHomeView.filters.difficultyOptions.extreme') },
                    ].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setSelectedDifficulty(opt.v)} className={filterChipCls(selectedDifficulty === opt.v)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[13px] font-extrabold text-brand-text-main mb-3">{tt('customerHome.toursHomeView.filters.regionsLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => setSelectedRegion('all')} className={filterChipCls(selectedRegion === 'all')}>
                      {t('everywhere')}
                    </button>
                    {uniqueRegions.map(reg => (
                      <button key={reg} type="button" onClick={() => setSelectedRegion(reg)} className={filterChipCls(selectedRegion === reg)}>
                        {reg}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative">
                  <label className="block text-[13px] font-extrabold text-brand-text-main mb-3">{tt('customerHome.toursHomeView.filters.dateLabel')}</label>
                  <button type="button" id="calendar-toggle-btn" onClick={() => setShowCalendarWidget(!showCalendarWidget)} className={`w-full px-3 py-2 border rounded-lg text-xs font-semibold text-left flex items-center justify-between transition-colors focus:outline-none focus:ring-1 focus:ring-brand-cta cursor-pointer ${showCalendarWidget || hasCalendarSelection ? 'bg-emerald-50 text-brand-primary border-brand-primary ring-1 ring-brand-primary' : 'bg-brand-bg-light text-brand-text-main border-slate-200 hover:bg-slate-100'}`}>
                    <span className="truncate">
                      {calendarSelectedDates.length === 1
                        ? calendarSelectedDates[0]
                        : calendarSelectedDates.length > 1
                          ? tt('customerHome.toursHomeView.filters.calendar.selectedCount', { count: calendarSelectedDates.length })
                          : calendarDateStart
                            ? `${calendarDateStart}${calendarDateEnd ? ` ➡️ ${calendarDateEnd}` : ''}`
                            : tt('customerHome.toursHomeView.filters.specificDate')}
                    </span>
                    <Calendar className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                  </button>
                  {showCalendarWidget && (
                    <div className="fixed inset-0 z-[220] flex items-center justify-center p-4">
                      <div className="absolute inset-0 bg-black/40 animate-fadeIn" onClick={() => setShowCalendarWidget(false)} />
                      <div ref={calendarContainerRef} className="relative bg-white px-5 py-4 rounded-2xl border border-slate-200 shadow-xl w-72 max-w-[90vw] animate-fade-in font-sans">
                        <div className="flex items-center justify-between mb-4">
                          <button type="button" onClick={handleCalendarPrevMonth} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-brand-text-main rounded-lg text-xs font-bold transition cursor-pointer">&larr;</button>
                          <h4 className="text-xs font-extrabold text-brand-text-main tracking-wider">
                            {(() => {
                              const [y, m] = currentMonthView.split('-');
                              return `${monthNames[m] || m} ${y}`;
                            })()}
                          </h4>
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={handleCalendarNextMonth} className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-brand-text-main rounded-lg text-xs font-bold transition cursor-pointer">&rarr;</button>
                            <button type="button" onClick={() => setShowCalendarWidget(false)} aria-label={tt('customerHome.toursHomeView.filters.hide')} className="p-1.5 bg-slate-100 hover:bg-slate-200 text-brand-text-main rounded-lg transition cursor-pointer">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                        <div className="flex bg-slate-100 rounded-lg p-0.5 mb-3">
                          <button type="button" onClick={() => handleCalendarModeChange('dates')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition cursor-pointer ${calendarMode === 'dates' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text-main'}`}>
                            {tt('customerHome.toursHomeView.filters.calendar.modeDates')}
                          </button>
                          <button type="button" onClick={() => handleCalendarModeChange('range')} className={`flex-1 py-1.5 rounded-md text-[10px] font-bold transition cursor-pointer ${calendarMode === 'range' ? 'bg-white text-brand-primary shadow-sm' : 'text-brand-text-muted hover:text-brand-text-main'}`}>
                            {tt('customerHome.toursHomeView.filters.calendar.modeRange')}
                          </button>
                        </div>
                        <p className="text-[10px] text-brand-text-muted text-center mb-2 leading-snug">
                          {calendarMode === 'dates'
                            ? tt('customerHome.toursHomeView.filters.calendar.hintDates')
                            : calendarDateStart && !calendarDateEnd
                              ? tt('customerHome.toursHomeView.filters.calendar.hintRangeEnd')
                              : tt('customerHome.toursHomeView.filters.calendar.hintRangeStart')}
                        </p>
                        <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-bold text-brand-text-muted">
                          {tt('customerHome.toursHomeView.filters.calendar.weekDays').split(',').map((day, idx) => (
                            <div key={`${day}-${idx}`}>{day}</div>
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
                              const isPicked = calendarMode === 'dates' && calendarSelectedDates.includes(fullDayStr);
                              const isStart = calendarMode === 'range' && calendarDateStart === fullDayStr;
                              const isEnd = calendarMode === 'range' && calendarDateEnd === fullDayStr;
                              const isWithinRange = calendarMode === 'range' && calendarDateStart && calendarDateEnd && fullDayStr > calendarDateStart && fullDayStr < calendarDateEnd;
                              let cellClass = "py-1.5 rounded-lg cursor-pointer transition select-none ";
                              if (isPicked || isStart || isEnd) {
                                cellClass += "bg-brand-primary text-white font-bold scale-102 shadow-xs";
                              } else if (isWithinRange) {
                                cellClass += "bg-emerald-100 text-brand-primary font-bold";
                              } else if (hasActiveSlots) {
                                cellClass += "bg-emerald-50 hover:bg-emerald-100 text-brand-text-main border border-emerald-250 font-bold";
                              } else {
                                cellClass += "text-brand-text-muted hover:bg-slate-50";
                              }
                              totalCells.push(
                                <div key={fullDayStr} onClick={(e) => { e.stopPropagation(); handleCalendarDayClick(fullDayStr); }} className={cellClass} title={hasActiveSlots ? tt('customerHome.toursHomeView.filters.calendar.hasActiveTrips') : tt('customerHome.toursHomeView.filters.calendar.noTrips')}>
                                  <div className="relative flex flex-col items-center">
                                    <span>{d}</span>
                                    {hasActiveSlots && !isPicked && !isStart && !isEnd && !isWithinRange && (
                                      <span className="w-1 h-1 bg-brand-primary rounded-full mt-0.5 animate-pulse"></span>
                                    )}
                                  </div>
                                </div>
                              );
                            }
                            return totalCells;
                          })()}
                        </div>
                        {hasCalendarSelection && (
                          <button type="button" onClick={(e) => { e.stopPropagation(); handleCalendarReset(); }} className="w-full mt-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-[10px] rounded-lg transition">
                            {tt('customerHome.toursHomeView.filters.calendar.reset')}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-[13px] font-extrabold text-brand-text-main mb-3">{tt('customerHome.toursHomeView.filters.sortLabel')}</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { v: 'default', label: tt('customerHome.toursHomeView.filters.sortOptions.default') },
                      { v: 'price-asc', label: tt('customerHome.toursHomeView.filters.sortOptions.priceAsc') },
                      { v: 'price-desc', label: tt('customerHome.toursHomeView.filters.sortOptions.priceDesc') },
                      { v: 'diff-asc', label: tt('customerHome.toursHomeView.filters.sortOptions.diffAsc') },
                      { v: 'diff-desc', label: tt('customerHome.toursHomeView.filters.sortOptions.diffDesc') },
                      { v: 'date-asc', label: tt('customerHome.toursHomeView.filters.sortOptions.dateAsc') },
                      { v: 'date-desc', label: tt('customerHome.toursHomeView.filters.sortOptions.dateDesc') },
                    ].map(opt => (
                      <button key={opt.v} type="button" onClick={() => setSortBy(opt.v)} className={filterChipCls(sortBy === opt.v)}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-[13px] font-extrabold text-brand-text-main">{tt('customerHome.toursHomeView.filters.maxPrice')}</label>
                    <span className="text-xs font-extrabold text-brand-primary bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 whitespace-nowrap">{maxPrice} ₼</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-bold text-brand-text-muted shrink-0">20 ₼</span>
                    <input type="range" min="20" max={maxPriceLimit} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="flex-1 accent-brand-primary cursor-pointer h-1.5 bg-slate-200 rounded-lg" />
                    <span className="text-[11px] font-bold text-brand-text-muted shrink-0">{maxPriceLimit} ₼</span>
                  </div>
                </div>
              </div>
              <div className="shrink-0 sticky bottom-0 bg-white border-t border-slate-100 px-6 sm:px-10 py-3 sm:py-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:pb-4 flex items-center justify-between gap-3">
                <button type="button" onClick={() => { setSelectedDifficulty('all'); setSelectedRegion('all'); handleCalendarReset(); setSortBy('default'); setMaxPrice(maxPriceLimit); }} className="px-4 py-2.5 rounded-xl text-xs font-bold text-brand-text-muted hover:bg-slate-100 hover:text-brand-text-main transition-colors cursor-pointer">
                  <span suppressHydrationWarning>{tt('customerHome.toursHomeView.filters.resetAll', 'Reset')}</span>
                </button>
                <button type="button" onClick={() => setIsFiltersExpanded(false)} className="flex-1 sm:flex-none sm:px-8 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white text-xs font-bold transition-colors cursor-pointer shadow-sm">
                  <span suppressHydrationWarning>{tt('customerHome.toursHomeView.filters.showResults', 'Show Results')}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {uniqueUpcomingTours.length > 0 && (
        <div className="mb-3 mt-0 w-full animate-fadeIn relative">
          <div className="flex items-center justify-between mb-2 px-1">
            <h3 className="text-[24px] font-bold text-brand-text-main tracking-tight">{t('upcomingTours')}</h3>
          </div>
          <div className="relative group">
            {uniqueUpcomingTours.length > 3 && upcomingScrollLeft > 5 && (
              <button onClick={(e) => { e.stopPropagation(); const slider = document.getElementById('upcoming-tours-slider'); if(slider) slider.scrollBy({ left: -300, behavior: 'smooth' }); }} className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 -ml-3 md:-ml-4 z-10 bg-brand-bg-page text-brand-accent p-2.5 rounded-full shadow-lg hover:bg-slate-50 transition-colors items-center justify-center border-2 border-slate-200">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div id="upcoming-tours-slider" onScroll={(e) => setUpcomingScrollLeft(e.currentTarget.scrollLeft)} className="flex overflow-x-auto gap-3 pb-2 snap-x snap-mandatory scroll-smooth w-full pr-4 md:pr-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {uniqueUpcomingTours.map(({ tour, slot }) => (
                <div key={tour.id} onClick={() => onSelectTour(tour)} className="w-[85vw] sm:w-[403px] h-[150px] flex-shrink-0 bg-white border border-slate-200 rounded-[20px] p-2.5 flex items-stretch gap-3.5 snap-start cursor-pointer hover:border-emerald-300 hover:shadow-xl transition-all duration-300 shadow-sm">
                  <div className="w-[130px] h-[130px] rounded-[16px] flex-shrink-0 relative overflow-hidden">
                    <img src={tour.image || `https://images.unsplash.com/photo-1542224566-6e85f2e6772f?auto=format&fit=crop&q=80&w=200`} className="w-full h-full object-cover rounded-[16px] hover:scale-105 transition-transform duration-500" alt="" />
                    <button type="button" onClick={(e) => handleToggleWishlist(tour.id, e)} className="absolute top-2 right-2 w-[40px] h-[40px] bg-white rounded-full shadow-md border border-slate-50 flex items-center justify-center transition cursor-pointer z-10 hover:scale-110" title={wishlist.includes(tour.id) ? tt('customerHome.toursHomeView.wishlist.remove') : tt('customerHome.toursHomeView.wishlist.add')}>
                      <Heart className={`w-5 h-5 ${wishlist.includes(tour.id) ? 'fill-rose-600 text-rose-600' : 'text-[#1a2b49] stroke-[2.5]'}`} />
                    </button>
                  </div>
                  <div className="flex flex-col flex-1 py-0.5 overflow-hidden pr-1">
                    <h4 className="text-[15px] font-extrabold text-[#1a2b49] line-clamp-2 leading-[1.2] mb-1" title={getLocalizedTourName(tour, language)}>
                      {getLocalizedTourName(tour, language)}
                    </h4>
                    <div className="text-[11px] font-semibold text-gray-500 line-clamp-1 mb-1">
                      {tour.durationDays} {tt('customerHome.toursHomeView.cardMeta.day')} • {tour.region} • {(tour.category === 'active' || tour.isActiveLife) ? tt('customerHome.toursHomeView.cardMeta.activeTag') : tt('customerHome.toursHomeView.cardMeta.localTag')}
                    </div>
                    {(() => {
                      const parts = slot.startDate ? slot.startDate.split('-') : [];
                      if (parts.length < 3) return null;
                      const [year, month, day] = parts;
                      const monthLabel = monthNames?.[month] || month;
                      return (
                        <div className="flex items-center gap-1 text-[11px] font-bold text-brand-primary mb-2">
                          <Calendar className="w-3 h-3 flex-shrink-0" />
                          <span>{parseInt(day, 10)} {monthLabel} {year}</span>
                        </div>
                      );
                    })()}
                    <div className="flex items-end justify-between mt-auto">
                      <div className="flex items-center gap-1">
                        {getAverageRating(tour.id) !== null ? (
                          <>
                            <span className="text-[13px] font-bold text-[#1a2b49]">{getAverageRating(tour.id)}</span>
                            <Star className="w-3.5 h-3.5 fill-[#1a2b49] text-[#1a2b49]" />
                            <span className="text-[11px] font-medium text-gray-500">({getReviewsCount(tour.id)})</span>
                          </>
                        ) : (
                          <>
                            <Star className="w-3.5 h-3.5 fill-[#1a2b49] text-[#1a2b49]" />
                            <span className="text-[13px] font-bold text-[#1a2b49]">{tt('customerHome.toursHomeView.cardMeta.newTag')}</span>
                          </>
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        {tour.discountPrice && tour.discountPrice > 0 && tour.discountPrice < (tour.price ?? slot.price) ? (
                          <>
                            <span className="text-gray-500 text-[11px] font-medium line-through">{getConvertedPriceInfo(tour.price ?? slot.price, tour.priceCurrency).both}</span>
                            <span className="text-[18px] font-extrabold text-[#dc3545] tracking-tight">{getConvertedPriceInfo(tour.discountPrice, tour.priceCurrency).both}</span>
                          </>
                        ) : (
                          <span className="text-[18px] font-extrabold text-[#dc3545] tracking-tight">{getConvertedPriceInfo(slot.price, tour.priceCurrency).both}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {uniqueUpcomingTours.length > 3 && (
              <button onClick={(e) => { e.stopPropagation(); const slider = document.getElementById('upcoming-tours-slider'); if(slider) slider.scrollBy({ left: 300, behavior: 'smooth' }); }} className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 -mr-3 md:-mr-4 z-10 bg-brand-bg-page text-brand-accent p-2.5 rounded-full shadow-lg hover:bg-slate-50 transition-colors items-center justify-center border-2 border-slate-200">
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      )}

      <div id="tours-list" className="space-y-16 mt-10">
        <div className="flex items-center justify-between mb-2 px-1">
          <h3 className="text-[24px] font-bold text-brand-text-main tracking-tight" suppressHydrationWarning>{tt('customerHome.toursHomeView.allToursSectionTitle')}</h3>
        </div>
        {selectedCategory === 'hiking' && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-3 mb-1 -mx-1 px-1">
            {HIKING_SUBCATEGORIES.map((sub) => {
              const isActive = hikingSubcategory === sub.id;
              return (
                <button key={sub.id} type="button" onClick={() => setHikingSubcategory(sub.id)} className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${isActive ? 'bg-brand-primary text-white border-brand-primary shadow-sm' : 'bg-white text-brand-text-main border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                  {sub.emoji} {tt(sub.labelKey)}
                </button>
              );
            })}
          </div>
        )}
        {visibleTours.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 space-y-3 shadow-xs">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-brand-text-main">{t('noToursFound')}</h3>
            <p className="text-xs text-brand-text-muted max-w-md mx-auto">{t('noToursDesc')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 xl:gap-6">
            {visibleTours.map((tour) => {
              const tourSlots = slots.filter(s => s.tourId === tour.id);
              const priceList = tourSlots.map(s => s.price);
              const minPrice = priceList.length > 0 ? Math.min(...priceList) : 25;
              const isSportActive = tour.category === 'active' || tour.isActiveLife;
              const diffColors: Record<TourDifficulty, { bg: string, text: string, label: string }> = {
                easy: { bg: 'bg-lime-600/10 text-lime-600 border border-lime-600/30', text: 'text-lime-600', label: tt('customerHome.toursHomeView.difficulty.easy') },
                medium: { bg: 'bg-yellow-400/10 text-yellow-600 border border-yellow-400/40', text: 'text-yellow-600', label: tt('customerHome.toursHomeView.difficulty.medium') },
                hard: { bg: 'bg-yellow-700/10 text-yellow-700 border border-yellow-700/30', text: 'text-yellow-700', label: tt('customerHome.toursHomeView.difficulty.hard') },
                extreme: { bg: 'bg-rose-600/10 text-rose-600 border border-rose-600/30', text: 'text-rose-600', label: tt('customerHome.toursHomeView.difficulty.extreme') }
              };
              const badges: Record<TourCategory, { emoji: string, label: string }> = {
                peak: { emoji: '🏔️', label: tt('customerHome.toursHomeView.categories.peak') },
                camp: { emoji: '⛺', label: tt('customerHome.toursHomeView.categories.camp') },
                hiking: { emoji: '🥾', label: tt('customerHome.toursHomeView.categories.hiking') },
                international: { emoji: '✈️', label: tt('customerHome.toursHomeView.badges.international') },
                active: { emoji: '🏃‍♂️', label: tt('customerHome.toursHomeView.categories.active') }
              };

              let difficultyBg = diffColors[tour.difficulty]?.bg || 'bg-slate-100 text-brand-text-main';
              let difficultyLabel = diffColors[tour.difficulty]?.label || tt('customerHome.toursHomeView.difficulty.medium');
              let difficultyBarColorClass = 'bg-[#ffc107]';
              let difficultyPercent = 60;
              if (tour.difficulty === 'easy') { difficultyBarColorClass = 'bg-[#28a745]'; difficultyPercent = 30; }
              else if (tour.difficulty === 'hard') { difficultyBarColorClass = 'bg-[#fd7e14]'; difficultyPercent = 85; }
              else if (tour.difficulty === 'extreme') { difficultyBarColorClass = 'bg-[#dc3545]'; difficultyPercent = 100; }

              if (isSportActive) {
                const activeDiff = tour.activeDifficulty || (tour.difficulty === 'easy' ? 'beginner' : tour.difficulty === 'hard' || tour.difficulty === 'extreme' ? 'professional' : 'medium');
                if (activeDiff === 'beginner' || activeDiff === 'easy') {
                  difficultyBg = 'bg-[#28a745]/10 text-[#28a745] border border-[#28a745]/30 font-bold';
                  difficultyLabel = `🟢 ${tt('customerHome.toursHomeView.activeDifficulty.beginner')}`;
                  difficultyBarColorClass = 'bg-[#28a745]'; difficultyPercent = 30;
                } else if (activeDiff === 'medium') {
                  difficultyBg = 'bg-[#ffc107]/10 text-[#d39e00] border border-[#ffc107]/40 font-bold';
                  difficultyLabel = `🟡 ${tt('customerHome.toursHomeView.activeDifficulty.medium')}`;
                  difficultyBarColorClass = 'bg-[#ffc107]'; difficultyPercent = 60;
                } else {
                  difficultyBg = 'bg-[#dc3545]/10 text-[#dc3545] border border-[#dc3545]/30 font-extrabold';
                  difficultyLabel = `🔴 ${tt('customerHome.toursHomeView.activeDifficulty.professional')}`;
                  difficultyBarColorClass = 'bg-[#dc3545]'; difficultyPercent = 85;
                }
                if (tour.category === 'active' || tour.isActiveLife) {
                  const tBadge = { emoji: '🏃‍♂️', label: tt('customerHome.toursHomeView.sportsBadges.activeSport') };
                  if (tour.activityType === 'volleyball') { tBadge.emoji = '🏐'; tBadge.label = tt('customerHome.toursHomeView.sportsBadges.volleyball'); }
                  else if (tour.activityType === 'running') { tBadge.emoji = '‍♂️'; tBadge.label = tt('customerHome.toursHomeView.sportsBadges.running'); }
                  else if (tour.activityType === 'ski' || tour.activityType === 'skiing') { tBadge.emoji = '⛷️'; tBadge.label = tt('customerHome.toursHomeView.sportsBadges.ski'); }
                  else if (tour.activityType === 'rafting') { tBadge.emoji = '🚣‍♂️'; tBadge.label = tt('customerHome.toursHomeView.sportsBadges.rafting'); }
                  else if (tour.activityType === 'bike' || tour.activityType === 'cycling') { tBadge.emoji = '🚴‍♂️'; tBadge.label = tt('customerHome.toursHomeView.sportsBadges.bike'); }
                  else if (tour.activityType === 'canyon') { tBadge.emoji = '🧗‍♂️'; tBadge.label = tt('customerHome.toursHomeView.sportsBadges.canyon'); }
                  else if (tour.activityType === 'other') { tBadge.emoji = '🏆'; tBadge.label = tt('customerHome.toursHomeView.sportsBadges.other'); }
                  badges['active'] = tBadge;
                }
              }

              const parsedGpx = parseStoredGpxData(tour.gpxData);
              const routeDurationLabel = parsedGpx
                ? `${getRouteDurationHours(parsedGpx)} ${tt('miscWidgets.tourRouteStatsCard.hours')}`
                : tour.durationHours
                  ? `${tour.durationHours} ${tt('miscWidgets.tourRouteStatsCard.hours')}`
                  : `${tour.durationDays} ${tt('miscWidgets.tourRouteStatsCard.days')}`;

              return (
                <div key={tour.id} className={`bg-[#fcfdfc] rounded-[24px] shadow-sm hover:shadow-md transition-all flex flex-col group cursor-pointer border ${tour.isInternational ? 'border-amber-200 ring-1 ring-amber-100/50' : 'border-slate-100'} ${isSportActive ? 'border-amber-300' : ''}`} onClick={() => onSelectTour(tour)}>
                  <div className="relative h-[200px] overflow-hidden bg-slate-100 shrink-0 rounded-t-[24px]">
                    <img src={tour.image || undefined} alt={getLocalizedTourName(tour, language)} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" referrerPolicy="no-referrer" />
                    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-white px-2.5 py-1 rounded-full flex items-center gap-1.5 z-10 shadow-sm">
                      <span className="text-[11px] font-medium tracking-wide">{badges[tour.category]?.emoji || '🏔️'} {badges[tour.category]?.label || tt('customerHome.toursHomeView.categories.peak')}</span>
                    </div>
                    <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                      <button type="button" onClick={(e) => handleToggleCompare(tour.id, e)} className={`w-[40px] h-[40px] rounded-full flex items-center justify-center transition shadow-sm ${compareList.includes(tour.id) ? 'bg-amber-50 text-amber-600' : 'bg-white/90 hover:bg-white text-gray-700'}`} title={compareList.includes(tour.id) ? tt('customerHome.toursHomeView.compare.remove') : tt('customerHome.toursHomeView.compare.add')}>
                        <Scale className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={(e) => handleToggleWishlist(tour.id, e)} className="w-[40px] h-[40px] bg-white/90 hover:bg-white rounded-full flex items-center justify-center transition shadow-sm" title={wishlist.includes(tour.id) ? tt('customerHome.toursHomeView.wishlist.remove') : tt('customerHome.toursHomeView.wishlist.add')}>
                        <Heart className={`w-5 h-5 ${wishlist.includes(tour.id) ? 'fill-rose-600 text-rose-600' : 'text-gray-700'}`} />
                      </button>
                      <ShareMenuButton tour={tour} slots={slots} onShowNotification={onShowNotification} stopPropagationOnOpen buttonClassName="w-[40px] h-[40px] bg-white/90 hover:bg-white rounded-full flex items-center justify-center text-gray-700 transition shadow-sm" iconClassName="w-5 h-5" />
                    </div>
                    <div className="absolute bottom-4 right-4 bg-white text-gray-800 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1 z-10 shadow-sm border border-slate-100">
                      <MapPin className="w-3 h-3 text-[#2E4F3E]" />
                      <span className="truncate max-w-[120px]">{tour.region.split(',')[0]}</span>
                    </div>
                  </div>
                  <div className="px-5 pt-5 pb-4 flex-1 flex flex-col">
                    <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-medium mb-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span suppressHydrationWarning>
                        {isSportActive
                          ? `${tt('customerHome.toursHomeView.sportsBadges.activeSport')}`
                          : tour.isInternational
                            ? tt('customerHome.toursHomeView.durationInternational', { nights: tour.durationNights || Number(tour.durationDays) - 1, days: tour.durationDays })
                            : tt('customerHome.toursHomeView.durationDomestic', { days: tour.durationDays })}
                        <span className="mx-1.5">•</span>
                        {tt('customerHome.toursHomeView.activeDates', { count: tourSlots.length })}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 text-[15px] leading-snug mb-4 line-clamp-2" suppressHydrationWarning>
                      {getLocalizedTourName(tour, language)}
                    </h3>
                    <div className="mt-auto flex flex-col">
                      {parsedGpx ? (
                        <div className="flex items-center justify-between bg-[#fcfdfc] border border-slate-100 rounded-xl p-2.5 mb-4 shadow-sm h-[60px]">
                          <div className="flex flex-col gap-0.5 justify-center">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider" suppressHydrationWarning>{tt('miscWidgets.tourRouteStatsCard.distance')}</span>
                            <span className="text-[12px] font-extrabold text-gray-800">{parsedGpx.stats.distanceKm} <span className="text-[9px] font-medium text-gray-500">km</span></span>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-100 mx-2"></div>
                          <div className="flex flex-col gap-0.5 items-center flex-1 justify-center overflow-hidden">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider leading-none" suppressHydrationWarning>{tt('miscWidgets.tourRouteStatsCard.route')}</span>
                            <RouteSparkline points={parsedGpx.points} className="w-[28px] h-[28px] text-brand-primary" />
                          </div>
                          <div className="w-[1px] h-8 bg-slate-100 mx-2"></div>
                          <div className="flex flex-col gap-0.5 text-right justify-center">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider" suppressHydrationWarning>{tt('miscWidgets.tourRouteStatsCard.elevation')}</span>
                            <span className="text-[12px] font-extrabold text-gray-800">{parsedGpx.stats.elevationGainM} <span className="text-[9px] font-medium text-gray-500">m</span></span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between bg-[#fcfdfc] border border-slate-100 rounded-xl p-2.5 mb-4 shadow-sm h-[60px]">
                          <div className="flex flex-col gap-0.5 justify-center w-[30%]">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider" suppressHydrationWarning>{tt('customerHome.toursHomeView.guideLabel', 'GUIDE')}</span>
                            <span className="text-[11px] font-extrabold text-gray-800 line-clamp-1 truncate">
                              {tour.languages && tour.languages.length > 0 ? tour.languages.join(', ') : 'AZ, RU'}
                            </span>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-100 mx-1.5 shrink-0"></div>
                          <div className="flex flex-col gap-0.5 items-center justify-center flex-1 overflow-hidden">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider text-center" suppressHydrationWarning>{tt('customerHome.toursHomeView.equipmentLabel', 'EQUIPMENT')}</span>
                            <span className="text-[11px] font-extrabold text-gray-800 line-clamp-1 text-center w-full truncate">
                              {tour.importantInfo?.bring && tour.importantInfo.bring.length > 0
                                ? tour.importantInfo.bring[0]
                                : 'Sərbəst geyim'}
                            </span>
                          </div>
                          <div className="w-[1px] h-8 bg-slate-100 mx-1.5 shrink-0"></div>
                          <div className="flex flex-col gap-0.5 text-right justify-center w-[30%]">
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider" suppressHydrationWarning>{tt('customerHome.toursHomeView.formatLabel', 'FORMAT')}</span>
                            <span className="text-[11px] font-extrabold text-gray-800 line-clamp-1 truncate" suppressHydrationWarning>
                              {isSportActive ? tt('customerHome.toursHomeView.activeTourLabel', 'Active Tour') : tour.isInternational ? tt('customerHome.toursHomeView.internationalTourLabel', 'International Tour') : tour.category === 'camp' ? tt('customerHome.toursHomeView.campLabel', 'Camp') : tt('customerHome.toursHomeView.natureTourLabel', 'Nature Tour')}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="mb-4">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className={`text-[11px] font-bold ${diffColors[tour.difficulty]?.text || 'text-gray-600'}`} suppressHydrationWarning>
                            {difficultyLabel}
                          </span>
                          <div className="flex items-center gap-1">
                            {getAverageRating(tour.id) !== null ? (
                              <>
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-[11px] font-bold text-gray-800">{getAverageRating(tour.id)} <span className="font-normal text-gray-500">({tt('customerHome.toursHomeView.cardMeta.reviews', { count: getReviewsCount(tour.id) })})</span></span>
                              </>
                            ) : (
                              <>
                                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                                <span className="text-[11px] font-bold text-gray-800">{tt('customerHome.toursHomeView.cardMeta.newTag')}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 h-1.5">
                          {[20, 40, 60, 80, 100].map(threshold => {
                            let segColor = 'bg-slate-200';
                            if (difficultyPercent >= threshold) {
                              if (difficultyPercent <= 30) segColor = 'bg-lime-600';
                              else if (difficultyPercent <= 60) segColor = 'bg-yellow-400';
                              else if (difficultyPercent <= 85) segColor = 'bg-yellow-700';
                              else segColor = 'bg-rose-600';
                            }
                            return <div key={threshold} className={`flex-1 rounded-full ${segColor}`}></div>;
                          })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <div className="flex flex-col">
                          <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-0.5" suppressHydrationWarning>{tt('customerHome.toursHomeView.priceLabel')}</span>
                          <div className="flex items-baseline gap-0.5">
                            <span className="text-[18px] font-extrabold text-gray-900 leading-none">
                              {tour.discountPrice && tour.discountPrice > 0 && tour.discountPrice < (tour.price ?? minPrice)
                                ? getConvertedPriceInfo(tour.discountPrice, tour.priceCurrency).both
                                : getConvertedPriceInfo(tour.price ?? minPrice, tour.priceCurrency).both}
                            </span>
                            <span className="text-[9px] font-medium text-gray-500 whitespace-nowrap" suppressHydrationWarning>/ {tt('customerHome.toursHomeView.perPerson')}</span>
                          </div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); onSelectTour(tour); }} className="bg-[#2E4F3E] hover:bg-[#233f30] text-white px-4 py-2 rounded-xl text-[11px] font-bold flex items-center gap-1.5 transition-colors shadow-sm">
                          <span suppressHydrationWarning>{tt('customerHome.toursHomeView.moreDetails')}</span>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
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

      {REVIEWS_ENABLED && (
        <ReviewSubmissionPanel
          tours={tours}
          bookings={bookings}
          reviews={reviews}
          currentUser={currentUser}
          onAddReview={onAddReview}
        />
      )}
    </div>
  );
}