export type Transaction = {
  _id?: string;
  title: string;
  date: string;
  category: string;
  isExpense: boolean;
  amount: number;
  description: string;
  labels: string[];
  sender?: string | null;
  receiver?: string | null;
};
