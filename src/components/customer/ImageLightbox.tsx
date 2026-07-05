import React from 'react';
import { Tour } from '../../types';
import { X, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface ImageLightboxProps {
  tour: Tour | null;
  lightboxIndex: number | null;
  onSetLightboxIndex: (updater: number | null | ((prev: number | null) => number | null)) => void;
}

export function ImageLightbox({ tour, lightboxIndex, onSetLightboxIndex }: ImageLightboxProps) {
  const { t } = useLanguage();
  if (!tour || lightboxIndex === null) return null;

  const allMedia: {type: 'image' | 'video', url: string}[] = [];
  if (tour.image) {
    allMedia.push({ type: 'image', url: tour.image });
  }
  if (tour.images && tour.images.length > 0) {
    tour.images.filter(Boolean).forEach(img => {
      allMedia.push({ type: 'image', url: img });
    });
  }
  if (tour.videos && tour.videos.length > 0) {
    tour.videos.filter(Boolean).forEach(vid => {
      allMedia.push({ type: 'video', url: vid });
    });
  }

  const currentMedia = allMedia[lightboxIndex];
  if (!currentMedia) return null;

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onSetLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : allMedia.length - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onSetLightboxIndex(prev => (prev !== null && prev < allMedia.length - 1 ? prev + 1 : 0));
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col justify-between p-4 md:p-8 select-none"
      onClick={() => onSetLightboxIndex(null)}
    >
      {/* Lightbox Header Controls */}
      <div className="flex items-center justify-between text-white w-full max-w-5xl mx-auto z-10 p-2">
        <div className="flex flex-col">
          <span className="text-xs text-slate-400 font-semibold tracking-wider font-mono">{t('customerHome.imageLightbox.galleryLabel', { current: lightboxIndex + 1, total: allMedia.length })}</span>
          <span className="text-sm font-bold truncate max-w-[200px] xs:max-w-xs">{tour.name}</span>
        </div>
        <button
          type="button"
          className="w-11 h-11 bg-slate-800 hover:bg-slate-700 text-white rounded-full shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center border border-white/10"
          onClick={(e) => {
            e.stopPropagation();
            onSetLightboxIndex(null);
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
            className="absolute left-2 md:left-4 z-10 w-11 h-11 bg-black/60 hover:bg-black text-white rounded-full hover:scale-110 active:scale-95 transition-all border border-white/10 cursor-pointer flex items-center justify-center"
          >
            <ChevronLeft className="w-5 h-5" />
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
              alt={t('customerHome.imageLightbox.fullViewAlt', { index: lightboxIndex })}
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
            className="absolute right-2 md:right-4 z-10 w-11 h-11 bg-black/60 hover:bg-black text-white rounded-full hover:scale-110 active:scale-95 transition-all border border-white/10 cursor-pointer flex items-center justify-center"
          >
            <ChevronRight className="w-5 h-5" />
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
              onClick={() => onSetLightboxIndex(i)}
              className={`relative h-10 w-16 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all cursor-pointer ${
                lightboxIndex === i
                  ? 'border-emerald-500 scale-105 shadow-md ring-2 ring-emerald-500/30'
                  : 'border-white/10 opacity-65 hover:opacity-100'
              }`}
            >
              {m.type === 'image' ? (
                <img src={m.url || undefined} alt={t('customerHome.imageLightbox.thumbAlt', { index: i })} className="w-full h-full object-cover" />
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
}
