import { useState } from 'react';
import { X } from 'lucide-react';

interface DynamicStringListInputProps {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
  accent?: 'emerald' | 'red';
  error?: boolean;
}

// Clickable add/remove list of free-text strings — used for "Qiymətə daxildir" /
// "Qiymətə daxil deyil" on both the domestic and international tour forms.
export function DynamicStringListInput({ label, items, onChange, placeholder, accent = 'emerald', error }: DynamicStringListInputProps) {
  const [draft, setDraft] = useState('');

  const addItem = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setDraft('');
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const isRed = accent === 'red';

  return (
    <div>
      <label className={`block text-xs font-bold mb-1 ${isRed ? 'text-red-800' : 'text-emerald-800'}`}>{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addItem();
            }
          }}
          placeholder={placeholder}
          className={`flex-1 px-3 py-1.5 border rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-700 ${error ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
        />
        <button
          type="button"
          onClick={addItem}
          className={`px-3 py-1.5 text-white font-bold text-xs rounded-lg transition ${isRed ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}
        >
          Əlavə et
        </button>
      </div>
      {items.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {items.map((item, idx) => (
            <span
              key={idx}
              className={`inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold border rounded-sm ${
                isRed ? 'bg-red-50 text-red-800 border-red-150' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
              }`}
            >
              {item}
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-red-500 hover:text-red-700 font-extrabold ml-1 cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className={`text-[10px] italic mt-1.5 ${error ? 'text-red-600 font-semibold not-italic' : 'text-slate-400'}`}>
          {error ? '⚠️ Ən azı 1 maddə əlavə edin.' : 'Hələ heç bir maddə əlavə edilməyib.'}
        </p>
      )}
    </div>
  );
}
