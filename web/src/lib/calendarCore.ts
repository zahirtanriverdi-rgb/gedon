export interface CalendarDayCell {
  date: Date;
  dayNumber: number;
  isCurrentMonth: boolean;
  isWeekend: boolean;
}

export const AZ_WEEKDAYS_MON_FIRST = [
  { key: 'BE', label: 'B.E' },
  { key: 'CA', label: 'Ç.A' },
  { key: 'C', label: 'Ç' },
  { key: 'CA2', label: 'C.A' },
  { key: 'C2', label: 'C' },
  { key: 'S', label: 'Ş' },
  { key: 'B', label: 'B' },
];

export function getDaysInMonthGrid(year: number, month: number): (CalendarDayCell | null)[] {
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // 0 = Sunday, 1 = Monday ... 6 = Saturday
  let firstDayIndex = firstDayOfMonth.getDay();
  // Adjust so Monday is 0 and Sunday is 6
  firstDayIndex = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const totalDays = lastDayOfMonth.getDate();
  const grid: (CalendarDayCell | null)[] = [];

  for (let i = 0; i < firstDayIndex; i++) {
    grid.push(null);
  }

  for (let day = 1; day <= totalDays; day++) {
    const d = new Date(year, month, day);
    const dayOfWeek = d.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    grid.push({
      date: d,
      dayNumber: day,
      isCurrentMonth: true,
      isWeekend,
    });
  }

  return grid;
}

export function formatISOYearMonthDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}