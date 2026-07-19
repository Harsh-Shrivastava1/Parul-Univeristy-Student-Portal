import type { Internship } from '../types';
import { studentApi } from '../lib/apiClient';

/**
 * Thin client for advertisements. Served read-only by the Student Portal
 * backend acting as a gateway over the TEC-owned advertisements collection
 * (cross-domain reads are permitted).
 */
export const internshipService = {
  getInternships: async (): Promise<Internship[]> => {
    return studentApi.get<Internship[]>('/advertisements');
  },

  getInternshipById: async (id: string): Promise<Internship | undefined> => {
    try {
      return await studentApi.get<Internship>(`/advertisements/${id}`);
    } catch {
      return undefined;
    }
  },

  searchInternships: async (query: string): Promise<Internship[]> => {
    return studentApi.get<Internship[]>(`/advertisements?q=${encodeURIComponent(query)}`);
  },
};
