import { useState, useEffect, useRef } from 'react';
import { Sparkles, FileText, Plus, Loader2, Search  } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MailStatusStepper } from '@/components/MailStatusStepper';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { formatDate } from '@/lib/data-helpers';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';
import { MailRegistrationForm } from '@/components/MailRegistrationForm';
import { apiRequest } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

// ── PDF first-page preview ────────────────────────────────────────────────────
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
        const container     = canvasRef.current.parentElement!;
        const containerWidth = container.clientWidth || 280;
        const viewport      = page.getViewport({ scale: 1 });
        const scale         = containerWidth / viewport.width;
        const scaled        = page.getViewport({ scale });
        const canvas        = canvasRef.current;
        canvas.width        = scaled.width;
        canvas.height       = scaled.height;
        page.render({ canvasContext: canvas.getContext('2d')!, viewport: scaled, canvas })
          .promise.then(() => { if (!cancelled) setLoading(false); });
      })
      .catch(() => { if (!cancelled) { setLoading(false); setError(true); } });

    return () => { cancelled = true; };
  }, [pdfUrl]);

  return (
    <div className="w-full rounded-lg overflow-hidden border bg-white flex items-center justify-center" style={{ minHeight: '220px' }}>
      {loading && !error && <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />}
      {error   && <span className="text-xs text-muted-foreground/50">Aperçu indisponible</span>}
      <canvas ref={canvasRef} className={`w-full ${loading || error ? 'hidden' : ''}`} />
    </div>
  );
}

