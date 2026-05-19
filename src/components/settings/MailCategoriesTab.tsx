import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Trash2, Tag, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsService } from '@/lib/settings-service';
import { TableSkeleton } from '@/components/LoadingSkeleton';

export default function MailCategoriesTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [form, setForm] = useState({ name: '', maxProcessingTime: '7', description: '', isActive: true });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['mail-categories'],
    queryFn: () => settingsService.getMailCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () => settingsService.createMailCategory({ name: form.name, maxProcessingTime: Number(form.maxProcessingTime), description: form.description }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mail-categories'] }); toast.success('Catégorie créée'); setDialogOpen(false); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: () => settingsService.updateMailCategory(editingId!, { name: form.name, maxProcessingTime: Number(form.maxProcessingTime), description: form.description, isActive: form.isActive }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mail-categories'] }); toast.success('Catégorie modifiée'); setDialogOpen(false); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => settingsService.deleteMailCategory(deletingId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mail-categories'] }); toast.success('Catégorie supprimée'); setDeleteDialogOpen(false); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', maxProcessingTime: '7', description: '', isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (cat: typeof categories[0]) => {
    setEditingId(cat._id);
    setForm({ name: cat.name, maxProcessingTime: String(cat.maxProcessingTime), description: cat.description ?? '', isActive: cat.isActive });
    setDialogOpen(true);
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base flex items-center gap-2"><Tag className="h-4 w-4 text-primary" /> Catégories de courrier</CardTitle>
          <Button onClick={openAdd} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton rows={4} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nom</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Délai SLA</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Aucune catégorie</TableCell></TableRow>
                ) : categories.map(cat => (
                  <TableRow key={cat._id}>
                    <TableCell className="font-medium text-sm">{cat.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[180px] truncate">{cat.description ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className={cat.maxProcessingTime <= 3 ? 'text-destructive font-medium' : cat.maxProcessingTime <= 7 ? 'text-warning font-medium' : ''}>
                          {cat.maxProcessingTime}j
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={cat.isActive ? 'default' : 'secondary'} className="text-[10px]">
                        {cat.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => { setDeletingId(cat._id); setDeletingName(cat.name); setDeleteDialogOpen(true); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{editingId ? 'Modifier la catégorie' : 'Nouvelle catégorie'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom *</Label><Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div>
              <Label>Délai maximum de traitement (jours) *</Label>
              <Input className="mt-1" type="number" min="1" max="365" value={form.maxProcessingTime} onChange={e => setForm(f => ({ ...f, maxProcessingTime: e.target.value }))} />
            </div>
            <div><Label>Description</Label><Textarea className="mt-1" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            {editingId && (
              <div className="flex items-center justify-between">
                <Label>Catégorie active</Label>
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={() => { if (!form.name.trim()) { toast.error('Nom requis'); return; } editingId ? updateMutation.mutate() : createMutation.mutate(); }} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}{editingId ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer la catégorie</DialogTitle>
            <DialogDescription>Voulez-vous supprimer <strong>{deletingName}</strong> ?</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
