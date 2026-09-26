import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getPaged, postData } from '@/lib/api';
import { queryKeys } from '@/lib/queryKeys';
import type { AppNotification } from '@/lib/types';
import { useAuthStore } from '@/store/auth';

const NOTIFICATIONS_ENDPOINT = '/notifications';
const NOTIFICATIONS_POLL_INTERVAL = 120_000;

export function useNotifications() {
  const authed = useAuthStore((s) => s.status === 'authenticated');

  return useQuery({
    queryKey: queryKeys.notifications.all,
    queryFn: () =>
      getPaged<AppNotification, { unread: number }>(NOTIFICATIONS_ENDPOINT, {
        limit: 30,
      }),
    enabled: authed,
    refetchInterval: NOTIFICATIONS_POLL_INTERVAL,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => postData(`${NOTIFICATIONS_ENDPOINT}/${id}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => postData(`${NOTIFICATIONS_ENDPOINT}/read-all`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notifications.all });
    },
  });
}
