export const WEEKDAYS_SHORT = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];
export const WEEKDAYS_LONG = ['måndagar', 'tisdagar', 'onsdagar', 'torsdagar', 'fredagar', 'lördagar', 'söndagar'];

const EN_INDEX: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
const stockholmWeekday = new Intl.DateTimeFormat('en-US', { weekday: 'short', timeZone: 'Europe/Stockholm' });

/** Måndag = 0 … söndag = 6, räknat i svensk tid så att servern kan stå var som helst. */
export function weekdayIndex(date: Date): number {
  return EN_INDEX[stockholmWeekday.format(date)];
}

export function countByWeekday(dates: Date[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const d of dates) counts[weekdayIndex(d)] += 1;
  return counts;
}
