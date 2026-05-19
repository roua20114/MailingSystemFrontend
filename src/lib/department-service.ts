import { apiRequest } from './api-client';

export interface ApiDepartment {
  _id: string;
  name: string;
  parentId?: string | null;
  headUserId?: { _id: string; name: string } | string | null;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

interface DeptListResponse { success: boolean; data: { departments: ApiDepartment[] } }
interface DeptSingleResponse { success: boolean; data: { department: ApiDepartment } }

export const departmentService = {
  async getAll(): Promise<ApiDepartment[]> {
    const res = await apiRequest<DeptListResponse>('/departments');
    return res.data.departments;
  },

  async create(payload: { name: string; description?: string; parentId?: string }): Promise<ApiDepartment> {
    const res = await apiRequest<DeptSingleResponse>('/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.department;
  },

  async update(id: string, payload: Partial<{ name: string; description: string; isActive: boolean; headUserId: string }>): Promise<ApiDepartment> {
    const res = await apiRequest<DeptSingleResponse>(`/departments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data.department;
  },

  async delete(id: string): Promise<void> {
    await apiRequest(`/departments/${id}`, { method: 'DELETE' });
  },
};
