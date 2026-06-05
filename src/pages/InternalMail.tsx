import { useState } from 'react';
import { ArrowRight, Eye, CheckCircle2 } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { MailStatusStepper } from '@/components/MailStatusStepper';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { formatDate } from '@/lib/data-helpers';
import { TableSkeleton } from '@/components/LoadingSkeleton';

export default function InternalMail() {
  const [selected, setSelected] = useState<ApiMail | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['mails', 'internal'],
    queryFn: () => mailService.getAll({ type: 'Internal', limit: '100' }),
  });

  const internal = data?.mails ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb className="mb-3">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Accueil</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Courrier Interne</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold tracking-tight">Courrier Interne</h1>
          <p className="text-sm text-muted-foreground">Circulation entre services</p>
        </div>
        <Badge variant="secondary">{data?.total ?? 0} courriers</Badge>
      </div>

      {isLoading ? <TableSkeleton /> : (
        <div className="grid gap-4 md:grid-cols-2">
          {internal.length === 0 && (
            <p className="text-center py-12 text-muted-foreground col-span-2">Aucun courrier interne</p>
          )}
          {internal.map(mail => (
            <Card
              key={mail._id}
              className={cn('cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5', selected?._id === mail._id && 'border-primary/30 shadow-md')}
              onClick={() => setSelected(selected?._id === mail._id ? null : mail)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono font-semibold">{mail.referenceNumber}</span>
                    <PriorityBadge priority={mail.priority} />
                  </div>
                  <StatusBadge status={mail.status} />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm font-medium">{mail.subject}</p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="rounded-lg bg-muted px-2.5 py-1 font-medium">{typeof mail.sender === 'string' ? mail.sender : mail.sender?.name ?? 'Inconnu'}</span>
                  <ArrowRight className="h-3 w-3 text-primary" />
                  <span className="rounded-lg bg-muted px-2.5 py-1 font-medium">
                    {mail.assignedDepartment?.name ?? mail.assignedTo?.name ?? 'Non assigné'}
                  </span>
                </div>
                <MailStatusStepper currentStatus={mail.status} />

                {selected?._id === mail._id && (
                  <div className="pt-3 border-t space-y-3 animate-fade-in">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <span className="text-muted-foreground">Date</span>
                      <span className="font-medium">{formatDate(mail.createdAt)}</span>
                      <span className="text-muted-foreground">Échéance SLA</span>
                      <span className="font-medium">{formatDate(mail.slaDeadline)}</span>
                      <span className="text-muted-foreground">Créé par</span>
                      <span className="font-medium">{mail.createdBy?.name ?? '—'}</span>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <Eye className="h-3 w-3" /> {mail.statusHistory?.length ?? 0} étapes
                      </Badge>
                      <Badge variant="outline" className="gap-1 text-[10px]">
                        <CheckCircle2 className="h-3 w-3" /> {mail.status}
                      </Badge>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
