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
  {
    title: 'Salary Payment',
    date: '2024-01-01',
    isExpense: false,
    amount: 3000.0,
    description: 'Received monthly salary payment for January from my employer.',
    labels: ['Income', 'Salary', 'Work'],
    sender: 'Company XYZ',
    receiver: 'John Doe',
  },
  {
    title: 'Grocery Shopping',
    date: '2024-01-05',
    isExpense: true,
    amount: 120.75,
    description: 'Weekly grocery run at the local supermarket.',
    labels: ['Expense'],
    sender: 'John Doe',
    receiver: 'Supermarket',
  },
  {
    title: 'Electricity Bill',
    date: '2024-01-03',
    isExpense: true,
    amount: 60.0,
    description: '',
    labels: ['Expense', 'Utilities'],
    sender: 'John Doe',
    receiver: 'Electric Company',
  },
  {
    title: 'Freelance Project Payment',
    date: '2024-01-06',
    isExpense: false,
    amount: 450.0,
    description:
      'Received payment for the website design and development project delivered to Client ABC.',
    labels: ['Income', 'Freelance', 'Web Development', 'Design'],
    sender: 'Client ABC',
    receiver: 'John Doe',
  },
  {
    title: 'Gym Membership',
    date: '2024-01-07',
    isExpense: true,
    amount: 50.0,
    description: 'Paid monthly membership fee for gym access.',
    labels: ['Expense', 'Fitness'],
    sender: 'John Doe',
    receiver: 'Gym Club',
  },
  {
    title: 'Dinner with Friends',
    date: '2024-01-02',
    isExpense: true,
    amount: 45.6,
    description:
      'A great night out with friends at a local restaurant. Shared a variety of dishes and drinks.',
    labels: ['Expense', 'Dining', 'Friends', 'Social'],
    sender: 'John Doe',
    receiver: 'Restaurant',
  },
  {
    title: 'Stock Dividends',
    date: '2024-01-08',
    isExpense: false,
    amount: 200.0,
    description: 'Quarterly dividends from my stock investments in tech companies.',
    labels: ['Income', 'Dividends', 'Investment', 'Passive Income'],
    sender: 'Investment Firm',
    receiver: 'John Doe',
  },
  {
    title: 'Car Maintenance',
    date: '2024-01-10',
    isExpense: true,
    amount: 250.0,
    description:
      'Took the car for regular maintenance. Oil change, tire rotation, and brake checkup.',
    labels: ['Expense', 'Automotive', 'Maintenance'],
    sender: 'John Doe',
    receiver: 'Auto Repair Shop',
  },
  {
    title: 'Freelance Graphics Design',
    date: '2024-01-12',
    isExpense: false,
    amount: 320.0,
    description:
      'Payment received for creating marketing materials for a client’s social media campaign.',
    labels: ['Income', 'Graphics Design', 'Freelance', 'Social Media'],
    sender: 'Client XYZ',
    receiver: 'John Doe',
  },
  {
    title: 'Flight to New York',
    date: '2023-12-22',
    isExpense: true,
    amount: 450.0,
    description: 'Round trip flight ticket to New York for Christmas vacation.',
    labels: ['Expense', 'Travel'],
    sender: 'John Doe',
    receiver: 'Airline Company',
  },
  {
    title: 'Christmas Gift Shopping',
    date: '2023-12-18',
    isExpense: true,
    amount: 350.0,
    description: 'Bought gifts for family and friends for Christmas.',
    labels: ['Expense', 'Shopping', 'Gifts'],
    sender: 'John Doe',
    receiver: 'Mall',
  },
  {
    title: 'Bonus Payment',
    date: '2023-12-15',
    isExpense: false,
    amount: 500.0,
    description: 'Year-end performance bonus from my employer.',
    labels: ['Income', 'Bonus', 'Salary'],
    sender: 'Company XYZ',
    receiver: 'John Doe',
  },
  {
    title: 'Restaurant Dinner',
    date: '2023-11-30',
    isExpense: true,
    amount: 70.5,
    description: 'Dinner at a fancy restaurant to celebrate a friend’s birthday.',
    labels: ['Expense', 'Dining'],
    sender: 'John Doe',
    receiver: 'Restaurant',
  },
  {
    title: 'Online Course Purchase',
    date: '2023-11-12',
    isExpense: true,
    amount: 120.0,
    description: 'Enrolled in an advanced web development course online.',
    labels: ['Expense', 'Education', 'Web Development'],
    sender: 'John Doe',
    receiver: 'Online Learning Platform',
  },
  {
    title: 'Freelance Payment - Logo Design',
    date: '2023-10-25',
    isExpense: false,
    amount: 300.0,
    description: 'Payment for designing a company logo for a client.',
    labels: ['Income', 'Freelance', 'Design'],
    sender: 'Client DEF',
    receiver: 'John Doe',
  },
  {
    title: 'Rent Payment',
    date: '2023-10-01',
    isExpense: true,
    amount: 1200.0,
    description: 'Paid rent for the month of October.',
    labels: ['Expense', 'Housing', 'Rent'],
    sender: 'John Doe',
    receiver: 'Landlord',
  },
  {
    title: 'Car Insurance Payment',
    date: '2023-09-20',
    isExpense: true,
    amount: 600.0,
    description: 'Annual car insurance premium payment.',
    labels: ['Expense', 'Automotive', 'Insurance'],
    sender: 'John Doe',
    receiver: 'Insurance Company',
  },
  {
    title: 'Stock Dividends',
    date: '2023-09-10',
    isExpense: false,
    amount: 150.0,
    description: 'Quarterly stock dividends from long-term investments.',
    labels: ['Income', 'Investment', 'Dividends'],
    sender: 'Investment Firm',
    receiver: 'John Doe',
  },
]
  .map((transaction) => ({
    ...transaction,
    labels: transaction.labels.sort((a, b) => a.localeCompare(b)),
  }))
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
