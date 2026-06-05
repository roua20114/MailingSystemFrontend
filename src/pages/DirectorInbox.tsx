import { useEffect, useState } from 'react';
import { ClipboardCheck, Filter, Plus, RefreshCw, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { DirectorDispatchView } from '@/components/DirectorDispatchView';
import { EmptyState } from '@/components/EmptyState';
import { TableSkeleton } from '@/components/LoadingSkeleton';
import { MailRegistrationForm } from '@/components/MailRegistrationForm';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { mailService, type ApiMail } from '@/lib/mail-service';
import { apiRequest } from '@/lib/api-client';
import { formatDate } from '@/lib/data-helpers';

interface Sender {
  _id: string;
  name: string;
}

export default function DirectorInbox() {
  const [selected, setSelected] = useState<ApiMail | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [senders, setSenders] = useState<Sender[]>([]);
  const [sendersLoading, setSendersLoading] = useState(false);
  const [sendersError, setSendersError] = useState<string | null>(null);
  const qc = useQueryClient();

  // ── Données : Registered + Under Review ──────────────────────────────
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
  const filtered =
    typeFilter === 'all' ? allMails : allMails.filter((m) => m.type === typeFilter);

  // ── Chargement des expéditeurs ────────────────────────────────────────
  useEffect(() => {
    let active = true;
    const loadSenders = async () => {
      setSendersLoading(true);
      setSendersError(null);
      try {
        const res = await apiRequest<{
          success: boolean;
          data: { senders: Sender[] };
        }>('/senders');
        if (!active) return;
        setSenders(res.data.senders ?? []);
      } catch (err) {
        if (!active) return;
        setSendersError(
          err instanceof Error ? err.message : 'Impossible de charger les expéditeurs.'
        );
      } finally {
        if (!active) return;
        setSendersLoading(false);
      }
    };
    loadSenders();
    return () => { active = false; };
  }, []);

  return (
    <div className="pt-6 space-y-6 px-1 animate-fade-in">

      {/* ════════════════════════════════════════════════════════════
          BREADCRUMB — Navigation contextuelle en haut
          ════════════════════════════════════════════════════════════ */}
      <Breadcrumb className="mb-2">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Accueil
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage className="text-xs font-medium">
                File de Dispatching
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/*
         * LIGNE TITRE + ACTIONS
         * flex-col sur mobile, flex-row centré sur desktop.
         * gap-4 entre les deux blocs pour ne jamais les coller.
         */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">

          {/* Bloc gauche : icône + titre + description empilés */}
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2.5 leading-snug">
              {/*
               * Icône dans un fond coloré doux : donne de la matière
               * visuelle sans surcharger — style Linear/Vercel.
               */}
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary shrink-0">
                <ClipboardCheck className="h-4.5 w-4.5" />
              </span>
              File de Dispatching
            </h1>
            {/* Description : espacement top minimal, couleur atténuée */}
            <p className="text-sm text-muted-foreground pl-[2.625rem]">
              Courriers en attente d'examen et de dispatching
            </p>
          </div>

          {/* Bloc droit : bouton d'action + badge compteur */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/*
             * BOUTON PRINCIPAL
             * rounded-lg : angles doux typiques des SaaS modernes.
             * h-9 : hauteur plus généreuse que size="sm" par défaut.
             */}
            <Button
              onClick={() => setShowForm(true)}
              className="h-9 px-4 gap-2 rounded-lg font-medium text-sm shadow-sm"
            >
              <Plus className="h-4 w-4 shrink-0" />
              Nouveau courrier
            </Button>

            {/*
             * BADGE COMPTEUR — style "pilule SaaS Premium"
             * ─ Fond bleu très doux (blue-50) + texte bleu medium = lisible
             *   sans agressivité.
             * ─ Bordure fine pour le distinguer du fond de page.
             * ─ px-3 py-1 : padding interne équilibré, effet "pilule".
             * ─ font-semibold + tabular-nums : le chiffre ne saute pas
             *   quand il passe de 9 à 10.
             */}
            <span className="
              inline-flex items-center gap-1.5
              px-3 py-1 rounded-full text-xs font-semibold tabular-nums
              bg-blue-50 text-blue-700 border border-blue-100
              dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900
            ">
              <Mail className="h-3 w-3 opacity-70" />
              {allMails.length} courrier{allMails.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

      {/* ════════════════════════════════════════════════════════════
          BARRE DE FILTRES
          ════════════════════════════════════════════════════════════ */}
      <div className="flex items-center gap-2 pt-4 border-t border-border/50">
        {/*
         * Select encapsulé dans un wrapper pour contrôler la largeur
         * exacte sans débordement sur mobile.
         */}
        <div className="w-44 shrink-0">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-8 text-xs rounded-lg">
              <Filter className="h-3 w-3 mr-1.5 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="Incoming">Entrant</SelectItem>
              <SelectItem value="Outgoing">Sortant</SelectItem>
              <SelectItem value="Internal">Interne</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/*
         * BOUTON RAFRAÎCHIR
         * Variant outline discret, hover très subtil (slate-50).
         * h-8 aligné avec le Select pour une ligne parfaitement plane.
         */}
        <Button
          variant="outline"
          size="sm"
          className="
            h-8 px-3 gap-1.5 rounded-lg text-xs font-medium
            text-muted-foreground border-border/70
            hover:bg-slate-50 hover:text-foreground hover:border-border
            dark:hover:bg-slate-800/50
            transition-colors duration-150
          "
          onClick={() => qc.invalidateQueries({ queryKey: ['mails-dispatch'] })}
        >
          <RefreshCw className="h-3 w-3" />
          Rafraîchir
        </Button>

        {/* Compteur de résultats filtrés, à droite de la barre */}
        {typeFilter !== 'all' && (
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* ════════════════════════════════════════════════════════════
          CONTENU PRINCIPAL : skeleton / empty state / liste
          ════════════════════════════════════════════════════════════ */}
      {isLoading ? (
        /* ── Skeleton dans une Card propre ── */
        <Card className="glass-card border-border/60 shadow-sm">
          <CardContent className="pt-6 pb-4">
            <TableSkeleton />
          </CardContent>
        </Card>

      ) : filtered.length === 0 ? (
        /*
         * EMPTY STATE
         * Centré horizontalement et verticalement grâce à py-20.
         * min-h permet d'occuper l'espace sous les filtres sans s'écraser.
         */
        <div className="flex flex-col items-center justify-center min-h-[320px] py-20">
          <EmptyState
            icon={ClipboardCheck}
            title="File vide"
            description="Aucun courrier en attente de dispatching. Tout est traité !"
          />
        </div>

      ) : (
        /*
         * LISTE DES CARTES
         * max-w-4xl : évite l'étirement infini sur très grands écrans
         *   (> 1400px) — largeur confortable pour la lecture.
         * grid gap-2.5 : espacement serré mais respirant entre cartes.
         */
        <div className="grid gap-2.5 max-w-4xl">
          {filtered.map((mail) => (
            <Card
              key={mail._id}
              onClick={() => setSelected(mail)}
              className={`
                group cursor-pointer
                border transition-all duration-200
                shadow-sm hover:shadow-md
                hover:-translate-y-px
                ${
                  selected?._id === mail._id
                    ? 'border-primary/50 shadow-md bg-primary/[0.02]'
                    : 'border-border/60 hover:border-border'
                }
              `}
            >
              {/*
               * EN-TÊTE DE CARTE : référence + type à gauche,
               * priorité + statut à droite.
               * pb-1.5 : réduit l'espace sous le header pour coller
               *   visuellement le sujet juste en dessous.
               */}
              <CardHeader className="px-4 pt-3.5 pb-1.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Numéro de référence en police monospace */}
                    <span className="font-mono text-xs font-semibold text-muted-foreground shrink-0">
                      {mail.referenceNumber}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0 h-4 rounded font-medium shrink-0"
                    >
                      {mail.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <PriorityBadge priority={mail.priority} />
                    <StatusBadge status={mail.status} />
                  </div>
                </div>
              </CardHeader>

              {/* CORPS DE CARTE */}
              <CardContent className="px-4 pb-3.5">
                {/* Sujet : taille lisible, tronqué proprement */}
                <p className="text-sm font-medium text-foreground truncate mb-2">
                  {mail.subject}
                </p>

                {/* Méta-données : expéditeur + date sur une seule ligne */}
                <div className="flex items-center justify-between gap-4 text-xs text-muted-foreground">
                  <span className="truncate">
                    De :{' '}
                    <span className="font-medium text-foreground/80">
                      {typeof mail.sender === 'string'
                        ? mail.sender
                        : mail.sender?.name ?? 'Inconnu'}
                    </span>
                  </span>
                  <span className="shrink-0 tabular-nums">
                    {formatDate(mail.createdAt)}
                  </span>
                </div>

                {/* Alertes conditionnelles empilées sous les méta-données */}
                {(mail.isOverdue || mail.aiSuggestedDepartment) && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-2">
                    {mail.isOverdue && (
                      <span className="text-[11px] text-destructive font-medium">
                        ⚠ Délai dépassé
                      </span>
                    )}
                    {mail.aiSuggestedDepartment && (
                      <span className="text-[11px] text-primary font-medium">
                        ✦ IA → {mail.aiSuggestedDepartment}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Modales : logique fonctionnelle 100% préservée ── */}
      <MailRegistrationForm
        open={showForm}
        onClose={() => {
          setShowForm(false);
          qc.invalidateQueries({ queryKey: ['mails-dispatch'] });
        }}
        senders={senders}
        sendersLoading={sendersLoading}
        onSenderCreated={(sender) => setSenders((prev) => [...prev, sender])}
      />
      <DirectorDispatchView
        mail={selected}
        open={!!selected}
        onClose={() => {
          setSelected(null);
          qc.invalidateQueries({ queryKey: ['mails-dispatch'] });
        }}
      />
    </div>
  );
}