import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  alert?: boolean;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}

export function KPICard({ title, value, icon: Icon, trend, alert, color = 'primary' }: KPICardProps) {
  const colorMap = {
    primary: { bg: 'bg-primary/10', text: 'text-primary' },
    success: { bg: 'bg-success/10', text: 'text-success' },
    warning: { bg: 'bg-warning/10', text: 'text-warning' },
    destructive: { bg: 'bg-destructive/10', text: 'text-destructive' },
  };
  const c = alert ? colorMap.destructive : colorMap[color];

  return (
    <div className={cn(
      'rounded-xl border bg-card p-5 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
      alert && 'border-destructive/20 bg-destructive/[0.02]'
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          <p className={cn('mt-2 text-3xl font-bold tracking-tight', alert ? 'text-destructive' : 'text-foreground')}>{value}</p>
          {trend && <p className="mt-1.5 text-[11px] text-muted-foreground">{trend}</p>}
        </div>
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-xl', c.bg)}>
          <Icon className={cn('h-5 w-5', c.text)} />
        </div>
      </div>
    </div>
  );
}
