import { toast } from 'react-toastify';

import axios from 'axios';

export const getUserTransactions = async () => {
  try {
    const { data } = await axios.get(`/api/transactions`);
    toast.success('Fetched user transactions');
    return data;
  } catch (error) {
    console.error(error);
    toast.error('Failed to fetch user transactions');
    return [];
  }
};
