import { useQuery } from '@tanstack/react-query';

import { getUserTransactions } from '@/lib/transactions';
import type { Transaction } from '@/schemas/transactionSchema';

export const useUserTransactions = () => {
  return useQuery<Transaction[]>({
    queryKey: ['userTransactions'],
    queryFn: () => getUserTransactions(),
    // refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
