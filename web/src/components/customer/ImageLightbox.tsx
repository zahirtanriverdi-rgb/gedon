'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Tour } from '../../types';
import { X, ChevronLeft, ChevronRight, Play, Grid2X2, ImageOff } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedTourName } from '../../i18n/tourLocalization';

interface ImageLightboxProps {
  tour: Tour | null;
  lightboxIndex: number | null;
  onSetLightboxIndex: (updater: number | null | ((prev: number | null) => number | null)) => void;
}

type ViewMode = 'grid' | 'single';

// Fade edges of the horizontally-scrolling thumbnail strip so it visually
// signals "there's more to scroll" instead of cutting off abruptly.
const thumbFadeMask: React.CSSProperties = {
  WebkitMaskImage:
    'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
  maskImage:
    'linear-gradient(to right, transparent 0, black 24px, black calc(100% - 24px), transparent 100%)',
};

export function ImageLightbox({ tour, lightboxIndex, onSetLightboxIndex }: ImageLightboxProps) {
  const { t, language } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [loadedUrls, setLoadedUrls] = useState<Set<string>>(new Set());

  const markLoaded = useCallback((url: string) => {
    setLoadedUrls(prev => (prev.has(url) ? prev : new Set(prev).add(url)));
  }, []);

  // Build media array (memoized so it doesn't create a new reference every render)
  const allMedia = useMemo(() => {
    const media: { type: 'image' | 'video'; url: string }[] = [];
    if (tour?.image) {
      media.push({ type: 'image', url: tour.image });
    }
    if (tour?.images && tour.images.length > 0) {
      tour.images.filter(Boolean).forEach(img => {
        media.push({ type: 'image', url: img });
      });
    }
    if (tour?.videos && tour.videos.length > 0) {
      tour.videos.filter(Boolean).forEach(vid => {
        media.push({ type: 'video', url: vid });
      });
    }
    return media;
  }, [tour]);

  // Reset to grid view ONLY when the lightbox transitions from closed -> open,
  // not every time lightboxIndex changes (e.g. via next/prev navigation).
  const prevIndexRef = useRef<number | null>(null);
  useEffect(() => {
    const wasClosed = prevIndexRef.current === null;
    if (lightboxIndex !== null && wasClosed) {
      setViewMode('grid');
    }
    prevIndexRef.current = lightboxIndex;
  }, [lightboxIndex]);

  const handlePrev = useCallback(() => {
    onSetLightboxIndex(prev => (prev !== null && prev > 0 ? prev - 1 : allMedia.length - 1));
  }, [allMedia.length, onSetLightboxIndex]);

  const handleNext = useCallback(() => {
    onSetLightboxIndex(prev => (prev !== null && prev < allMedia.length - 1 ? prev + 1 : 0));
  }, [allMedia.length, onSetLightboxIndex]);

  const handleClose = useCallback(() => {
    onSetLightboxIndex(null);
  }, [onSetLightboxIndex]);

  // Keyboard navigation — only meaningful in single view; Escape always closes.
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      } else if (viewMode === 'single' && e.key === 'ArrowLeft') {
        handlePrev();
      } else if (viewMode === 'single' && e.key === 'ArrowRight') {
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, viewMode, handleClose, handlePrev, handleNext]);

  const handleImageClick = (index: number) => {
    onSetLightboxIndex(index);
    setViewMode('single');
  };

  const handleGridReturn = () => {
    setViewMode('grid');
  };

  if (!tour || lightboxIndex === null) return null;

  const currentMedia = allMedia[lightboxIndex];
  if (!currentMedia && viewMode === 'single') return null;

  const iconButtonClass =
    'w-11 h-11 bg-white/10 hover:bg-white/20 text-white rounded-full shadow-lg backdrop-blur-md border border-white/15 transition-all active:scale-95 motion-reduce:transition-none cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950';

  return (
    <div
      className="fixed inset-0 z-[100] bg-neutral-950/98 backdrop-blur-sm flex flex-col select-none animate-fadeIn"
      onClick={handleClose}
    >
      {/* Header - sadəcə düymələr, yazı yoxdur */}
      <div className="flex items-center justify-end w-full max-w-7xl mx-auto z-10 p-4 md:p-6">
        <div className="flex items-center gap-2">
          {/* Grid return button (only in single mode) */}
          {viewMode === 'single' && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleGridReturn();
              }}
              className={iconButtonClass}
              aria-label="Grid görünüşünə qayıt"
            >
              <Grid2X2 className="w-5 h-5" />
            </button>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className={iconButtonClass}
            aria-label="Bağla"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex items-center justify-center relative w-full max-w-7xl mx-auto overflow-hidden px-4 md:px-8">
        {allMedia.length === 0 ? (
          /* EMPTY STATE */
          <div className="flex flex-col items-center gap-3 text-white/50">
            <ImageOff className="w-10 h-10" strokeWidth={1.5} />
            <p className="text-sm">Media tapılmadı</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="w-full max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent pb-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              {allMedia.map((media, index) => (
                <div
                  key={index}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleImageClick(index);
                    }
                  }}
                  className="relative aspect-square rounded-2xl overflow-hidden cursor-pointer group bg-neutral-900 ring-1 ring-white/5 hover:ring-2 hover:ring-emerald-400 transition-all duration-300 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageClick(index);
                  }}
                >
                  {media.type === 'image' ? (
                    <img
                      src={media.url}
                      alt={`${getLocalizedTourName(tour, language)} - ${index + 1}`}
                      className={`w-full h-full object-cover transition-all duration-500 motion-reduce:transition-none group-hover:scale-[1.03] ${
                        loadedUrls.has(media.url) ? 'opacity-100 blur-0 scale-100' : 'opacity-0 blur-md scale-105'
                      }`}
                      referrerPolicy="no-referrer"
                      loading="lazy"
                      onLoad={() => markLoaded(media.url)}
                    />
                  ) : (
                    <>
                      <video
                        src={media.url}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 motion-reduce:transition-none"
                        muted
                        playsInline
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/5 to-transparent pointer-events-none" />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-14 h-14 rounded-full bg-white/95 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform duration-300 motion-reduce:transition-none">
                          <Play className="w-7 h-7 text-neutral-900 ml-0.5" fill="currentColor" />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* SINGLE VIEW */
          <>
            {/* Counter */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/10 text-white/90 px-3.5 py-1.5 rounded-full text-xs font-medium tracking-wide tabular-nums z-10">
              {lightboxIndex + 1} / {allMedia.length}
            </div>

            {/* Prev Button */}
            {allMedia.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrev();
                }}
                className={`absolute left-2 md:left-6 z-10 ${iconButtonClass} w-12 h-12 hover:scale-110`}
                aria-label="Əvvəlki"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* Main Media */}
            <div
              key={lightboxIndex}
              className="relative max-h-[75vh] max-w-full flex items-center justify-center animate-fadeIn"
              onClick={(e) => e.stopPropagation()}
            >
              {currentMedia.type === 'image' ? (
                <img
                  src={currentMedia.url}
                  alt={`${getLocalizedTourName(tour, language)} - ${lightboxIndex + 1}`}
                  className={`max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl shadow-black/50 transition-opacity duration-300 motion-reduce:transition-none ${
                    loadedUrls.has(currentMedia.url) ? 'opacity-100' : 'opacity-0'
                  }`}
                  referrerPolicy="no-referrer"
                  onLoad={() => markLoaded(currentMedia.url)}
                />
              ) : (
                <div className="relative max-h-[75vh] rounded-xl overflow-hidden shadow-2xl shadow-black/50 bg-black flex items-center justify-center">
                  <video
                    src={currentMedia.url}
                    className="max-h-[75vh] max-w-full object-contain"
                    controls
                    autoPlay
                    playsInline
                  />
                </div>
              )}
            </div>

            {/* Next Button */}
            {allMedia.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNext();
                }}
                className={`absolute right-2 md:right-6 z-10 ${iconButtonClass} w-12 h-12 hover:scale-110`}
                aria-label="Növbəti"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Thumbnail Strip (only in single mode) */}
      {viewMode === 'single' && allMedia.length > 1 && (
        <div
          className="w-full max-w-4xl mx-auto flex gap-2 overflow-x-auto py-4 px-6 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shrink-0 justify-start sm:justify-center scrollbar-thin scrollbar-thumb-white/15 scrollbar-track-transparent z-10 mb-4 md:mb-6"
          style={thumbFadeMask}
          onClick={(e) => e.stopPropagation()}
        >
          {allMedia.map((media, index) => (
            <button
              key={index}
              type="button"
              onClick={() => {
                onSetLightboxIndex(index);
              }}
              aria-label={`${index + 1}-ci media`}
              aria-current={lightboxIndex === index}
              className={`relative h-12 w-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-all duration-200 motion-reduce:transition-none cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 ${
                lightboxIndex === index
                  ? 'border-emerald-400 scale-105 shadow-lg shadow-emerald-500/20'
                  : 'border-white/10 opacity-50 hover:opacity-90'
              }`}
            >
              {media.type === 'image' ? (
                <img
                  src={media.url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-neutral-950 flex items-center justify-center relative">
                  <video src={media.url} className="w-full h-full object-cover opacity-60" muted playsInline />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <Play className="w-4 h-4 text-white fill-white" />
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