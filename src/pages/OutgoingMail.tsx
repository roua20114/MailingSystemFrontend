import { useState } from 'react';
import { Sparkles, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { mailService } from '@/lib/mail-service';
import { formatDate } from '@/lib/data-helpers';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { toast } from 'sonner';

export default function OutgoingMail() {
  const [showGenerate, setShowGenerate] = useState(false);

  const { data: outgoingData, isLoading: outLoading } = useQuery({
    queryKey: ['mails', 'outgoing'],
    queryFn: () => mailService.getAll({ type: 'Outgoing', limit: '100' }),
  });

  const { data: incomingData } = useQuery({
    queryKey: ['mails', 'incoming-refs'],
    queryFn: () => mailService.getAll({ type: 'Incoming', limit: '100' }),
  });

  const outgoing = outgoingData?.mails ?? [];
  const incoming = incomingData?.mails ?? [];

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
                <BreadcrumbPage>Courrier Sortant</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold tracking-tight">Courrier Sortant</h1>
          <p className="text-sm text-muted-foreground">{outgoingData?.total ?? 0} courriers envoyés</p>
        </div>
        <Button className="gap-2" onClick={() => setShowGenerate(true)}>
          <Sparkles className="h-4 w-4" /> Générer une réponse IA
        </Button>
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6">
          {outLoading ? <TableSkeleton /> : (
            <Table>
              <TableHeader>
                <TableRow>
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
                  <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">Aucun courrier sortant</TableCell></TableRow>
                ) : outgoing.map(mail => (
                  <TableRow key={mail._id} className="cursor-pointer hover:bg-muted/50 transition-colors">
                    <TableCell className="font-mono text-xs font-semibold">{mail.referenceNumber}</TableCell>
                    <TableCell className="text-xs">{formatDate(mail.createdAt)}</TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs">{mail.subject}</TableCell>
                    <TableCell className="text-xs">{typeof mail.sender === 'string' ? mail.sender : mail.sender?.name ?? 'Inconnu'}</TableCell>
                    <TableCell className="text-xs">{mail.assignedDepartment?.name ?? '—'}</TableCell>
                    <TableCell className="text-xs">{mail.assignedTo?.name ?? '—'}</TableCell>
                    <TableCell><PriorityBadge priority={mail.priority} /></TableCell>
                    <TableCell><StatusBadge status={mail.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* AI Generate Response Dialog */}
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
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner un courrier..." /></SelectTrigger>
                <SelectContent>
                  {incoming.map(m => (
                    <SelectItem key={m._id} value={m._id}>{m.referenceNumber} — {m.subject}</SelectItem>
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
              <Textarea rows={6} className="mt-1 text-xs"
                defaultValue={"Monsieur,\n\nNous accusons réception de votre courrier et avons le plaisir de vous informer que votre demande a été examinée favorablement.\n\nVeuillez agréer l'expression de nos salutations distinguées."} />
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
