import { useState, useRef, useEffect } from 'react';
import { Sparkles, FileText, Loader2, X, ChevronDown, Check, Building2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { MailStatusStepper } from '@/components/MailStatusStepper';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { departmentService } from '@/lib/department-service';
import { userService } from '@/lib/user-service';
import { formatDate } from '@/lib/data-helpers';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ── Types locaux ──────────────────────────────────────────────────────────────
interface Department { _id: string; name: string; description?: string; }

interface Props { mail: ApiMail | null; open: boolean; onClose: () => void; }

// ── Composant Multi-Select Départements ───────────────────────────────────────
interface MultiSelectDeptProps {
  departments: Department[];
  selected: string[];           // tableau d'IDs sélectionnés
  onChange: (ids: string[]) => void;
  placeholder?: string;
}

function MultiSelectDept({ departments, selected, onChange, placeholder = 'Sélectionner des départements...' }: MultiSelectDeptProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Ferme la dropdown si clic en dehors
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedDepts = departments.filter(d => selected.includes(d._id));

  // Filtre : exclut les déjà sélectionnés ET applique la recherche texte
  const available = departments.filter(
    d => !selected.includes(d._id) &&
         d.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleDept = (id: string) => {
    onChange(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const removeDept = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selected.filter(s => s !== id));
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Zone des tags + déclencheur */}
      <div
        onClick={() => setOpen(v => !v)}
        className={cn(
          'min-h-[36px] w-full rounded-md border border-input bg-background px-3 py-1.5',
          'flex flex-wrap gap-1.5 items-center cursor-pointer transition-colors',
          'hover:border-ring/60 focus-within:ring-2 focus-within:ring-ring/30',
          open && 'ring-2 ring-ring/30 border-ring/60'
        )}
      >
        {selectedDepts.length === 0 ? (
          <span className="text-xs text-muted-foreground flex-1">{placeholder}</span>
        ) : (
          selectedDepts.map(d => (
            <span
              key={d._id}
              className={cn(
                'inline-flex items-center gap-1 rounded-md px-2 py-0.5',
                'bg-primary/10 text-primary text-[11px] font-medium border border-primary/20',
                'transition-colors hover:bg-primary/15'
              )}
            >
              <Building2 className="h-2.5 w-2.5 opacity-70" />
              {d.name}
              <button
                type="button"
                onClick={e => removeDept(d._id, e)}
                className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 transition-colors"
                aria-label={`Retirer ${d.name}`}
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className={cn(
          'h-3.5 w-3.5 text-muted-foreground ml-auto flex-shrink-0 transition-transform duration-150',
          open && 'rotate-180'
        )} />
      </div>

      {/* Dropdown */}
      {open && (
        <div className={cn(
          'absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md',
          'animate-in fade-in-0 zoom-in-95 duration-100'
        )}>
          {/* Champ de recherche */}
          <div className="p-2 border-b">
            <input
              autoFocus
              type="text"
              placeholder="Rechercher un département..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
              className={cn(
                'w-full rounded-sm border border-input bg-background px-2.5 py-1.5',
                'text-xs placeholder:text-muted-foreground outline-none',
                'focus:ring-1 focus:ring-ring/40'
              )}
            />
          </div>

          {/* Liste filtrée */}
          <div className="max-h-48 overflow-y-auto">
            {available.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                {search ? 'Aucun résultat' : 'Tous les départements ont été sélectionnés'}
              </div>
            ) : (
              available.map(d => (
                <button
                  key={d._id}
                  type="button"
                  onClick={e => { e.stopPropagation(); toggleDept(d._id); }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-xs text-left',
                    'hover:bg-accent transition-colors'
                  )}
                >
                  <div className="h-4 w-4 rounded border border-input flex items-center justify-center flex-shrink-0 bg-background">
                    {selected.includes(d._id) && <Check className="h-3 w-3 text-primary" />}
                  </div>
                  <span className="font-medium">{d.name}</span>
                  {d.description && (
                    <span className="text-muted-foreground truncate text-[10px]">— {d.description}</span>
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer : compteur + effacer tout */}
          {selected.length > 0 && (
            <div className="border-t px-3 py-2 flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {selected.length} département{selected.length > 1 ? 's' : ''} sélectionné{selected.length > 1 ? 's' : ''}
              </span>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange([]); }}
                className="text-[10px] text-destructive hover:underline"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
function MultiSelectUser({ users, selected, onChange }: {
  users: Array<{ _id: string; name: string; role: string; departmentId?: unknown }>;
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedUsers = users.filter(u => selected.includes(u._id));
  const available = users.filter(
    u => !selected.includes(u._id) &&
         u.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => setOpen(v => !v)}
        className={cn(
          'min-h-[36px] w-full rounded-md border border-input bg-background px-3 py-1.5',
          'flex flex-wrap gap-1.5 items-center cursor-pointer transition-colors',
          'hover:border-ring/60 focus-within:ring-2 focus-within:ring-ring/30',
          open && 'ring-2 ring-ring/30 border-ring/60'
        )}
      >
        {selectedUsers.length === 0 ? (
          <span className="text-xs text-muted-foreground flex-1">Choisir des responsables</span>
        ) : (
          selectedUsers.map(u => (
            <span
              key={u._id}
              className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 bg-primary/10 text-primary text-[11px] font-medium border border-primary/20"
            >
              {u.name}
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onChange(selected.filter(id => id !== u._id)); }}
                className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto flex-shrink-0" />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-lg">
          <div className="p-2 border-b">
            <input
              autoFocus
              className="w-full text-xs bg-transparent outline-none placeholder:text-muted-foreground"
              placeholder="Rechercher..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-48 overflow-y-auto p-1">
            {available.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">Aucun utilisateur trouvé</p>
            ) : (
              available.map(u => {
                const deptName = typeof u.departmentId === 'object' && u.departmentId
                  ? ` · ${(u.departmentId as { name: string }).name}` : '';
                return (
                  <button
                    key={u._id}
                    type="button"
                    onClick={e => { e.stopPropagation(); onChange([...selected, u._id]); }}
                    className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-accent flex items-center gap-2"
                  >
                    <User className="h-3 w-3 text-muted-foreground" />
                    {u.name} — {u.role}{deptName}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PdfFirstPage({ pdfUrl }: { pdfUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    pdfjsLib.getDocument({ url: pdfUrl }).promise
      .then(pdf => pdf.getPage(1))
      .then(page => {
        if (cancelled || !canvasRef.current) return;
        const container = canvasRef.current.parentElement!;
        const containerWidth = container.clientWidth || 280;
        const viewport = page.getViewport({ scale: 1 });
        const scale = containerWidth / viewport.width;
        const scaled = page.getViewport({ scale });

        const canvas = canvasRef.current;
        canvas.width = scaled.width;
        canvas.height = scaled.height;

        page.render({
          canvasContext: canvas.getContext('2d')!,
          viewport: scaled,
          canvas: canvas,
        }).promise.then(() => {
          if (!cancelled) setLoading(false);
        });
      })
      .catch(() => {
        if (!cancelled) { setLoading(false); setError(true); }
      });

    return () => { cancelled = true; };
  }, [pdfUrl]);

  return (
    <div className="w-full rounded-lg overflow-hidden border bg-white flex items-center justify-center" style={{ minHeight: '220px' }}>
      {loading && !error && (
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      )}
      {error && (
        <span className="text-xs text-muted-foreground/50">Aperçu indisponible</span>
      )}
      <canvas ref={canvasRef} className={`w-full ${loading || error ? 'hidden' : ''}`} />
    </div>
  );
}

// ── Composant principal DirectorDispatchView ──────────────────────────────────
export function DirectorDispatchView({ mail, open, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();

  // ── State du formulaire ────────────────────────────────────────────────────
  // dispatchedTo : tableau d'IDs de départements (PATCH /api/mails/:id/dispatch)
  const [dispatchedTo, setDispatchedTo] = useState<string[]>([]);
  // assignedTo  : ID optionnel d'un utilisateur principal
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [instructions, setInstructions] = useState('');
  const [priority, setPriority] = useState('');

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-assignable'],
    queryFn: () => userService.getAll({ limit: '200' }),
  });

  const assignableUsers = users.filter(u => u.isActive);
  const isDirectorOrAdmin = user?.role === 'director' || user?.role === 'admin';

  // Réinitialise le formulaire à chaque ouverture
  useEffect(() => {
    if (open) {
      // Pré-remplit avec les départements déjà dispatchés s'ils existent
      const existing = mail?.dispatchedTo?.map(d =>
        typeof d === 'string' ? d : d._id
      ) ?? [];
      setDispatchedTo(existing);
      setAssignedTo(
        Array.isArray(mail?.assignedTo)
          ? mail.assignedTo.map((u: { _id: string }) => u._id)
          : []
      );
      setInstructions(mail?.instructions ?? '');
      setPriority('');
    }
  }, [open, mail]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const reviewMutation = useMutation({
    mutationFn: () =>
      mailService.updateStatus(mail!._id, 'Under Review', 'Pris en charge par le Directeur'),
    onSuccess: () => {
      toast.success('Statut mis à jour', { description: 'Courrier passé en révision.' });
      qc.invalidateQueries({ queryKey: ['mails'] });
      qc.invalidateQueries({ queryKey: ['mails-dispatch'] });
      onClose();
    },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  // PATCH /api/mails/:id/dispatch — dispatching multi-département
  const dispatchMutation = useMutation({
    mutationFn: () => {
      if (dispatchedTo.length === 0) {
        throw new Error('Sélectionnez au moins un département');
      }
      return mailService.dispatch(mail!._id, {
        dispatchedTo,                                            // tableau d'IDs
        ...(assignedTo.length > 0 ? { assignedTo } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(priority ? { priority: priority as ApiMail['priority'] } : {}),
      });
    },
    onSuccess: () => {
      toast.success('Courrier dispatché', {
        description: `${mail!.referenceNumber} a été assigné à ${dispatchedTo.length} département(s).`,
      });
      qc.invalidateQueries({ queryKey: ['mails'] });
      qc.invalidateQueries({ queryKey: ['mails-dispatch'] });
      setDispatchedTo([]);
      setAssignedTo([]);
      setInstructions('');
      setPriority('');
      onClose();
    },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  if (!mail) return null;

  const canReview = isDirectorOrAdmin && mail.status === 'Registered';
  const canAssign = isDirectorOrAdmin && mail.status === 'Under Review';

  // Départements déjà dispatchés (pour l'affichage "Déjà assigné")
  const existingDepts = mail.dispatchedTo ?? [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="font-mono">{mail.referenceNumber}</span>
            <StatusBadge status={mail.status} />
            <PriorityBadge priority={mail.priority} />
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-4 rounded-xl border bg-muted/20">
          <MailStatusStepper currentStatus={mail.status} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* PDF Preview */}
          <div className="rounded-xl border bg-muted/30 p-4 flex flex-col items-center min-h-[320px]">
            <p className="text-sm font-medium text-muted-foreground mb-1 self-start">Document scanné</p>
            <p className="text-xs text-muted-foreground/70 mb-3 self-start max-w-full truncate">
              {mail.subject}
            </p>

            {mail.pdfUrl ? (
              <>
                {/* Prévisualisation de la première page */}
                 <PdfFirstPage pdfUrl={mail.pdfUrl} />

                {/* Bouton Ouvrir le PDF */}
                {/* Bouton Ouvrir le PDF */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(mail.pdfUrl!, '_blank', 'noopener,noreferrer')}
              >
                Ouvrir le PDF
              </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 w-full">
                <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <span className="text-xs text-muted-foreground/50">Aucun PDF joint</span>
              </div>
            )}
          </div>
          {/* Panneau droit */}
          <div className="space-y-4">
            {/* Détails */}
            <div className="rounded-xl border p-4 space-y-2.5">
              <h3 className="text-sm font-semibold mb-1">Détails</h3>
              {[
                ['Expéditeur', typeof mail.sender === 'string' ? mail.sender : mail.sender?.name ?? 'Inconnu'],
                ['Type', mail.type],
                ['Date', formatDate(mail.createdAt)],
                ['Échéance SLA', mail.slaDeadline ? formatDate(mail.slaDeadline) : 'Calculée automatiquement'],
                ['Créé par', mail.createdBy?.name ?? '—'],
              ].map(([label, value]) => (
                <div key={label} className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <span className="font-medium text-xs">{value}</span>
                </div>
              ))}
              {mail.description && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-xs">{mail.description}</p>
                </div>
              )}
            </div>

            {/* Suggestion IA */}
            {mail.aiSuggestedDepartment && (
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary">Suggestion IA</p>
                  <p className="text-xs text-primary/80 mt-0.5">
                    Département recommandé : <strong>{mail.aiSuggestedDepartment}</strong>
                    {mail.aiConfidenceScore != null &&
                      ` (${Math.round(mail.aiConfidenceScore * 100)}% confiance)`}
                  </p>
                  {mail.aiSummary && (
                    <p className="text-[10px] text-muted-foreground mt-1">{mail.aiSummary}</p>
                  )}
                </div>
              </div>
            )}

            {/* Déjà dispatché */}
            {existingDepts.length > 0 && (
              <div className="rounded-lg border bg-emerald-500/5 border-emerald-500/20 p-3 text-xs space-y-2">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Déjà dispatché vers {existingDepts.length} département(s)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {existingDepts.map(d => {
                    const id   = typeof d === 'string' ? d : d._id;
                    const name = typeof d === 'string' ? id : d.name;
                    return (
                      <Badge key={id} variant="secondary" className="text-[10px]">
                        <Building2 className="h-2.5 w-2.5 mr-1" />
                        {name}
                      </Badge>
                    );
                  })}
                </div>
                  {Array.isArray(mail.assignedTo) && mail.assignedTo.length > 0 && (
                    <p className="text-muted-foreground">
                      Responsables : <strong>
                        {mail.assignedTo.map((u: { name: string }) => u.name).join(', ')}
                      </strong>
                    </p>
                  )}
                {mail.instructions && (
                  <p className="text-muted-foreground italic">{mail.instructions}</p>
                )}
              </div>
            )}

            {/* Formulaire de dispatching */}
            {canAssign && (
              <div className="space-y-3 pt-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Dispatching
                </p>

                {/* ── MULTI-SELECT DÉPARTEMENTS ───────────────────────── */}
                <div>
                  <Label className="text-xs">
                    Départements destinataires{' '}
                    <span className="text-destructive">*</span>
                  </Label>
                  <div className="mt-1">
                    <MultiSelectDept
                      departments={departments}
                      selected={dispatchedTo}
                      onChange={setDispatchedTo}
                    />
                  </div>
                  {/* Feedback si aucune sélection */}
                  {dispatchedTo.length === 0 && (
                    <p className="mt-1.5 text-[10px] text-muted-foreground flex items-center gap-1">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-destructive/60" />
                      Sélectionnez au moins un département pour activer le dispatching
                    </p>
                  )}
                </div>

                {/* Responsable principal (optionnel) */}
                <div>
                  <Label className="text-xs">Responsable principal (optionnel)</Label>
                  <div className="mt-1">
                    <MultiSelectUser
                      users={assignableUsers}
                      selected={assignedTo}
                      onChange={setAssignedTo}
                    />
                  </div>
                </div>

                {/* Priorité */}
                <div>
                  <Label className="text-xs">Priorité (optionnel)</Label>
                  <Select
                    value={priority}
                    onValueChange={v => setPriority(v === 'keep' ? '' : v)}
                  >
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Conserver la priorité actuelle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep">Conserver ({mail.priority})</SelectItem>
                      <SelectItem value="Urgent">🔴 Urgent</SelectItem>
                      <SelectItem value="High">🟠 Élevée</SelectItem>
                      <SelectItem value="Medium">🔵 Normal</SelectItem>
                      <SelectItem value="Low">⚪ Faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Instructions */}
                <div>
                  <Label className="text-xs">Instructions (optionnel)</Label>
                  <Textarea
                    className="mt-1 text-xs"
                    placeholder="Ajoutez des instructions pour les départements destinataires..."
                    rows={3}
                    value={instructions}
                    onChange={e => setInstructions(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t">
          <Button variant="outline" onClick={onClose}>
            Fermer
          </Button>

          {canReview && (
            <Button
              variant="secondary"
              onClick={() => reviewMutation.mutate()}
              disabled={reviewMutation.isPending}
            >
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Prendre en révision
            </Button>
          )}

          {canAssign && (
            <Button
              onClick={() => dispatchMutation.mutate()}
              // Désactivé si aucun département sélectionné
              disabled={dispatchMutation.isPending || dispatchedTo.length === 0}
              className="gap-2"
            >
              {dispatchMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              Dispatcher{dispatchedTo.length > 0 ? ` (${dispatchedTo.length})` : ''}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}