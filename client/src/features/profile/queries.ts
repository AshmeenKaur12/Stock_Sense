import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import type { PublicUser } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { profileApi, type ChangePasswordBody, type ProfileBody } from './api';

export const activityKey = [...queryKeys.auth.me, 'activity'] as const;

export function useMyActivity() {
  return useQuery({ queryKey: activityKey, queryFn: profileApi.activity, staleTime: 30_000 });
}

/** Pushes the fresh user into the auth store and refreshes views that show users. */
function useSyncUser() {
  const qc = useQueryClient();
  return (user: PublicUser) => {
    useAuthStore.getState().setUser(user);
    void qc.invalidateQueries({ queryKey: queryKeys.users.all });
  };
}

export function useUpdateProfile() {
  const sync = useSyncUser();
  return useMutation({
    mutationFn: (body: ProfileBody) => profileApi.update(body),
    onSuccess: (res) => sync(res.data.user),
  });
}

export function useUploadAvatar() {
  const sync = useSyncUser();
  return useMutation({
    mutationFn: (file: File) => profileApi.uploadAvatar(file),
    onSuccess: (res) => sync(res.data.user),
  });
}

export function useChangePassword() {
  return useMutation({ mutationFn: (body: ChangePasswordBody) => profileApi.changePassword(body) });
}
