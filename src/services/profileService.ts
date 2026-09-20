import type { User } from '../types';
import { studentApi } from '../lib/apiClient';

/**
 * Thin client for the student profile (Student Portal backend).
 * Identity comes from the auth cookie, so the userId argument is retained only
 * for signature compatibility with existing call sites. The enrollment number
 * stays read-only; institute, department and semester are editable and are
 * re-validated server-side against the institute master data.
 */
export const profileService = {
  getUserProfile: async (_userId: string): Promise<User | null> => {
    try {
      return await studentApi.get<User>('/me/profile');
    } catch {
      return null;
    }
  },

  updateUserProfile: async (_userId: string, data: Partial<User>): Promise<User | null> => {
    try {
      return await studentApi.patch<User>('/me/profile', data);
    } catch {
      return null;
    }
  },
};
