import { cn } from '@/lib/utils';
import { statusConfig, priorityConfig } from '@/lib/data-helpers';
import type { ApiMailStatus, ApiMailPriority } from '@/lib/mail-service';

export function StatusBadge({ status }: { status: ApiMailStatus }) {
  const config = statusConfig[status] ?? { label: status, color: 'text-muted-foreground', bgColor: 'bg-muted' };
  const dotColor =
    status === 'Processed' ? 'bg-success' :
    status === 'In Progress' ? 'bg-warning' :
    status === 'Registered' ? 'bg-info' : 'bg-purple-500';
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', config.bgColor, config.color)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', dotColor)} />
      {config.label}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: ApiMailPriority }) {
  const config = priorityConfig[priority] ?? { label: priority, color: 'text-muted-foreground', bgColor: 'bg-muted' };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', config.bgColor, config.color)}>
      {config.label}
    </span>
  );
}
