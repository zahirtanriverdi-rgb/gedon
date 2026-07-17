'use client';
import React from 'react';
import { Tour } from '../../types';
import { useLanguage } from '../../i18n/LanguageContext';
import { getLocalizedTourName } from '../../i18n/tourLocalization';

interface CompareSwapModalProps {
  currentTours: Tour[];
  onSelectReplace: (tourIdToRemove: string) => void;
  onCancel: () => void;
}

// Shown when the customer tries to add a 4th tour to compare while 3 are already selected —
// lets them pick which of the existing 3 to swap out instead of silently dropping one.
export function CompareSwapModal({ currentTours, onSelectReplace, onCancel }: CompareSwapModalProps) {
  const { t, language } = useLanguage();
  return (
    <div
      className="fixed inset-0 z-[1100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center px-4"
      onClick={onCancel}
    >
      <div
        className="bg-white w-full max-w-sm rounded-2xl shadow-2xl p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-1">
          <h3 className="text-base font-extrabold text-label-primary">{t('customerHome.compareView.swapModal.title')}</h3>
          <p className="text-xs text-label-secondary">{t('customerHome.compareView.swapModal.subtitle')}</p>
        </div>
        <div className="space-y-2">
          {currentTours.map(tour => (
            <button
              key={tour.id}
              type="button"
              onClick={() => onSelectReplace(tour.id)}
              className="w-full flex items-center gap-3 p-2 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition cursor-pointer text-left"
            >
              <img
                src={tour.image || undefined}
                className="w-12 h-12 rounded-lg object-cover flex-shrink-0 bg-slate-100"
                alt=""
                referrerPolicy="no-referrer"
              />
              <span className="text-sm font-bold text-label-primary truncate">{getLocalizedTourName(tour, language)}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-center text-xs font-bold text-label-tertiary hover:text-label-secondary py-1 cursor-pointer"
        >
          {t('customerHome.compareView.swapModal.cancel')}
        </button>
      </div>
    </div>
  );
}