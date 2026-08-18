import { tecApi, coordinatorApi } from '../lib/apiClient';
import type { Application } from '../types';
import { generateApplicationPDF } from '../utils/generatePDF';

/** Backend document types (URL segment). */
export type DownloadType =
  | 'application-pdf'
  | 'attendance-form'
  | 'training-application'
  | 'offer-letter'
  | 'completion-certificate';

/**
 * Documents are generated and stored by their OWNING backend; the frontend only
 * downloads the file.
 *   - Application PDF -> generated client-side via generateApplicationPDF / fallback TEC
 *   - Attendance Form -> Coordinator (owner + where the file lives)
 */
export const documentService = {
  download: async (applicationId: string, type: DownloadType, fileName: string, appData?: Application): Promise<void> => {
    if (type === 'application-pdf' && appData) {
      return generateApplicationPDF(appData);
    }
    try {
      const blob =
        type === 'attendance-form'
          ? await coordinatorApi.blob(`/student/attendance-form/${applicationId}`)
          : type === 'training-application'
          ? await coordinatorApi.blob(`/student/training-application/${applicationId}`)
          : await tecApi.blob(`/applications/${applicationId}/documents/${type}`);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (type === 'application-pdf' && appData) {
        return generateApplicationPDF(appData);
      }
      throw err;
    }
  },
};
