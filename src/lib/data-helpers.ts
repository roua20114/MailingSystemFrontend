// Shared helpers: map backend values → frontend display values
import type { ApiMailStatus, ApiMailPriority } from './mail-service';

export const statusConfig: Record<ApiMailStatus, { label: string; color: string; bgColor: string }> = {
  'Registered':   { label: 'Enregistré',      color: 'text-info',           bgColor: 'bg-info/10' },
  'Under Review': { label: 'En révision',      color: 'text-purple-600',     bgColor: 'bg-purple-100' },
  'Assigned':     { label: 'Assigné',          color: 'text-purple-700',     bgColor: 'bg-purple-100' },
  'In Progress':  { label: 'En cours',         color: 'text-warning',        bgColor: 'bg-warning/10' },
  'Processed':    { label: 'Traité',           color: 'text-success',        bgColor: 'bg-success/10' },
};

export const priorityConfig: Record<ApiMailPriority, { label: string; color: string; bgColor: string }> = {
  Urgent: { label: 'Urgent', color: 'text-destructive',    bgColor: 'bg-destructive/10' },
  High:   { label: 'Élevée', color: 'text-orange-600',     bgColor: 'bg-orange-100' },
  Medium: { label: 'Normal', color: 'text-info',           bgColor: 'bg-info/10' },
  Low:    { label: 'Faible', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

export const statusOrder: ApiMailStatus[] = [
  'Registered', 'Under Review', 'Assigned', 'In Progress', 'Processed',
];

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
