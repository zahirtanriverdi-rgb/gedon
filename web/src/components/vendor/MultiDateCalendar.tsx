'use client';
import React from 'react';
import { getDaysInMonthGrid, formatISOYearMonthDay, AZ_WEEKDAYS_MON_FIRST } from '@/lib/calendarCore';
import { ChevronLeft, ChevronRight, Trash2, Calendar as CalendarIcon } from 'lucide-react';

interface MultiDateCalendarProps {
  selectedDates?: Date[];
  onChange: (dates: Date[]) => void;
}

export const toIsoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const MultiDateCalendar: React.FC<MultiDateCalendarProps> = ({
  selectedDates = [],
  onChange,
}) => {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysGrid = React.useMemo(() => getDaysInMonthGrid(year, month), [year, month]);
  
  const monthNames = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr'
  ];

  const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  
  const safeDates = selectedDates || [];
  const isSelected = (iso: string) => safeDates.some((d) => toIsoDate(d) === iso);
  
  const toggleDate = (iso: string) => {
    const date = new Date(iso + 'T00:00:00');
    if (isSelected(iso)) {
      onChange(safeDates.filter((d) => toIsoDate(d) !== iso));
    } else {
      onChange([...safeDates, date]);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
      {/* Sol Sütun: Kompakt Təqvim */}
      <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-gray-100 pb-5 lg:pb-0 lg:pr-5">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800 text-base flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-emerald-800" />
            Təqvimdən gün seçin
          </h4>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[100px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Həftə günləri */}
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {AZ_WEEKDAYS_MON_FIRST.map((day, idx) => (
            <span
              key={day.key}
              className={`text-xs font-semibold py-1 ${
                idx >= 5 ? 'text-rose-500' : 'text-gray-500'
              }`}
            >
              {day.label}
            </span>
          ))}
        </div>

        {/* Təqvim Toru */}
        <div className="grid grid-cols-7 gap-1">
          {daysGrid.map((dayObj, i) => {
            if (!dayObj) {
              return <div key={`empty-${i}`} className="h-9" />;
            }
            const iso = formatISOYearMonthDay(dayObj.date);
            const active = isSelected(iso);
            const isWeekend = dayObj.isWeekend;
            return (
              <button
                key={iso}
                type="button"
                onClick={() => toggleDate(iso)}
                className={`h-9 w-full rounded-lg text-xs font-medium transition flex items-center justify-center relative ${
                  active
                    ? 'bg-emerald-800 text-white font-bold shadow-sm'
                    : isWeekend
                    ? 'bg-rose-50/60 text-rose-600 hover:bg-rose-100'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {dayObj.dayNumber}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500 mt-4 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-800 rounded-sm inline-block" />
            <span>Seçilib</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-rose-50 border border-rose-200 rounded-sm inline-block" />
            <span>Həftəsonu</span>
          </div>
        </div>
      </div>

      {/* Sağ Sütun: Seçilmiş Tarixlər */}
      <div className="lg:col-span-7">
        <h4 className="font-semibold text-gray-800 text-base mb-3 flex items-center justify-between">
          <span>Seçilmiş Tarixlər</span>
          <span className="text-xs font-normal text-gray-500">
            Cəmi: {safeDates.length} tarix
          </span>
        </h4>
        
        {safeDates.length === 0 ? (
          <div className="border border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50/50">
            <p className="text-sm text-gray-500">
              Hələ heç bir tarix seçilməyib. Sol tərəfdəki təqvimdən turun keçiriləcəyi günləri klikləyin.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
            {safeDates.map((date) => {
              const iso = toIsoDate(date);
              return (
                <div
                  key={iso}
                  className="flex items-center justify-between bg-gray-50 border border-gray-200/80 rounded-xl p-3 hover:border-gray-300 transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">
                      {iso}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleDate(iso)}
                    className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                    title="Sil"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};