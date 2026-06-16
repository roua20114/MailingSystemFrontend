import { useState, useRef, useEffect } from 'react';
import { FileSearch, FileText, Clock, User, Building2, MessageSquare, PlayCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { MailStatusStepper } from '@/components/MailStatusStepper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/EmptyState';
import { cn } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { formatDate, formatDateTime } from '@/lib/data-helpers';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Sparkles } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

function PdfFirstPage({ pdfUrl }: { pdfUrl: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    pdfjsLib.getDocument({ url: pdfUrl }).promise
      .then(pdf => pdf.getPage(1))
      .then(page => {
        if (cancelled || !canvasRef.current) return;
        const container      = canvasRef.current.parentElement!;
        const containerWidth = container.clientWidth || 280;
        const viewport       = page.getViewport({ scale: 1 });
        const scale          = containerWidth / viewport.width;
        const scaled         = page.getViewport({ scale });
        const canvas         = canvasRef.current;
        canvas.width         = scaled.width;
        canvas.height        = scaled.height;
        page.render({ canvasContext: canvas.getContext('2d')!, viewport: scaled, canvas })
          .promise.then(() => { if (!cancelled) setLoading(false); });
      })
      .catch(() => { if (!cancelled) { setLoading(false); setError(true); } });

    return () => { cancelled = true; };
  }, [pdfUrl]);

  return (
    <div className="w-full rounded-lg overflow-hidden border bg-white flex items-center justify-center" style={{ minHeight: '200px' }}>
      {loading && !error && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      {error   && <span className="text-xs text-muted-foreground/50">Aperçu indisponible</span>}
      <canvas ref={canvasRef} className={`w-full ${loading || error ? 'hidden' : ''}`} />
    </div>
  );
}
export default function MailTracking() {
  const [selected, setSelected] = useState<ApiMail | null>(null);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const { user } = useAuth();
  const qc = useQueryClient();

  const params: Record<string, string> = { limit: '100' };
  if (search) params.search = search;

  const { data } = useQuery({
    queryKey: ['mails-tracking', search],
    queryFn: () => mailService.getAll(params),
  });

  const myMails = data?.mails ?? [];

  // ── Status transition mutation ──────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id, status, n }: { id: string; status: 'In Progress' | 'Processed'; n: string }) =>
      mailService.updateStatus(id, status, n),
    onSuccess: (updated) => {
      // Update the selected mail in-place so the UI reflects immediately
      setSelected(updated);
      setNote('');
      qc.invalidateQueries({ queryKey: ['mails-tracking'] });
      qc.invalidateQueries({ queryKey: ['mails'] });
      qc.invalidateQueries({ queryKey: ['mail-stats'] });
      toast.success(
        updated.status === 'In Progress' ? 'Courrier pris en charge' : 'Courrier marqué comme traité'
      );
    },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  // ── Who can do what ─────────────────────────────────────────────────────────
  const isAssignedToMe = (mail: ApiMail) =>
    mail.assignedTo?._id === user?.id;

  const isDirectorOrAdmin =
    user?.role === 'director' || user?.role === 'admin';

  const canStartProgress = (mail: ApiMail) =>
    mail.status === 'Assigned' &&
    (isAssignedToMe(mail) || isDirectorOrAdmin);

  const canMarkProcessed = (mail: ApiMail) =>
    mail.status === 'In Progress' &&
    (isAssignedToMe(mail) || isDirectorOrAdmin);

  const handleStatusChange = (mail: ApiMail, status: 'In Progress' | 'Processed') => {
    statusMutation.mutate({ id: mail._id, status, n: note });
  };
  const summarizeMutation = useMutation({
    mutationFn: (id: string) => mailService.summarize(id),
    onSuccess: (updated) => {
      setSelected(updated);
      qc.invalidateQueries({ queryKey: ['mails-tracking'] });
      toast.success('Résumé IA généré avec succès');
    },
    onError: (e: Error) => toast.error('Erreur', { description: e.message }),
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mon Suivi</h1>
          <p className="text-sm text-muted-foreground">Suivez et traitez vos courriers assignés</p>
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

        {/* ── Mail list ── */}
        <div className={cn('space-y-2', selected ? 'lg:col-span-2' : 'lg:col-span-5')}>
          {myMails.length === 0 ? (
            <EmptyState
              icon={FileSearch}
              title="Aucun courrier trouvé"
              description="Aucun courrier ne correspond à votre recherche."
            />
          ) : myMails.map(mail => (
            <Card
              key={mail._id}
              className={cn(
                'cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
                selected?._id === mail._id && 'border-primary/30 shadow-md bg-primary/[0.02]'
              )}
              onClick={() => { setSelected(mail); setNote(''); }}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-xl flex-shrink-0',
                    mail.status === 'Processed' ? 'bg-success/10' : 'bg-primary/10'
                  )}>
                    <FileSearch className={cn(
                      'h-5 w-5',
                      mail.status === 'Processed' ? 'text-success' : 'text-primary'
                    )} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{mail.subject}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {mail.referenceNumber} · {formatDate(mail.createdAt)}
                    </p>
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

        {/* ── Detail panel ── */}
        {selected && (
          <div className="lg:col-span-3 space-y-4 animate-fade-in">
            <Card>
              <CardContent className="p-5 space-y-5">

                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-sm">{selected.referenceNumber}</h3>
                      <StatusBadge status={selected.status} />
                      <PriorityBadge priority={selected.priority} />
                    </div>
                    <p className="text-xs text-muted-foreground">{selected.subject}</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="text-xs">
                    Fermer
                  </Button>
                </div>

                {/* Stepper */}
                <div className="rounded-xl border bg-muted/20 p-4">
                  <MailStatusStepper currentStatus={selected.status} />
                </div>

                {/* Details */}
                <div className="grid gap-2.5">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-28">Expéditeur</span>
                    <span className="font-medium">{typeof selected.sender === 'string' ? selected.sender : selected.sender?.name ?? 'Inconnu'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-28">Département</span>
                    <span className="font-medium">{selected.assignedDepartment?.name ?? '—'}</span>
                  </div>
                  {selected.assignedTo && (
                    <div className="flex items-center gap-2 text-xs">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-28">Assigné à</span>
                      <span className="font-medium">{selected.assignedTo.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-xs">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground w-28">Échéance SLA</span>
                    <span className={cn('font-medium', selected.isOverdue && 'text-destructive')}>
                      {formatDate(selected.slaDeadline)}
                    </span>
                  </div>
                  {selected.instructions && (
                    <div className="flex items-start gap-2 text-xs">
                      <MessageSquare className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <span className="text-muted-foreground w-28">Instructions</span>
                      <span className="font-medium">{selected.instructions}</span>
                    </div>
                  )}
                </div>

                {/* ── Action buttons ── */}
                {(canStartProgress(selected) || canMarkProcessed(selected)) && (
                  <div className="rounded-xl border border-dashed p-4 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Action requise
                    </p>

                    <Textarea
                      placeholder="Ajouter une note (optionnel)..."
                      className="text-xs min-h-[60px] resize-none"
                      value={note}
                      onChange={e => setNote(e.target.value)}
                    />

                    <div className="flex gap-2">
                      {canStartProgress(selected) && (
                        <Button
                          className="gap-2 flex-1"
                          onClick={() => handleStatusChange(selected, 'In Progress')}
                          disabled={statusMutation.isPending}
                        >
                          {statusMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <PlayCircle className="h-4 w-4" />}
                          Prendre en charge
                        </Button>
                      )}

                      {canMarkProcessed(selected) && (
                        <Button
                          className="gap-2 flex-1 bg-success hover:bg-success/90"
                          onClick={() => handleStatusChange(selected, 'Processed')}
                          disabled={statusMutation.isPending}
                        >
                          {statusMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <CheckCircle2 className="h-4 w-4" />}
                          Marquer comme traité
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Status history */}
                {selected.statusHistory && selected.statusHistory.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold">Historique</p>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {[...selected.statusHistory].reverse().map((h, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-muted-foreground min-w-[120px]">
                            {formatDateTime(h.changedAt)}
                          </span>
                          <span className="font-medium">{h.status}</span>
                          {h.note && <span className="text-muted-foreground">— {h.note}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                
                <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold">Résumé IA</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 h-7 text-xs"
                      onClick={() => summarizeMutation.mutate(selected._id)}
                      disabled={summarizeMutation.isPending}
                    >
                      {summarizeMutation.isPending
                        ? <Loader2 className="h-3 w-3 animate-spin" />
                        : <Sparkles className="h-3 w-3" />}
                      {selected.aiSummary ? 'Régénérer' : 'Générer le résumé'}
                    </Button>
                  </div>

                  {selected.aiSummary ? (
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {selected.aiSummary}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Aucun résumé disponible. Cliquez sur "Générer le résumé".
                    </p>
                  )}
                </div>

                {/* PDF */}
                <div className="rounded-xl border bg-muted/30 p-4 flex flex-col items-center">
                  <p className="text-sm font-medium text-muted-foreground mb-1 self-start">Document scanné</p>
                  <p className="text-[11px] text-muted-foreground/60 mb-3 self-start">{selected.subject}</p>
                  {selected.pdfUrl ? (
                    <>
                      <PdfFirstPage pdfUrl={selected.pdfUrl} />
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 mt-3"
                        onClick={() => window.open(selected.pdfUrl!, '_blank', 'noopener,noreferrer')}
                      >
                        Ouvrir le PDF
                      </Button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground/30 mb-3" />
                      <span className="text-xs text-muted-foreground">Aucun PDF joint</span>
                    </div>
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