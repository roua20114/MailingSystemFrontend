import { useState } from 'react';
import { Archive, Search, Filter, FileText, User, Building2, Clock, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PriorityBadge } from '@/components/StatusBadge';
import { MailStatusStepper } from '@/components/MailStatusStepper';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { useQuery } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { formatDate, formatDateTime } from '@/lib/data-helpers';
import { cn } from '@/lib/utils';

const TYPE_LABELS: Record<string, string> = {
  Incoming: 'Entrant',
  Outgoing: 'Sortant',
  Internal: 'Interne',
};

const TYPE_COLORS: Record<string, string> = {
  Incoming: 'bg-blue-100 text-blue-700',
  Outgoing: 'bg-green-100 text-green-700',
  Internal: 'bg-orange-100 text-orange-700',
};

export default function Archives() {
  const [search, setSearch]         = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected]     = useState<ApiMail | null>(null);

  const params: Record<string, string> = { status: 'Processed', limit: '200' };
  if (typeFilter !== 'all') params.type = typeFilter;
  if (search)               params.search = search;

  const { data, isLoading } = useQuery({
    queryKey: ['mails-archives', typeFilter, search],
    queryFn: () => mailService.getAll(params),
  });

  const mails = data?.mails ?? [];

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb className="mb-3">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Accueil</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Archives</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold">Archives</h1>
          <p className="text-sm text-muted-foreground">Tous les courriers traités</p>
        </div>
        <Badge variant="secondary" className="gap-1.5 text-xs">
          <Archive className="h-3 w-3" />
          {data?.total ?? 0} courrier(s) traité(s)
        </Badge>
      </div>

      {/* Filters */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Rechercher par objet, expéditeur, référence..."
                className="pl-10 bg-muted/50 border-0"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-3 w-3 mr-1" />
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                <SelectItem value="Incoming">Entrant</SelectItem>
                <SelectItem value="Outgoing">Sortant</SelectItem>
                <SelectItem value="Internal">Interne</SelectItem>
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
                  <TableHead>Type</TableHead>
                  <TableHead>Expéditeur</TableHead>
                  <TableHead>Objet</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead>Assigné à</TableHead>
                  <TableHead>Date traitement</TableHead>
                  <TableHead>Priorité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {mails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16 text-muted-foreground">
                      <Archive className="h-10 w-10 mx-auto mb-3 opacity-20" />
                      <p className="font-medium">Aucun courrier traité</p>
                      <p className="text-xs mt-1">Les courriers apparaîtront ici une fois traités</p>
                    </TableCell>
                  </TableRow>
                ) : mails.map(mail => (
                  <TableRow
                    key={mail._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelected(mail)}
                  >
                    <TableCell className="font-mono text-xs font-medium">{mail.referenceNumber}</TableCell>
                    <TableCell>
                      <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', TYPE_COLORS[mail.type] ?? '')}>
                        {TYPE_LABELS[mail.type] ?? mail.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm">{typeof mail.sender === 'string' ? mail.sender : mail.sender?.name ?? 'Inconnu'}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-sm">{mail.subject}</TableCell>
                    <TableCell className="text-xs">{mail.assignedDepartment?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{mail.assignedTo?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {/* Last status history entry = when it was marked Processed */}
                      {mail.statusHistory && mail.statusHistory.length > 0
                        ? formatDateTime(mail.statusHistory[mail.statusHistory.length - 1].changedAt)
                        : formatDate(mail.createdAt)}
                    </TableCell>
                    <TableCell><PriorityBadge priority={mail.priority} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={v => !v && setSelected(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Archive className="h-4 w-4 text-success" />
              {selected?.referenceNumber}
              <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full ml-1', TYPE_COLORS[selected?.type ?? ''] ?? '')}>
                {TYPE_LABELS[selected?.type ?? ''] ?? selected?.type}
              </span>
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-4 pt-1">

              {/* Stepper */}
              <div className="rounded-xl border bg-muted/20 p-4">
                <MailStatusStepper currentStatus={selected.status} />
              </div>

              {/* Details */}
              <div className="grid gap-2.5">
                <DetailRow icon={User}      label="Expéditeur"   value={typeof selected.sender === 'string' ? selected.sender : selected.sender?.name ?? 'Inconnu'} />
                <DetailRow icon={Building2} label="Département"  value={selected.assignedDepartment?.name ?? '—'} />
                <DetailRow icon={User}      label="Assigné à"    value={selected.assignedTo?.name ?? '—'} />
                <DetailRow icon={Clock}     label="Échéance SLA" value={formatDate(selected.slaDeadline)} />
                {selected.instructions && (
                  <DetailRow icon={MessageSquare} label="Instructions" value={selected.instructions} />
                )}
              </div>

              {/* AI summary */}
              {selected.aiSummary && (
                <div className="rounded-xl border bg-muted/30 p-4">
                  <p className="text-xs font-semibold mb-1">Résumé IA</p>
                  <p className="text-xs text-muted-foreground">{selected.aiSummary}</p>
                </div>
              )}

              {/* Status history */}
              {selected.statusHistory && selected.statusHistory.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold">Historique complet</p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto rounded-xl border p-3 bg-muted/10">
                    {[...selected.statusHistory].reverse().map((h, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs">
                        <span className="text-muted-foreground min-w-[130px]">{formatDateTime(h.changedAt)}</span>
                        <span className="font-medium">{h.status}</span>
                        {h.note && <span className="text-muted-foreground">— {h.note}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF */}
              {selected.pdfUrl && (
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs">Document scanné</span>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1.5 text-xs h-7" asChild>
                    <a
                      href={selected.pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => { e.preventDefault(); window.open(selected.pdfUrl!, '_blank', 'noopener,noreferrer'); }}
                    >
                      Ouvrir le PDF
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Small helper component
function DetailRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <span className="text-muted-foreground w-28 flex-shrink-0">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}