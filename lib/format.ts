import { differenceInDays, format, isToday } from 'date-fns';
import { sv } from 'date-fns/locale';

export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatShortDuration(ms: number): string {
  if (!ms || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function formatDate(date?: Date | string | null): string {
  if (!date) return 'Aldrig';
  return format(new Date(date), 'd MMM yyyy', { locale: sv });
}

export function formatRelativeDate(date?: Date | string | null): string {
  if (!date) return 'Aldrig';
  const parsed = new Date(date);
  if (isToday(parsed)) return 'Idag';
  const diff = differenceInDays(new Date(), parsed);
  return `${diff} dagar sedan`;
}
