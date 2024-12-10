import { format, formatDistanceToNow } from 'date-fns';
import { toDate } from 'date-fns-tz';

const TIMEZONE = 'America/New_York';

export const formatDate = (date: string | Date, formatStr: string = 'MMM d, yyyy h:mm a'): string => {
  const utcDate = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toDate(utcDate, { timeZone: TIMEZONE });
  return format(zonedDate, formatStr);
};

export const formatRelativeTime = (date: string | Date): string => {
  const utcDate = typeof date === 'string' ? new Date(date) : date;
  const zonedDate = toDate(utcDate, { timeZone: TIMEZONE });
  return formatDistanceToNow(zonedDate, { addSuffix: true });
};

export const toUTC = (date: Date): Date => {
  return new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
};

export const fromUTC = (date: Date): Date => {
  return toDate(date, { timeZone: TIMEZONE });
}; 