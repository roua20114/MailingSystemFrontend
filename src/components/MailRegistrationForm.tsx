import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Sparkles, X, Loader2 } from 'lucide-react';
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

interface Props { open: boolean; onClose: () => void; }

const defaultForm = {
  subject: '',
  sender: '',
  type: 'Incoming' as ApiMailType,
  priority: 'Medium' as ApiMailPriority,
  description: '',
  category: '',
};

export function MailRegistrationForm({ open, onClose }: Props) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState(defaultForm);

  // Load mail categories for the dropdown
  const { data: categoriesRes } = useQuery({
    queryKey: ['mail-categories'],
    queryFn: async () => {
      const { apiRequest } = await import('@/lib/api-client');
      const res = await apiRequest<{ success: boolean; data: { mailCategories: Array<{ _id: string; name: string }> } }>('/mail-categories');
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

  const canRegister = user?.role === 'secretary' || user?.role === 'admin';

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.subject.trim() || form.subject.trim().length < 3) e.subject = 'L\'objet doit faire au moins 3 caractères';
    if (!form.sender.trim() || form.sender.trim().length < 2) e.sender = 'L\'expéditeur doit faire au moins 2 caractères';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!validate()) return;

  setLoading(true);
  try {
    let pdfUrl: string | undefined;

    // Upload file first if one was attached
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
      subject: form.subject.trim(),
      sender: form.sender.trim(),
      type: form.type,
      priority: form.priority,
      ...(form.description.trim() ? { description: form.description.trim() } : {}),
      ...(form.category ? { category: form.category } : {}),
      ...(pdfUrl ? { pdfUrl } : {}),
    });

    toast.success('Courrier enregistré', { description: 'Envoyé à la file du Directeur pour dispatching.' });
    setForm(defaultForm);
    setFile(null);
    setErrors({});
    onClose();
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Une erreur est survenue.';
    toast.error('Erreur lors de l\'enregistrement', { description: msg });
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
          <DialogTitle className="text-xl">Enregistrer un nouveau courrier</DialogTitle>
        </DialogHeader>

        {!canRegister && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
            Seuls les Secrétaires et Administrateurs peuvent enregistrer des courriers.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Upload */}
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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Type de courrier *</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as ApiMailType }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Incoming">Entrant</SelectItem>
                  <SelectItem value="Outgoing">Sortant</SelectItem>
                  <SelectItem value="Internal">Interne</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Priorité *</Label>
              <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v as ApiMailPriority }))}>
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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Expéditeur *</Label>
              <Input
                className={`mt-1 ${errors.sender ? 'border-destructive' : ''}`}
                placeholder="Nom ou organisme expéditeur"
                value={form.sender}
                onChange={e => { setForm(f => ({ ...f, sender: e.target.value })); setErrors(v => ({ ...v, sender: '' })); }}
              />
              {errors.sender && <p className="text-xs text-destructive mt-1">{errors.sender}</p>}
            </div>
            <div>
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Aucune catégorie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune</SelectItem>
                  {categories.map(c => <SelectItem key={c._id} value={c._id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Objet *</Label>
            <Input
              className={`mt-1 ${errors.subject ? 'border-destructive' : ''}`}
              placeholder="Objet du courrier (3 caractères minimum)"
              value={form.subject}
              onChange={e => { setForm(f => ({ ...f, subject: e.target.value })); setErrors(v => ({ ...v, subject: '' })); }}
            />
            {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
          </div>

          <div>
            <Label>Description / Notes</Label>
            <Textarea
              className="mt-1"
              placeholder="Observations éventuelles..."
              rows={3}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            />
          </div>

          <div className="rounded-xl border border-info/20 bg-info/5 p-3 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Note :</span> Le numéro de référence et l'échéance SLA seront générés automatiquement par le système.
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>Annuler</Button>
            <Button type="submit" disabled={loading || !canRegister}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enregistrement…</> : 'Enregistrer & Envoyer au Directeur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
