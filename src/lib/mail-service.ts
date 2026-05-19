import { apiRequest } from './api-client';

export type ApiMailStatus = 'Registered' | 'Under Review' | 'Assigned' | 'In Progress' | 'Processed';
export type ApiMailType = 'Incoming' | 'Outgoing' | 'Internal';
export type ApiMailPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface ApiMail {
  _id: string;
  referenceNumber: string;
  type: ApiMailType;
  subject: string;
  sender: string;
  status: ApiMailStatus;
  priority: ApiMailPriority;
  description?: string;
  instructions?: string;
  pdfUrl?: string;
  assignedTo?: { _id: string; name: string; email: string; role: string } | null;
  assignedDepartment?: { _id: string; name: string } | null;
  createdBy?: { _id: string; name: string; email: string };
  category?: { _id: string; name: string } | null;
  aiSummary?: string | null;
  aiSuggestedDepartment?: string | null;
  aiConfidenceScore?: number | null;
  slaDeadline?: string | null;
  isOverdue?: boolean;
  statusHistory?: Array<{
    status: string;
    changedBy?: { _id: string; name: string };
    changedAt: string;
    note?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

interface SingleResponse<T> {
  success: boolean;
  data: { mail: T };
}

interface StatsResponse {
  success: boolean;
  data: { stats: Record<string, number> };
}

export interface ApiComment {
  _id: string;
  mailId: string;
  userId: { _id: string; name: string; email: string; role: string };
  message: string;
  isInternal: boolean;
  createdAt: string;
}

// Only fields that are in createMailSchema — no slaDeadline (computed by backend)
interface CreateMailPayload {
  subject: string;
  sender: string;
  type: ApiMailType;
  priority?: ApiMailPriority;
  description?: string;
  category?: string;
  pdfUrl?: string;
}

interface AssignMailPayload {
  assignedTo: string;                // required — 24-char MongoDB ObjectId
  assignedDepartment?: string;       // optional
  instructions?: string;             // optional (backend no longer requires it)
  priority?: ApiMailPriority;        // optional override
}

export const mailService = {
  async getAll(params?: Record<string, string>): Promise<{ mails: ApiMail[]; total: number; totalPages: number }> {
    const qs = params ? '?' + new URLSearchParams(params).toString() : '';
    const res = await apiRequest<PaginatedResponse<ApiMail>>(`/mails${qs}`);
    return { mails: res.data, total: res.meta.total, totalPages: res.meta.totalPages };
  },

  async getById(id: string): Promise<ApiMail> {
    const res = await apiRequest<SingleResponse<ApiMail>>(`/mails/${id}`);
    return res.data.mail;
  },

  async create(payload: CreateMailPayload): Promise<ApiMail> {
    // Strip any undefined/empty optional fields before sending
    const body: Record<string, unknown> = {
      subject: payload.subject,
      sender: payload.sender,
      type: payload.type,
      priority: payload.priority ?? 'Medium',
    };
    if (payload.description) body.description = payload.description;
    if (payload.category) body.category = payload.category;
    if (payload.pdfUrl) body.pdfUrl = payload.pdfUrl;

    const res = await apiRequest<SingleResponse<ApiMail>>('/mails', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    return res.data.mail;
  },

  async updateStatus(id: string, status: ApiMailStatus, note?: string): Promise<ApiMail> {
    const body: Record<string, unknown> = { status };
    if (note) body.note = note;
    const res = await apiRequest<SingleResponse<ApiMail>>(`/mails/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return res.data.mail;
  },

  async assign(id: string, payload: AssignMailPayload): Promise<ApiMail> {
    // Build clean body — only send defined, non-empty values
    const body: Record<string, unknown> = { assignedTo: payload.assignedTo };
    if (payload.assignedDepartment) body.assignedDepartment = payload.assignedDepartment;
    if (payload.instructions && payload.instructions.trim()) body.instructions = payload.instructions.trim();
    if (payload.priority) body.priority = payload.priority;

    const res = await apiRequest<SingleResponse<ApiMail>>(`/mails/${id}/assign`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return res.data.mail;
  },

  async getStats(): Promise<Record<string, number>> {
    const res = await apiRequest<StatsResponse>('/mails/stats');
    return res.data.stats;
  },

  async getComments(mailId: string): Promise<ApiComment[]> {
    const res = await apiRequest<{ success: boolean; data: { comments: ApiComment[] } }>(`/mails/${mailId}/comments`);
    return res.data.comments;
  },

  async addComment(mailId: string, message: string, isInternal = false): Promise<ApiComment> {
    const res = await apiRequest<{ success: boolean; data: { comment: ApiComment } }>(
      `/mails/${mailId}/comments`,
      { method: 'POST', body: JSON.stringify({ message, isInternal }) }
    );
    return res.data.comment;
  },
};
