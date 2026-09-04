/** Allt som rör "när på veckan/dagen" räknas i svensk tid, så att servern kan stå var som helst. */
const TZ = 'Europe/Stockholm';

export const WEEKDAYS_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
export const WEEKDAYS_LONG = ['måndagar', 'tisdagar', 'onsdagar', 'torsdagar', 'fredagar', 'lördagar', 'söndagar'];

const EN_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const weekdayFormat = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: TZ });
const hourFormat = new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: TZ });
const dayFormat = new Intl.DateTimeFormat('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ });

/** Måndag = 0 … söndag = 6. */
export function weekdayIndex(date: Date): number {
  return EN_INDEX[weekdayFormat.format(date)];
}

/** Timme 0–23. */
export function hourOfDay(date: Date): number {
  return Number(hourFormat.format(date));
}

/** "2026-09-04" — samma nyckel för alla händelser samma svenska dygn. */
export function dayKey(date: Date): string {
  return dayFormat.format(date);
}

export function countByWeekday(dates: Date[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dates) counts[weekdayIndex(d)] += 1;
  return counts;
}
