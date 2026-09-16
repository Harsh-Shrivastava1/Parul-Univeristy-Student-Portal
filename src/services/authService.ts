import type { User } from '../types';
import { api, setAccessToken } from '../lib/apiClient';

export interface RegisterPayload {
  fullName: string;
  enrollmentNumber: string;
  /** Institute code (e.g. PIET) — locked after signup, Admin-only edit. */
  institute: string;
  department: string;
  semester: number;
  email: string;
  password: string;
}

/**
 * Thin API client for student authentication. The Student Portal backend
 * (POST /auth/*) is the source of truth for validation, email/enrollment
 * uniqueness, password policy, bcrypt hashing, and the atomic
 * users + students creation + 1:1 linkage. Form-level validation still runs
 * client-side purely for UX.
 */
export const authService = {
  // Self-registration → backend creates users+students atomically and
  // auto-issues the session cookies. Returns the merged student profile.
  /**
   * Create the account. Returns NO session: the address has to be verified
   * first, so the caller sends the student to check their mail.
   */
  register: async (payload: RegisterPayload): Promise<{ email: string; message: string }> =>
    api.post<{ email: string; message: string }>('/auth/register', payload),

  login: async (enrollmentNumber: string, password: string): Promise<User> => {
    const data = await api.post<User & { token?: string }>('/auth/login', { enrollmentNumber, password });
    if (data?.token) setAccessToken(data.token);
    return data;
  },

  // Forgot password → backend emails a temporary password. Always resolves
  // (generic response) so it can't reveal whether the email is registered.
  forgotPassword: async (email: string): Promise<void> => {
    await api.post<void>('/auth/forgot-password', { email });
  },

  /** Consume a single-use reset link and set the new password. */
  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post<void>('/auth/reset-password', { token, password });
  },

  /** Consume the emailed verification link. Single-use. */
  verifyEmail: async (token: string): Promise<void> => {
    await api.post<void>('/auth/verify-email', { token });
  },

  /** Ask for a fresh verification link. Always resolves — the server answer is
   *  deliberately the same whether or not the address is registered. */
  resendVerification: async (email: string): Promise<void> => {
    await api.post<void>('/auth/resend-verification', { email });
  },

  // Self-service password change (authenticated): current (or temp) password
  // + new password. Backend enforces the password policy.
  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await api.post<void>('/auth/change-password', { currentPassword, newPassword });
  },

  logout: async (): Promise<void> => {
    try {
      await api.post<void>('/auth/logout');
    } finally {
      setAccessToken(null);
    }
  },

  // Restores the session from the httpOnly cookie; null when unauthenticated.
  getCurrentUser: async (): Promise<User | null> => {
    try {
      return await api.get<User>('/auth/me');
    } catch {
      return null;
    }
  },
};
