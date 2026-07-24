// Paylaşılan təqvim köməkçiləri — bütün vendor tur formu təqvimləri (tək-tarix
// DateTimeField və çox-tarix MultiDateCalendar) üçün eyni Bazar ertəsi-başlanğıclı
// grid və həftəsonu (Şənbə/Bazar) qaydalarını tətbiq edir.

export const AZ_WEEKDAY_LABELS = ['B.E', 'Ç.A', 'Ç', 'C.A', 'C', 'Ş', 'B'];

export const AZ_MONTH_LABELS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// JS Date.getDay(): 0=Bazar(Sun) .. 6=Şənbə(Sat). AZ iş həftəsi B.E-C, həftəsonu Ş-B.
export function isWeekendDay(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

export interface CalendarCell {
  date: Date;
  inMonth: boolean;
  isWeekend: boolean;
}

// Bazar ertəsindən (Monday) başlayan 6 sətir x 7 sütun (42 xana) grid qurur.
export function buildMonthGrid(year: number, month: number): CalendarCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const jsFirstDay = firstOfMonth.getDay(); // 0=Sun..6=Sat
  const mondayOffset = (jsFirstDay + 6) % 7; // Monday-ə qədər neçə gün geri getmək lazımdır
  const gridStart = new Date(year, month, 1 - mondayOffset);

  const cells: CalendarCell[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({ date: d, inMonth: d.getMonth() === month, isWeekend: isWeekendDay(d) });
  }
  return cells;
}

// 30 dəqiqəlik addımlarla saat siyahısı: 00:00, 00:30, 01:00 ... 23:30
export function buildTimeOptions(stepMinutes = 30): string[] {
  const options: string[] = [];
  for (let mins = 0; mins < 24 * 60; mins += stepMinutes) {
    const h = String(Math.floor(mins / 60)).padStart(2, '0');
    const m = String(mins % 60).padStart(2, '0');
    options.push(`${h}:${m}`);
  }
  return options;
}
