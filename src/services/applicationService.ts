import type { Application, ApplicationFormData } from '../types';
import { studentApi, tecApi } from '../lib/apiClient';

/**
 * Thin client for applications.
 *
 * WRITES go to the TEC Cell backend (tecApi → VITE_TEC_API_URL), which OWNS the
 * applications collection and performs all validation, duplicate checks, audit
 * logging, notifications and workflow status changes. The Student Portal never
 * writes MongoDB directly.
 *
 * READS are served by the Student Portal backend acting as a read gateway over
 * the shared collection (cross-domain reads are permitted). Identity comes from
 * the auth cookie; the userId argument is kept only for call-site compatibility.
 */
export const applicationService = {
  getApplications: async (_userId: string): Promise<Application[]> => {
    return studentApi.get<Application[]>('/me/applications');
  },

  getApplicationById: async (id: string): Promise<Application | undefined> => {
    try {
      return await studentApi.get<Application>(`/applications/${id}`);
    } catch {
      return undefined;
    }
  },

  submitApplication: async (
    internshipId: string,
    _userId: string,
    _internship: Application['internship'],
    formData: ApplicationFormData
  ): Promise<Application> => {
    return tecApi.post<Application>('/applications', { advertisementId: internshipId, formData });
  },

  withdrawApplication: async (appId: string): Promise<void> => {
    await tecApi.del<void>(`/applications/${appId}`);
  },
};
