import type { Notification } from '../types';
import { studentApi } from '../lib/apiClient';

/**
 * Thin client for notifications (single shared collection; recipient-scoped).
 * The signed-in student reads and updates only their own notifications.
 */
export const notificationService = {
  getNotifications: async (_userId: string): Promise<Notification[]> => {
    return studentApi.get<Notification[]>('/me/notifications');
  },

  markAsRead: async (id: string): Promise<void> => {
    await studentApi.patch<void>(`/notifications/${id}/read`);
  },

  markAllAsRead: async (_userId: string): Promise<void> => {
    await studentApi.patch<void>('/notifications/read-all');
  },

  deleteNotification: async (id: string): Promise<void> => {
    await studentApi.del<void>(`/notifications/${id}`);
  },

  getUnreadCount: async (userId: string): Promise<number> => {
    const notifications = await notificationService.getNotifications(userId);
    return notifications.filter((n) => !n.read).length;
  },
};
