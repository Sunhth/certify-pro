import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import {
  Award,
  BarChart3,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  TrendingUp,
  Upload,
  Users,
  Layers,
} from "lucide-react";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useMemo, useState, useEffect } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/use-auth";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

type CertificateDoc = Doc<"certificates">;

const NEON_COLORS = [
  "#00ff88", "#0088ff", "#ff0080", "#ffcc00",
  "#aa00ff", "#00ccff", "#ff6600", "#ff4488",
  "#44ffcc", "#8844ff",
];

// ── Memoized analytics computation (pure function, no hooks) ─────────────────
function computeAnalytics(certificates: CertificateDoc[]) {
  if (certificates.length === 0) return null;

  const total = certificates.length;

  // Domain (role) aggregation
  const domainMap: Record<string, number> = {};
  for (const c of certificates) {
    const domain = (c.role || "Unknown").trim();
    domainMap[domain] = (domainMap[domain] ?? 0) + 1;
  }
  const domainData = Object.entries(domainMap)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name,
      value,
      pct: Math.round((value / total) * 100),
      color: NEON_COLORS[i % NEON_COLORS.length],
    }));

  const uniqueDomains = domainData.length;
  const topDomain = domainData[0]?.name ?? "—";
  const topDomainCount = domainData[0]?.value ?? 0;

  // Monthly issuance (last 12 months)
  const now = new Date();
  const monthKeys: string[] = [];
  const monthMap: Record<string, number> = {};
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
    monthKeys.push(key);
    monthMap[key] = 0;
  }
  for (const c of certificates) {
    const key = new Date(c.issueDate).toLocaleString("default", { month: "short", year: "2-digit" });
    if (key in monthMap) monthMap[key]++;
  }
  const monthlyData = monthKeys.map((month) => ({ month, count: monthMap[month] }));

  // This month
  const thisMonthKey = now.toLocaleString("default", { month: "short", year: "2-digit" });
  const thisMonth = monthMap[thisMonthKey] ?? 0;

  // Growth rate (this month vs last month)
  const lastMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleString("default", { month: "short", year: "2-digit" });
  const lastMonth = monthMap[lastMonthKey] ?? 0;
  const growthRate =
    lastMonth === 0
      ? thisMonth > 0 ? 100 : 0
      : Math.round(((thisMonth - lastMonth) / lastMonth) * 100);

  // Recent 5
  const recent = [...certificates].slice(0, 5);

  return {
    total,
    uniqueDomains,
    topDomain,
    topDomainCount,
    thisMonth,
    lastMonth,
    growthRate,
    domainData,
    monthlyData,
    recent,
  };
}

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate("/auth");
  }, [isLoading, isAuthenticated, navigate]);

  const certificates = useQuery(api.certificates.list);
  const createCertificate = useMutation(api.certificates.create);
  const bulkCreateCertificates = useMutation(api.certificates.bulkCreate);
  const deleteCertificate = useMutation(api.certificates.deleteCertificate);
  const updateCertificate = useMutation(api.certificates.update);

  const [newCert, setNewCert] = useState({ candidateName: "", role: "", duration: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"certificates">>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [editingCert, setEditingCert] = useState<CertificateDoc | null>(null);
  const [editForm, setEditForm] = useState({ candidateName: "", role: "", duration: "" });

  // Auto-select newly added certificates
  useEffect(() => {
    if (!certificates) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      let changed = false;
      const latestIds = new Set(certificates.map((c) => c._id));
      for (const id of Array.from(next)) {
        if (!latestIds.has(id)) { next.delete(id); changed = true; }
      }
      for (const cert of certificates) {
        if (!next.has(cert._id)) { next.add(cert._id); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [certificates]);

  // ── Memoized analytics ───────────────────────────────────────────────────
  const analytics = useMemo(
    () => (certificates ? computeAnalytics(certificates) : null),
    [certificates],
  );

  // Memoized chart configs
  const domainPieConfig = useMemo(() => {
    if (!analytics) return {};
    return Object.fromEntries(
      analytics.domainData.map((d) => [d.name, { label: d.name, color: d.color }]),
    );
  }, [analytics]);

  const barChartConfig = useMemo(
    () => ({ count: { label: "Certificates Issued", color: "#00ff88" } }),
    [],
  );

  const domainBarConfig = useMemo<ChartConfig>(() => {
    return { value: { label: "Interns", color: "#0088ff" } };
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCertificate(newCert);
      toast.success("Certificate created successfully");
      setNewCert({ candidateName: "", role: "", duration: "" });
    } catch {
      toast.error("Failed to create certificate");
    }
  };

  const handleDelete = async (id: Id<"certificates">) => {
    if (confirm("Are you sure you want to delete this certificate?")) {
      try {
        await deleteCertificate({ id });
        toast.success("Certificate deleted");
      } catch {
        toast.error("Failed to delete");
      }
    }
  };

  const openEditDialog = (cert: CertificateDoc) => {
    setEditingCert(cert);
    setEditForm({ candidateName: cert.candidateName, role: cert.role, duration: cert.duration });
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCert) return;
    try {
      await updateCertificate({ id: editingCert._id, ...editForm });
      toast.success("Certificate updated");
      setEditingCert(null);
    } catch {
      toast.error("Failed to update certificate");
    }
  };

  const toggleCertificateSelection = (id: Id<"certificates">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!certificates || certificates.length === 0) return;
    setSelectedIds((prev) =>
      prev.size === certificates.length ? new Set() : new Set(certificates.map((c) => c._id)),
    );
  };

  const downloadQrImages = async (items: CertificateDoc[]) => {
    const failed: string[] = [];
    for (const cert of items) {
      try {
        const viewerLink = `${window.location.origin}/c/${cert.accessCode}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(viewerLink)}`;
        const response = await fetch(qrUrl);
        if (!response.ok) throw new Error("QR request failed");
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = `${cert.candidateName.replace(/\s+/g, "_")}_QR.png`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
      } catch {
        failed.push(cert.candidateName);
      }
    }
    return failed;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws) as any[];
        const formattedData = data
          .map((row) => ({
            candidateName: row.Name || row.name || row["Full Name"] || "",
            role: row.Role || row.role || row.Position || "",
            duration: row.Duration || row.duration || "",
          }))
          .filter((d) => d.candidateName && d.role);
        if (formattedData.length === 0) { toast.error("No valid data found in Excel"); return; }
        await bulkCreateCertificates({ certificates: formattedData });
        toast.success(`Imported ${formattedData.length} certificates`);
      } catch {
        toast.error("Failed to process Excel file");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadExcel = async () => {
    if (!certificates) return;
    const selectedCerts = certificates.filter((c) => selectedIds.has(c._id));
    if (selectedCerts.length === 0) { toast.error("Select at least one certificate to export."); return; }
    setIsExporting(true);
    try {
      const data = selectedCerts.map((cert) => ({
        NAME: cert.candidateName,
        ROLE: cert.role,
        "DURATION (TIME PERIOD)": cert.duration,
        LINK: `${window.location.origin}/c/${cert.accessCode}`,
      }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Certificates");
      XLSX.writeFile(wb, "ProjXty_Selected_Certificates.xlsx");
      const failures = await downloadQrImages(selectedCerts);
      if (failures.length > 0) {
        toast.warning(`Excel downloaded but QR files failed for: ${failures.join(", ")}`);
      } else {
        toast.success("Excel and QR codes downloaded.");
      }
    } catch {
      toast.error("Failed to export certificates.");
    } finally {
      setIsExporting(false);
    }
  };

  // ── Derived selection state ───────────────────────────────────────────────
  const totalCertificates = certificates?.length ?? 0;
  const selectedCount = selectedIds.size;
  const hasSelectableCertificates = totalCertificates > 0 && selectedCount > 0;
  const headerSelectionState: CheckedState = useMemo(() => {
    if (totalCertificates === 0) return false;
    if (selectedCount === totalCertificates) return true;
    if (selectedCount === 0) return false;
    return "indeterminate";
  }, [totalCertificates, selectedCount]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      {/* Sticky Header */}
      <div className="border-b border-border/50 bg-card/60 backdrop-blur-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-primary tracking-tight">ProjXty Admin</h1>
            <p className="text-xs text-muted-foreground">Certificate Management System</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => window.open("https://projxty.in", "_blank")}>
            Visit ProjXty.in
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs defaultValue="analytics" className="space-y-8">
          <TabsList className="bg-muted/50 border border-border/50">
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" /> Analytics
            </TabsTrigger>
            <TabsTrigger value="issue" className="gap-2">
              <Award className="h-4 w-4" /> Issue & Manage
            </TabsTrigger>
          </TabsList>

          {/* ── ANALYTICS TAB ──────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="space-y-8">
            {!certificates ? (
              <div className="flex justify-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
              </div>
            ) : !analytics ? (
              <div className="text-center py-20 text-muted-foreground">
                <BarChart3 className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <p className="text-lg">No data yet. Issue some certificates to see analytics.</p>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <motion.div
                  className="grid grid-cols-2 md:grid-cols-4 gap-4"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {[
                    {
                      label: "Total Interns",
                      value: analytics.total,
                      sub: "all time",
                      icon: Users,
                      color: "text-primary",
                      glow: "shadow-[0_0_18px_rgba(0,255,136,0.12)]",
                      border: "border-primary/20",
                    },
                    {
                      label: "Unique Domains",
                      value: analytics.uniqueDomains,
                      sub: "distinct roles",
                      icon: Layers,
                      color: "text-accent",
                      glow: "shadow-[0_0_18px_rgba(0,136,255,0.12)]",
                      border: "border-accent/20",
                    },
                    {
                      label: "This Month",
                      value: analytics.thisMonth,
                      sub: analytics.growthRate >= 0
                        ? `+${analytics.growthRate}% vs last month`
                        : `${analytics.growthRate}% vs last month`,
                      icon: TrendingUp,
                      color: analytics.growthRate >= 0 ? "text-primary" : "text-destructive",
                      glow: "shadow-[0_0_18px_rgba(255,0,128,0.12)]",
                      border: "border-secondary/20",
                    },
                    {
                      label: "Top Domain",
                      value: analytics.topDomain,
                      sub: `${analytics.topDomainCount} interns`,
                      icon: Award,
                      color: "text-yellow-400",
                      glow: "shadow-[0_0_18px_rgba(255,204,0,0.12)]",
                      border: "border-yellow-400/20",
                      small: true,
                    },
                  ].map((kpi, i) => (
                    <motion.div
                      key={kpi.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.07 }}
                    >
                      <Card className={`${kpi.border} ${kpi.glow} h-full`}>
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between mb-3">
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                              {kpi.label}
                            </p>
                            <kpi.icon className={`h-4 w-4 ${kpi.color} opacity-60`} />
                          </div>
                          <p className={`font-bold ${kpi.small ? "text-xl leading-tight" : "text-4xl"} ${kpi.color} mb-1`}>
                            {kpi.value}
                          </p>
                          <p className="text-xs text-muted-foreground">{kpi.sub}</p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Charts Row 1: Monthly + Pie */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                  {/* Monthly Bar Chart (wider) */}
                  <motion.div
                    className="lg:col-span-3"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="border-border/50 shadow-[0_0_20px_rgba(0,255,136,0.06)] h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <TrendingUp className="h-4 w-4 text-primary" />
                          Monthly Issuance — Last 12 Months
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={barChartConfig} className="h-[260px]">
                          <BarChart
                            data={analytics.monthlyData}
                            margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                            <XAxis
                              dataKey="month"
                              tick={{ fontSize: 10, fill: "#666" }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10, fill: "#666" }}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                            />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="#00ff88" radius={[4, 4, 0, 0]} maxBarSize={40} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Domain Pie Chart */}
                  <motion.div
                    className="lg:col-span-2"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="border-border/50 shadow-[0_0_20px_rgba(0,136,255,0.06)] h-full">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <Layers className="h-4 w-4 text-accent" />
                          Interns by Domain
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={domainPieConfig} className="h-[260px]">
                          <PieChart>
                            <Pie
                              data={analytics.domainData}
                              cx="50%"
                              cy="45%"
                              innerRadius={55}
                              outerRadius={90}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {analytics.domainData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(value: number, name: string) => [`${value} interns`, name]}
                              contentStyle={{
                                background: "#111",
                                border: "1px solid #333",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                          </PieChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Charts Row 2: Domain Horizontal Bar + Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Domain Horizontal Bar Chart */}
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="border-border/50 shadow-[0_0_20px_rgba(255,0,128,0.06)]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-secondary" />
                          Domain Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={domainBarConfig} className="h-[260px]">
                          <BarChart
                            data={analytics.domainData.slice(0, 8)}
                            layout="vertical"
                            margin={{ top: 0, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" horizontal={false} />
                            <XAxis
                              type="number"
                              tick={{ fontSize: 10, fill: "#666" }}
                              tickLine={false}
                              axisLine={false}
                              allowDecimals={false}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 10, fill: "#aaa" }}
                              tickLine={false}
                              axisLine={false}
                              width={90}
                            />
                            <Tooltip
                              formatter={(value: number) => [`${value} interns`]}
                              contentStyle={{
                                background: "#111",
                                border: "1px solid #333",
                                borderRadius: "8px",
                                fontSize: "12px",
                              }}
                            />
                            <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                              {analytics.domainData.slice(0, 8).map((entry, index) => (
                                <Cell key={`hbar-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Domain Breakdown with Progress Bars + Recent Activity */}
                  <motion.div
                    className="space-y-6"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    {/* Domain Breakdown */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Domain Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analytics.domainData.slice(0, 6).map((d) => (
                          <div key={d.name} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full shrink-0"
                                  style={{ backgroundColor: d.color }}
                                />
                                <span className="truncate max-w-[140px] text-foreground/80">{d.name}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="secondary"
                                  className="font-mono text-xs px-1.5 py-0"
                                >
                                  {d.value}
                                </Badge>
                                <span className="text-muted-foreground w-8 text-right">{d.pct}%</span>
                              </div>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${d.pct}%`, backgroundColor: d.color }}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* Recent Activity */}
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Recent Certificates
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {analytics.recent.map((cert, i) => (
                          <div
                            key={cert._id}
                            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors"
                          >
                            <div
                              className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{
                                backgroundColor: NEON_COLORS[i % NEON_COLORS.length] + "22",
                                color: NEON_COLORS[i % NEON_COLORS.length],
                                border: `1px solid ${NEON_COLORS[i % NEON_COLORS.length]}44`,
                              }}
                            >
                              {cert.candidateName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{cert.candidateName}</p>
                              <p className="text-xs text-muted-foreground truncate">{cert.role}</p>
                            </div>
                            <p className="text-xs text-muted-foreground shrink-0">
                              {new Date(cert.issueDate).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                              })}
                            </p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── ISSUE & MANAGE TAB ─────────────────────────────────────────── */}
          <TabsContent value="issue" className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Create Single */}
              <Card className="md:col-span-1 border-primary/20 shadow-[0_0_15px_rgba(0,255,136,0.1)]">
                <CardHeader>
                  <CardTitle className="text-primary">Issue Certificate</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreate} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name</label>
                      <Input
                        placeholder="John Doe"
                        value={newCert.candidateName}
                        onChange={(e) => setNewCert({ ...newCert, candidateName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Role / Domain</label>
                      <Input
                        placeholder="Software Intern"
                        value={newCert.role}
                        onChange={(e) => setNewCert({ ...newCert, role: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration</label>
                      <Input
                        placeholder="Jan 2024 – Mar 2024"
                        value={newCert.duration}
                        onChange={(e) => setNewCert({ ...newCert, duration: e.target.value })}
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" /> Issue Certificate
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Bulk Actions */}
              <Card className="md:col-span-2 border-accent/20 shadow-[0_0_15px_rgba(0,136,255,0.1)]">
                <CardHeader>
                  <CardTitle className="text-accent">Bulk Operations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4 p-6 border border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                      <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">Upload Excel</h3>
                        <p className="text-xs text-muted-foreground">Columns: Name, Role, Duration</p>
                      </div>
                      <div className="relative">
                        <input
                          type="file"
                          accept=".xlsx, .xls"
                          onChange={handleFileUpload}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isUploading}
                        />
                        <Button variant="secondary" disabled={isUploading}>
                          {isUploading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          Select File
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 p-6 border border-muted rounded-lg flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                      <Download className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">Export Data</h3>
                        <p className="text-xs text-muted-foreground">
                          Choose certificates below, then export with QR codes
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleDownloadExcel}
                        disabled={!hasSelectableCertificates || isExporting}
                        className="w-full"
                      >
                        {isExporting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Preparing...
                          </>
                        ) : (
                          <>
                            <Download className="mr-2 h-4 w-4" /> Download Excel & QR
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-muted-foreground text-center">
                        {selectedCount} of {totalCertificates} certificates selected
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Certificates Table */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Issued Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                {!certificates ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : certificates.length === 0 ? (
                  <div className="text-center p-8 text-muted-foreground">No certificates issued yet.</div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">
                            <Checkbox
                              aria-label="Select all certificates"
                              checked={headerSelectionState}
                              disabled={totalCertificates === 0}
                              onCheckedChange={() => toggleSelectAll()}
                            />
                          </TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Domain / Role</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Link</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {certificates.map((cert) => (
                          <TableRow key={cert._id}>
                            <TableCell className="w-12">
                              <Checkbox
                                aria-label={`Select ${cert.candidateName}`}
                                checked={selectedIds.has(cert._id)}
                                onCheckedChange={() => toggleCertificateSelection(cert._id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">{cert.candidateName}</TableCell>
                            <TableCell>{cert.role}</TableCell>
                            <TableCell>{cert.duration}</TableCell>
                            <TableCell>
                              <a
                                href={`/c/${cert.accessCode}`}
                                target="_blank"
                                className="text-accent hover:underline text-sm"
                              >
                                View Link
                              </a>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  aria-label={`Edit ${cert.candidateName}`}
                                  onClick={() => openEditDialog(cert)}
                                >
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDelete(cert._id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingCert} onOpenChange={(open) => !open && setEditingCert(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit certificate</DialogTitle>
            <DialogDescription>Update the intern's name, role/domain, or duration.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={editForm.candidateName}
                onChange={(e) => setEditForm((p) => ({ ...p, candidateName: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role / Domain</label>
              <Input
                value={editForm.role}
                onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Input
                value={editForm.duration}
                onChange={(e) => setEditForm((p) => ({ ...p, duration: e.target.value }))}
                required
              />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingCert(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}