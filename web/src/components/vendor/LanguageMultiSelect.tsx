'use client';
import React, { useRef, useState } from 'react';
import { X } from 'lucide-react';

interface LanguageMultiSelectProps {
  value: string[];
  onChange: (value: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  error?: boolean;
}

// Axtarışlı, çoxlu-seçimli combobox: yazdıqca siyahı filtrlənir, seçilən dillər
// inputun içində silinə bilən "chip" kimi görünür. Siyahıda olmayan bir dil də
// yazılıb Enter ilə əlavə oluna bilər (məs. nadir dillər üçün).
export function LanguageMultiSelect({ value, onChange, suggestions, placeholder, error }: LanguageMultiSelectProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const blurTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filtered = suggestions.filter(
    (s) => !value.includes(s) && s.toLowerCase().includes(query.trim().toLowerCase())
  );

  const addValue = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setQuery('');
  };

  const removeValue = (v: string) => onChange(value.filter((item) => item !== v));

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (query.trim()) addValue(filtered.length > 0 ? filtered[0] : query);
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      removeValue(value[value.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div
        className={`flex flex-wrap items-center gap-1.5 w-full px-3 py-2 bg-white border rounded-lg min-h-[42px] focus-within:ring-2 focus-within:ring-emerald-100 focus-within:border-emerald-500 transition ${
          error ? 'border-red-400' : 'border-gray-200'
        }`}
      >
        {value.map((lang) => (
          <span
            key={lang}
            className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full pl-2.5 pr-1 py-0.5 text-[11px] font-semibold"
          >
            {lang}
            <button
              type="button"
              onClick={() => removeValue(lang)}
              className="hover:bg-emerald-200/60 rounded-full p-0.5 transition"
              aria-label={`${lang} sil`}
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => { setOpen(true); if (blurTimeout.current) clearTimeout(blurTimeout.current); }}
          onBlur={() => { blurTimeout.current = setTimeout(() => setOpen(false), 120); }}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          className="flex-1 min-w-[100px] outline-none bg-transparent text-xs text-gray-800 placeholder-gray-400 py-0.5"
        />
      </div>

      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-auto">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addValue(s)}
              className="w-full text-left px-3 py-2 text-xs text-gray-700 hover:bg-emerald-50 transition"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
