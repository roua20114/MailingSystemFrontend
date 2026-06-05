import { useState } from 'react';
import { Sparkles, FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Send, MessageSquare, Clock, User, Building2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { MailStatusStepper } from '@/components/MailStatusStepper';
import { services, users, mockMails, type Mail } from '@/lib/mock-data';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const comments = [
  { id: '1', author: 'Mme. Benali', role: 'Secrétaire', text: 'Document scanné et enregistré. Attention: 12 étudiants concernés.', time: '07 Avr, 09:15' },
  { id: '2', author: 'Dr. Khelifi', role: 'Directeur', text: 'À traiter en priorité avant la fin de la semaine.', time: '07 Avr, 11:30' },
];

export default function DirectorDispatchInterface() {
  const [selectedMail, setSelectedMail] = useState<Mail | null>(mockMails.find(m => m.status === 'registered') || mockMails[0]);
  const [zoom, setZoom] = useState(100);
  const [newComment, setNewComment] = useState('');
  const pendingMails = mockMails.filter(m => m.status === 'registered' || m.status === 'under-review');

  const handleDispatch = () => {
    toast.success('Courrier dispatché', { description: `${selectedMail?.chronoNumber} a été assigné avec succès.` });
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] gap-0 animate-fade-in">
      {/* Column 1: Mail List */}
      <div className="w-80 flex-shrink-0 border-r flex flex-col bg-card/50">
        <div className="p-4 border-b">
          <h2 className="text-sm font-semibold mb-3">À dispatcher</h2>
          <Input placeholder="Filtrer..." className="h-8 text-xs bg-muted/50 border-0" />
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {pendingMails.map(mail => (
              <button
                key={mail.id}
                onClick={() => setSelectedMail(mail)}
                className={cn(
                  'w-full text-left rounded-lg p-3 transition-all hover:bg-muted/80',
                  selectedMail?.id === mail.id && 'bg-primary/5 border border-primary/20 shadow-sm'
                )}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-[11px] font-semibold text-foreground">{mail.chronoNumber}</span>
                  <PriorityBadge priority={mail.priority} />
                </div>
                <p className="text-xs font-medium text-foreground truncate mb-1">{mail.subject}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{typeof mail.sender === 'string' ? mail.sender : mail.sender?.name ?? 'Inconnu'}</span>
                  <StatusBadge status={mail.status} />
                </div>
                {mail.priority === 'urgent' && (
                  <div className="flex items-center gap-1 mt-1.5 text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    <span className="text-[10px] font-medium">Échéance: {mail.deadline}</span>
                  </div>
                )}
              </button>
            ))}
            {pendingMails.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Aucun courrier en attente</p>
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="p-3 border-t text-center">
          <span className="text-[10px] text-muted-foreground">{pendingMails.length} courrier(s) en attente</span>
        </div>
      </div>

      {/* Column 2: PDF Viewer */}
      {selectedMail ? (
        <>
          <div className="flex-1 flex flex-col min-w-0 bg-muted/20">
            {/* AI Summary Banner */}
            <div className="px-4 py-3 border-b bg-primary/[0.03]">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-primary mb-0.5">Résumé IA</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Demande de stage PFE pour 12 étudiants en informatique de l'Université de Blida.
                    Convention de partenariat requise avant le {selectedMail.deadline}.
                  </p>
                </div>
              </div>
            </div>

            {/* PDF Toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b bg-card/60">
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.max(50, z - 25))}>
                  <ZoomOut className="h-3.5 w-3.5" />
                </Button>
                <span className="text-xs font-medium w-10 text-center">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoom(z => Math.min(200, z + 25))}>
                  <ZoomIn className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="flex items-center gap-1.5">
                <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronLeft className="h-3.5 w-3.5" /></Button>
                <span className="text-xs text-muted-foreground">Page 1 / 3</span>
                <Button variant="ghost" size="icon" className="h-7 w-7"><ChevronRight className="h-3.5 w-3.5" /></Button>
              </div>
            </div>

            {/* PDF Content Area */}
            <ScrollArea className="flex-1">
              <div className="p-6 flex justify-center">
                <div
                  className="bg-card rounded-lg shadow-lg border"
                  style={{ width: `${(595 * zoom) / 100}px`, minHeight: `${(842 * zoom) / 100}px` }}
                >
                  <div className="p-8 space-y-4">
                    <div className="text-center space-y-2 border-b pb-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">République Algérienne Démocratique et Populaire</p>
                      <p className="text-xs text-muted-foreground">Ministère de l'Enseignement Supérieur</p>
                      <p className="text-sm font-semibold mt-2">Université de Blida</p>
                    </div>
                    <div className="space-y-2 text-xs text-muted-foreground">
                      <p className="text-right">Blida, le {selectedMail.date}</p>
                      <p className="font-medium text-foreground">Objet: {selectedMail.subject}</p>
                      <div className="mt-4 space-y-2 leading-relaxed">
                        <p>Monsieur le Directeur,</p>
                        <p>J'ai l'honneur de porter à votre connaissance que dans le cadre de la formation de nos étudiants en Master 2 Informatique, nous souhaitons établir une convention de stage pour un groupe de 12 étudiants.</p>
                        <p>Nous vous prions de bien vouloir examiner cette demande et de nous communiquer votre décision dans les meilleurs délais.</p>
                        <p className="mt-6">Veuillez agréer, Monsieur le Directeur, l'expression de nos salutations distinguées.</p>
                        <p className="mt-4 font-medium text-foreground">Le Vice-Recteur chargé de la Formation Supérieure</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Column 3: Dispatch Panel */}
          <div className="w-96 flex-shrink-0 border-l flex flex-col bg-card">
            <ScrollArea className="flex-1">
              <div className="p-5 space-y-5">
                {/* Header */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-sm">{selectedMail.chronoNumber}</h3>
                    <StatusBadge status={selectedMail.status} />
                    <PriorityBadge priority={selectedMail.priority} />
                  </div>
                  <p className="text-xs text-muted-foreground">{selectedMail.subject}</p>
                </div>

                {/* Stepper */}
                <MailStatusStepper currentStatus={selectedMail.status} />

                {/* Metadata */}
                <Card>
                  <CardContent className="p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-20">Expéditeur</span>
                      <span className="font-medium">{typeof selectedMail.sender === 'string' ? selectedMail.sender : selectedMail.sender?.name ?? 'Inconnu'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-20">Reçu le</span>
                      <span className="font-medium">{selectedMail.date}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                      <span className="text-muted-foreground w-20">Échéance</span>
                      <span className="font-medium text-destructive">{selectedMail.deadline}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground w-20">Support</span>
                      <span className="font-medium capitalize">{selectedMail.supportType}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Suggestion */}
                <div className="rounded-lg bg-primary/[0.04] border border-primary/15 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold text-primary">Suggestion IA</span>
                    <Badge variant="secondary" className="text-[9px] h-4 px-1.5">92% confiance</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">Recommandation: <strong className="text-foreground">Service Scolarité</strong> — Similitude avec 8 courriers précédents de type stage/PFE.</p>
                </div>

                {/* Dispatch Form */}
                <div className="space-y-3">
                  <div>
                    <Label className="text-xs">Assigner au service</Label>
                    <Select defaultValue={selectedMail.service}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {services.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Assigner au responsable</Label>
                    <Select>
                      <SelectTrigger className="mt-1"><SelectValue placeholder="Choisir un responsable" /></SelectTrigger>
                      <SelectContent>
                        {users.filter(u => u.role === 'service-lead' || u.role === 'professor').map(u => (
                          <SelectItem key={u.id} value={u.id}>{u.name} — {u.service}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Priorité</Label>
                    <Select defaultValue={selectedMail.priority}>
                      <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="urgent">🔴 Urgent</SelectItem>
                        <SelectItem value="normal">🔵 Normal</SelectItem>
                        <SelectItem value="low">⚪ Faible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs">Instructions du Directeur</Label>
                    <Textarea placeholder="Ajoutez vos instructions de dispatch..." rows={3} className="mt-1 text-xs" />
                  </div>
                </div>

                {/* Comments Thread */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Commentaires ({comments.length})
                  </h4>
                  <div className="space-y-2.5">
                    {comments.map(c => (
                      <div key={c.id} className="rounded-lg border p-3 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium">{c.author}</span>
                            <Badge variant="outline" className="text-[9px] h-4">{c.role}</Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{c.time}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">{c.text}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ajouter un commentaire..."
                      className="text-xs h-8"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                    />
                    <Button size="sm" variant="outline" className="h-8 px-3">
                      <Send className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* Action Buttons */}
            <div className="p-4 border-t space-y-2">
              <Button className="w-full gap-2" onClick={handleDispatch}>
                <Send className="h-4 w-4" />
                Dispatcher le courrier
              </Button>
              <Button variant="outline" className="w-full text-xs">Demander plus d'informations</Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center text-muted-foreground">
          <div className="text-center">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p className="text-sm">Sélectionnez un courrier pour le dispatcher</p>
          </div>
        </div>
      )}
    </div>
  );
}
