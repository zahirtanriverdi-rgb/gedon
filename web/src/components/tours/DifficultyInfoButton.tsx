'use client';
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

type StandardKey = 'easy' | 'medium' | 'hard' | 'extreme';
type ActiveKey = 'beginner' | 'medium' | 'professional';

interface DifficultyInfoButtonProps {
  scale: 'standard' | 'active';
  activeKey: StandardKey | ActiveKey;
}

const STANDARD_ORDER: StandardKey[] = ['easy', 'medium', 'hard', 'extreme'];
const ACTIVE_ORDER: ActiveKey[] = ['beginner', 'medium', 'professional'];
const STANDARD_DOT: Record<StandardKey, string> = {
  easy: 'bg-emerald-500',
  medium: 'bg-sky-500',
  hard: 'bg-rose-500',
  extreme: 'bg-red-700',
};
const ACTIVE_DOT: Record<ActiveKey, string> = {
  beginner: 'bg-emerald-500',
  medium: 'bg-sky-500',
  professional: 'bg-rose-500',
};

// Small "ⓘ" trigger that explains what the difficulty bar/label actually mean — without it,
// a lone "Orta" label next to a colored bar gives no sense of where that sits relative to the
// other levels. Rendered via a portal so the popover isn't clipped by the tour card's
// `overflow-hidden` (needed for the rounded cover image corners).
export const DifficultyInfoButton: React.FC<DifficultyInfoButtonProps> = ({ scale, activeKey }) => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;
      const panelWidth = 220;
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - panelWidth - 8);
      setCoords({ top: rect.bottom + 6, left });
    };
    reposition();
    const handleOutside = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || buttonRef.current?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const order = scale === 'active' ? ACTIVE_ORDER : STANDARD_ORDER;
  const dotClass = scale === 'active' ? ACTIVE_DOT : STANDARD_DOT;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        aria-label={t('miscWidgets.tourRouteStatsCard.difficultyInfo.buttonLabel')}
        className="text-label-tertiary hover:text-label-secondary transition-colors shrink-0"
      >
        <Info className="w-3 h-3" />
      </button>
      {open && coords && createPortal(
        <div
          ref={panelRef}
          onClick={(e) => e.stopPropagation()}
          style={{ top: coords.top, left: coords.left, width: 220 }}
          className="fixed z-[1000] bg-white rounded-xl border border-slate-200 shadow-lg p-3 text-xs"
        >
          <p className="font-extrabold text-label-primary mb-2">{t('miscWidgets.tourRouteStatsCard.difficultyInfo.title')}</p>
          <div className="flex flex-col gap-1.5">
            {order.map((key) => (
              <div key={key} className={`flex items-start gap-1.5 ${key === activeKey ? 'font-bold text-label-primary' : 'text-label-secondary'}`}>
                <span className={`w-2 h-2 rounded-full mt-0.5 shrink-0 ${dotClass[key as keyof typeof dotClass]}`} />
                <span className="leading-snug">
                  {t(`miscWidgets.tourRouteStatsCard.difficultyInfo.${scale}.${key}`)}
                </span>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};