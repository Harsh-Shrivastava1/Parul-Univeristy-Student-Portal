import { tecApi, coordinatorApi } from '../lib/apiClient';

/** Backend document types (URL segment). */
export type DownloadType =
  | 'application-pdf'
  | 'attendance-form'
  | 'offer-letter'
  | 'completion-certificate';

/**
 * Documents are generated and stored by their OWNING backend; the frontend only
 * downloads the file. No document is generated client-side.
 *   - Application PDF / Offer Letter / Completion Certificate → TEC (owner)
 *   - Attendance Form → Coordinator (owner + where the file lives)
 * Same download experience for every document; only the owning backend differs.
 */
export const documentService = {
  download: async (applicationId: string, type: DownloadType, fileName: string): Promise<void> => {
    const blob =
      type === 'attendance-form'
        ? await coordinatorApi.blob(`/student/attendance-form/${applicationId}`)
        : await tecApi.blob(`/applications/${applicationId}/documents/${type}`);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};
