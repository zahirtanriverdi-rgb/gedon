'use client';
import React, { useRef, useState, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { AZ_MONTH_LABELS, AZ_WEEKDAY_LABELS, buildMonthGrid, buildTimeOptions, isSameDay, toIsoDate } from './calendarCore';

const TIME_OPTIONS = buildTimeOptions(30);

interface DateTimeFieldProps {
  label: string;
  value: string; // 'YYYY-MM-DDTHH:mm' — datetime-local ilə uyğun format, boş ola bilər
  onChange: (value: string) => void;
  error?: boolean;
}

function parseValue(value: string): { date: Date | null; time: string } {
  if (!value) return { date: null, time: '' };
  const [datePart, timePart] = value.split('T');
  if (!datePart) return { date: null, time: '' };
  const [y, m, d] = datePart.split('-').map(Number);
  if (!y || !m || !d) return { date: null, time: timePart || '' };
  return { date: new Date(y, m - 1, d), time: timePart || '' };
}

function combine(date: Date | null, time: string): string {
  if (!date) return '';
  return `${toIsoDate(date)}T${time || '09:00'}`;
}

// Tək tarix + saat seçimi: təmiz DatePicker (Bazar ertəsi başlanğıclı, həftəsonu
// vurğulanmış təqvim) və yanında açılan saat siyahısı (30 dəqiqəlik addımlarla).
// dd/mm/yyyy əl ilə yazılan köhnə input-u əvəz edir; çıxış eyni "datetime-local"
// formatındadır ki, qalan kod (Date parse və s.) dəyişmədən işləsin.
export function DateTimeField({ label, value, onChange, error }: DateTimeFieldProps) {
  const { date, time } = parseValue(value);
  const [open, setOpen] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState((date || today).getFullYear());
  const [viewMonth, setViewMonth] = useState((date || today).getMonth());
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const cells = buildMonthGrid(viewYear, viewMonth);
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); } else { setViewMonth((m) => m - 1); }
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); } else { setViewMonth((m) => m + 1); }
  };

  const pickDate = (d: Date) => {
    onChange(combine(d, time));
    setOpen(false);
  };

  return (
    <div>
      <label className="block text-[11px] font-bold text-slate-400 tracking-wide mb-1">{label}</label>
      <div className={`flex items-stretch gap-1.5 ${error ? 'ring-1 ring-red-300 rounded-lg' : ''}`} ref={wrapperRef}>
        <div className="relative flex-1 min-w-0">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className={`w-full flex items-center gap-1.5 px-3 py-2 bg-slate-50 border rounded-lg text-xs font-semibold transition cursor-pointer ${
              open ? 'border-emerald-500 ring-1 ring-emerald-100' : 'border-slate-200 hover:border-slate-300'
            } ${date ? 'text-slate-800' : 'text-slate-400'}`}
          >
            <Calendar className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span className="truncate">{date ? toIsoDate(date) : 'Tarix seçin'}</span>
          </button>

          {open && (
            <div className="absolute z-30 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={goPrevMonth} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer">
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] font-extrabold text-slate-800">{AZ_MONTH_LABELS[viewMonth]} {viewYear}</span>
                <button type="button" onClick={goNextMonth} className="w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-500 cursor-pointer">
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-7 gap-0.5 mb-0.5">
                {AZ_WEEKDAY_LABELS.map((l, idx) => (
                  <div key={l} className={`text-center text-[9px] font-extrabold py-1 ${idx >= 5 ? 'text-red-500' : 'text-slate-400'}`}>{l}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map(({ date: d, inMonth, isWeekend }, idx) => {
                  const selected = date && isSameDay(d, date);
                  const isPast = d < startOfToday;
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={isPast}
                      onClick={() => pickDate(d)}
                      className={`aspect-square rounded-md text-[10px] font-bold flex items-center justify-center transition
                        ${!inMonth ? 'text-slate-300' : isWeekend ? 'text-red-600' : 'text-slate-700'}
                        ${isPast ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer hover:bg-emerald-50'}
                        ${selected ? 'bg-emerald-600 !text-white hover:bg-emerald-700' : isWeekend && inMonth ? 'bg-red-50/60' : ''}
                      `}
                    >
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="relative w-28 shrink-0">
          <Clock className="w-3.5 h-3.5 text-emerald-600 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={time}
            onChange={(e) => onChange(combine(date, e.target.value))}
            className="w-full pl-7 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 cursor-pointer appearance-none"
          >
            <option value="" disabled>--:--</option>
            {TIME_OPTIONS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