// ── Outgoing mail detail modal ────────────────────────────────────────────────
function OutgoingMailDetail({ mail, open, onClose }: { mail: ApiMail | null; open: boolean; onClose: () => void }) {
  if (!mail) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 flex-wrap">
            <span className="font-mono">{mail.referenceNumber}</span>
            <StatusBadge status={mail.status} />
            <PriorityBadge priority={mail.priority} />
          </DialogTitle>
        </DialogHeader>

        <div className="mb-4 p-4 rounded-xl border bg-muted/20">
          <MailStatusStepper currentStatus={mail.status} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* PDF Preview */}
          <div className="rounded-xl border bg-muted/30 p-4 flex flex-col items-center min-h-[320px]">
            <p className="text-sm font-medium text-muted-foreground mb-1 self-start">Document scanné</p>
            <p className="text-xs text-muted-foreground/70 mb-3 self-start max-w-full truncate">{mail.subject}</p>
            {mail.pdfUrl ? (
              <>
                <PdfFirstPage pdfUrl={mail.pdfUrl} />
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => window.open(mail.pdfUrl!, '_blank', 'noopener,noreferrer')}
                >
                  Ouvrir le PDF
                </Button>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center flex-1 w-full">
                <FileText className="h-16 w-16 text-muted-foreground/30 mb-4" />
                <span className="text-xs text-muted-foreground/50">Aucun PDF joint</span>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            <div className="rounded-xl border p-4 space-y-2.5">
              <h3 className="text-sm font-semibold mb-1">Détails</h3>
              {([
                ['Expéditeur',   typeof mail.sender === 'string' ? mail.sender : mail.sender?.name ?? 'Inconnu'],
                ['Type',         mail.type],
                ['Date',         formatDate(mail.createdAt)],
                ['Échéance SLA', mail.slaDeadline ? formatDate(mail.slaDeadline) : '—'],
                ['Créé par',     mail.createdBy?.name ?? '—'],
              ] as [string, string][]).map(([label, value]) => (
                <div key={label} className="grid grid-cols-2 gap-2 text-sm">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <span className="font-medium text-xs">{value}</span>
                </div>
              ))}
              {mail.description && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-1">Description</p>
                  <p className="text-xs">{mail.description}</p>
                </div>
              )}
            </div>

            {Array.isArray(mail.assignedTo) && mail.assignedTo.length > 0 && (
              <div className="rounded-xl border p-4 space-y-1.5">
                <h3 className="text-sm font-semibold">Responsables</h3>
                <div className="flex flex-wrap gap-1.5">
                  {mail.assignedTo.map((u: { _id: string; name: string }) => (
                    <Badge key={u._id} variant="secondary" className="text-xs">{u.name}</Badge>
                  ))}
                </div>
              </div>
            )}

            {mail.dispatchedTo && mail.dispatchedTo.length > 0 && (
              <div className="rounded-xl border p-4 space-y-1.5">
                <h3 className="text-sm font-semibold">Départements destinataires</h3>
                <div className="flex flex-wrap gap-1.5">
                  {mail.dispatchedTo.map((d: string | { _id: string; name: string }) => {
                    const id   = typeof d === 'string' ? d : d._id;
                    const name = typeof d === 'string' ? d : d.name;
                    return <Badge key={id} variant="secondary" className="text-xs">{name}</Badge>;
                  })}
                </div>
              </div>
            )}

            {mail.isMarked && (
              <div className="rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20 p-3 flex items-center gap-2">
                <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-xs font-medium text-green-700 dark:text-green-400">Courrier traité / marqué</span>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── One-time checkbox ─────────────────────────────────────────────────────────
function OnceCheckbox({ mailId, initialChecked, onMarked }: {
  mailId: string;
  initialChecked: boolean;
  onMarked: () => void;
}) {
  const [checked, setChecked] = useState(initialChecked);
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (checked || loading) return;
    setLoading(true);
    try {
      await mailService.mark(mailId);
      setChecked(true);
      onMarked();
      toast.success('Courrier marqué comme traité');
    } catch {
      toast.error('Impossible de marquer ce courrier');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={checked || loading}
      title={checked ? 'Déjà marqué' : 'Marquer comme traité'}
      className={[
        'h-5 w-5 rounded border-2 flex items-center justify-center transition-all',
        checked
          ? 'bg-green-500 border-green-500 cursor-not-allowed'
          : loading
            ? 'border-muted-foreground/40 cursor-wait'
            : 'border-muted-foreground/40 hover:border-green-500 cursor-pointer',
      ].join(' ')}
    >
      {loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
      {checked && !loading && (
        <svg className="h-3 w-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Sender     { _id: string; name: string; }
interface ReplyState { inboxMailId?: string; incomingMailSubject: string; }

// ── Main component ────────────────────────────────────────────────────────────
export default function OutgoingMail() {
  const [showGenerate, setShowGenerate]     = useState(false);
  const [showForm, setShowForm]             = useState(false);
  const [showNewMail, setShowNewMail]       = useState(false);
  const [replyState, setReplyState]         = useState<ReplyState | null>(null);
  const [senders, setSenders]               = useState<Sender[]>([]);
  const [sendersLoading, setSendersLoading] = useState(false);
  const [selectedMail, setSelectedMail]     = useState<ApiMail | null>(null);
  const [search, setSearch] = useState('');
  const qc = useQueryClient();

  const outgoingParams: Record<string, string> = { type: 'Outgoing', limit: '100' };
  if (search) outgoingParams.search = search;

  const { data: outgoingData, isLoading: outLoading } = useQuery({
    queryKey: ['mails', 'outgoing', search],
    queryFn: () => mailService.getAll(outgoingParams),
  });

  const { data: incomingData } = useQuery({
    queryKey: ['mails', 'incoming-refs'],
    queryFn: () => mailService.getAll({ type: 'Incoming', limit: '100' }),
  });

  const outgoing = outgoingData?.mails ?? [];
  const incoming = incomingData?.mails  ?? [];

  useEffect(() => {
    let active = true;
    setSendersLoading(true);
    apiRequest<{ success: boolean; data: { senders: Sender[] } }>('/senders')
      .then(res => { if (active) setSenders(res.data.senders ?? []); })
      .catch(() => {})
      .finally(() => { if (active) setSendersLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb className="mb-3">
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="/">Accueil</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Courrier Sortant</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold tracking-tight">Courrier Sortant</h1>
          <p className="text-sm text-muted-foreground">{outgoingData?.total ?? 0} courriers envoyés</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setShowGenerate(true)}>
            <Sparkles className="h-4 w-4" /> Générer une réponse IA
          </Button>
          <Button className="gap-2" onClick={() => setShowNewMail(true)}>
            <Plus className="h-4 w-4" /> Nouveau courrier
          </Button>
        </div>
      </div>
        {/* Search bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher par objet, description, référence... (FR, EN, AR)"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      {/* Table */}
      <Card className="glass-card">
        <CardContent className="pt-6">
          {outLoading ? <TableSkeleton /> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 text-xs">✓</TableHead>
                  <TableHead className="text-xs">N° Référence</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Objet</TableHead>
                  <TableHead className="text-xs">Expéditeur</TableHead>
                  <TableHead className="text-xs">Département</TableHead>
                  <TableHead className="text-xs">Assigné à</TableHead>
                  <TableHead className="text-xs">Priorité</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {outgoing.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      Aucun courrier sortant
                    </TableCell>
                  </TableRow>
                ) : outgoing.map(mail => (
                  <TableRow
                    key={mail._id}
                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setSelectedMail(mail)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <OnceCheckbox
                        mailId={mail._id}
                        initialChecked={!!mail.isMarked}
                        onMarked={() => qc.invalidateQueries({ queryKey: ['mails'] })}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold">{mail.referenceNumber}</TableCell>
                    <TableCell className="text-xs">{formatDate(mail.createdAt)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{mail.subject}</TableCell>
                    <TableCell className="text-xs">
                      {typeof mail.sender === 'string' ? mail.sender : mail.sender?.name ?? 'Inconnu'}
                    </TableCell>
                    <TableCell className="text-xs">{mail.assignedDepartment?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">
                      {Array.isArray(mail.assignedTo) && mail.assignedTo.length > 0
                        ? mail.assignedTo.map((u: { name: string }) => u.name).join(', ')
                        : '—'}
                    </TableCell>
                    <TableCell><PriorityBadge priority={mail.priority} /></TableCell>
                    <TableCell><StatusBadge status={mail.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail modal */}
      <OutgoingMailDetail
        mail={selectedMail}
        open={!!selectedMail}
        onClose={() => setSelectedMail(null)}
      />

      {/* Reply form */}
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

      {/* New outgoing mail */}
      <MailRegistrationForm
        open={showNewMail}
        onClose={() => {
          setShowNewMail(false);
          qc.invalidateQueries({ queryKey: ['mails'] });
        }}
        senders={senders}
        sendersLoading={sendersLoading}
        onSenderCreated={sender => setSenders(prev => [...prev, sender])}
        defaultType="Outgoing"
      />

      {/* AI Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Générer une réponse IA
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Courrier entrant de référence</Label>
              <Select>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Sélectionner un courrier..." />
                </SelectTrigger>
                <SelectContent>
                  {incoming.map(m => (
                    <SelectItem key={m._id} value={m._id}>
                      {m.referenceNumber} — {m.subject}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ton de la réponse</Label>
              <Select defaultValue="formal">
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="formal">Formel</SelectItem>
                  <SelectItem value="neutral">Neutre</SelectItem>
                  <SelectItem value="friendly">Cordial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Réponse générée</Label>
              <Textarea
                rows={6}
                className="mt-1 text-xs"
                defaultValue={"Monsieur,\n\nNous accusons réception de votre courrier et avons le plaisir de vous informer que votre demande a été examinée favorablement.\n\nVeuillez agréer l'expression de nos salutations distinguées."}
              />
              <div className="flex items-center gap-1.5 mt-1.5">
                <Sparkles className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary">Contenu éditable — modifiez avant validation</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowGenerate(false)}>Annuler</Button>
            <Button onClick={() => { toast.success('Réponse créée avec succès'); setShowGenerate(false); }}>
              <FileText className="h-4 w-4 mr-2" /> Valider & Créer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}