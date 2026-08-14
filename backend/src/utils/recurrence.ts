export type RecurrenceInterval = 'WEEKLY' | 'MONTHLY' | 'YEARLY';

export function addInterval(date: Date, interval: RecurrenceInterval, times: number): Date {
  const result = new Date(date);
  if (interval === 'WEEKLY') {
    result.setDate(result.getDate() + 7 * times);
  } else if (interval === 'MONTHLY') {
    result.setMonth(result.getMonth() + times);
  } else {
    result.setFullYear(result.getFullYear() + times);
  }
  return result;
}

export function generateSeriesDates(startDate: Date, interval: RecurrenceInterval, count: number): Date[] {
  const dates: Date[] = [];
  for (let i = 0; i < count; i++) {
    dates.push(addInterval(startDate, interval, i));
  }
  return dates;
}

export function generateInstallmentDates(startDate: Date, total: number): Date[] {
  return generateSeriesDates(startDate, 'MONTHLY', total);
}
