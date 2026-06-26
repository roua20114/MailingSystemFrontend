import { apiRequest } from './api-client';

export type DemandStatus = 'Pending' | 'Forwarded' | 'In Progress' | 'Resolved' | 'Rejected';
export type DemandType   = 'Congé' | 'Problème technique' | 'Demande de document' | 'Réclamation' | 'Autre';

export interface Demand {
  _id: string;
  type: DemandType;
  subject: string;
  description: string;
  fileUrl?: string | null;
  status: DemandStatus;
  adminNote?: string | null;
  directorResponse?: string | null; 
  forwardedToDirector: boolean;
  professor?: { _id: string; name: string; email: string };
  statusHistory: Array<{
    status: string;
    changedBy?: { name: string; role: string };
    changedAt: string;
    note?: string;
  }>;
  createdAt: string;
}

export const demandService = {
 async createDemand(data: {
  type: string;
  subject: string;
  description: string;
  file?: File | null;
}): Promise<Demand> {
  const fd = new FormData();
  fd.append('type', data.type);
  fd.append('subject', data.subject);
  fd.append('description', data.description);
  if (data.file) fd.append('file', data.file);

  const res = await apiRequest<{ success: boolean; data: { demand: Demand } }>('/demands', {
    method: 'POST',
    body: fd,
    // No Content-Type header — browser sets it automatically with boundary
  });
  return res.data.demand;
 },

  async getMyDemands(): Promise<Demand[]> {
    const res = await apiRequest<{ success: boolean; data: { demands: Demand[] } }>('/demands/my');
    return res.data.demands;
  },

  async getAllDemands(): Promise<Demand[]> {
    const res = await apiRequest<{ success: boolean; data: { demands: Demand[] } }>('/demands');
    return res.data.demands;
  },

  async updateStatus(id: string, payload: {
    status?: DemandStatus;
    adminNote?: string;
    forwardedToDirector?: boolean;
    directorResponse?: string;
    directorAction?: 'accept' | 'reject';
  }): Promise<Demand> {
    const res = await apiRequest<{ success: boolean; data: { demand: Demand } }>(`/demands/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return res.data.demand;
  },

    async updateDemand(id: string, data: {
    type?: string;
    subject?: string;
    description?: string;
    file?: File | null;
    }): Promise<Demand> {
    const fd = new FormData();
    if (data.type)        fd.append('type', data.type);
    if (data.subject)     fd.append('subject', data.subject);
    if (data.description) fd.append('description', data.description);
    if (data.file)        fd.append('file', data.file);

    const res = await apiRequest<{ success: boolean; data: { demand: Demand } }>(`/demands/${id}`, {
        method: 'PATCH',
        body: fd,
    });
    return res.data.demand;
    },

    async deleteDemand(id: string): Promise<void> {
    await apiRequest(`/demands/${id}`, { method: 'DELETE' });
    },
};