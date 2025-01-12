import type { Transaction } from '@/schemas/transactionSchema';

const LOCALE = 'en-DE';

export const rounded = (num: number, precision = 2) => Math.round(num * 10 ** precision) / 10 ** precision;

export const formatPrice = (price: number, options?: Intl.NumberFormatOptions): string => {
  return price.toLocaleString(LOCALE, { style: 'currency', currency: 'EUR', ...options });
};

export const formatDate = (dateString: string | Date, options?: Intl.DateTimeFormatOptions): string =>
  new Date(dateString).toLocaleDateString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options,
  });

export const formatTime = (timeString: string | Date, options?: Intl.DateTimeFormatOptions): string =>
  new Date(timeString).toLocaleTimeString(LOCALE, {
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });

export const formatDateTime = (dateTimeString: string | Date, options?: Intl.DateTimeFormatOptions): string =>
  new Date(dateTimeString).toLocaleString(LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    ...options,
  });

export const toTitleCase = (str: string): string =>
  str
    .split(' ')
    .map(
      (word) => (word !== word.toUpperCase() ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word), // Keep acronyms like "API" or "HTML" in uppercase
    )
    .join(' ');

export const toRandomCase = (str: string): string =>
  str
    .split('')
    .map((char) => (Math.random() < 0.5 ? char.toUpperCase() : char.toLowerCase()))
    .join('');

export const isFile = (value: unknown): value is File => typeof File !== 'undefined' && value instanceof File;

export const groupBy = <T extends Record<string, any>>(
  key: keyof T,
  items: T[],
  unknownKey: string = 'unknown',
): Array<{ [key: string]: T[] }> => {
  const grouped = items.reduce((acc: { [key: string]: T[] }, item) => {
    const groupKey = item[key]?.toString() ?? unknownKey;
    if (!acc[groupKey]) acc[groupKey] = [];
    acc[groupKey].push(item);
    return acc;
  }, {});

  return Object.entries(grouped).map(([key, items]) => ({ [key]: items }));
};

export const groupByDateAndType = (transactions: Transaction[]) => {
  const grouped = transactions.reduce(
    (acc: { [key: string]: { expenses: Transaction[]; incomes: Transaction[] } }, transaction) => {
      const groupKey = transaction['date']?.toString() ?? 'other';
      if (!acc[groupKey]) acc[groupKey] = { expenses: [], incomes: [] };
      const type = transaction.isExpense ? 'expenses' : 'incomes';
      acc[groupKey][type].push(transaction);
      return acc;
    },
    {},
  );

  return Object.entries(grouped)
    .map(([date, { expenses, incomes }]) => ({ date, expenses, incomes }))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};
