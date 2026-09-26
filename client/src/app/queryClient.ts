import { QueryClient } from '@tanstack/react-query';
import axios from 'axios';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Don't retry client errors (auth, validation, not found).
        if (axios.isAxiosError(error) && error.response && error.response.status < 500) return false;
        return failureCount < 2;
      },
    },
    mutations: { retry: false },
  },
});
