import { create } from 'zustand';
import type { PublicUser, Role } from '@/lib/types';

export type { Role };
export type AuthUser = PublicUser;

/** `idle` until the first /auth/me check finishes — guards wait on it. */
type AuthStatus = 'idle' | 'authenticated' | 'unauthenticated';

interface AuthState {
  user: AuthUser | null;
  status: AuthStatus;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: user ? 'authenticated' : 'unauthenticated' }),
  clear: () => set({ user: null, status: 'unauthenticated' }),
}));

const RANK: Record<Role, number> = { staff: 0, manager: 1, admin: 2 };

/** True when `role` is at least `min` in the staff < manager < admin hierarchy. */
export const hasRole = (role: Role | undefined, min: Role) => role !== undefined && RANK[role] >= RANK[min];

/** Convenience hook: `const canManage = useHasRole('manager')`. */
export const useHasRole = (min: Role) => useAuthStore((s) => hasRole(s.user?.role, min));
