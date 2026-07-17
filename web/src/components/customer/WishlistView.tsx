'use client';
import React from 'react';
import { Tour } from '../../types';
import { Heart, MapPin, Scale } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedTourName } from '../../i18n/tourLocalization';

interface WishlistViewProps {
  wishlistTours: Tour[];
  onBack: () => void;
  onSelectTour: (tour: Tour) => void;
  onToggleWishlist: (tourId: string, e?: React.MouseEvent) => void;
  compareList: string[];
  onToggleCompare: (tourId: string, e?: React.MouseEvent) => void;
}

export function WishlistView({ wishlistTours, onBack, onSelectTour, onToggleWishlist, compareList, onToggleCompare }: WishlistViewProps) {
  const { t, language } = useLanguage();
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-extrabold text-label-primary flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-600 fill-rose-600" /> {t('customerHome.wishlistView.title')}
        </h2>
        <button
          type="button"
          onClick={onBack}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
        >
          ← {t('customerHome.wishlistView.backButton')}
        </button>
      </div>

      {wishlistTours.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-200">
          <Heart className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-sm text-slate-500 font-medium">{t('customerHome.wishlistView.emptyState')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlistTours.map(tour => (
            <div
              key={tour.id}
              onClick={() => onSelectTour(tour)}
              className="bg-white rounded-2xl border border-[#E4E6E9] overflow-hidden cursor-pointer hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] transition-all group"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                <img src={tour.image || undefined} className="w-full h-full object-cover group-hover:scale-102 transition duration-500" alt={getLocalizedTourName(tour, language)} referrerPolicy="no-referrer" />
                <div className="absolute top-2 right-2 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={(e) => onToggleCompare(tour.id, e)}
                    className={`p-1.5 rounded-full shadow-md transition cursor-pointer border-2 ${compareList.includes(tour.id) ? 'bg-amber-50 border-amber-500 hover:bg-amber-100' : 'bg-white/90 hover:bg-white border-transparent'}`}
                    title={compareList.includes(tour.id) ? t('customerHome.toursHomeView.compare.remove') : t('customerHome.toursHomeView.compare.add')}
                  >
                    <Scale className={`w-4 h-4 ${compareList.includes(tour.id) ? 'text-amber-600' : 'text-label-secondary'}`} />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => onToggleWishlist(tour.id, e)}
                    className="bg-white/90 hover:bg-white p-1.5 rounded-full shadow-md transition cursor-pointer"
                    title={t('customerHome.wishlistView.removeTitle')}
                  >
                    <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
                  </button>
                </div>
              </div>
              <div className="p-4 space-y-2">
                <h4 className="text-[16px] font-bold leading-[1.4] text-label-primary truncate">{getLocalizedTourName(tour, language)}</h4>
                <p className="text-[14px] font-normal text-label-secondary flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" /> {tour.region}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}