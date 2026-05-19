// This file is kept for backwards-compatibility only.
// All display config is now in data-helpers.ts
// All mock data has been removed — real data comes from the API.
export { statusConfig, priorityConfig, formatDate, formatDateTime } from './data-helpers';
export type { ApiMailStatus as MailStatus, ApiMailPriority as Priority } from './mail-service';

// Re-export MailType for any remaining imports
export type MailType = 'incoming' | 'outgoing' | 'internal';
export type SupportType = 'paper' | 'email' | 'fax';
