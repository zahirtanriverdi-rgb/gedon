'use client';
import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

interface TagPillInputProps {
  label?: string;
  items: string[];
  onChange: (items: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  accent?: 'emerald' | 'red';
  error?: boolean;
}

// Təklif kartları (klikləyəndə aktiv/deaktiv olur) + yığcam "yaz və Enter/+ ilə əlavə et"
// sahəsi. Əvvəlki versiyada eyni seçim həm pill kimi, həm də aşağıdakı tam siyahıda iki
// dəfə göstərilirdi və ayrıca böyük "Əlavə et" düyməsi var idi — bu versiya təkrarı aradan
// qaldırır: yalnız siyahıda olmayan (əl ilə yazılan) maddələr ayrıca chip kimi görünür.
export function TagPillInput({ label, items, onChange, suggestions, placeholder, accent = 'emerald', error }: TagPillInputProps) {
  const [draft, setDraft] = useState('');

  const activeClasses = accent === 'red' ? 'bg-red-600 border-red-600 text-white' : 'bg-emerald-600 border-emerald-600 text-white';
  const chipClasses = accent === 'red' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200';
  const chipHoverClasses = accent === 'red' ? 'hover:bg-red-200/60' : 'hover:bg-emerald-200/60';

  const toggleSuggestion = (item: string) => {
    onChange(items.includes(item) ? items.filter((i) => i !== item) : [...items, item]);
  };

  const addDraft = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (!items.includes(trimmed)) onChange([...items, trimmed]);
    setDraft('');
  };

  const removeItem = (item: string) => onChange(items.filter((i) => i !== item));

  const customItems = items.filter((i) => !suggestions.includes(i));

  return (
    <div>
      {label && <label className="block text-xs font-medium text-gray-700 mb-1.5">{label}</label>}

      <div className="flex flex-wrap gap-2 mb-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => toggleSuggestion(s)}
            className={`text-[11px] px-2.5 py-1 rounded-full border transition ${items.includes(s) ? activeClasses : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'}`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className={`flex items-center gap-1 w-full px-2 py-1.5 bg-white border rounded-lg focus-within:ring-2 focus-within:ring-emerald-100 focus-within:border-emerald-500 transition ${error ? 'border-red-400' : 'border-gray-200'}`}>
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addDraft(); } }}
          placeholder={placeholder}
          className="flex-1 min-w-0 px-1.5 py-1 text-xs outline-none bg-transparent text-gray-800 placeholder-gray-400"
        />
        <button
          type="button"
          onClick={addDraft}
          disabled={!draft.trim()}
          className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md text-emerald-700 hover:bg-emerald-50 disabled:opacity-30 disabled:hover:bg-transparent transition"
          aria-label="Əlavə et"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {customItems.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {customItems.map((item) => (
            <span key={item} className={`inline-flex items-center gap-1 rounded-full pl-2.5 pr-1 py-0.5 text-[11px] font-semibold border ${chipClasses}`}>
              {item}
              <button type="button" onClick={() => removeItem(item)} className={`rounded-full p-0.5 transition ${chipHoverClasses}`} aria-label={`${item} sil`}>
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
