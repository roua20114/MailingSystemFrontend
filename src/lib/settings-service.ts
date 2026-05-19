import { apiRequest } from './api-client';

export interface ApiMailCategory {
  _id: string;
  name: string;
  maxProcessingTime: number;
  description?: string;
  isActive: boolean;
}

export interface ApiSystemConfig {
  institutionName: string;
  logoUrl?: string | null;
  globalTimeout: number;
  allowSelfRegistration: boolean;
}

export interface ApiAuditLog {
  _id: string;
  userId?: { _id: string; name: string; email: string };
  userEmail: string;
  action: string;
  entity: string;
  entityId?: string;
  changes?: Record<string, unknown>;
  createdAt: string;
}

export const settingsService = {
  async getMailCategories(): Promise<ApiMailCategory[]> {
    const res = await apiRequest<{ success: boolean; data: { mailCategories: ApiMailCategory[] } }>('/mail-categories');
    return res.data.mailCategories;
  },

  async createMailCategory(payload: { name: string; maxProcessingTime: number; description?: string }): Promise<ApiMailCategory> {
    const res = await apiRequest<{ success: boolean; data: { mailCategory: ApiMailCategory } }>('/mail-categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data.mailCategory;
  },

  async updateMailCategory(id: string, payload: Partial<ApiMailCategory>): Promise<ApiMailCategory> {
    const res = await apiRequest<{ success: boolean; data: { mailCategory: ApiMailCategory } }>(`/mail-categories/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data.mailCategory;
  },

  async deleteMailCategory(id: string): Promise<void> {
    await apiRequest(`/mail-categories/${id}`, { method: 'DELETE' });
  },

  async getSystemConfig(): Promise<ApiSystemConfig> {
    const res = await apiRequest<{ success: boolean; data: { config: ApiSystemConfig } }>('/config');
    return res.data.config;
  },

  async updateSystemConfig(payload: Partial<ApiSystemConfig>): Promise<ApiSystemConfig> {
    const res = await apiRequest<{ success: boolean; data: { config: ApiSystemConfig } }>('/config', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    return res.data.config;
  },

  async getAuditLogs(params?: Record<string, string>): Promise<{ logs: ApiAuditLog[]; total: number }> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await apiRequest<{
      success: boolean; data: ApiAuditLog[];
      meta: { total: number; page: number; limit: number };
    }>(`/audit-logs${qs}`);
    return { logs: res.data, total: res.meta.total };
  },
};
