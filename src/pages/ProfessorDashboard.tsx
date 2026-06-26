import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { demandService, type Demand, type DemandType } from '@/lib/demand-service';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, FileText, Clock, CheckCircle2, XCircle, AlertCircle, Send, Upload, ChevronDown, ChevronUp } from 'lucide-react';
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

// ── Demand detail modal for professor ─────────────────────────────────────────
function DemandDetailModal({ demand, open, onClose }: { demand: Demand | null; open: boolean; onClose: () => void }) {
  if (!demand) return null;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{demand.subject}</span>
            <DemandStatusBadge status={demand.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type + Date */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border p-4">
            <div>
              <p className="text-xs text-muted-foreground">Type</p>
              <p className="text-xs font-medium mt-0.5">{demand.type}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="text-xs font-medium mt-0.5">{formatDate(demand.createdAt)}</p>
            </div>
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

          {/* Forwarded badge */}
          {demand.forwardedToDirector && (
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 p-3 flex items-center gap-2">
              <Send className="h-4 w-4 text-blue-600" />
              <span className="text-xs text-blue-700 font-medium">Votre demande a été transmise au Directeur</span>
            </div>
          )}

          {/* Admin note */}
          

          {/* Director response */}
          {demand.directorResponse && (
            <div className="rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 p-3">
              <p className="text-xs font-medium text-green-700 mb-1">✓ Réponse officielle du Directeur</p>
              <p className="text-sm text-green-700 whitespace-pre-wrap">{demand.directorResponse}</p>
            </div>
          )}

          {/* History */}
          <div className="rounded-xl border p-4">
            <p className="text-xs font-semibold mb-3">Suivi de votre demande</p>
            <div className="space-y-2">
              {demand.statusHistory.map((h, i) => (
                <div key={i} className="flex items-start gap-2 text-xs flex-wrap">
                  <span className="text-muted-foreground whitespace-nowrap">
                    {new Date(h.changedAt).toLocaleString('fr-FR')}
                  </span>
                  <DemandStatusBadge status={h.status} />
                  {h.note && <span className="text-muted-foreground">— {h.note}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── New demand modal ──────────────────────────────────────────────────────────
function NewDemandModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [loading, setLoading]         = useState(false);
  const [type, setType]               = useState<DemandType | ''>('');
  const [subject, setSubject]         = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile]               = useState<File | null>(null);

  const reset = () => { setType(''); setSubject(''); setDescription(''); setFile(null); };

  const handleSubmit = async () => {
    if (!type || !subject.trim() || !description.trim()) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }
    setLoading(true);
    try {
      await demandService.createDemand({ type, subject: subject.trim(), description: description.trim(), file });
      toast.success('Demande envoyée avec succès');
      qc.invalidateQueries({ queryKey: ['my-demands'] });
      reset();
      onClose();
    } catch {
      toast.error('Erreur lors de l\'envoi de la demande');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { reset(); onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-4 w-4 text-primary" /> Nouvelle demande
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Type de demande *</Label>
            <Select value={type} onValueChange={v => setType(v as DemandType)}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un type..." /></SelectTrigger>
              <SelectContent>
                {(['Congé', 'Problème technique', 'Demande de document', 'Réclamation', 'Autre'] as DemandType[]).map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Objet *</Label>
            <Input className="mt-1" placeholder="Objet de votre demande..." value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description *</Label>
            <Textarea className="mt-1" rows={4} placeholder="Décrivez votre demande en détail..." value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Document joint (optionnel)</Label>
            <label className="mt-1 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-5 w-5 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">{file ? file.name : 'Cliquez ou glissez un fichier'}</span>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onClose(); }}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Envoi...' : 'Envoyer la demande'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
function EditDemandModal({ demand, open, onClose }: { demand: Demand | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [loading, setLoading]         = useState(false);
  const [type, setType]               = useState<DemandType | ''>('');
  const [subject, setSubject]         = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile]               = useState<File | null>(null);   // ← add

  useEffect(() => {
    if (demand) {
      setType(demand.type);
      setSubject(demand.subject);
      setDescription(demand.description);
      setFile(null);  // reset file on open
    }
  }, [demand]);

  if (!demand) return null;

  const handleUpdate = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    setLoading(true);
    try {
      await demandService.updateDemand(demand._id, {
        type: type || undefined,
        subject: subject.trim(),
        description: description.trim(),
        file,   // ← pass file
      });
      toast.success('Demande mise à jour');
      qc.invalidateQueries({ queryKey: ['my-demands'] });
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Modifier la demande</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-xs">Type <span className="text-red-500">*</span></Label>
            <Select value={type} onValueChange={v => setType(v as DemandType)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(['Congé', 'Problème technique', 'Demande de document', 'Réclamation', 'Autre'] as DemandType[]).map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Objet <span className="text-red-500">*</span></Label>
            <Input className="mt-1" value={subject} onChange={e => setSubject(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Description <span className="text-red-500">*</span></Label>
            <Textarea className="mt-1" rows={4} value={description} onChange={e => setDescription(e.target.value)} />
          </div>

          {/* File upload */}
          <div>
            <Label className="text-xs">Document joint</Label>
            {demand.fileUrl && !file && (
              <div className="mt-1 mb-2 flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Fichier actuel</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-xs px-2"
                  onClick={() => window.open(demand.fileUrl!, '_blank')}
                >
                  Voir
                </Button>
              </div>
            )}
            <label className="mt-1 flex flex-col items-center justify-center w-full h-20 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
              <Upload className="h-4 w-4 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground">
                {file ? file.name : demand.fileUrl ? 'Remplacer le fichier...' : 'Ajouter un fichier...'}
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            {file && (
              <button
                className="text-xs text-red-500 mt-1"
                onClick={() => setFile(null)}
              >
                ✕ Annuler le nouveau fichier
              </button>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleUpdate} disabled={loading}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
// ── Demand card ───────────────────────────────────────────────────────────────
function DemandCard({ demand, onViewDetail, onEdit, onDelete }: {
  demand: Demand;
  onViewDetail: (d: Demand) => void;
  onEdit: (d: Demand) => void;
  onDelete: (d: Demand) => void;
}) {
  const isPending = demand.status === 'Pending';

  return (
    <Card className="glass-card hover:shadow-md transition-shadow">
      <CardContent className="pt-4">
        <div
          className="flex items-start justify-between gap-3 cursor-pointer"
          onClick={() => onViewDetail(demand)}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">{demand.type}</span>
              <DemandStatusBadge status={demand.status} />
              {demand.forwardedToDirector && (
                <span className="text-xs text-blue-600 flex items-center gap-1">
                  <Send className="h-3 w-3" /> Transmise au Directeur
                </span>
              )}
            </div>
            <p className="font-medium text-sm truncate">{demand.subject}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{formatDate(demand.createdAt)}</p>
          </div>
          {demand.directorResponse && (
            <span className="text-xs text-green-600 flex items-center gap-1 bg-green-50 border border-green-200 rounded px-2 py-0.5 flex-shrink-0">
              <CheckCircle2 className="h-3 w-3" /> Réponse reçue
            </span>
          )}
        </div>

        {demand.directorResponse && (
          <div className="mt-3 pt-3 border-t">
            <p className="text-xs text-green-600 truncate">
              <span className="font-medium">Directeur :</span> {demand.directorResponse}
            </p>
          </div>
        )}

        {/* Edit/Delete — only for Pending demands */}
        {isPending && (
          <div className="mt-3 pt-3 border-t flex gap-2" onClick={e => e.stopPropagation()}>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs"
              onClick={() => onEdit(demand)}
            >
              ✏️ Modifier
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-xs text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => onDelete(demand)}
            >
              🗑️ Supprimer
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// ── Main component ────────────────────────────────────────────────────────────
export default function ProfessorDashboard() {
  const { user } = useAuth();
  const [showForm, setShowForm]       = useState(false);
  const qc = useQueryClient();  
  const [selectedDemand, setSelectedDemand] = useState<Demand | null>(null);
  const [editDemand, setEditDemand]   = useState<Demand | null>(null);
  const [deletingId, setDeletingId]   = useState<string | null>(null);

  const { data: demands = [], isLoading } = useQuery({
    queryKey: ['my-demands'],
    queryFn: () => demandService.getMyDemands(),
  });

  const pending    = demands.filter(d => d.status === 'Pending').length;
  const inProgress = demands.filter(d => ['Forwarded', 'In Progress'].includes(d.status)).length;
  const resolved   = demands.filter(d => d.status === 'Resolved').length;
  

    const handleDelete = async (demand: Demand) => {
        if (!confirm(`Supprimer la demande "${demand.subject}" ?`)) return;
        try {
            await demandService.deleteDemand(demand._id);
            toast.success('Demande supprimée');
            qc.invalidateQueries({ queryKey: ['my-demands'] });
        } catch (e: any) {
            toast.error(e.message ?? 'Erreur lors de la suppression');
        }
    };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Bonjour, {user?.fullName?.split(' ')[0]} 👋
          </h1>
          <p className="text-sm text-muted-foreground">Espace Professeur — Gestion de vos demandes</p>
        </div>
        <Button className="gap-2" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" /> Nouvelle demande
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {([
          [pending,    'En attente', 'bg-yellow-100 dark:bg-yellow-900/30', 'text-yellow-600', Clock],
          [inProgress, 'En cours',   'bg-blue-100 dark:bg-blue-900/30',    'text-blue-600',   AlertCircle],
          [resolved,   'Traitées',   'bg-green-100 dark:bg-green-900/30',  'text-green-600',  CheckCircle2],
        ] as [number, string, string, string, React.ElementType][]).map(([count, label, bg, color, Icon]) => (
          <Card key={label} className="glass-card">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bg}`}>
                  <Icon className={`h-4 w-4 ${color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Demands list */}
      <div>
        <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wider">
          Mes demandes — cliquez pour voir les détails
        </h2>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Chargement...</div>
        ) : demands.length === 0 ? (
          <Card className="glass-card">
            <CardContent className="py-12 flex flex-col items-center">
              <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">Aucune demande pour le moment</p>
              <Button className="mt-4 gap-2" onClick={() => setShowForm(true)}>
                <Plus className="h-4 w-4" /> Créer ma première demande
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {demands.map(d => (
                <DemandCard
                        key={d._id}
                        demand={d}
                        onViewDetail={setSelectedDemand}
                        onEdit={setEditDemand}
                        onDelete={handleDelete}
                />
))}
          </div>
        )}
      </div>

      <NewDemandModal open={showForm} onClose={() => setShowForm(false)} />
      <DemandDetailModal
        demand={selectedDemand}
        open={!!selectedDemand}
        onClose={() => setSelectedDemand(null)}
      />

      <EditDemandModal
            demand={editDemand}
            open={!!editDemand}
            onClose={() => setEditDemand(null)}
        />
    </div>
  );
}