import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Pencil, Shield, UserCheck, UserX, Search, Loader2 } from 'lucide-react';
import { roleLabels, roleColors } from '@/lib/settings-data';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '@/lib/user-service';
import { departmentService } from '@/lib/department-service';
import { formatDateTime } from '@/lib/data-helpers';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import type { UserRole } from '@/lib/settings-data';

// Backend roles → frontend UserRole
function toFrontendRole(r: string): UserRole {
  const map: Record<string, UserRole> = {
    Admin: 'admin', Director: 'director', Secretary: 'secretary',
    Professor: 'professor', 'Service Lead': 'service-lead',
  };
  return map[r] ?? 'professor';
}

// Frontend UserRole → backend role string
function toBackendRole(r: string): string {
  const map: Record<string, string> = {
    admin: 'Admin', director: 'Director', secretary: 'Secretary',
    professor: 'Professor', 'service-lead': 'Service Lead',
  };
  return map[r] ?? 'Professor';
}

const rolePermissions: Record<UserRole, string[]> = {
  admin: ['Accès complet', 'Gérer utilisateurs', 'Configurer système', 'Voir audit'],
  director: ['Dispatcher courrier', 'Assigner', 'Ajouter instructions', 'Voir tout'],
  secretary: ['Enregistrer courrier', 'Scanner PDF', 'Voir ses courriers'],
  professor: ['Suivi personnel', 'Voir PDF', 'Recevoir notifications'],
  'service-lead': ['Gérer tâches', 'Mettre à jour statut', 'Voir service'],
};

export default function UsersRolesTab() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' as UserRole | '', departmentId: '', isActive: true });

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => userService.getAll({ limit: '200' }),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentService.getAll(),
  });

  const createMutation = useMutation({
    mutationFn: () => userService.create({
      name: form.name, email: form.email, password: form.password,
      role: toBackendRole(form.role as string),
      departmentId: (form.departmentId && form.departmentId !== 'none') ? form.departmentId : undefined,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur créé'); setDialogOpen(false); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: () => userService.update(editingId!, {
      name: form.name, email: form.email,
      role: toBackendRole(form.role as string) as never,
      departmentId: form.departmentId || undefined as never,
      isActive: form.isActive,
      ...(form.password ? { password: form.password } : {}),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur modifié'); setDialogOpen(false); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => userService.update(id, { isActive } as never),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Statut modifié'); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => userService.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur supprimé'); },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => {
    setEditingId(null);
    setForm({ name: '', email: '', password: '', role: '', departmentId: '', isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (u: typeof users[0]) => {
    setEditingId(u._id);
    const deptId = typeof u.departmentId === 'object' && u.departmentId ? u.departmentId._id : u.departmentId as string ?? '';
    setForm({ name: u.name, email: u.email, password: '', role: toFrontendRole(u.role), departmentId: deptId, isActive: u.isActive });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim() || !form.role) {
      toast.error('Tous les champs obligatoires doivent être remplis'); return;
    }
    // departmentId is required for non-Admin roles only
    if (form.role !== 'admin' && !form.departmentId) {
      toast.error('Veuillez sélectionner un département'); return;
    }
    if (!editingId && !form.password) { toast.error('Le mot de passe est requis pour un nouveau compte'); return; }
    if (editingId) updateMutation.mutate();
    else createMutation.mutate();
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Role Permissions Summary */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.entries(rolePermissions) as [UserRole, string[]][]).map(([role, perms]) => (
          <Card key={role} className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="h-3.5 w-3.5 text-primary" />
                <Badge className={`text-[10px] border-0 ${roleColors[role]}`}>{roleLabels[role]}</Badge>
              </div>
              <ul className="space-y-1">
                {perms.map(p => <li key={p} className="text-[10px] text-muted-foreground flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-muted-foreground/50 flex-shrink-0" />{p}</li>)}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Users table */}
      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between pb-4">
          <CardTitle className="text-base">Utilisateurs du système</CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input className="h-8 pl-8 w-48 text-xs" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Button size="sm" className="gap-1.5 h-8" onClick={openAdd}><Plus className="h-3.5 w-3.5" /> Ajouter</Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton rows={5} /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Nom</TableHead>
                  <TableHead className="text-xs">Email</TableHead>
                  <TableHead className="text-xs">Rôle</TableHead>
                  <TableHead className="text-xs">Département</TableHead>
                  <TableHead className="text-xs">Dernière connexion</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucun utilisateur trouvé</TableCell></TableRow>
                ) : filtered.map(u => {
                  const frontRole = toFrontendRole(u.role);
                  const deptName = typeof u.departmentId === 'object' && u.departmentId ? (u.departmentId as { name: string }).name : '—';
                  return (
                    <TableRow key={u._id}>
                      <TableCell className="text-sm font-medium">{u.name}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{u.email}</TableCell>
                      <TableCell><Badge className={`text-[10px] border-0 ${roleColors[frontRole]}`}>{roleLabels[frontRole]}</Badge></TableCell>
                      <TableCell className="text-xs">{deptName}</TableCell>
                      <TableCell className="text-xs">{u.lastLogin ? formatDateTime(u.lastLogin) : '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          {u.isActive ? <UserCheck className="h-3.5 w-3.5 text-success" /> : <UserX className="h-3.5 w-3.5 text-muted-foreground" />}
                          <Switch
                            checked={u.isActive}
                            onCheckedChange={v => toggleMutation.mutate({ id: u._id, isActive: v })}
                            className="h-4 w-7"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => { if (confirm('Supprimer cet utilisateur ?')) deleteMutation.mutate(u._id); }}>
                            <UserX className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</DialogTitle>
            <DialogDescription>{editingId ? 'Modifiez les informations ci-dessous.' : 'Créez un nouveau compte utilisateur.'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>Nom complet *</Label><Input className="mt-1" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Email *</Label><Input className="mt-1" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><Label>{editingId ? 'Nouveau mot de passe (optionnel)' : 'Mot de passe *'}</Label><Input className="mt-1" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min. 8 car., 1 majuscule, 1 chiffre" /></div>
            <div>
              <Label>Rôle *</Label>
              <Select value={form.role} onValueChange={v => setForm(f => ({ ...f, role: v as UserRole, departmentId: '' }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un rôle" /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(roleLabels) as [UserRole, string][]).map(([r, label]) => (
                    <SelectItem key={r} value={r}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Département {form.role === 'admin' ? '(optionnel)' : '*'}</Label>
              <Select value={form.departmentId} onValueChange={v => setForm(f => ({ ...f, departmentId: v }))}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un département" /></SelectTrigger>
                <SelectContent>
                  {form.role === 'admin' && <SelectItem value="none">— Aucun —</SelectItem>}
                  {departments.map(d => <SelectItem key={d._id} value={d._id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {editingId && (
              <div className="flex items-center justify-between">
                <Label>Compte actif</Label>
                <Switch checked={form.isActive} onCheckedChange={v => setForm(f => ({ ...f, isActive: v }))} />
              </div>
            )}
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
    </div>
  );
}