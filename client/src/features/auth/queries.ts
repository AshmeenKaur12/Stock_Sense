import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { disconnectSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/auth';
import { authApi } from './api';

export function useLogin() {
  const setUser = useAuthStore((s) => s.setUser);
  return useMutation({ mutationFn: authApi.login, onSuccess: ({ user }) => setUser(user) });
}

export function useLogout() {
  const clear = useAuthStore((s) => s.clear);
  const qc = useQueryClient();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      disconnectSocket();
      clear();
      qc.clear();
      navigate('/login', { replace: true });
    },
  });
}

/** Debounced availability check for sign-up fields. */
export function useAvailability(kind: 'loginId' | 'email', value: string, enabled: boolean) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value.trim().toLowerCase()), 350);
    return () => clearTimeout(t);
  }, [value]);
  return useQuery({
    queryKey: ['auth', 'availability', kind, debounced],
    queryFn: () => (kind === 'loginId' ? authApi.checkLoginId(debounced) : authApi.checkEmail(debounced)),
    enabled: enabled && debounced.length > 0 && debounced === value.trim().toLowerCase(),
    staleTime: 30_000,
    retry: false,
  });
}
