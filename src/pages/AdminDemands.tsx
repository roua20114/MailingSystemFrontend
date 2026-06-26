import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { demandService, type Demand, type DemandStatus } from '@/lib/demand-service';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { toast } from 'sonner';
import { Clock, CheckCircle2, XCircle, AlertCircle, Send, FileText, Eye } from 'lucide-react';
import { formatDate } from '@/lib/data-helpers';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  Pending:       { label: 'En attente', color: 'bg-yellow-100 text-yellow-800 border-yellow-200',  icon: <Clock className="h-3 w-3" /> },
  Forwarded:     { label: 'Transmise',  color: 'bg-blue-100 text-blue-800 border-blue-200',        icon: <Send className="h-3 w-3" /> },
  'In Progress': { label: 'En cours',   color: 'bg-purple-100 text-purple-800 border-purple-200',  icon: <AlertCircle className="h-3 w-3" /> },
  Resolved:      { label: 'Traitée',    color: 'bg-green-100 text-green-800 border-green-200',     icon: <CheckCircle2 className="h-3 w-3" /> },
  Rejected:      { label: 'Rejetée',    color: 'bg-red-100 text-red-800 border-red-200',           icon: <XCircle className="h-3 w-3" /> },
};

function DemandStatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: 'bg-gray-100 text-gray-800', icon: null };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
      {cfg.icon}{cfg.label}
    </span>
  );
}

