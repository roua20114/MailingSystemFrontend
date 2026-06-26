import { useState } from 'react';
import { Bell, Check, CheckCheck, Trash2, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationService, type ApiNotification } from '@/lib/notification-service';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

// ── Icon colour per type ─────────────────────────────────────────────────────
const TYPE_STYLE: Record<string, { dot: string; bg: string }> = {
  MAIL_REGISTERED:   { dot: 'bg-blue-500',   bg: 'bg-blue-50 dark:bg-blue-950/40' },
  MAIL_UNDER_REVIEW: { dot: 'bg-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/40' },
  MAIL_ASSIGNED:     { dot: 'bg-cyan-500',   bg: 'bg-cyan-50 dark:bg-cyan-950/40' },
  MAIL_IN_PROGRESS:  { dot: 'bg-amber-500',  bg: 'bg-amber-50 dark:bg-amber-950/40' },
  MAIL_PROCESSED:    { dot: 'bg-green-500',  bg: 'bg-green-50 dark:bg-green-950/40' },
   DEMAND_CREATED:    { dot: 'bg-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/40' },   // ← add
  DEMAND_FORWARDED:  { dot: 'bg-violet-500', bg: 'bg-violet-50 dark:bg-violet-950/40' },   // ← add
  DEMAND_ANSWERED:   { dot: 'bg-teal-500',   bg: 'bg-teal-50 dark:bg-teal-950/40' },       // ← add

};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'à l\'instant';
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
}

export function NotificationBell() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationService.getAll(),
    refetchInterval: 15000, // poll every 15 s
    refetchIntervalInBackground: false,
  });

  const notifications = data?.notifications ?? [];
  const unreadCount   = data?.unreadCount   ?? 0;

  const markOne = useMutation({
    mutationFn: (id: string) => notificationService.markOneRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAll = useMutation({
    mutationFn: () => notificationService.markAllRead(),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const deleteOne = useMutation({
    mutationFn: (id: string) => notificationService.deleteOne(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const handleClickNotif = (n: ApiNotification) => {
  if (!n.read) markOne.mutate(n._id);
  setOpen(false);

  // ── Mail notifications ──────────────────────────────────────────────────
  if (n.type === 'MAIL_ASSIGNED' || n.type === 'MAIL_IN_PROGRESS' || n.type === 'MAIL_PROCESSED') {
    navigate('/tracking');
    return;
  }
  if (n.type === 'MAIL_REGISTERED' || n.type === 'MAIL_UNDER_REVIEW') {
    navigate('/dispatch');
    return;
  }

  // ── Demand notifications ────────────────────────────────────────────────
  if (n.type === 'DEMAND_CREATED') {
    // Admin → go to demands management page
    navigate('/demands');
    return;
  }
  if (n.type === 'DEMAND_FORWARDED') {
    // Director → go to demands management page, demand is highlighted by mailId
    navigate('/demands');
    return;
  }
  if (n.type === 'DEMAND_ANSWERED') {
    // Professor → go to their dashboard (demands list)
    navigate('/');
    return;
  }
};

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        className="w-[380px] p-0 shadow-xl"
        sideOffset={8}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Notifications</span>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-4 px-1.5 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              {markAll.isPending
                ? <Loader2 className="h-3 w-3 animate-spin" />
                : <CheckCheck className="h-3 w-3" />}
              Tout lire
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2 text-muted-foreground">
              <Mail className="h-8 w-8 opacity-20" />
              <p className="text-sm">Aucune notification</p>
            </div>
          ) : notifications.map(n => {
            const style = TYPE_STYLE[n.type] ?? { dot: 'bg-gray-400', bg: '' };
            return (
              <div
                key={n._id}
                className={cn(
                  'group flex gap-3 px-4 py-3 border-b last:border-0 cursor-pointer transition-colors hover:bg-muted/60',
                  !n.read && style.bg
                )}
                onClick={() => handleClickNotif(n)}
              >
                {/* Dot */}
                <div className="mt-1.5 flex-shrink-0">
                  <div className={cn('h-2 w-2 rounded-full', style.dot, n.read && 'opacity-30')} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={cn('text-xs font-semibold leading-tight', n.read && 'text-muted-foreground font-normal')}>
                    {n.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug line-clamp-2">
                    {n.message}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[10px] text-muted-foreground/60">{timeAgo(n.createdAt)}</span>
                    {n.referenceNumber && (
                      <span className="text-[10px] font-mono text-primary/60">{n.referenceNumber}</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  {!n.read && (
                    <button
                      className="rounded p-1 hover:bg-muted"
                      title="Marquer comme lu"
                      onClick={e => { e.stopPropagation(); markOne.mutate(n._id); }}
                    >
                      <Check className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                  <button
                    className="rounded p-1 hover:bg-muted"
                    title="Supprimer"
                    onClick={e => { e.stopPropagation(); deleteOne.mutate(n._id); }}
                  >
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-xs text-muted-foreground gap-1"
              onClick={() => { navigate('/archives'); setOpen(false); }}
            >
              Voir les courriers traités <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}