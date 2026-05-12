// Types and display config only — no more mock data.
// All real data comes from the API via the service files.

export type UserRole = 'admin' | 'director' | 'secretary' | 'professor' | 'service-lead';

export const roleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  director: 'Directeur',
  secretary: 'Secrétaire',
  professor: 'Professeur',
  'service-lead': 'Chef de service',
};

export const roleColors: Record<UserRole, string> = {
  admin: 'bg-destructive/10 text-destructive',
  director: 'bg-primary/10 text-primary',
  secretary: 'bg-info/10 text-info',
  professor: 'bg-purple-100 text-purple-700',
  'service-lead': 'bg-warning/10 text-warning',
};

// --- Kept for type compatibility, but these interfaces now mirror the API shapes ---
export interface SystemUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId: string;
  departmentName: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  headUserId: string | null;
  headUserName: string | null;
  description: string;
  createdAt: string;
}

export interface MailCategory {
  id: string;
  name: string;
  mailType: 'incoming' | 'outgoing' | 'internal';
  maxProcessingDays: number;
  description: string;
  isActive: boolean;
}

export interface SystemConfig {
  key: string;
  label: string;
  value: string;
  type: 'text' | 'number' | 'boolean';
  description: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  action: string;
  entity: string;
  entityId: string;
  details: string;
  timestamp: string;
}
