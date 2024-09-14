export type Transaction = {
  _id?: string;
  title: string;
  date: string;
  isExpense: boolean;
  amount: number;
  description: string;
  labels: string[];
  sender?: string | null;
  receiver?: string | null;
};
