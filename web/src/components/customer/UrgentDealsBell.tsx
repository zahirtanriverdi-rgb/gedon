'use client';

import React from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bell, Ticket, Flame, X } from 'lucide-react';
import type { Tour, TourSlot } from '@/types';
import { useExpandingMenu } from '@/hooks/useExpandingMenu';
import { useLanguage } from '@/i18n/LanguageContext';

// A slot is a "təcili fürsət" (urgent opportunity) when it still has seats left but fewer
// than this many — few enough that the customer should act now. 0 remaining means sold out,
// which is deliberately excluded (nothing to "act on" there).
const URGENT_SEATS_THRESHOLD = 5;

// How many rows the popup shows before it starts scrolling internally.
const MAX_VISIBLE_ROWS = 6;

const PANEL_WIDTH = 340;

type AppLanguage = 'az' | 'en' | 'ru';

interface UrgentDealsBellProps {
  // 'header': small dropdown panel anchored under the button — used in the site header.
  // 'mobileNav': bottom tab-bar icon style that opens a full bottom sheet instead of a
  // dropdown — a small panel anchored to a bottom-fixed nav icon would run off-screen.
  variant?: 'header' | 'mobileNav';
}

interface UrgentDeal {
  tour: Tour;
  slot: TourSlot;
  remaining: number;
}

const STRINGS = {
  az: {
    title: 'Təcili fürsətlər',
    navLabel: 'Fürsətlər',
    empty: 'Hazırda yeri azalan tur yoxdur.',
    emptyHint: 'Yenə də baxın — yerlər tez dolur!',
    headerCount: (n: number) => `${n} turda yerlər azalır`,
    seatsLeft: (n: number) => `Cəmi ${n} yer qalıb`,
    lastSeat: 'Son yer!',
    buyTicket: 'Bilet al',
  },
  en: {
    title: 'Urgent deals',
    navLabel: 'Deals',
    empty: 'No tours are running low right now.',
    emptyHint: 'Check back soon — seats fill fast!',
    headerCount: (n: number) => `${n} tour${n === 1 ? '' : 's'} almost full`,
    seatsLeft: (n: number) => `Only ${n} seat${n === 1 ? '' : 's'} left`,
    lastSeat: 'Last seat!',
    buyTicket: 'Buy ticket',
  },
  ru: {
    title: 'Срочные предложения',
    navLabel: 'Предложения',
    empty: 'Сейчас нет туров с малым числом мест.',
    emptyHint: 'Загляните позже — места разбирают быстро!',
    headerCount: (n: number) => `Мест мало в ${n} тур${n === 1 ? 'е' : 'ах'}`,
    seatsLeft: (n: number) => `Осталось всего ${n} мест${n === 1 ? 'о' : ''}`,
    lastSeat: 'Последнее место!',
    buyTicket: 'Купить билет',
  },
} as const;

