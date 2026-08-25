import { formatInTimeZone, toDate } from 'date-fns-tz';
import { config } from './index';

export function formatTimeInTz(date: Date | string, formatStr: string = 'yyyy-MM-dd HH:mm:ss', tz: string = config.appTimezone): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return formatInTimeZone(d, tz, formatStr);
}

export function getCurrentTzTime(tz: string = config.appTimezone): Date {
  return toDate(new Date(), { timeZone: tz });
}
