import { Transaction } from '@/types';

export const toTitleCase = (str: string): string =>
  str
    .split(' ')
    .map((word) =>
      word !== word.toUpperCase()
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : word,
    )
    .join(' ');

export const nullify = (val: any): any | null => val || null;

export const isFile = (value: unknown): value is File => {
  return typeof File !== 'undefined' && value instanceof File;
};

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

export const groupByDateAndType = (key: keyof Transaction, transactions: Transaction[]) => {
  const grouped = transactions.reduce(
    (acc: { [key: string]: { expenses: Transaction[]; incomes: Transaction[] } }, transaction) => {
      const groupKey = transaction[key]?.toString() ?? 'other';
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
