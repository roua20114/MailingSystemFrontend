import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { DirectorDispatchView } from '@/components/DirectorDispatchView';
import { MailRegistrationForm } from '@/components/MailRegistrationForm';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { formatDate } from '@/lib/data-helpers';

export default function IncomingMail() {
  const [showForm, setShowForm] = useState(false);
  const [selectedMail, setSelectedMail] = useState<ApiMail | null>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const params: Record<string, string> = { type: 'Incoming', limit: '100' };
  if (statusFilter !== 'all') params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading } = useQuery({
    queryKey: ['mails', 'incoming', statusFilter, search],
    queryFn: () => mailService.getAll(params),
  });

  const mails = data?.mails ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Courrier Entrant</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} courriers enregistrés</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="gap-2"><Plus className="h-4 w-4" /> Nouveau courrier</Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher..." className="pl-10 bg-muted/50 border-0" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Statut" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="Registered">Enregistré</SelectItem>
                <SelectItem value="Under Review">En révision</SelectItem>
                <SelectItem value="Assigned">Assigné</SelectItem>
                <SelectItem value="In Progress">En cours</SelectItem>
                <SelectItem value="Processed">Traité</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? <TableSkeleton /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Référence</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expéditeur</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Échéance SLA</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mails.length === 0 ? (
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Aucun courrier trouvé</TableCell></TableRow>
                ) : mails.map(mail => (
                  <TableRow key={mail._id} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedMail(mail)}>
                    <TableCell className="font-mono text-xs font-medium">{mail.referenceNumber}</TableCell>
                    <TableCell className="text-xs">{formatDate(mail.createdAt)}</TableCell>
                    <TableCell>{mail.sender}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{mail.subject}</TableCell>
                    <TableCell className="text-xs">{mail.assignedDepartment?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{formatDate(mail.slaDeadline)}</TableCell>
                    <TableCell><PriorityBadge priority={mail.priority} /></TableCell>
                    <TableCell><StatusBadge status={mail.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MailRegistrationForm
        open={showForm}
        onClose={() => { setShowForm(false); qc.invalidateQueries({ queryKey: ['mails'] }); }}
      />
      <DirectorDispatchView
        mail={selectedMail}
        open={!!selectedMail}
        onClose={() => { setSelectedMail(null); qc.invalidateQueries({ queryKey: ['mails'] }); }}
      />
    </div>
  );
}
