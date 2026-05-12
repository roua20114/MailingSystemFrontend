import { Check, Clock, Eye, UserCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statusOrder } from '@/lib/data-helpers';
import type { ApiMailStatus } from '@/lib/mail-service';

const steps: { key: ApiMailStatus; label: string; icon: React.ElementType }[] = [
  { key: 'Registered',   label: 'Enregistré',      icon: Clock },
  { key: 'Under Review', label: 'Examen Directeur', icon: Eye },
  { key: 'Assigned',     label: 'Assigné',          icon: UserCheck },
  { key: 'In Progress',  label: 'En cours',         icon: Loader2 },
  { key: 'Processed',    label: 'Traité',           icon: Check },
];

export function MailStatusStepper({ currentStatus }: { currentStatus: ApiMailStatus }) {
  const currentIndex = statusOrder.indexOf(currentStatus);
  return (
    <div className="flex items-center gap-1">
      {steps.map((step, i) => {
        const done = i <= currentIndex;
        const active = i === currentIndex;
        const Icon = step.icon;
        return (
          <div key={step.key} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full border-2 transition-all',
                done ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-muted text-muted-foreground',
                active && 'ring-4 ring-primary/20'
              )}>
                <Icon className={cn('h-4 w-4', active && step.key === 'In Progress' && 'animate-spin')} />
              </div>
              <span className={cn('text-[10px] font-medium text-center max-w-[70px]', done ? 'text-foreground' : 'text-muted-foreground')}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={cn('h-0.5 w-6 mt-[-16px]', i < currentIndex ? 'bg-primary' : 'bg-border')} />
            )}
          </div>
        );
      })}
    </div>
  );
}
