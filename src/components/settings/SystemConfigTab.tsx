import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Settings2, Save, History, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/lib/settings-service';
import { formatDateTime } from '@/lib/data-helpers';
import { TableSkeleton } from '@/components/LoadingSkeleton';

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-50 text-green-700 border-green-200',
  UPDATE: 'bg-primary/10 text-primary border-primary/20',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/20',
  LOGIN: 'bg-purple-50 text-purple-700 border-purple-200',
  LOGOUT: 'bg-muted text-muted-foreground border-border',
  ASSIGN: 'bg-warning/10 text-warning border-warning/20',
  STATUS_CHANGE: 'bg-info/10 text-info border-info/20',
};

export default function SystemConfigTab() {
  const qc = useQueryClient();
  const [auditSearch, setAuditSearch] = useState('');
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const { data: config, isLoading: configLoading } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => settingsService.getSystemConfig(),
  });

  const { data: auditData, isLoading: auditLoading } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => settingsService.getAuditLogs({ limit: '50' }),
  });

  const configMutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) => settingsService.updateSystemConfig(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['system-config'] }); toast.success('Configuration mise à jour'); setEditingKey(null); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const logs = auditData?.logs ?? [];
  const filteredLogs = logs.filter(log =>
    (log.userId as { name: string } | undefined)?.name?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.userEmail?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.entity?.toLowerCase().includes(auditSearch.toLowerCase()) ||
    log.action?.toLowerCase().includes(auditSearch.toLowerCase())
  );

  const configFields: Array<{ key: keyof typeof config; label: string; description: string; type: 'text' | 'number' | 'boolean' }> = [
    { key: 'institutionName', label: 'Nom de l\'institution', description: 'Nom officiel affiché dans les en-têtes', type: 'text' },
    { key: 'globalTimeout', label: 'Délai global SLA (jours)', description: 'Nombre de jours par défaut pour le traitement', type: 'number' },
    { key: 'allowSelfRegistration', label: 'Auto-inscription activée', description: 'Permettre aux utilisateurs de créer leur compte', type: 'boolean' },
  ];

  return (
    <div className="space-y-6">
      {/* System Config */}
      <Card className="glass-card">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2"><Settings2 className="h-4 w-4 text-primary" /> Configuration Système</CardTitle>
        </CardHeader>
        <CardContent>
          {configLoading ? <TableSkeleton rows={3} /> : !config ? (
            <p className="text-sm text-muted-foreground text-center py-4">Configuration non disponible</p>
          ) : (
            <div className="space-y-3">
              {configFields.map(field => {
                const value = config[field.key as keyof typeof config];
                const isEditing = editingKey === field.key;
                return (
                  <div key={field.key} className="flex items-center justify-between rounded-xl border p-4">
                    <div>
                      <p className="text-sm font-medium">{field.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {isEditing ? (
                        <>
                          <Input
                            className="h-7 text-xs w-40"
                            value={editValue}
                            type={field.type === 'number' ? 'number' : 'text'}
                            onChange={e => setEditValue(e.target.value)}
                          />
                          <Button size="sm" className="h-7 text-xs gap-1" onClick={() => configMutation.mutate({ [field.key]: field.type === 'number' ? Number(editValue) : field.type === 'boolean' ? editValue === 'true' : editValue })} disabled={configMutation.isPending}>
                            {configMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingKey(null)}>✕</Button>
                        </>
                      ) : (
                        <>
                          <span className="text-sm font-medium rounded-lg bg-muted px-2.5 py-1">
                            {field.type === 'boolean' ? (value ? '✓ Activé' : '✗ Désactivé') : String(value ?? '—')}
                          </span>
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingKey(field.key); setEditValue(String(value ?? '')); }}>
                            Modifier
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base flex items-center gap-2"><History className="h-4 w-4 text-primary" /> Journal d'Audit</CardTitle>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input className="h-8 pl-8 w-52 text-xs" placeholder="Rechercher..." value={auditSearch} onChange={e => setAuditSearch(e.target.value)} />
          </div>
        </CardHeader>
        <CardContent>
          {auditLoading ? <TableSkeleton rows={6} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Utilisateur</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Entité</TableHead>
                  <TableHead className="text-xs">Détails</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucun journal trouvé</TableCell></TableRow>
                ) : filteredLogs.map(log => (
                  <TableRow key={log._id}>
                    <TableCell className="text-xs">{formatDateTime(log.createdAt)}</TableCell>
                    <TableCell className="text-xs font-medium">{(log.userId as { name: string } | undefined)?.name ?? log.userEmail}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] ${actionColors[log.action] ?? ''}`}>{log.action}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">{log.entity}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[220px] truncate">
                      {log.changes ? JSON.stringify(log.changes) : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
