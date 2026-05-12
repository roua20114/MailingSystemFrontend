import { useMemo } from 'react';
import { cn } from '@/lib/utils';

export interface PasswordCheck {
  label: string;
  passed: boolean;
}

export function evaluatePassword(pwd: string): PasswordCheck[] {
  return [
    { label: 'Au moins 8 caractères', passed: pwd.length >= 8 },
    { label: 'Une majuscule', passed: /[A-Z]/.test(pwd) },
    { label: 'Une minuscule', passed: /[a-z]/.test(pwd) },
    { label: 'Un chiffre', passed: /\d/.test(pwd) },
  ];
}

export function PasswordStrength({ password }: { password: string }) {
  const checks = useMemo(() => evaluatePassword(password), [password]);
  const score = checks.filter((c) => c.passed).length;
  const labels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Excellent'];
  const colors = ['bg-destructive', 'bg-destructive', 'bg-warning', 'bg-info', 'bg-success'];

  if (!password) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 grid grid-cols-4 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={cn(
                'h-1 rounded-full transition-colors',
                i < score ? colors[score] : 'bg-muted',
              )}
            />
          ))}
        </div>
        <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
          {labels[score]}
        </span>
      </div>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-1">
        {checks.map((c) => (
          <li
            key={c.label}
            className={cn(
              'flex items-center gap-1.5 text-[11px] transition-colors',
              c.passed ? 'text-success' : 'text-muted-foreground',
            )}
          >
            <span
              className={cn(
                'inline-flex h-3 w-3 items-center justify-center rounded-full text-[8px] font-bold',
                c.passed ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground',
              )}
            >
              {c.passed ? '✓' : '·'}
            </span>
            {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
