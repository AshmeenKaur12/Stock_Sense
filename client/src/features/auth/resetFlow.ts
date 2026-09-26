import { create } from 'zustand';

/**
 * In-memory state for Forgot → Verify OTP → Reset. Deliberately not persisted:
 * the reset token never touches storage or the URL. A refresh restarts the flow.
 */
interface ResetFlowState {
  email: string;
  resetToken: string;
  sentAt: number;
  setEmail: (email: string) => void;
  markSent: () => void;
  setResetToken: (token: string) => void;
  clear: () => void;
}

export const useResetFlow = create<ResetFlowState>((set) => ({
  email: '',
  resetToken: '',
  sentAt: 0,
  setEmail: (email) => set({ email }),
  markSent: () => set({ sentAt: Date.now() }),
  setResetToken: (resetToken) => set({ resetToken }),
  clear: () => set({ email: '', resetToken: '', sentAt: 0 }),
}));
