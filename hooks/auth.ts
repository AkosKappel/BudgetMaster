import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { getLoggedInUser } from '@/lib/crud';
import { RootState } from '@/store';
import { setUser } from '@/store/userSlice';

export const useCurrentUser = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const user = useSelector((state: RootState) => state.user);
  const dispatch = useDispatch();

  const refetch = useCallback(
    async (force: boolean = false) => {
      if (isLoading) return;
      if (!force && user.id) return;

      setIsLoading(true);
      setIsError(false);
      setError(null);

      try {
        const loggedInUser = await getLoggedInUser();
        dispatch(setUser({ ...loggedInUser, id: loggedInUser._id }));
      } catch (error) {
        setIsError(true);
        setError(error as Error);
      } finally {
        setIsLoading(false);
      }
    },
    [dispatch, isLoading, user.id],
  );

  useEffect(() => {
    refetch(true);
  }, []);

  return { user, isLoading, isError, error, refetch };
};
