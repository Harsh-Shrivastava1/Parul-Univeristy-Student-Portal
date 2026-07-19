import { studentApi } from '../lib/apiClient';

/** Read-only training view for the signed-in student. */
export interface TrainingInfo {
  id: string;
  applicationId: string;
  mentorName: string;
  trainingModule: string;
  reportingLocation: string;
  joiningDate: string;
  reportingTime: string;
  duration: string;
  status: string;
}

/**
 * Served read-only by the Student Portal backend as a gateway over the
 * Coordinator-owned trainings collection (cross-domain read).
 */
export const trainingService = {
  getMyTraining: async (): Promise<TrainingInfo | null> => {
    try {
      return await studentApi.get<TrainingInfo | null>('/me/training');
    } catch {
      return null;
    }
  },
};
