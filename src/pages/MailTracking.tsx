import { useState } from 'react';
import { FileSearch, FileText, Clock, User, Building2, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { MailStatusStepper } from '@/components/MailStatusStepper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { formatDate, formatDateTime } from '@/lib/data-helpers';
import { useAuth } from '@/contexts/AuthContext';

export default function MailTracking() {
  const [selected, setSelected] = useState<ApiMail | null>(null);
  const [search, setSearch] = useState('');
  const { user } = useAuth();

  const params: Record<string, string> = { limit: '100' };
  if (search) params.search = search;

  const { data } = useQuery({
    queryKey: ['mails-tracking', search],
    queryFn: () => mailService.getAll(params),
  });

  const myMails = data?.mails ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mon Suivi</h1>
          <p className="text-sm text-muted-foreground">Suivez la progression de vos courriers</p>
        </div>
        <Badge variant="secondary" className="text-xs">{myMails.length} courrier(s)</Badge>
      </div>

      <Input
        placeholder="Rechercher par objet ou numéro de référence..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="max-w-md bg-muted/50 border-0"
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className={cn('space-y-2', selected ? 'lg:col-span-2' : 'lg:col-span-5')}>
          {myMails.length === 0 ? (
            <EmptyState icon={FileSearch} title="Aucun courrier trouvé" description="Aucun courrier ne correspond à votre recherche." />
          ) : myMails.map(mail => (
            <Card
              key={mail._id}
              className={cn('cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5', selected?._id === mail._id && 'border-primary/30 shadow-md bg-primary/[0.02]')}
              onClick={() => setSelected(mail)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0', mail.status === 'Processed' ? 'bg-success/10' : 'bg-primary/10')}>
                    <FileSearch className={cn('h-5 w-5', mail.status === 'Processed' ? 'text-success' : 'text-primary')} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{mail.subject}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{mail.referenceNumber} · {formatDate(mail.createdAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <PriorityBadge priority={mail.priority} />
                  <StatusBadge status={mail.status} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selected && (
          <div className="lg:col-span-3 space-y-4 animate-fade-in">
            <Card>
              <CardContent className="p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{selected.referenceNumber}</h3>
                      <StatusBadge status={selected.status} />
                      <PriorityBadge priority={selected.priority} />
                    </div>
                    <p className="text-xs text-muted-foreground">{selected.subject}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="text-xs">Fermer</Button>
                </div>

                <div className="rounded-xl border bg-muted/20 p-4">
                  <MailStatusStepper currentStatus={selected.status} />
                </div>

                <div className="grid gap-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-28">Expéditeur</span>
                    <span className="font-medium">{selected.sender}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-28">Département</span>
                    <span className="font-medium">{selected.assignedDepartment?.name ?? '—'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-28">Échéance SLA</span>
                    <span className={cn('font-medium', selected.isOverdue && 'text-destructive')}>{formatDate(selected.slaDeadline)}</span>
                  </div>
                  {selected.instructions && (
                    <div className="flex items-start gap-2 text-xs">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground w-28">Instructions</span>
                      <span className="font-medium">{selected.instructions}</span>
                    </div>
                  )}
                </div>

                {/* Status History */}
                {selected.statusHistory && selected.statusHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Historique</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {[...selected.statusHistory].reverse().map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground min-w-[120px]">{formatDateTime(h.changedAt)}</span>
                          <span className="font-medium">{h.status}</span>
                          {h.note && <span className="text-muted-foreground">— {h.note}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                {selected.aiSummary && (
                  <div className="rounded-xl border bg-muted/30 p-4">
                    <p className="text-xs font-semibold mb-1">Résumé IA</p>
                    <p className="text-xs text-muted-foreground">{selected.aiSummary}</p>
                  </div>
                )}

                <div className="rounded-xl border bg-muted/30 p-8 flex flex-col items-center">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground mb-1">Document scanné</p>
                  <p className="text-[11px] text-muted-foreground/60 mb-3">{selected.subject}</p>
                  {selected.pdfUrl ? (
                    <Button variant="outline" size="sm" className="gap-2" asChild>
                      <a href={selected.pdfUrl} target="_blank" rel="noopener noreferrer"
                        onClick={e => { e.preventDefault(); window.open(selected.pdfUrl!, '_blank', 'noopener,noreferrer'); }}>
                        Ouvrir le PDF
                    </a>
                    </Button>
                  ) : (
                    <span className="text-xs text-muted-foreground">Aucun PDF joint</span>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
