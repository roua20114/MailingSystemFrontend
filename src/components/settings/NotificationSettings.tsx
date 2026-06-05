import { useState, useEffect, useCallback } from 'react';
import { Bell, Mail, MonitorSmartphone, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { apiRequest } from '@/lib/api-client';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChannelPrefs {
  inApp: boolean;
  email: boolean;
}

interface NotificationPreferences {
  assignedMail: ChannelPrefs;
  slaAlert: ChannelPrefs;
  statusUpdates: ChannelPrefs;
}

type EventKey = keyof NotificationPreferences;
type ChannelKey = keyof ChannelPrefs;

interface UpdatingState {
  key: EventKey;
  channel: ChannelKey;
}

// ── Config des lignes d'événements ────────────────────────────────────────────

const EVENT_ROWS: {
  key: EventKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'assignedMail',
    label: 'Nouveau courrier assigné',
    description: `Alerte lorsqu'un document vous est attribué par le directeur.`,
    icon: <Bell className="h-4 w-4 text-primary" />,
  },
  {
    key: 'slaAlert',
    label: 'Rappels et Échéances SLA',
    description: `Alerte lorsqu'un courrier approche de sa date limite de traitement.`,
    icon: (
      <svg
        className="h-4 w-4 text-amber-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: 'statusUpdates',
    label: 'Mises à jour de statut',
    description: 'Suivi des courriers que vous avez initiés ou enregistrés.',
    icon: (
      <svg
        className="h-4 w-4 text-emerald-500"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

// ── Valeurs par défaut ────────────────────────────────────────────────────────

const DEFAULT_PREFS: NotificationPreferences = {
  assignedMail:  { inApp: true,  email: true  },
  slaAlert:      { inApp: true,  email: true  },
  statusUpdates: { inApp: true,  email: false },
};

// ── Composant principal ───────────────────────────────────────────────────────

export default function NotificationSettings() {
  const [prefs, setPrefs]         = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating]   = useState<UpdatingState | null>(null);
  const [syncMsg, setSyncMsg]     = useState<'success' | 'error' | null>(null);
  const [loadError, setLoadError] = useState(false);

  // ── Chargement initial ────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiRequest<{
          success: boolean;
          data: { preferences: NotificationPreferences };
        }>('/users/notification-settings');
        if (!cancelled) {
          setPrefs(res.data.preferences);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Mise à jour optimiste ─────────────────────────────────────────────────

  const handleToggle = useCallback(
    async (eventKey: EventKey, channel: ChannelKey) => {
      if (updating) return;

      const prev = prefs[eventKey][channel];
      const next = !prev;

      setPrefs(p => ({
        ...p,
        [eventKey]: { ...p[eventKey], [channel]: next },
      }));

      setUpdating({ key: eventKey, channel });
      setSyncMsg(null);

      try {
        await apiRequest('/users/notification-settings', {
          method: 'PATCH',
          body: JSON.stringify({
            [eventKey]: { [channel]: next },
          }),
        });
        setSyncMsg('success');
      } catch {
        // Rollback en cas d'erreur
        setPrefs(p => ({
          ...p,
          [eventKey]: { ...p[eventKey], [channel]: prev },
        }));
        setSyncMsg('error');
      } finally {
        setUpdating(null);
        setTimeout(() => setSyncMsg(null), 2500);
      }
    },
    [prefs, updating]
  );

  const isUpdating = (key: EventKey, channel: ChannelKey) =>
    updating?.key === key && updating?.channel === channel;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* En-tête */}
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Préférences de notifications
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Choisissez comment vous souhaitez être informé des événements.
          </p>
        </div>

        {/* Badge de synchronisation */}
        <div
          className={cn(
            'flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full transition-all duration-300',
            syncMsg === 'success'
              ? 'bg-emerald-50 text-emerald-600 opacity-100'
              : syncMsg === 'error'
              ? 'bg-red-50 text-red-500 opacity-100'
              : 'opacity-0 pointer-events-none'
          )}
        >
          {syncMsg === 'success' ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Préférences synchronisées
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5" />
              Erreur de sauvegarde
            </>
          )}
        </div>
      </div>

      {/* En-têtes des colonnes */}
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-6 py-3 bg-slate-50 border-b border-slate-100">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Événement
        </span>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[90px] justify-center">
          <MonitorSmartphone className="h-3.5 w-3.5" />
          Plateforme
        </div>
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground min-w-[90px] justify-center">
          <Mail className="h-3.5 w-3.5" />
          Email
        </div>
      </div>

      {/* Lignes d'événements */}
      <div className="divide-y divide-slate-100">
        {isLoading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-x-6 px-6 py-4 items-center animate-pulse">
                <div className="space-y-2">
                  <div className="h-3.5 bg-slate-100 rounded w-48" />
                  <div className="h-2.5 bg-slate-50 rounded w-72" />
                </div>
                <div className="h-6 w-11 bg-slate-100 rounded-full mx-auto" />
                <div className="h-6 w-11 bg-slate-100 rounded-full mx-auto" />
              </div>
            ))
          : EVENT_ROWS.map((row, idx) => (
              <div
                key={row.key}
                className={cn(
                  'grid grid-cols-[1fr_auto_auto] gap-x-6 px-6 py-4 items-center transition-colors',
                  idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50',
                  'hover:bg-slate-50'
                )}
              >
                {/* Colonne événement */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="mt-0.5 flex-shrink-0 p-1.5 rounded-lg bg-slate-100">
                    {row.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground leading-tight">
                      {row.label}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                      {row.description}
                    </p>
                  </div>
                </div>

                {/* Switch In-App */}
                <div className="flex flex-col items-center gap-1.5 min-w-[90px]">
                  {isUpdating(row.key, 'inApp') ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={prefs[row.key].inApp}
                      onCheckedChange={() => handleToggle(row.key, 'inApp')}
                      disabled={!!updating}
                      aria-label={`Notifications in-app - ${row.label}`}
                    />
                  )}
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      prefs[row.key].inApp ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {prefs[row.key].inApp ? 'Activé' : 'Désactivé'}
                  </span>
                </div>

                {/* Switch Email */}
                <div className="flex flex-col items-center gap-1.5 min-w-[90px]">
                  {isUpdating(row.key, 'email') ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  ) : (
                    <Switch
                      checked={prefs[row.key].email}
                      onCheckedChange={() => handleToggle(row.key, 'email')}
                      disabled={!!updating}
                      aria-label={`Notifications email - ${row.label}`}
                    />
                  )}
                  <span
                    className={cn(
                      'text-[10px] font-medium transition-colors',
                      prefs[row.key].email ? 'text-primary' : 'text-muted-foreground'
                    )}
                  >
                    {prefs[row.key].email ? 'Activé' : 'Désactivé'}
                  </span>
                </div>
              </div>
            ))}
      </div>

      {/* Pied de carte — erreur de chargement */}
      {loadError && (
        <div className="px-6 py-3 bg-amber-50 border-t border-amber-100 flex items-center gap-2 text-xs text-amber-700">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          Impossible de charger vos préférences actuelles. Les valeurs affichées sont celles par défaut.
        </div>
      )}

      {/* Pied de carte — note informative */}
      {!loadError && (
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100">
          <p className="text-[11px] text-muted-foreground">
            Les préférences sont sauvegardées automatiquement à chaque modification.
            Les notifications email sont envoyées à l&apos;adresse associée à votre compte.
          </p>
        </div>
      )}
    </div>
  );
}