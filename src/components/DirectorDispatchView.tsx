import { useState } from 'react';
import { Sparkles, FileText, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { MailStatusStepper } from '@/components/MailStatusStepper';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { departmentService } from '@/lib/department-service';
import { userService } from '@/lib/user-service';
import { formatDate } from '@/lib/data-helpers';
import { useAuth } from '@/contexts/AuthContext';

interface Props { mail: ApiMail | null; open: boolean; onClose: () => void; }

export function DirectorDispatchView({ mail, open, onClose }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [assignedTo, setAssignedTo] = useState('');
  const [assignedDept, setAssignedDept] = useState('');
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

  const reviewMutation = useMutation({
    mutationFn: () => mailService.updateStatus(mail!._id, 'Under Review', 'Pris en charge par le Directeur'),
    onSuccess: () => {
      toast.success('Statut mis à jour', { description: 'Courrier passé en révision.' });
      qc.invalidateQueries({ queryKey: ['mails'] });
      qc.invalidateQueries({ queryKey: ['mails-dispatch'] });
      onClose();
    },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const assignMutation = useMutation({
    mutationFn: () => {
      if (!assignedTo) throw new Error('Veuillez sélectionner un responsable');
      // Only send fields in the schema — instructions is optional
      return mailService.assign(mail!._id, {
        assignedTo,
        ...(assignedDept ? { assignedDepartment: assignedDept } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
        ...(priority ? { priority: priority as ApiMail['priority'] } : {}),
      });
    },
    onSuccess: () => {
      toast.success('Courrier dispatché', { description: `${mail!.referenceNumber} a été assigné avec succès.` });
      qc.invalidateQueries({ queryKey: ['mails'] });
      qc.invalidateQueries({ queryKey: ['mails-dispatch'] });
      setAssignedTo('');
      setAssignedDept('');
      setInstructions('');
      setPriority('');
      onClose();
    },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  if (!mail) return null;

  const canReview = isDirectorOrAdmin && mail.status === 'Registered';
  const canAssign = isDirectorOrAdmin && mail.status === 'Under Review';

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
          {/* PDF Preview panel */}
          <div className="rounded-xl border bg-muted/30 p-6 flex flex-col items-center justify-center min-h-[320px]">
            <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <p className="text-sm font-medium text-muted-foreground mb-1">Document scanné</p>
            <p className="text-xs text-muted-foreground/70 text-center mb-4 max-w-[200px] truncate">{mail.subject}</p>
            {mail.pdfUrl ? (
              <Button variant="outline" size="sm" asChild>
                <a href={mail.pdfUrl} target="_blank" rel="noopener noreferrer"
   onClick={e => { e.preventDefault(); window.open(mail.pdfUrl!, '_blank', 'noopener,noreferrer'); }}>
  Ouvrir le PDF
</a>
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground/50">Aucun PDF joint</span>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Mail details */}
            <div className="rounded-xl border p-4 space-y-2.5">
              <h3 className="text-sm font-semibold mb-1">Détails</h3>
              {[
                ['Expéditeur', mail.sender],
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

            {/* AI suggestion */}
            {mail.aiSuggestedDepartment && (
              <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary">Suggestion IA</p>
                  <p className="text-xs text-primary/80 mt-0.5">
                    Département recommandé : <strong>{mail.aiSuggestedDepartment}</strong>
                    {mail.aiConfidenceScore != null && ` (${Math.round(mail.aiConfidenceScore * 100)}% confiance)`}
                  </p>
                  {mail.aiSummary && <p className="text-[10px] text-muted-foreground mt-1">{mail.aiSummary}</p>}
                </div>
              </div>
            )}

            {/* Already assigned */}
            {mail.assignedTo && (
              <div className="rounded-lg border bg-success/5 border-success/20 p-3 text-xs space-y-1">
                <p className="font-medium text-success">Déjà assigné</p>
                <p>Assigné à : <strong>{mail.assignedTo.name}</strong></p>
                {mail.assignedDepartment && <p>Département : <strong>{mail.assignedDepartment.name}</strong></p>}
                {mail.instructions && <p className="text-muted-foreground mt-1">{mail.instructions}</p>}
              </div>
            )}

            {/* Dispatch form */}
            {canAssign && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Dispatching</p>

                <div>
                  <Label className="text-xs">Responsable désigné *</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Choisir un responsable" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignableUsers.map(u => {
                        const deptName = typeof u.departmentId === 'object' && u.departmentId
                          ? ` · ${(u.departmentId as { name: string }).name}` : '';
                        return (
                          <SelectItem key={u._id} value={u._id}>
                            {u.name} — {u.role}{deptName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Département (optionnel)</Label>
                  <Select value={assignedDept} onValueChange={v => setAssignedDept(v === 'none' ? '' : v)}>
                    <SelectTrigger className="mt-1 h-9">
                      <SelectValue placeholder="Sélectionner le département" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Non spécifié</SelectItem>
                      {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Priorité (optionnel)</Label>
                  <Select value={priority} onValueChange={v => setPriority(v === 'keep' ? '' : v)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue placeholder="Conserver la priorité actuelle" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="keep">Conserver ({mail.priority})</SelectItem>
                      <SelectItem value="Urgent">🔴 Urgent</SelectItem>
                      <SelectItem value="High">🟠 Élevée</SelectItem>
                      <SelectItem value="Medium">🔵 Normal</SelectItem>
                      <SelectItem value="Low">⚪ Faible</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs">Instructions (optionnel)</Label>
                  <Textarea
                    className="mt-1 text-xs"
                    placeholder="Ajoutez des instructions pour le responsable..."
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
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          {canReview && (
            <Button variant="secondary" onClick={() => reviewMutation.mutate()} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Prendre en révision
            </Button>
          )}
          {canAssign && (
            <Button
              onClick={() => assignMutation.mutate()}
              disabled={assignMutation.isPending || !assignedTo}
            >
              {assignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Dispatcher le courrier
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
