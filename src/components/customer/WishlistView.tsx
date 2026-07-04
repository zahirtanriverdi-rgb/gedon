import React from 'react';
import { Tour } from '../../types';
import { Heart, MapPin } from 'lucide-react';

interface WishlistViewProps {
  wishlistTours: Tour[];
  onBack: () => void;
  onSelectTour: (tour: Tour) => void;
  onToggleWishlist: (tourId: string, e?: React.MouseEvent) => void;
}

export function WishlistView({ wishlistTours, onBack, onSelectTour, onToggleWishlist }: WishlistViewProps) {
  return (
    <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-extrabold text-label-primary flex items-center gap-2">
          <Heart className="w-5 h-5 text-rose-600 fill-rose-600" /> İstəklərim
        </h2>
        <button
          type="button"
          onClick={onBack}
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {wishlistTours.map(tour => (
            <div
              key={tour.id}
              onClick={() => onSelectTour(tour)}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all group"
            >
              <div className="relative h-40">
                <img src={tour.image || undefined} className="w-full h-full object-cover" alt={tour.name} referrerPolicy="no-referrer" />
                <button
                  type="button"
                  onClick={(e) => onToggleWishlist(tour.id, e)}
                  className="absolute top-2 right-2 bg-white/90 hover:bg-white p-1.5 rounded-full shadow-md transition cursor-pointer"
                  title="İstəklərdən çıxar"
                >
                  <Heart className="w-4 h-4 fill-rose-600 text-rose-600" />
                </button>
              </div>
              <div className="p-4 space-y-1">
                <h4 className="font-bold text-sm text-label-primary truncate">{tour.name}</h4>
                <p className="text-xs text-label-secondary flex items-center gap-1">
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
