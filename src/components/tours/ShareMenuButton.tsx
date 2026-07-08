import React from 'react';
import { createPortal } from 'react-dom';
import { Share2, X, Link2 } from 'lucide-react';
import { Tour, TourSlot } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { useExpandingMenu } from '../../hooks/useExpandingMenu';

interface ShareMenuButtonProps {
  tour: Tour;
  slots: TourSlot[];
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error' | 'warning') => void;
  buttonClassName: string;
  iconClassName?: string;
  showLabel?: boolean;
  // Grid cards wrap this button inside a clickable tour card — opening the menu must not
  // also trigger the card's own onClick (which navigates to the tour detail page).
  stopPropagationOnOpen?: boolean;
}

// Bootstrap Icons "whatsapp" glyph — lucide-react has no WhatsApp brand icon, so this is an
// inline SVG using the same currentColor convention as the rest of the icon set.
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className={className}>
    <path d="M13.601 2.326A7.85 7.85 0 0 0 7.994 0C3.627 0 .068 3.558.064 7.926c0 1.399.366 2.76 1.057 3.965L0 16l4.204-1.102a7.9 7.9 0 0 0 3.79.965h.004c4.368 0 7.926-3.558 7.93-7.93A7.9 7.9 0 0 0 13.6 2.326zM7.994 14.521a6.6 6.6 0 0 1-3.356-.92l-.24-.144-2.494.654.666-2.433-.156-.251a6.56 6.56 0 0 1-1.007-3.505c0-3.626 2.957-6.584 6.591-6.584a6.56 6.56 0 0 1 4.66 1.931 6.56 6.56 0 0 1 1.928 4.66c-.004 3.639-2.961 6.592-6.592 6.592m3.615-4.934c-.197-.099-1.17-.578-1.353-.646-.182-.065-.315-.099-.445.099-.133.197-.513.646-.627.775-.114.133-.232.148-.43.05-.197-.1-.836-.308-1.592-.985-.59-.525-.985-1.175-1.103-1.372-.114-.198-.011-.304.088-.403.087-.088.197-.232.296-.346.1-.114.133-.198.198-.33.065-.134.034-.248-.015-.347-.05-.099-.445-1.076-.612-1.47-.16-.389-.323-.335-.445-.34-.114-.007-.247-.007-.38-.007a.73.73 0 0 0-.529.247c-.182.198-.691.677-.691 1.654s.71 1.916.81 2.049c.098.133 1.394 2.132 3.383 2.992.47.205.84.326 1.129.418.475.152.904.129 1.246.08.38-.058 1.171-.48 1.338-.943.164-.464.164-.86.114-.943-.049-.084-.182-.133-.38-.232" />
  </svg>
);

// Builds the same share text every target (WhatsApp/copy) sends, so the message a customer
// receives is never just a bare URL — see the tour name/price/region template below.
function buildShareText(tour: Tour, slots: TourSlot[], t: (key: string, vars?: Record<string, any>) => string) {
  const tourSlots = slots.filter((s) => s.tourId === tour.id);
  const minPrice = tourSlots.length > 0 ? Math.min(...tourSlots.map((s) => s.price)) : 25;
  const shareUrl = window.location.origin;
  const categoryLabel = tour.category === 'hiking' ? 'Yurus / Hiking' : tour.category === 'camp' ? 'Kamp' : 'Zirve';
  const text = t('customerMisc.customerPortal.shareTourTemplate', {
    tourName: tour.name,
    region: tour.region,
    durationDays: tour.durationDays,
    minPrice,
    category: categoryLabel,
    vendorName: tour.vendorName,
    descriptionExcerpt: tour.description.slice(0, 180),
    shareUrl,
  });
  return { text, shareUrl };
}

// Replaces the old "click share -> jump straight to WhatsApp (or the OS share sheet)" behavior.
// The dropdown is sized to exactly match the trigger button's own width and sits flush beneath
// it (no gap, flat touching corners) so the two read as one continuous, merged shape — the
// trigger's icon swaps to an X while it's open, like a lid folding open. WhatsApp gets its own
// fully-built deep link instead of relying on the Web Share API, which would sometimes hand
// WhatsApp just the bare `url` and drop the `text`.
export const ShareMenuButton: React.FC<ShareMenuButtonProps> = ({
  tour,
  slots,
  onShowNotification,
  buttonClassName,
  iconClassName = 'w-3.5 h-3.5',
  showLabel = false,
  stopPropagationOnOpen = false,
}) => {
  const { t } = useLanguage();
  const { open, setOpen, hasOpenedOnce, panelVisible, expandedHeight, coords, buttonRef, panelRef } = useExpandingMenu();

  const runAndClose = (fn: () => void) => { fn(); setOpen(false); };

  const shareToWhatsApp = () => {
    const { text } = buildShareText(tour, slots, t);
    // The WhatsApp Desktop app's link handler only reliably keeps the bare URL out of a long
    // `text` param and drops the rest of the message — copying to the clipboard first means the
    // full text is always one paste away even when that happens.
    navigator.clipboard.writeText(text).catch(() => {});
    onShowNotification?.(t('customerMisc.customerPortal.shareMenu.whatsappCopiedNotification'), 'success');
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };
  const copyLink = () => {
    const { text } = buildShareText(tour, slots, t);
    const notify = () => onShowNotification?.(t('customerMisc.customerPortal.shareMenu.copiedNotification'), 'success');
    navigator.clipboard.writeText(text).then(notify).catch(notify);
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => {
          if (stopPropagationOnOpen) e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={`${buttonClassName} ${open ? 'rounded-b-none' : ''} relative z-[1001]`}
        title={t('customerHome.toursHomeView.shareTitle')}
      >
        <span className={`relative inline-block ${iconClassName}`}>
          <Share2
            className={`absolute inset-0 w-full h-full transition-all duration-300 ease-out ${
              open ? 'opacity-0 rotate-90 scale-50' : 'opacity-100 rotate-0 scale-100'
            }`}
          />
          <X
            className={`absolute inset-0 w-full h-full transition-all duration-300 ease-out ${
              open ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-50'
            }`}
          />
        </span>
        {showLabel && t('tourDetailPage.header.share')}
      </button>
      {hasOpenedOnce && coords && createPortal(
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{
            top: coords.top,
            left: coords.left,
            width: coords.width,
            maxHeight: panelVisible ? expandedHeight : 0,
          }}
          className={`fixed z-[1000] bg-white border border-t-0 border-slate-200 shadow-lg rounded-b-2xl overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            panelVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <div className="py-1 flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => runAndClose(shareToWhatsApp)}
              title="WhatsApp"
              className="group w-9 h-9 rounded-full flex items-center justify-center bg-transparent hover:bg-[#25D366]/10 active:bg-[#25D366]/20 transition-colors shrink-0"
            >
              <WhatsAppIcon className="w-4 h-4 text-[#25D366] transition-transform duration-150 group-hover:scale-125 group-active:scale-100" />
            </button>
            <div className="h-px w-5 bg-slate-200 shrink-0" />
            <button
              type="button"
              onClick={() => runAndClose(copyLink)}
              title={t('customerMisc.customerPortal.shareMenu.copyLink')}
              className="group w-9 h-9 rounded-full flex items-center justify-center bg-transparent hover:bg-sky-50 active:bg-sky-100 transition-colors shrink-0"
            >
              <Link2 className="w-4 h-4 text-label-tertiary transition-transform duration-150 group-hover:scale-125 group-hover:text-sky-600 group-active:scale-100" />
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