// Localized month names, kept manual rather than via Intl: the browser's az-AZ short-month
// format renders as an unreadable "M07", so we match the app's own "18 İyul" style instead.
const MONTHS: Record<AppLanguage, string[]> = {
  az: ['Yan', 'Fev', 'Mar', 'Apr', 'May', 'İyun', 'İyul', 'Avq', 'Sen', 'Okt', 'Noy', 'Dek'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ru: ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
};

function formatDate(dateStr: string, appLanguage: AppLanguage): string {
  const parts = dateStr.split('-');
  if (parts.length < 3) return dateStr;
  const monthIndex = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const months = MONTHS[appLanguage] || MONTHS.az;
  if (monthIndex < 0 || monthIndex > 11 || Number.isNaN(day)) return dateStr;
  return `${day} ${months[monthIndex]}`;
}

/**
 * "Təcili fürsətlər" notification button — desktop header dropdown (variant="header") or
 * mobile bell that opens a bottom sheet (variant="mobileNav").
 *
 * Unlike the old SPA (which received live tours/slots props from the App god-component),
 * the Next site header has no client-side marketplace store — the public pages are
 * server-rendered — so the bell fetches the public tours/slots endpoints itself on mount
 * and derives the set of approved, active tours that have an upcoming departure with fewer
 * than URGENT_SEATS_THRESHOLD seats left. When there's at least one, the bell rings and
 * shows an amber count badge. Opening it lists those tours, most-urgent first, each with a
 * direct "Bilet al" link to its booking page.
 */
export function UrgentDealsBell({ variant = 'header' }: UrgentDealsBellProps) {
  const router = useRouter();
  const { language } = useLanguage();
  const appLanguage = (language as AppLanguage) || 'az';
  const s = STRINGS[appLanguage] || STRINGS.az;

  const [tours, setTours] = React.useState<Tour[]>([]);
  const [slots, setSlots] = React.useState<TourSlot[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [toursRes, slotsRes] = await Promise.all([fetch('/api/tours'), fetch('/api/slots')]);
        if (!toursRes.ok || !slotsRes.ok || cancelled) return;
        const [toursData, slotsData] = await Promise.all([toursRes.json(), slotsRes.json()]);
        if (cancelled) return;
        setTours(toursData.tours || []);
        setSlots(slotsData.slots || []);
      } catch {
        /* best-effort widget — a failed fetch just leaves the bell quiet */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const menu = useExpandingMenu((rect) => {
    // Right-align the panel to the button, kept fully on-screen with an 8px margin.
    const left = Math.max(8, Math.min(rect.right - PANEL_WIDTH, window.innerWidth - PANEL_WIDTH - 8));
    return { left, width: PANEL_WIDTH };
  });
  const [sheetOpen, setSheetOpen] = React.useState(false);

  const urgentDeals = React.useMemo<UrgentDeal[]>(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const tourMap = new Map(tours.map((t) => [t.id, t]));
    const bookable = new Set(
      tours.filter((t) => t.status === 'approved' && t.isActive !== false).map((t) => t.id),
    );

    // One entry per tour — its single most urgent upcoming slot (fewest seats, then soonest).
    const byTour = new Map<string, UrgentDeal>();
    for (const slot of slots) {
      if (!bookable.has(slot.tourId)) continue;
      if (!slot.startDate || slot.startDate < todayStr) continue;
      const remaining = (slot.capacity ?? 0) - (slot.bookedCount ?? 0);
      if (remaining <= 0 || remaining >= URGENT_SEATS_THRESHOLD) continue;

      const existing = byTour.get(slot.tourId);
      const isMoreUrgent =
        !existing ||
        remaining < existing.remaining ||
        (remaining === existing.remaining && slot.startDate < existing.slot.startDate);
      if (!isMoreUrgent) continue;

      const tour = tourMap.get(slot.tourId);
      if (tour) byTour.set(slot.tourId, { tour, slot, remaining });
    }

    return Array.from(byTour.values()).sort(
      (a, b) => a.remaining - b.remaining || a.slot.startDate.localeCompare(b.slot.startDate),
    );
  }, [tours, slots]);

  const count = urgentDeals.length;
  const hasUrgent = count > 0;

  const localizedName = (tour: Tour) => tour.translations?.[appLanguage]?.name || tour.name;

  const closePanel = variant === 'mobileNav' ? () => setSheetOpen(false) : () => menu.setOpen(false);
  const handleBuy = (deal: UrgentDeal) => {
    closePanel();
    router.push(`/tours/${deal.tour.slug || deal.tour.id}`);
  };

  // Shared header strip + list/empty-state markup — only the outer panel chrome differs
  // between the desktop dropdown and the mobile bottom sheet.
  const panelContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white shrink-0">
        <Flame className="w-5 h-5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold leading-tight">{s.title}</div>
          {hasUrgent && (
            <div className="text-[11px] font-medium text-amber-50/90 leading-tight">
              {s.headerCount(count)}
            </div>
          )}
        </div>
        <button
          onClick={closePanel}
          className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {hasUrgent ? (
        <div
          className="overflow-y-auto divide-y divide-slate-100"
          style={variant === 'header' ? { maxHeight: `${MAX_VISIBLE_ROWS * 76}px` } : undefined}
        >
          {urgentDeals.map((deal) => (
            <div
              key={deal.tour.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-amber-50/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-brand-text-main truncate">
                  {localizedName(deal.tour)}
                </div>
                <div className="mt-1 flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      deal.remaining === 1
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {deal.remaining === 1 ? s.lastSeat : s.seatsLeft(deal.remaining)}
                  </span>
                  <span className="text-[11px] text-brand-text-muted font-medium">
                    {formatDate(deal.slot.startDate, appLanguage)}
                  </span>
                </div>
              </div>
              <button
                onClick={() => handleBuy(deal)}
                className="shrink-0 inline-flex items-center gap-1.5 bg-brand-cta hover:bg-brand-cta-hover text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                <Ticket className="w-3.5 h-3.5" />
                {s.buyTicket}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-4 py-8 text-center">
          <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <div className="text-sm font-medium text-brand-text-main">{s.empty}</div>
          <div className="text-xs text-brand-text-muted mt-1">{s.emptyHint}</div>
        </div>
      )}
    </>
  );

  if (variant === 'mobileNav') {
    return (
      <>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          className={`flex-1 relative flex flex-col items-center justify-center h-full gap-0.5 transition-colors ${
            hasUrgent ? 'text-amber-500' : 'text-brand-text-muted'
          }`}
          aria-label={s.title}
          aria-haspopup="true"
          aria-expanded={sheetOpen}
        >
          <span className="relative flex justify-center">
            <Bell className={`w-5 h-5 ${hasUrgent ? 'animate-bell-ring' : ''}`} strokeWidth={2} />
            {hasUrgent && (
              <span className="absolute -top-1.5 -right-3 min-w-[15px] h-[15px] px-0.5 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </span>
          <span className="text-[10px] font-bold">{s.title}</span>
        </button>

        {sheetOpen &&
          createPortal(
            <div className="sm:hidden fixed inset-0 z-[200] flex items-end">
              <div
                className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-sheet-backdrop-in"
                onClick={closePanel}
              />
              <div
                className="relative w-full max-h-[75vh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-sheet-slide-up pb-[env(safe-area-inset-bottom)]"
                onClick={(e) => e.stopPropagation()}
              >
                {panelContent}
              </div>
            </div>,
            document.body,
          )}
      </>
    );
  }

  return (
    <div className="relative">
      {/* Icon (40px circle) with the label below it, matching the rest of the header nav. */}
      <button
        ref={menu.buttonRef}
        onClick={() => menu.setOpen((v) => !v)}
        className={`flex h-16 min-w-10 flex-col items-center justify-center gap-1.5 transition-colors group cursor-pointer bg-transparent border-none ${
          hasUrgent ? 'text-amber-500' : 'text-brand-text-muted hover:text-emerald-600'
        }`}
        title={s.title}
        aria-label={s.title}
        aria-haspopup="true"
        aria-expanded={menu.open}
      >
        <span
          className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 group-hover:bg-amber-50 group-hover:scale-110 group-active:scale-95 ${
            menu.open ? 'bg-amber-50 text-amber-600' : ''
          }`}
        >
          <Bell
            className={`w-6 h-6 stroke-[2px] transition-colors ${
              hasUrgent ? 'text-amber-500 animate-bell-ring' : 'group-hover:stroke-amber-500'
            }`}
          />
          {hasUrgent && (
            <span className="absolute -top-0.5 right-0 flex items-center justify-center">
              {/* Pulsing halo behind the count for extra pull toward the seat shortage. */}
              <span className="absolute inline-flex w-5 h-5 rounded-full bg-amber-400 opacity-60 animate-ping" />
              <span className="relative min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center shadow-sm">
                {count}
              </span>
            </span>
          )}
        </span>
        <span className="text-[11px] font-semibold leading-none whitespace-nowrap">{s.navLabel}</span>
      </button>

      {menu.hasOpenedOnce && menu.coords &&
        createPortal(
          <div
            ref={menu.panelRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              top: menu.coords.top + 6,
              left: menu.coords.left,
              width: menu.coords.width,
              maxHeight: menu.panelVisible ? '70vh' : 0,
            }}
            className={`fixed z-50 bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] flex flex-col ${
              menu.panelVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {panelContent}
          </div>,
          document.body,
        )}
    </div>
  );
}