function DemandDetailModal({
  demand,
  open,
  onClose,
  role,
}: {
  demand: Demand | null;
  open: boolean;
  onClose: () => void;
  role: string;
}) {
  const qc = useQueryClient();
  const [status, setStatus]             = useState<DemandStatus | ''>('');
  const [note, setNote]                 = useState('');
  const [forward, setForward]           = useState(false);
  const [directorResponse, setDirectorResponse] = useState('');
  const [loading, setLoading]           = useState(false);

  if (!demand) return null;

  const isAdmin    = role === 'admin';
  const isDirector = role === 'director';

  const handleUpdate = async () => {
    if (!status && !note.trim() && !forward && !directorResponse.trim()) {
      toast.error('Veuillez remplir au moins un champ');
      return;
    }
    setLoading(true);
    try {
      await demandService.updateStatus(demand._id, {
        ...(status ? { status } : {}),
        ...(note.trim() ? { adminNote: note.trim() } : {}),
        ...(forward ? { forwardedToDirector: true } : {}),
        ...(directorResponse.trim() ? { directorResponse: directorResponse.trim() } : {}),
      });
      toast.success('Demande mise à jour');
      qc.invalidateQueries({ queryKey: ['all-demands'] });
      setStatus('');
      setNote('');
      setForward(false);
      setDirectorResponse('');
      onClose();
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">{demand.professor?.name}</span>
            <DemandStatusBadge status={demand.status} />
            {demand.forwardedToDirector && (
              <span className="text-xs text-blue-600 flex items-center gap-1">
                <Send className="h-3 w-3" /> Transmise au Directeur
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
            {([
              ['Professeur', demand.professor?.name ?? '—'],
              ['Email',      demand.professor?.email ?? '—'],
              ['Type',       demand.type],
              ['Date',       formatDate(demand.createdAt)],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="font-medium text-xs mt-0.5">{value}</p>
              </div>
            ))}
          </div>

          {/* Subject */}
          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground mb-1">Objet</p>
            <p className="font-medium text-sm">{demand.subject}</p>
          </div>

          {/* Description */}
          <div className="rounded-xl border p-4">
            <p className="text-xs text-muted-foreground mb-1">Description</p>
            <p className="text-sm whitespace-pre-wrap">{demand.description}</p>
          </div>

          {/* File */}
          {demand.fileUrl && (
            <div className="rounded-xl border p-4">
              <p className="text-xs text-muted-foreground mb-2">Document joint</p>
              <Button variant="outline" size="sm" onClick={() => window.open(demand.fileUrl!, '_blank')}>
                <FileText className="h-3.5 w-3.5 mr-1" /> Ouvrir le fichier
              </Button>
            </div>
          )}

          {/* Admin note */}
          {demand.adminNote && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 p-3">
              <p className="text-xs font-medium text-blue-700 mb-1">Note de l'administrateur</p>
              <p className="text-xs text-blue-600">{demand.adminNote}</p>
            </div>
          )}

          {/* Director response */}
          {/* Director response — shown to all roles */}
{demand.directorResponse && (
  <div className={`rounded-lg border p-3 ${
    demand.status === 'Resolved'
      ? 'bg-green-50 dark:bg-green-950/20 border-green-200'
      : 'bg-red-50 dark:bg-red-950/20 border-red-200'
  }`}>
    <p className={`text-xs font-medium mb-1 flex items-center gap-1 ${
      demand.status === 'Resolved' ? 'text-green-700' : 'text-red-700'
    }`}>
      {demand.status === 'Resolved'
        ? <><CheckCircle2 className="h-3.5 w-3.5" /> Demande acceptée par le Directeur</>
        : <><XCircle className="h-3.5 w-3.5" /> Demande rejetée par le Directeur</>}
    </p>
    <p className={`text-sm whitespace-pre-wrap ${
      demand.status === 'Resolved' ? 'text-green-700' : 'text-red-700'
    }`}>
      {demand.directorResponse}
    </p>
  </div>
)}

          {/* Status history */}
          <div className="rounded-xl border p-4">
            <p className="text-xs font-semibold mb-3">Historique</p>
            <div className="space-y-2">
              {demand.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs flex-wrap">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(h.changedAt).toLocaleString('fr-FR')}
                  </span>
                  <DemandStatusBadge status={h.status} />
                  {h.changedBy && <span className="text-muted-foreground">par {h.changedBy.name}</span>}
                  {h.note && <span className="text-muted-foreground">— {h.note}</span>}
                </div>
              ))}
            </div>
          </div>

          {/* ── Admin actions ── */}
          {isAdmin && (
            <div className="rounded-xl border border-dashed p-4 space-y-3 bg-muted/20">
              <p className="text-xs font-semibold">Actions administrateur</p>

              <div>
                <Label className="text-xs">Changer le statut</Label>
                <Select value={status} onValueChange={v => setStatus(v as DemandStatus)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Sélectionner un statut..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">En attente</SelectItem>
                    <SelectItem value="In Progress">En cours</SelectItem>
                    <SelectItem value="Resolved">Traitée</SelectItem>
                    <SelectItem value="Rejected">Rejetée</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Note pour le professeur</Label>
                <Textarea
                  className="mt-1"
                  rows={3}
                  placeholder="Ajoutez une note visible par le professeur..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
              </div>

              {!demand.forwardedToDirector && (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="forward"
                    checked={forward}
                    onChange={e => {
                      setForward(e.target.checked);
                      if (e.target.checked) setStatus('In Progress');
                    }}
                    className="h-4 w-4 rounded border"
                  />
                  <label htmlFor="forward" className="text-xs cursor-pointer">
                    Transmettre au Directeur (statut → En cours automatiquement)
                  </label>
                </div>
              )}
            </div>
          )}

          {/* ── Director actions ── */}
          {/* ── Director actions ── */}
{isDirector && demand.forwardedToDirector && !demand.directorResponse && (
  <div className="rounded-xl border border-dashed p-4 space-y-3 bg-muted/20">
    <p className="text-xs font-semibold">Décision du Directeur</p>

    <Textarea
      rows={3}
      placeholder="Commentaire optionnel (visible par le professeur et l'admin)..."
      value={directorResponse}
      onChange={e => setDirectorResponse(e.target.value)}
    />

    <div className="flex gap-2">
      <Button
        className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-2"
        onClick={async () => {
          setLoading(true);
          try {
            await demandService.updateStatus(demand._id, {
              directorAction: 'accept',
              ...(directorResponse.trim() ? { directorResponse: directorResponse.trim() } : {}),
            });
            toast.success('Demande acceptée');
            qc.invalidateQueries({ queryKey: ['all-demands'] });
            onClose();
          } catch { toast.error('Erreur'); }
          finally { setLoading(false); }
        }}
        disabled={loading}
      >
        <CheckCircle2 className="h-4 w-4" /> Accepter
      </Button>
      <Button
        className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
        onClick={async () => {
          setLoading(true);
          try {
            await demandService.updateStatus(demand._id, {
              directorAction: 'reject',
              ...(directorResponse.trim() ? { directorResponse: directorResponse.trim() } : {}),
            });
            toast.success('Demande rejetée');
            qc.invalidateQueries({ queryKey: ['all-demands'] });
            onClose();
          } catch { toast.error('Erreur'); }
          finally { setLoading(false); }
        }}
        disabled={loading}
      >
        <XCircle className="h-4 w-4" /> Rejeter
      </Button>
    </div>
  </div>
)}

{/* Show result after decision */}
        {isDirector && demand.directorResponse && (
        <div className={`rounded-lg border p-3 flex items-center gap-2 ${
            demand.status === 'Resolved'
            ? 'bg-green-50 border-green-200'
            : 'bg-red-50 border-red-200'
        }`}>
        {demand.status === 'Resolved'
            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
            : <XCircle className="h-4 w-4 text-red-600" />}
            <span className={`text-xs font-medium ${
            demand.status === 'Resolved' ? 'text-green-700' : 'text-red-700'
            }`}>
        {demand.status === 'Resolved' ? 'Vous avez accepté cette demande' : 'Vous avez rejeté cette demande'}
            </span>
        </div>
        )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          {(isAdmin || (isDirector && demand.forwardedToDirector && !demand.directorResponse)) && (
            <Button onClick={handleUpdate} disabled={loading}>
              {loading ? 'Enregistrement...' : isDirector ? 'Envoyer la réponse' : 'Enregistrer'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminDemands() {
  const { user }  = useAuth();
  const role      = user?.role ?? '';
  const [selected, setSelected]         = useState<Demand | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ['all-demands'],
    queryFn: () => demandService.getAllDemands(),
  });

  const filtered = filterStatus === 'all' ? demands : demands.filter(d => d.status === filterStatus);

  const counts = {
    Pending:       demands.filter(d => d.status === 'Pending').length,
    'In Progress': demands.filter(d => d.status === 'In Progress').length,
    Resolved:      demands.filter(d => d.status === 'Resolved').length,
    Rejected:      demands.filter(d => d.status === 'Rejected').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            <BreadcrumbItem><BreadcrumbLink href="/">Accueil</BreadcrumbLink></BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem><BreadcrumbPage>Demandes Professeurs</BreadcrumbPage></BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <h1 className="text-2xl font-bold tracking-tight">Demandes Professeurs</h1>
        <p className="text-sm text-muted-foreground">{demands.length} demande(s) au total</p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {([
          ['Pending',       'En attente', 'bg-yellow-50 text-yellow-700 border-yellow-200'],
          ['In Progress',   'En cours',   'bg-purple-50 text-purple-700 border-purple-200'],
          ['Resolved',      'Traitées',   'bg-green-50 text-green-700 border-green-200'],
          ['Rejected',      'Rejetées',   'bg-red-50 text-red-700 border-red-200'],
        ] as [string, string, string][]).map(([key, label, color]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(prev => prev === key ? 'all' : key)}
            className={`rounded-xl p-3 text-left border transition-all ${
              filterStatus === key ? 'ring-2 ring-primary' : ''
            } ${color}`}
          >
            <p className="text-xl font-bold">{counts[key as keyof typeof counts] ?? 0}</p>
            <p className="text-xs">{label}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">Aucune demande trouvée</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Professeur</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Objet</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Directeur</TableHead>
                  <TableHead className="text-xs">Réponse</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(demand => (
                  <TableRow
                    key={demand._id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelected(demand)}
                  >
                    <TableCell className="text-xs font-medium">{demand.professor?.name ?? '—'}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{demand.type}</Badge></TableCell>
                    <TableCell className="text-xs max-w-[180px] truncate">{demand.subject}</TableCell>
                    <TableCell className="text-xs">{formatDate(demand.createdAt)}</TableCell>
                    <TableCell><DemandStatusBadge status={demand.status} /></TableCell>
                    <TableCell>
                      {demand.forwardedToDirector
                        ? <span className="text-xs text-blue-600 flex items-center gap-1"><Send className="h-3 w-3" />Oui</span>
                        : <span className="text-xs text-muted-foreground">Non</span>}
                    </TableCell>
                    <TableCell>
                      {demand.directorResponse
                        ? <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Oui</span>
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={e => { e.stopPropagation(); setSelected(demand); }}
                      >
                        <Eye className="h-3.5 w-3.5" />
                        {role === 'admin' ? 'Gérer' : 'Voir'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DemandDetailModal
        demand={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
        role={role}
      />
    </div>
  );
}