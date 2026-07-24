'use client';
import React, { useRef, useState } from 'react';
import { MapPin, Link2, PenLine } from 'lucide-react';
import { useLanguage } from '../../i18n/LanguageContext';

interface MeetingPointOption {
  name: string;
  embedUrl?: string;
}

interface MeetingPointFieldProps {
  value: string;
  embedUrl: string;
  onChange: (value: string, embedUrl: string) => void;
  suggestions: MeetingPointOption[];
  error?: boolean;
}

const isMapLink = (text: string): boolean => /^https?:\/\/(maps\.app\.goo\.gl|(www\.)?google\.[a-z.]+\/maps|goo\.gl\/maps)/i.test(text.trim());

// Görüş yeri üçün 3-ü-1-də sahə: (1) MEETING_POINTS siyahısından axtarıb seçmək,
// (2) Google Maps linki yapışdırmaq (avtomatik aşkarlanır), (3) tamamilə azad mətnlə
// unikal ünvan yazmaq. Əvvəlki versiya yalnız sabit siyahıdan <select> icazə verirdi.
export function MeetingPointField({ value, embedUrl, onChange, suggestions, error }: MeetingPointFieldProps) {
  const { t } = useLanguage();
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = suggestions.filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));
  const matchedPreset = suggestions.find((s) => s.name === value);
  const badge = matchedPreset ? 'preset' : isMapLink(value) ? 'map' : value ? 'custom' : null;

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) { onChange('', ''); return; }
    const preset = suggestions.find((s) => s.name.toLowerCase() === trimmed.toLowerCase());
    if (preset) {
      onChange(preset.name, preset.embedUrl || '');
      setQuery(preset.name);
    } else if (isMapLink(trimmed)) {
      onChange(trimmed, trimmed);
      setQuery(trimmed);
    } else {
      onChange(trimmed, '');
      setQuery(trimmed);
    }
  };

  const pickSuggestion = (opt: MeetingPointOption) => {
    onChange(opt.name, opt.embedUrl || '');
    setQuery(opt.name);
    setOpen(false);
  };

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-1.5 w-full px-3 py-2 bg-slate-50 border rounded-lg focus-within:ring-2 focus-within:ring-emerald-100 focus-within:border-emerald-500 transition ${
          error ? 'border-red-400' : 'border-slate-200'
        }`}
      >
        <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); if (blurTimeout.current) clearTimeout(blurTimeout.current); }}
          onBlur={() => { blurTimeout.current = setTimeout(() => { commit(query); setOpen(false); }, 120); }}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(query); setOpen(false); } }}
          placeholder={t('vendorTourForms.tourForm.fields.meetingPoint.searchPlaceholder')}
          className="flex-1 min-w-0 outline-none bg-transparent text-xs text-slate-800 placeholder-slate-400 py-0.5"
        />
      </div>

      {badge && (
        <div className="mt-1">
          {badge === 'preset' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
              <MapPin className="w-2.5 h-2.5" /> {t('vendorTourForms.tourForm.fields.meetingPoint.presetBadge')}
            </span>
          )}
          {badge === 'map' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-sky-50 border border-sky-200 rounded-full px-2 py-0.5">
              <Link2 className="w-2.5 h-2.5" /> {t('vendorTourForms.tourForm.fields.meetingPoint.mapLinkDetected')}
            </span>
          )}
          {badge === 'custom' && (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 rounded-full px-2 py-0.5">
              <PenLine className="w-2.5 h-2.5" /> {t('vendorTourForms.tourForm.fields.meetingPoint.customBadge')}
            </span>
          )}
        </div>
      )}

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {filtered.map((opt) => (
            <button
              key={opt.name}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickSuggestion(opt)}
              className="w-full text-left px-3 py-2 text-xs text-slate-700 hover:bg-emerald-50 transition flex items-center gap-1.5"
            >
              <MapPin className="w-3 h-3 text-emerald-500 shrink-0" />
              {opt.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
