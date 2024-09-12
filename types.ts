export type Transaction = {
  title: string;
  date: string;
  isExpense: boolean;
  amount: number;
  description: string;
  labels: string[];
  sender?: string | null;
  receiver?: string | null;
};

// TODO: delete dummy data
export const transactions: Transaction[] = [
  {
    title: 'Grocery Shopping',
    date: '2023-09-01',
    isExpense: true,
    amount: 50.75,
    description: 'Bought groceries from the local market',
    labels: ['Food', 'Shopping'],
    sender: null,
    receiver: 'Supermarket',
  },
  {
    title: 'Salary',
    date: '2023-09-01',
    isExpense: false,
    amount: 2500,
    description: 'Received salary for September',
    labels: ['Income', 'Work'],
    sender: 'Company ABC',
    receiver: null,
  },
  {
    title: 'Salary',
    date: '2024-01-01',
    isExpense: false,
    amount: 1000,
    description: 'Monthly salary',
    labels: ['Income', 'Salary'],
    sender: null,
    receiver: 'John Doe',
  },
  {
    title: 'Rent',
    date: '2024-01-02',
    isExpense: true,
    amount: 1000,
    description: 'Monthly rent',
    labels: ['Expense', 'Rent'],
    sender: 'John Doe',
    receiver: null,
  },
  {
    title: 'Groceries',
    date: '2024-01-03',
    isExpense: true,
    amount: 100,
    description: 'Weekly groceries',
    labels: ['Expense', 'Groceries'],
    sender: 'John Doe',
    receiver: null,
  },
  {
    title: 'Dinner',
    date: '2024-01-04',
    isExpense: true,
    amount: 50.99,
    description: 'Dinner with friends at Mcdonalds',
    labels: ['Expense', 'Dinner', 'Restaurant', 'Food', 'Friends'],
    sender: 'John Doe',
    receiver: 'Restaurant',
  },
  {
    title: 'Breakfast',
    date: '2024-01-04',
    isExpense: true,
    amount: 30.25,
    description: '',
    labels: ['Expense', 'Breakfast'],
    sender: 'John Doe',
    receiver: 'Cafe',
  },
  {
    title: 'Luck',
    date: '2024-01-04',
    isExpense: false,
    amount: 1.0,
    description: 'Found $1 on the street',
    labels: [],
    sender: null,
    receiver: null,
  },
  {
    title: 'Salary',
    date: '2024-01-06',
    isExpense: false,
    amount: 1500,
    description: '',
    labels: ['Salary', 'Work'],
  },
  {
    title: 'Bonus',
    date: '2024-01-06',
    isExpense: false,
    amount: 50,
    description: 'Extra bonus for the project, received from the client. Thank you!',
    labels: ['Work'],
  },
  {
    title: 'Lunch',
    date: '2024-01-06',
    isExpense: true,
    amount: 150,
    description: "Lunch with friends at Sam's",
    labels: ['Expense', 'Lunch'],
    sender: 'John Doe',
    receiver: null,
  },
  {
    title: 'Lottery',
    date: '2024-01-06',
    isExpense: false,
    amount: 1000,
    description: 'Win a small amount of money from a local lottery',
    labels: [],
    sender: '',
    receiver: 'Me',
  },
].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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

export const transactionsByDate = groupBy('date', transactions);

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

export const transactionsByDateAndType = groupByDateAndType('date', transactions);
