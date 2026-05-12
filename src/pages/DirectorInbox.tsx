import { useState } from 'react';
import { ClipboardCheck, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { DirectorDispatchView } from '@/components/DirectorDispatchView';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { formatDate } from '@/lib/data-helpers';

export default function DirectorInbox() {
  const [selected, setSelected] = useState<ApiMail | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const qc = useQueryClient();

  // Director inbox = Registered + Under Review mails
  const { data: registeredData, isLoading: r1 } = useQuery({
    queryKey: ['mails-dispatch', 'Registered'],
    queryFn: () => mailService.getAll({ status: 'Registered', limit: '100' }),
  });

  const { data: reviewData, isLoading: r2 } = useQuery({
    queryKey: ['mails-dispatch', 'Under Review'],
    queryFn: () => mailService.getAll({ status: 'Under Review', limit: '100' }),
  });

  const isLoading = r1 || r2;
  const allMails = [...(registeredData?.mails ?? []), ...(reviewData?.mails ?? [])];
  const filtered = typeFilter === 'all' ? allMails : allMails.filter(m => m.type === typeFilter);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ClipboardCheck className="h-6 w-6 text-primary" />
            File de Dispatching
          </h1>
          <p className="text-sm text-muted-foreground">Courriers en attente d'examen et de dispatching</p>
        </div>
        <Badge variant="destructive" className="text-sm px-3 py-1">{allMails.length} courriers</Badge>
      </div>

      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="h-3 w-3 mr-2" /><SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            <SelectItem value="Incoming">Entrant</SelectItem>
            <SelectItem value="Outgoing">Sortant</SelectItem>
            <SelectItem value="Internal">Interne</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => { qc.invalidateQueries({ queryKey: ['mails-dispatch'] }); }}>
          Rafraîchir
        </Button>
      </div>

      {isLoading ? (
        <Card className="glass-card"><CardContent className="pt-6"><TableSkeleton /></CardContent></Card>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="File vide" description="Aucun courrier en attente de dispatching. Tout est traité !" />
      ) : (
        <div className="grid gap-3">
          {filtered.map(mail => (
            <Card
              key={mail._id}
              className={`cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 ${selected?._id === mail._id ? 'border-primary/40 shadow-md' : ''}`}
              onClick={() => setSelected(mail)}
            >
              <CardHeader className="pb-2 pt-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-semibold">{mail.referenceNumber}</span>
                    <Badge variant="outline" className="text-[10px]">{mail.type}</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={mail.priority} />
                    <StatusBadge status={mail.status} />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pb-4">
                <p className="text-sm font-medium truncate mb-1">{mail.subject}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>De : <strong>{mail.sender}</strong></span>
                  <span>Enregistré le {formatDate(mail.createdAt)}</span>
                </div>
                {mail.isOverdue && (
                  <p className="text-[11px] text-destructive font-medium mt-1.5">⚠ Délai dépassé</p>
                )}
                {mail.aiSuggestedDepartment && (
                  <p className="text-[10px] text-primary mt-1">✦ IA → {mail.aiSuggestedDepartment}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <DirectorDispatchView
        mail={selected}
        open={!!selected}
        onClose={() => { setSelected(null); qc.invalidateQueries({ queryKey: ['mails-dispatch'] }); }}
      />
    </div>
  );
}
