import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Sparkles, X, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { mailService } from '@/lib/mail-service';
import type { ApiMailType, ApiMailPriority } from '@/lib/mail-service';
import { useAuth } from '@/contexts/AuthContext';
import { apiRequest } from '@/lib/api-client';

interface Sender {
  _id: string;
  name: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  senders: Sender[];
  sendersLoading: boolean;
  onSenderCreated: (sender: Sender) => void;
  inboxMailId?: string;
  incomingMailSubject?: string;
}

const defaultForm = {
  subject:         '',
  sender:          '',
  type:            'Incoming' as ApiMailType,
  priority:        'Medium' as ApiMailPriority,
  description:     '',
  category:        '',
  manualReference: '',   // ← référence administrative saisie manuellement
};

export function MailRegistrationForm({
  open,
  onClose,
  senders,
  sendersLoading,
  onSenderCreated,
  inboxMailId,
  incomingMailSubject,
}: Props) {
  const { user } = useAuth();
  const [file, setFile]                     = useState<File | null>(null);
  const [loading, setLoading]               = useState(false);
  const [errors, setErrors]                 = useState<Record<string, string>>({});
  const [form, setForm] = useState<typeof defaultForm>({ ...defaultForm });
  const [showNewSender, setShowNewSender]   = useState(false);
  const [newSenderName, setNewSenderName]   = useState('');
  const [newSenderLoading, setNewSenderLoading] = useState(false);
  const [newSenderError, setNewSenderError] = useState('');
  const isReplyMode = !!inboxMailId;

  // Reset form when opening/closing or when mode changes
  useEffect(() => {
    if (open) {
      if (isReplyMode && incomingMailSubject) {
        setForm({
          subject:         `RE: ${incomingMailSubject}`,
          sender:          senders.length > 0 ? senders[0]._id : '',
          type:            'Outgoing',
          priority:        'Medium',
          description:     '',
          category:        '',
          manualReference: '',
        });
      } else {
        setForm({
          ...defaultForm,
          sender: senders.length > 0 ? senders[0]._id : '',
        });
      }
      setFile(null);
      setErrors({});
      setShowNewSender(false);
      setNewSenderName('');
      setNewSenderError('');
    }
  }, [open, isReplyMode, incomingMailSubject, senders.length]);

  useEffect(() => {
    if (open && !form.sender && senders.length > 0) {
      setForm(prev => ({ ...prev, sender: senders[0]._id }));
    }
  }, [open, senders, form.sender]);

  const { data: categoriesRes } = useQuery({
    queryKey: ['mail-categories'],
    queryFn: async () => {
      const { apiRequest } = await import('@/lib/api-client');
      const res = await apiRequest<{
        success: boolean;
        data: { mailCategories: Array<{ _id: string; name: string }> };
      }>('/mail-categories');
      return res.data.mailCategories;
    },
  });
  const categories = categoriesRes ?? [];

  const onDrop = useCallback((files: File[]) => {
    if (files[0]) setFile(files[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'], 'image/*': ['.png', '.jpg', '.jpeg'] },
    maxFiles: 1,
  });

  const canRegister = (() => {
    const role = (user?.role ?? '').toLowerCase();
    return role === 'secretary' || role === 'admin' || role === 'director';
  })();

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim() || form.subject.trim().length < 3)
      e.subject = "L'objet doit faire au moins 3 caractères";
    const senderValue = typeof form.sender === 'string' ? form.sender.trim() : '';
    if (!senderValue) e.sender = 'Sélectionnez un expéditeur valide';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleCreateSender = async () => {
    if (!newSenderName.trim()) {
      setNewSenderError("Le nom de l'expéditeur est requis.");
      return;
    }
    setNewSenderError('');
    setNewSenderLoading(true);
    try {
      const res = await apiRequest<{ success: boolean; data: { sender: Sender } }>('/senders', {
        method: 'POST',
        body: JSON.stringify({ name: newSenderName.trim() }),
      });
      onSenderCreated(res.data.sender);
      setForm(prev => ({ ...prev, sender: res.data.sender._id }));
      setShowNewSender(false);
      setNewSenderName('');
      toast.success('Expéditeur ajouté', {
        description: 'Le nouvel expéditeur est désormais sélectionné.',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Impossible d'ajouter l'expéditeur.";
      setNewSenderError(message);
    } finally {
      setNewSenderLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      let pdfUrl: string | undefined;

      if (file) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const uploadRes = await apiRequest<{ success: boolean; data: { pdfUrl: string } }>(
          '/mails/upload',
          {
            method: 'POST',
            body: JSON.stringify({ filename: file.name, data: base64, mimeType: file.type }),
          }
        );
        pdfUrl = uploadRes.data.pdfUrl;
      }

      await mailService.create({
        subject:  form.subject.trim(),
        sender:   String(form.sender).trim(),
        type:     form.type,
        priority: form.priority,
        ...(form.description.trim()     ? { description:     form.description.trim() }     : {}),
        ...(form.category               ? { category:        form.category }               : {}),
        ...(pdfUrl                      ? { pdfUrl }                                        : {}),
        ...(inboxMailId                 ? { inboxMailId }                                   : {}),
        // Only send manualReference when non-empty
        ...(form.manualReference.trim() ? { manualReference: form.manualReference.trim() } : {}),
      });

      const msg  = isReplyMode ? 'Réponse envoyée'          : 'Courrier enregistré';
      const desc = isReplyMode
        ? 'Votre réponse a été créée avec succès.'
        : 'Envoyé à la file du Directeur pour dispatching.';
      toast.success(msg, { description: desc });
      setForm(defaultForm);
      setFile(null);
      setErrors({});
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
      toast.error("Erreur lors de l'enregistrement", { description: msg });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setForm(defaultForm);
    setFile(null);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {isReplyMode ? 'Créer une réponse' : 'Enregistrer un nouveau courrier'}
          </DialogTitle>
        </DialogHeader>

        {!canRegister && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            Seuls les Secrétaires, Directeurs et Administrateurs peuvent enregistrer des courriers.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* ── File Upload ── */}
          <div>
            <Label className="mb-2 block">Document scanné (optionnel)</Label>
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-colors cursor-pointer ${
                isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              <input {...getInputProps()} />
              {file ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{file.name}</span>
                  <Button
                    type="button" variant="ghost" size="icon"
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Glissez votre PDF ici ou cliquez pour sélectionner</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">PDF, PNG, JPG acceptés</p>
                </>
              )}
            </div>
            {file && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary">Document joint — le délai SLA sera calculé automatiquement</span>
              </div>
            )}
          </div>

          {/* ── Type + Priorité ── */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Type de courrier *</Label>
              {isReplyMode ? (
                <div className="mt-1 px-3 py-2 rounded-md bg-muted text-sm font-medium text-muted-foreground">
                  Sortant (Réponse)
                </div>
              ) : (
                <Select
                  value={form.type}
                  onValueChange={v => setForm(f => ({ ...f, type: v as ApiMailType }))}
                >
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Incoming">Entrant</SelectItem>
                    <SelectItem value="Outgoing">Sortant</SelectItem>
                    <SelectItem value="Internal">Interne</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <Label>Priorité *</Label>
              <Select
                value={form.priority}
                onValueChange={v => setForm(f => ({ ...f, priority: v as ApiMailPriority }))}
              >
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Urgent">🔴 Urgent</SelectItem>
                  <SelectItem value="High">🟠 Élevée</SelectItem>
                  <SelectItem value="Medium">🔵 Normal</SelectItem>
                  <SelectItem value="Low">⚪ Faible</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Expéditeur + Catégorie ── */}
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Expéditeur *</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={form.sender}
                  onValueChange={v => {
                    setForm(f => ({ ...f, sender: String(v ?? '') }));
                    setErrors(prev => ({ ...prev, sender: '' }));
                  }}
                >
                  <SelectTrigger className="mt-1 w-full">
                    <SelectValue placeholder="Sélectionner un expéditeur" />
                  </SelectTrigger>
                  <SelectContent>
                    {sendersLoading ? (
                      <SelectItem value="loading" disabled>Chargement...</SelectItem>
                    ) : senders.length === 0 ? (
                      <SelectItem value="no-senders" disabled>Aucun expéditeur disponible</SelectItem>
                    ) : (
                      senders.map(sender => (
                        <SelectItem key={sender._id} value={sender._id}>{sender.name}</SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  type="button" variant="outline" size="icon"
                  onClick={() => setShowNewSender(prev => !prev)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {errors.sender && <p className="text-xs text-destructive mt-1">{errors.sender}</p>}
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select
                value={form.category}
                onValueChange={v => setForm(f => ({ ...f, category: v === 'none' ? '' : v }))}
              >
                <SelectTrigger className="mt-1"><SelectValue placeholder="Aucune catégorie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── Nouveau expéditeur inline ── */}
          {showNewSender && (
            <div className="rounded-xl border border-border/70 bg-muted/5 p-4 space-y-3">
              <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                <Input
                  placeholder="Nom du nouvel expéditeur"
                  value={newSenderName ?? ""}
                  onChange={e => { setNewSenderName(e.target.value); setNewSenderError(''); }}
                />
                <Button
                  type="button"
                  onClick={handleCreateSender}
                  disabled={newSenderLoading || !newSenderName.trim()}
                >
                  {newSenderLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Créer'}
                </Button>
              </div>
              {newSenderError && <p className="text-xs text-destructive">{newSenderError}</p>}
            </div>
          )}

          {/* ── Objet ── */}
          <div>
            <Label>Objet *</Label>
            <Input
              className={`mt-1 ${errors.subject ? 'border-destructive' : ''}`}
              placeholder="Objet du courrier (3 caractères minimum)"
              value={form.subject ?? ""}
              onChange={e => {
                setForm(f => ({ ...f, subject: e.target.value }));
                setErrors(v => ({ ...v, subject: '' }));
              }}
            />
            {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
          </div>

          {/* ── Référence manuelle (optionnelle) ── */}
          {!isReplyMode && (
            <div>
              <Label>
                Référence du document physique
                <span className="ml-1 text-xs font-normal text-muted-foreground">(optionnelle)</span>
              </Label>
              <Input
                className="mt-1 font-mono"
                placeholder="ex : MIN-2026-123"
                value={form.manualReference ?? ""}
                onChange={e => setForm(f => ({ ...f, manualReference: e.target.value }))}
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Numéro figurant sur le courrier papier, conservé pour la traçabilité administrative.
                Le système générera également sa propre référence automatique.
              </p>
            </div>
          )}

          {/* ── Description ── */}
          <div>
            <Label>Description / Notes</Label>
            <Textarea
              className="mt-1"
              placeholder="Observations éventuelles..."
              rows={3}
              value={form.description ?? ""}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          {/* ── Note système ── */}
          <div className="rounded-xl border border-info/20 bg-info/5 p-3 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Note :</span>{' '}
            {isReplyMode
              ? "Cette réponse sera liée au courrier entrant d'origine. Le numéro de référence sera généré automatiquement."
              : 'Le numéro de référence interne (NM-YYYY-XXXX) et l\'échéance SLA seront générés automatiquement par le système.'}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
            <Button type="submit" disabled={loading || !canRegister}>
              {loading
                ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</>
                : isReplyMode ? 'Envoyer la réponse' : 'Enregistrer & Envoyer au Directeur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
