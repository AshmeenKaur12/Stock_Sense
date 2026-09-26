import { getData, patchData, postData } from '@/lib/api';
import { api, type ApiEnvelope } from '@/lib/axios';
import type { ActivityItem, PublicUser } from '@/lib/types';

export interface ProfileBody {
  name?: string;
  email?: string;
}

export interface ChangePasswordBody {
  currentPassword: string;
  password: string;
  confirmPassword: string;
}

export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export const profileApi = {
  update: (body: ProfileBody) => patchData<{ user: PublicUser }>('/users/me', body),
  changePassword: (body: ChangePasswordBody) => postData<null>('/users/me/password', body),
  uploadAvatar: async (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    // Explicit multipart header stops axios serialising FormData as JSON (instance default).
    const res = await api.post<ApiEnvelope<{ user: PublicUser }>>('/users/me/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return { data: res.data.data, message: res.data.message };
  },
  activity: () => getData<ActivityItem[]>('/users/me/activity'),
};
