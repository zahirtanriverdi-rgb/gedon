import { DayPicker } from 'react-day-picker';
import 'react-day-picker/style.css';
import { X } from 'lucide-react';

interface MultiDateCalendarProps {
  selectedDates: Date[];
  onChange: (dates: Date[]) => void;
}

function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Lets an operator pick the concrete calendar days a tour runs on. Each selected date turns
// into one TourSlot on submit (see TourForm/InternationalTourForm's slot-diffing logic).
export function MultiDateCalendar({ selectedDates, onChange }: MultiDateCalendarProps) {
  const sorted = [...selectedDates].sort((a, b) => a.getTime() - b.getTime());

  return (
    <div className="space-y-3">
      <div className="bg-white border border-slate-200 rounded-xl p-3 inline-block" style={{ ['--rdp-accent-color' as any]: '#059669', ['--rdp-today-color' as any]: '#047857' }}>
        <DayPicker
          mode="multiple"
          selected={selectedDates}
          onSelect={(dates) => onChange(dates || [])}
          disabled={{ before: new Date() }}
          className="text-xs"
        />
      </div>

      {sorted.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {sorted.map((date) => (
            <span
              key={date.toISOString()}
              className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-200 rounded-md"
            >
              📅 {toIsoDate(date)}
              <button
                type="button"
                onClick={() => onChange(selectedDates.filter((d) => toIsoDate(d) !== toIsoDate(date)))}
                className="text-red-500 hover:text-red-700 ml-1 cursor-pointer"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-slate-400 italic">Hələ heç bir tarix seçilməyib — təqvimdən klikləyərək turun aktiv olacağı günləri seçin.</p>
      )}
    </div>
  );
}

export { toIsoDate };
