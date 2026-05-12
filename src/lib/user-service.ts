import { apiRequest } from './api-client';

export interface ApiUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  departmentId?: { _id: string; name: string } | string | null;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
}

interface UserListResponse {
  success: boolean;
  data: ApiUser[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
interface UserSingleResponse { success: boolean; data: { user: ApiUser } }

export const userService = {
  async getAll(params?: Record<string, string>): Promise<ApiUser[]> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await apiRequest<UserListResponse>(`/users${qs}`);
    return res.data;
  },

  async create(payload: {
    name: string;
    email: string;
    password: string;
    role: string;
    departmentId?: string;
  }): Promise<ApiUser> {
    const res = await apiRequest<UserSingleResponse>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.user;
  },

  async update(id: string, payload: Partial<ApiUser & { password?: string }>): Promise<ApiUser> {
    const res = await apiRequest<UserSingleResponse>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data.user;
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/users/${id}`, { method: 'DELETE' });
  },
};
