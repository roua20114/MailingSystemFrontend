import { useEffect, useState } from 'react';
import { Plus, Search, Filter, Reply, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { DirectorDispatchView } from '@/components/DirectorDispatchView';
import { MailRegistrationForm } from '@/components/MailRegistrationForm';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { apiRequest } from '@/lib/api-client';
import { formatDate } from '@/lib/data-helpers';

interface ReplyState {
  inboxMailId: string;
  incomingMailSubject: string;
}

interface Sender {
  _id: string;
  name: string;
}

export default function IncomingMail() {
  const [showForm, setShowForm]           = useState(false);
  const [selectedMail, setSelectedMail]   = useState<ApiMail | null>(null);
  const [statusFilter, setStatusFilter]   = useState('all');
  const [search, setSearch]               = useState('');
  const [replyState, setReplyState]       = useState<ReplyState | null>(null);
  const [senders, setSenders]             = useState<Sender[]>([]);
  const [sendersLoading, setSendersLoading] = useState(false);
  const [sendersError, setSendersError]   = useState<string | null>(null);
  const qc = useQueryClient();

  const params: Record<string, string> = { type: 'Incoming', limit: '100' };
  if (statusFilter !== 'all') params.status = statusFilter;
  if (search) params.search = search;

  const { data, isLoading } = useQuery({
    queryKey: ['mails', 'incoming', statusFilter, search],
    queryFn: () => mailService.getAll(params),
  });

  const mails = data?.mails ?? [];

  useEffect(() => {
    let active = true;
    const loadSenders = async () => {
      setSendersLoading(true);
      setSendersError(null);
      try {
        const res = await apiRequest<{ success: boolean; data: { senders: Sender[] } }>('/senders');
        if (!active) return;
        setSenders(res.data.senders ?? []);
      } catch (err) {
        if (!active) return;
        setSendersError(err instanceof Error ? err.message : 'Impossible de charger les expéditeurs.');
      } finally {
        if (!active) return;
        setSendersLoading(false);
      }
    };
    loadSenders();
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <Breadcrumb className="mb-3">
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="/">Accueil</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Courrier Entrant</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold">Courrier Entrant</h1>
          <p className="text-sm text-muted-foreground">{data?.total ?? 0} courriers enregistrés</p>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)} className="gap-2 rounded-md">
          <Plus className="h-4 w-4" /> Nouveau courrier
        </Button>
      </div>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par objet, réf. auto ou réf. manuelle..."
                className="pl-10 bg-muted/50 border-0"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-3 w-3 mr-1" /><SelectValue placeholder="Statut" />
              </SelectTrigger>
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
                  <TableHead>Réf. Auto</TableHead>
                  <TableHead>Réf. Manuelle</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Expéditeur</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Échéance SLA</TableHead>
                  <TableHead>Priorité</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Relation / Réponse</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                      Aucun courrier trouvé
                    </TableCell>
                  </TableRow>
                ) : mails.map(mail => {
                  const hasResponses = mail.responses && mail.responses.length > 0;
                  return (
                    <TableRow key={mail._id} className="hover:bg-muted/50">

                      {/* Réf. Auto (NM-YYYY-XXXX) */}
                      <TableCell
                        className="font-mono text-xs font-medium cursor-pointer"
                        onClick={() => setSelectedMail(mail)}
                      >
                        {mail.referenceNumber}
                      </TableCell>

                      {/* Réf. Manuelle (saisie par la secrétaire) */}
                      <TableCell
                        className="font-mono text-xs cursor-pointer"
                        onClick={() => setSelectedMail(mail)}
                      >
                        {mail.manualReference ? (
                          <span className="text-blue-700 dark:text-blue-400">
                            {mail.manualReference}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      <TableCell
                        className="text-xs cursor-pointer"
                        onClick={() => setSelectedMail(mail)}
                      >
                        {formatDate(mail.createdAt)}
                      </TableCell>

                      <TableCell className="cursor-pointer" onClick={() => setSelectedMail(mail)}>
                        {typeof mail.sender === 'string' ? mail.sender : mail.sender?.name ?? 'Inconnu'}
                      </TableCell>

                      <TableCell
                        className="max-w-[200px] truncate cursor-pointer"
                        onClick={() => setSelectedMail(mail)}
                      >
                        {mail.subject}
                      </TableCell>

                      <TableCell className="text-xs cursor-pointer" onClick={() => setSelectedMail(mail)}>
                        {mail.assignedDepartment?.name ?? '—'}
                      </TableCell>

                      <TableCell className="text-xs cursor-pointer" onClick={() => setSelectedMail(mail)}>
                        {formatDate(mail.slaDeadline)}
                      </TableCell>

                      <TableCell onClick={() => setSelectedMail(mail)}>
                        <PriorityBadge priority={mail.priority} />
                      </TableCell>

                      <TableCell onClick={() => setSelectedMail(mail)}>
                        <StatusBadge status={mail.status} />
                      </TableCell>

                      {/* Relation / Réponse */}
                      <TableCell onClick={() => setSelectedMail(mail)}>
                        {hasResponses ? (
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-700 border-green-200 text-xs gap-1"
                            >
                              <Link2 className="h-3 w-3" />
                              Répondu
                            </Badge>
                            {mail.responses?.[0]?.referenceNumber && (
                              <span className="text-xs text-muted-foreground font-mono">
                                {mail.responses[0].referenceNumber}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">En attente</span>
                        )}
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={hasResponses ? 'ghost' : 'outline'}
                          disabled={hasResponses}
                          onClick={() => {
                            setReplyState({ inboxMailId: mail._id, incomingMailSubject: mail.subject });
                            setShowForm(true);
                          }}
                          className="gap-1"
                        >
                          <Reply className="h-3.5 w-3.5" />
                          Répondre
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MailRegistrationForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          setReplyState(null);
          qc.invalidateQueries({ queryKey: ['mails'] });
        }}
        senders={senders}
        sendersLoading={sendersLoading}
        onSenderCreated={sender => setSenders(prev => [...prev, sender])}
        inboxMailId={replyState?.inboxMailId}
        incomingMailSubject={replyState?.incomingMailSubject}
      />

      <DirectorDispatchView
        mail={selectedMail}
        open={!!selectedMail}
        onClose={() => {
          setSelectedMail(null);
          qc.invalidateQueries({ queryKey: ['mails'] });
        }}
      />
    </div>
  );
}