import { useRef, useState } from 'react';
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, Loader2, FileText, FileSpreadsheet } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { mailService } from '@/lib/mail-service';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';
import { formatDate } from '@/lib/data-helpers';
import { toast } from 'sonner';

// ─── colour palette ──────────────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  Registered:     '#3b82f6',
  'Under Review': '#8b5cf6',
  Assigned:       '#06b6d4',
  'In Progress':  '#f59e0b',
  Processed:      '#22c55e',
};
const DEPT_COLORS = ['#3b82f6','#22c55e','#f59e0b','#8b5cf6','#ef4444','#06b6d4'];

const STATUS_LABELS: Record<string, string> = {
  Registered:     'Enregistré',
  'Under Review': 'En révision',
  Assigned:       'Assigné',
  'In Progress':  'En cours',
  Processed:      'Traité',
};

const TYPE_LABELS: Record<string, string> = {
  Incoming: 'Entrant',
  Outgoing: 'Sortant',
  Internal: 'Interne',
};

const MONTH_LABELS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

export default function Statistics() {
  const chartsRef = useRef<HTMLDivElement>(null);
  const [exportingPdf, setExportingPdf]     = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);

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
  const generatedAt = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  // ── Monthly data ──────────────────────────────────────────────────────────
  const monthlyMap: Record<string, { incoming: number; outgoing: number; internal: number }> = {};
  mails.forEach(m => {
    const month = MONTH_LABELS[new Date(m.createdAt).getMonth()];
    if (!monthlyMap[month]) monthlyMap[month] = { incoming: 0, outgoing: 0, internal: 0 };
    if (m.type === 'Incoming')      monthlyMap[month].incoming++;
    else if (m.type === 'Outgoing') monthlyMap[month].outgoing++;
    else                            monthlyMap[month].internal++;
  });
  const monthlyData = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }));

  // ── Status pie ────────────────────────────────────────────────────────────
  const pieData = Object.entries(stats)
    .filter(([, v]) => (v as number) > 0)
    .map(([k, v]) => ({
      name: STATUS_LABELS[k] ?? k,
      value: v as number,
      fill: STATUS_COLORS[k] ?? '#3b82f6',
    }));

  // ── Department performance ────────────────────────────────────────────────
  const deptMap: Record<string, number> = {};
  mails.forEach(m => {
    const name = Array.isArray(m.dispatchedTo) && m.dispatchedTo.length > 0
    ? (typeof m.dispatchedTo[0] === 'string' ? m.dispatchedTo[0] : (m.dispatchedTo[0] as any).name)
    : undefined;
    if (name) deptMap[name] = (deptMap[name] ?? 0) + 1;
  });
  const deptData = Object.entries(deptMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value], i) => ({ name, value, fill: DEPT_COLORS[i % 6] }));

  const totalMails     = mails.length;
  const processedCount = (stats['Processed'] as number) ?? 0;
  const processingRate = totalMails > 0 ? Math.round((processedCount / totalMails) * 100) : 0;

  // ════════════════════════════════════════════════════════════════════════════
  // EXCEL EXPORT
  // ════════════════════════════════════════════════════════════════════════════
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      const XLSX = await import('xlsx');

      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryRows = [
        ['NexusMail — Rapport statistique'],
        [`Généré le : ${generatedAt}`],
        [],
        ['Indicateur', 'Valeur'],
        ['Total courriers', totalMails],
        ['Taux de traitement', `${processingRate}%`],
        [],
        ['Répartition par statut'],
        ['Statut', 'Nombre', 'Pourcentage'],
        ...Object.entries(stats).map(([k, v]) => [
          STATUS_LABELS[k] ?? k,
          v,
          totalMails > 0 ? `${Math.round(((v as number) / totalMails) * 100)}%` : '0%',
        ]),
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      wsSummary['!cols'] = [{ wch: 30 }, { wch: 15 }, { wch: 15 }];
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Résumé');

      // Sheet 2: Mail detail
      const detailRows = [
        ['N° Référence','Type','Expéditeur','Objet','Statut','Priorité','Département assigné','Date création','Échéance SLA'],
        ...mails.map(m => [
          m.referenceNumber,
          TYPE_LABELS[m.type] ?? m.type,
          typeof m.sender === 'string' ? m.sender : (m.sender as any)?.name ?? '—',
          m.subject,
          STATUS_LABELS[m.status] ?? m.status,
          m.priority,
          Array.isArray(m.dispatchedTo) && m.dispatchedTo.length > 0
            ? m.dispatchedTo.map((d: any) => typeof d === 'string' ? d : d.name).join(', ')
            : '—',
          formatDate(m.createdAt),
          m.slaDeadline ? formatDate(m.slaDeadline) : '—',
        ]),

      ];
      const wsDetail = XLSX.utils.aoa_to_sheet(detailRows);
      wsDetail['!cols'] = [
        { wch: 20 },{ wch: 12 },{ wch: 20 },{ wch: 30 },
        { wch: 16 },{ wch: 12 },{ wch: 25 },{ wch: 14 },{ wch: 14 },
      ];
      XLSX.utils.book_append_sheet(wb, wsDetail, 'Courriers');

      // Sheet 3: Monthly
      const monthlyRows = [
        ['Mois','Entrant','Sortant','Interne','Total'],
        ...monthlyData.map(r => [
          r.month, r.incoming, r.outgoing, r.internal,
          r.incoming + r.outgoing + r.internal,
        ]),
      ];
      const wsMonthly = XLSX.utils.aoa_to_sheet(monthlyRows);
      wsMonthly['!cols'] = [{ wch: 12 },{ wch: 12 },{ wch: 12 },{ wch: 12 },{ wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsMonthly, 'Évolution mensuelle');

      // Sheet 4: Departments
      const deptRows = [
        ['Département','Courriers assignés','Part (%)'],
        ...deptData.map(d => [
          d.name, d.value,
          totalMails > 0 ? `${Math.round((d.value / totalMails) * 100)}%` : '0%',
        ]),
      ];
      const wsDept = XLSX.utils.aoa_to_sheet(deptRows);
      wsDept['!cols'] = [{ wch: 30 },{ wch: 22 },{ wch: 12 }];
      XLSX.utils.book_append_sheet(wb, wsDept, 'Départements');

      XLSX.writeFile(wb, `NexusMail_Statistiques_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success('Export Excel réussi');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export Excel", {
        description: 'Assurez-vous que le paquet xlsx est installé : npm install xlsx',
      });
    } finally {
      setExportingExcel(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // PDF EXPORT
  // ════════════════════════════════════════════════════════════════════════════
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const margin = 14;
      let y = margin;

      // Helper: add new page when needed
      const addPageIfNeeded = (needed = 20) => {
        if (y + needed > pageH - margin) { doc.addPage(); y = margin; }
      };

      // Helper: section title bar
      const sectionTitle = (text: string) => {
        addPageIfNeeded(16);
        doc.setFillColor(37, 99, 235);
        doc.roundedRect(margin, y, pageW - margin * 2, 9, 2, 2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.text(text, margin + 4, y + 6.2);
        doc.setTextColor(30, 30, 30);
        y += 14;
      };

      // ── Cover header ──────────────────────────────────────────────────────
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, pageW, 48, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(255, 255, 255);
      doc.text('NexusMail', margin, 22);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text('Rapport de Statistiques', margin, 32);
      doc.setFontSize(9);
      doc.text(`Généré le ${generatedAt}`, margin, 41);
      doc.setTextColor(30, 30, 30);
      y = 58;

      // ── KPI row ───────────────────────────────────────────────────────────
      const kpiItems: { label: string; value: string; color: [number,number,number] }[] = [
        { label: 'Total courriers',  value: String(totalMails),           color: [37, 99, 235]  },
        { label: 'Traités',          value: String(processedCount),       color: [34, 197, 94]  },
        { label: 'Taux traitement',  value: `${processingRate}%`,         color: [245, 158, 11] },
        { label: 'En cours',         value: String((stats['In Progress'] as number) ?? 0), color: [139, 92, 246] },
      ];
      const cardW = (pageW - margin * 2 - 9) / 4;
      kpiItems.forEach((k, i) => {
        const x = margin + i * (cardW + 3);
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(x, y, cardW, 22, 3, 3, 'F');
        doc.setDrawColor(...k.color);
        doc.setLineWidth(0.8);
        doc.roundedRect(x, y, cardW, 22, 3, 3, 'S');
        // top colour bar
        doc.setFillColor(...k.color);
        doc.roundedRect(x, y, cardW, 4, 3, 3, 'F');
        doc.rect(x, y + 1.5, cardW, 2.5, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...k.color);
        doc.text(k.value, x + cardW / 2, y + 14, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(k.label, x + cardW / 2, y + 19.5, { align: 'center' });
      });
      doc.setTextColor(30, 30, 30);
      y += 30;

      // ── Status table ──────────────────────────────────────────────────────
      sectionTitle('Répartition par statut');
      autoTable(doc, {
        startY: y,
        head: [['Statut', 'Nombre', 'Pourcentage']],
        body: Object.entries(stats).map(([k, v]) => [
          STATUS_LABELS[k] ?? k,
          String(v),
          totalMails > 0 ? `${Math.round(((v as number) / totalMails) * 100)}%` : '0%',
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // ── Monthly table ─────────────────────────────────────────────────────
      addPageIfNeeded(30);
      sectionTitle('Évolution mensuelle');
      autoTable(doc, {
        startY: y,
        head: [['Mois', 'Entrant', 'Sortant', 'Interne', 'Total']],
        body: monthlyData.map(r => [
          r.month, String(r.incoming), String(r.outgoing), String(r.internal),
          String(r.incoming + r.outgoing + r.internal),
        ]),
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // ── Department table ──────────────────────────────────────────────────
      addPageIfNeeded(30);
      sectionTitle('Performance par département');
      autoTable(doc, {
        startY: y,
        head: [['Département', 'Courriers assignés', 'Part (%)']],
        body: deptData.length > 0
          ? deptData.map(d => [
              d.name, String(d.value),
              totalMails > 0 ? `${Math.round((d.value / totalMails) * 100)}%` : '0%',
            ])
          : [['Aucune donnée disponible', '', '']],
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        margin: { left: margin, right: margin },
      });
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

      // ── Full mail list ────────────────────────────────────────────────────
      doc.addPage();
      y = margin;
      sectionTitle(`Liste complète des courriers (${mails.length})`);
      autoTable(doc, {
        startY: y,
        head: [['Référence','Type','Expéditeur','Objet','Statut','Priorité','Département','Date']],
       body: mails.map(m => [
          m.referenceNumber,
          TYPE_LABELS[m.type] ?? m.type,
          typeof m.sender === 'string' ? m.sender : (m.sender as any)?.name ?? '—',
          m.subject,
          STATUS_LABELS[m.status] ?? m.status,
          m.priority,
          Array.isArray(m.dispatchedTo) && m.dispatchedTo.length > 0
            ? m.dispatchedTo.map((d: any) => typeof d === 'string' ? d : d.name).join(', ')
            : '—',
          formatDate(m.createdAt),
          m.slaDeadline ? formatDate(m.slaDeadline) : '—',
        ]),
        styles: { fontSize: 7.5, cellPadding: 2.5, overflow: 'ellipsize' },
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: 'bold', fontSize: 8 },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 16 }, 3: { cellWidth: 35 }, 7: { cellWidth: 20 } },
        margin: { left: margin, right: margin },
      });

      // ── Pagination footer ─────────────────────────────────────────────────
      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.line(margin, pageH - 10, pageW - margin, pageH - 10);
        doc.text('NexusMail — Rapport confidentiel', margin, pageH - 6);
        doc.text(`Page ${p} / ${totalPages}`, pageW - margin, pageH - 6, { align: 'right' });
      }

      doc.save(`NexusMail_Statistiques_${new Date().toISOString().slice(0,10)}.pdf`);
      toast.success('Export PDF réussi');
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'export PDF", {
        description: 'Assurez-vous que jspdf et jspdf-autotable sont installés',
      });
    } finally {
      setExportingPdf(false);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 animate-fade-in" ref={chartsRef}>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumb className="mb-3">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Accueil</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Statistiques</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-2xl font-bold">Statistiques</h1>
          <p className="text-sm text-muted-foreground">
            Analyses et rapports — {totalMails} courriers au total
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportPdf}
            disabled={exportingPdf || exportingExcel}
          >
            {exportingPdf
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileText className="h-4 w-4 text-red-500" />}
            Export PDF
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleExportExcel}
            disabled={exportingPdf || exportingExcel}
          >
            {exportingExcel
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <FileSpreadsheet className="h-4 w-4 text-green-600" />}
            Export Excel
          </Button>
        </div>
      </div>

      {/* KPI summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {Object.entries(stats).map(([status, count]) => (
          <div
            key={status}
            className="rounded-xl border bg-card p-4"
            style={{ borderLeftColor: STATUS_COLORS[status] ?? '#3b82f6', borderLeftWidth: 4 }}
          >
            <p className="text-xs text-muted-foreground">{STATUS_LABELS[status] ?? status}</p>
            <p className="text-2xl font-bold mt-1">{count as number}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {totalMails > 0
                ? `${Math.round(((count as number) / totalMails) * 100)}%`
                : '0%'} du total
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">

        {/* Monthly bar chart */}
        <Card className="glass-card">
          <CardHeader><CardTitle className="text-base">Évolution mensuelle</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  formatter={(v, name) => [v, name === 'incoming' ? 'Entrant' : name === 'outgoing' ? 'Sortant' : 'Interne']}
                />
                <Legend formatter={v => v === 'incoming' ? 'Entrant' : v === 'outgoing' ? 'Sortant' : 'Interne'} />
                <Bar dataKey="incoming" fill="#3b82f6" radius={[4,4,0,0]} name="incoming" />
                <Bar dataKey="outgoing" fill="#22c55e" radius={[4,4,0,0]} name="outgoing" />
                <Bar dataKey="internal" fill="#f59e0b" radius={[4,4,0,0]} name="internal" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status pie chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-success" /> Distribution par statut
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={100}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department performance */}
        <Card className="glass-card lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Performance par département</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {deptData.length === 0 ? (
                <p className="text-sm text-muted-foreground col-span-3 text-center py-4">
                  Aucune donnée disponible
                </p>
              ) : deptData.map(s => (
                <div key={s.name} className="flex items-center justify-between rounded-xl border p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: s.fill }} />
                    <div>
                      <span className="text-sm font-medium truncate block">{s.name}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {totalMails > 0
                          ? `${Math.round((s.value / totalMails) * 100)}%`
                          : '0%'} du total
                      </span>
                    </div>
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