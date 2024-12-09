import { api } from './api';
import { NotificationsResponse } from '@/types/notifications';

export const notificationsService = {
  async fetchNotifications(): Promise<NotificationsResponse> {
    const response = await api.get('/notifications/');
    return response.data;
  },

  async markNotificationRead(id: number) {
    const response = await api.post(`/notifications/${id}/mark_read/`);
    return response.data;
  },

  async markAllNotificationsRead() {
    const response = await api.post('/notifications/mark_all_read/');
    return response.data;
  }
}; 