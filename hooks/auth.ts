import { useDispatch } from 'react-redux';

import axios from 'axios';

import { setUser } from '@/store/userSlice';

export const useAuth = () => {
  const dispatch = useDispatch();

  const fetchUser = async () => {
    const response = await axios.get('/api/user/auth');

    if (response.status === 200) {
      dispatch(setUser(response.data));
    }
  };

  return { fetchUser };
};
