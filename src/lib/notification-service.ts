import { apiRequest } from './api-client';

export interface ApiNotification {
  _id: string;
  type: string;
  title: string;
  message: string;
  mailId: string | null;
  referenceNumber: string | null;
  read: boolean;
  createdAt: string;
  demandId:string;
}

interface NotifResponse {
  success: boolean;
  data: { notifications: ApiNotification[]; unreadCount: number };
}

export const notificationService = {
  async getAll(): Promise<{ notifications: ApiNotification[]; unreadCount: number }> {
    const res = await apiRequest<NotifResponse>('/notifications');
    return res.data;
  },
  async markOneRead(id: string): Promise<void> {
    await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
  },
  async markAllRead(): Promise<void> {
    await apiRequest('/notifications/read-all', { method: 'PUT' });
  },
  async deleteOne(id: string): Promise<void> {
    await apiRequest(`/notifications/${id}`, { method: 'DELETE' });
  },
};