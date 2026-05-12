import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil, Trash2, FolderTree, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentService } from '@/lib/department-service';
import { userService } from '@/lib/user-service';
import { formatDate } from '@/lib/data-helpers';
import { TableSkeleton } from '@/components/LoadingSkeleton';

export default function DepartmentTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState('');
  const [form, setForm] = useState({ name: '', parentId: '', headUserId: '', description: '' });

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll(),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users-dept-heads'],
    queryFn: () => userService.getAll({ limit: '200' }),
  });

  const createMutation = useMutation({
    mutationFn: () => departmentService.create({ name: form.name, description: form.description, parentId: form.parentId || undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Service créé avec succès'); setDialogOpen(false); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: () => departmentService.update(editingId!, {
      name: form.name, description: form.description,
      headUserId: form.headUserId || undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Service modifié avec succès'); setDialogOpen(false); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => departmentService.delete(deletingId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Service supprimé'); setDeleteDialogOpen(false); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', parentId: '', headUserId: '', description: '' });
    setDialogOpen(true);
  };

  const openEdit = (dept: typeof departments[0]) => {
    setEditingId(dept._id);
    const headId = typeof dept.headUserId === 'object' && dept.headUserId ? dept.headUserId._id : dept.headUserId as string ?? '';
    const parentId = typeof dept.parentId === 'string' ? dept.parentId : '';
    setForm({ name: dept.name, parentId: parentId ?? '', headUserId: headId ?? '', description: dept.description ?? '' });
    setDialogOpen(true);
  };

  const openDelete = (id: string, name: string) => {
    setDeletingId(id);
    setDeletingName(name);
    setDeleteDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Le nom est requis'); return; }
    if (editingId) updateMutation.mutate();
    else createMutation.mutate();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <FolderTree className="h-4 w-4 text-primary" /> Services & Départements
          </CardTitle>
          <Button onClick={openAdd} size="sm" className="gap-2"><Plus className="h-4 w-4" /> Ajouter</Button>
        </CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton rows={4} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nom</TableHead>
                  <TableHead className="text-xs">Description</TableHead>
                  <TableHead className="text-xs">Créé le</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Aucun département</TableCell></TableRow>
                ) : departments.map(dept => (
                  <TableRow key={dept._id}>
                    <TableCell className="font-medium text-sm">{dept.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{dept.description ?? '—'}</TableCell>
                    <TableCell className="text-xs">{formatDate(dept.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(dept)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => openDelete(dept._id, dept.name)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier le service' : 'Nouveau service'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom *</Label><Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Service Scolarité" /></div>
            <div>
              <Label>Service parent</Label>
              <Select value={form.parentId} onValueChange={v => setForm(f => ({ ...f, parentId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Aucun (service racine)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun (racine)</SelectItem>
                  {departments.filter(d => d._id !== editingId).map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Chef de service</Label>
              <Select value={form.headUserId} onValueChange={v => setForm(f => ({ ...f, headUserId: v === 'none' ? '' : v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Non assigné" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {users.filter(u => u.isActive).map(u => <SelectItem key={u._id} value={u._id}>{u.name} ({u.role})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Description</Label><Textarea className="mt-1" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Annuler</Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingId ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer le service</DialogTitle>
            <DialogDescription>Êtes-vous sûr de vouloir supprimer <strong>{deletingName}</strong> ? Cette action est irréversible.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Annuler</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
