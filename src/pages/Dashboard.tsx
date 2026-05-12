import { ArrowDownLeft, ArrowUpRight, Clock, AlertTriangle, Sparkles, TrendingUp, ArrowRight, CheckCircle2, Timer } from 'lucide-react';
import { KPICard } from '@/components/KPICard';
import { StatusBadge, PriorityBadge } from '@/components/StatusBadge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { roleLabels, roleColors } from '@/lib/settings-data';
import { useQuery } from '@tanstack/react-query';
import { mailService } from '@/lib/mail-service';
import { formatDate } from '@/lib/data-helpers';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';

const PIE_COLORS = [
  'hsl(217, 91%, 60%)', 'hsl(142, 76%, 36%)', 'hsl(38, 92%, 50%)',
  'hsl(262, 83%, 58%)', 'hsl(0, 84%, 60%)', 'hsl(187, 85%, 43%)',
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const firstName = user?.fullName.split(' ')[0] ?? '';

  const { data: stats = {}, isLoading: statsLoading } = useQuery({
    queryKey: ['mail-stats'],
    queryFn: () => mailService.getStats(),
  });

  const { data: mailsData, isLoading: mailsLoading } = useQuery({
    queryKey: ['mails-dashboard'],
    queryFn: () => mailService.getAll({ limit: '20', sortBy: 'createdAt', sortOrder: 'desc' }),
  });

  if (statsLoading || mailsLoading) return <DashboardSkeleton />;

  const mails = mailsData?.mails ?? [];
  const urgentMails = mails.filter(m => m.priority === 'Urgent' || m.status === 'Registered');
  const pendingCount = (stats['Registered'] ?? 0) + (stats['Under Review'] ?? 0);

  // Build monthly chart data from real mails
  const monthLabels = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];
  const monthlyMap: Record<string, { incoming: number; outgoing: number; internal: number }> = {};
  mails.forEach(m => {
    const month = monthLabels[new Date(m.createdAt).getMonth()];
    if (!monthlyMap[month]) monthlyMap[month] = { incoming: 0, outgoing: 0, internal: 0 };
    if (m.type === 'Incoming') monthlyMap[month].incoming++;
    else if (m.type === 'Outgoing') monthlyMap[month].outgoing++;
    else monthlyMap[month].internal++;
  });
  const monthlyData = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }));

  // Pie data from status distribution
  const statusColors: Record<string, string> = {
    Registered: 'hsl(217, 91%, 60%)', 'Under Review': 'hsl(262, 83%, 58%)',
    Assigned: 'hsl(187, 85%, 43%)', 'In Progress': 'hsl(38, 92%, 50%)',
    Processed: 'hsl(142, 76%, 36%)',
  };
  const pieData = Object.entries(stats)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v], i) => ({ name: k, value: v as number, fill: statusColors[k] ?? PIE_COLORS[i % PIE_COLORS.length] }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Bonjour, {firstName} 👋</h1>
            {user && (
              <Badge variant="secondary" className={`border-0 ${roleColors[user.role]}`}>
                {roleLabels[user.role]}
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">Vue d'ensemble de la gestion des courriers · {user?.departmentName}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-primary/5 border border-primary/20 px-4 py-2.5">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs text-primary font-medium">{pendingCount} courriers à dispatcher</span>
          </div>
          <Button onClick={() => navigate('/dispatch')} className="gap-2">
            Dispatcher <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Courrier Entrant" value={mails.filter(m => m.type === 'Incoming').length} icon={ArrowDownLeft} trend="Total enregistré" color="primary" />
        <KPICard title="Courrier Sortant" value={mails.filter(m => m.type === 'Outgoing').length} icon={ArrowUpRight} trend="Total enregistré" color="success" />
        <KPICard title="En attente" value={pendingCount} icon={Clock} trend="Enregistré & en révision" color="warning" />
        <KPICard title="En retard" value={mails.filter(m => m.isOverdue).length} icon={AlertTriangle} alert trend="Action requise" />
      </div>

      {/* AI Insights Banner */}
      <Card className="border-primary/10 bg-gradient-to-r from-primary/[0.02] to-transparent">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 flex-shrink-0">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">Insights</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {pendingCount} courriers en attente de traitement. {mails.filter(m => m.isOverdue).length} dépassent leur échéance.
              {mails.filter(m => m.status === 'Processed').length} courriers traités au total.
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Badge variant="outline" className="gap-1 text-success border-success/20 bg-success/5">
              <CheckCircle2 className="h-3 w-3" /> {mails.filter(m => m.status === 'Processed').length} traités
            </Badge>
            {mails.filter(m => m.isOverdue).length > 0 && (
              <Badge variant="outline" className="gap-1 text-destructive border-destructive/20 bg-destructive/5">
                <Timer className="h-3 w-3" /> {mails.filter(m => m.isOverdue).length} retards
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Évolution du flux courrier
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                <Line type="monotone" dataKey="incoming" stroke="hsl(217, 91%, 60%)" strokeWidth={2.5} dot={{ r: 4 }} name="Entrant" />
                <Line type="monotone" dataKey="outgoing" stroke="hsl(142, 76%, 36%)" strokeWidth={2.5} dot={{ r: 4 }} name="Sortant" />
                <Line type="monotone" dataKey="internal" stroke="hsl(38, 92%, 50%)" strokeWidth={2.5} dot={{ r: 4 }} name="Interne" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Distribution par statut</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
              {pieData.map(s => (
                <div key={s.name} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: s.fill }} />
                    <span className="text-muted-foreground truncate">{s.name}</span>
                  </div>
                  <span className="font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Urgent / Pending Mails */}
      <Card className="glass-card">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Courriers urgents & à dispatcher
          </CardTitle>
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => navigate('/dispatch')}>
            Voir tout <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {urgentMails.length === 0 ? (
            <p className="text-center py-8 text-sm text-muted-foreground">Aucun courrier urgent en attente</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">N° Référence</TableHead>
                  <TableHead className="text-xs">Objet</TableHead>
                  <TableHead className="text-xs">Expéditeur</TableHead>
                  <TableHead className="text-xs">Échéance</TableHead>
                  <TableHead className="text-xs">Priorité</TableHead>
                  <TableHead className="text-xs">Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {urgentMails.slice(0, 8).map(mail => (
                  <TableRow key={mail._id} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigate('/dispatch')}>
                    <TableCell className="font-mono text-xs font-semibold">{mail.referenceNumber}</TableCell>
                    <TableCell className="max-w-[250px] truncate text-xs">{mail.subject}</TableCell>
                    <TableCell className="text-xs">{mail.sender}</TableCell>
                    <TableCell className="text-xs font-medium">{formatDate(mail.slaDeadline)}</TableCell>
                    <TableCell><PriorityBadge priority={mail.priority} /></TableCell>
                    <TableCell><StatusBadge status={mail.status} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
