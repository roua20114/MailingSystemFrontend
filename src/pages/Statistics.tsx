import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { mailService } from '@/lib/mail-service';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';

export default function Statistics() {
  const { data: mailsData, isLoading } = useQuery({
    queryKey: ['mails-stats-all'],
    queryFn: () => mailService.getAll({ limit: '500' }),
  });

  const { data: stats = {} } = useQuery({
    queryKey: ['mail-stats'],
    queryFn: () => mailService.getStats(),
  });

  if (isLoading) return <DashboardSkeleton />;

  const mails = mailsData?.mails ?? [];

  // Monthly data from real mails
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

  // Status distribution pie
  const statusColors: Record<string, string> = {
    Registered: 'hsl(217, 91%, 60%)', 'Under Review': 'hsl(262, 83%, 58%)',
    Assigned: 'hsl(187, 85%, 43%)', 'In Progress': 'hsl(38, 92%, 50%)',
    Processed: 'hsl(142, 76%, 36%)',
  };
  const pieData = Object.entries(stats)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => ({ name: k, value: v as number, fill: statusColors[k] ?? 'hsl(217, 91%, 60%)' }));

  // Department performance
  const deptMap: Record<string, number> = {};
  mails.forEach(m => {
    const name = m.assignedDepartment?.name;
    if (name) deptMap[name] = (deptMap[name] ?? 0) + 1;
  });
  const deptData = Object.entries(deptMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], i) => ({
      name, value,
      fill: ['hsl(217,91%,60%)', 'hsl(142,76%,36%)', 'hsl(38,92%,50%)', 'hsl(262,83%,58%)', 'hsl(0,84%,60%)', 'hsl(187,85%,43%)'][i % 6],
    }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <p className="text-sm text-muted-foreground">Analyses et rapports</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export PDF</Button>
          <Button variant="outline" className="gap-2"><Download className="h-4 w-4" /> Export Excel</Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(stats).map(([status, count]) => (
          <div key={status} className="rounded-xl border bg-card p-4">
            <p className="text-xs text-muted-foreground">{status}</p>
            <p className="text-2xl font-bold mt-1">{count as number}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Évolution mensuelle</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
                <Bar dataKey="incoming" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} name="Entrant" />
                <Bar dataKey="outgoing" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Sortant" />
                <Bar dataKey="internal" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} name="Interne" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-success" /> Distribution par statut</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" paddingAngle={3}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Performance par département</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {deptData.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-3 text-center py-4">Aucune donnée disponible</p>
              ) : deptData.map(s => (
                <div key={s.name} className="flex items-center justify-between rounded-xl border p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: s.fill }} />
                    <span className="text-sm font-medium truncate">{s.name}</span>
                  </div>
                  <span className="text-lg font-bold">{s.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
