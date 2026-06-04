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
  ResponsiveContainer,
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
} from "lucide-react";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
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

const NEON_COLORS = ["#00ff88", "#0088ff", "#ff0080", "#ffcc00", "#aa00ff", "#00ccff", "#ff6600"];

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
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

  // ── Analytics computations ──────────────────────────────────────────────────
  const analytics = useMemo(() => {
    if (!certificates || certificates.length === 0) return null;

    const total = certificates.length;

    // Roles breakdown
    const roleMap: Record<string, number> = {};
    for (const c of certificates) {
      const r = c.role.trim() || "Unknown";
      roleMap[r] = (roleMap[r] ?? 0) + 1;
    }
    const roleData = Object.entries(roleMap)
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));

    // Monthly issuance (last 12 months)
    const monthMap: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      monthMap[key] = 0;
    }
    for (const c of certificates) {
      const d = new Date(c.issueDate);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (key in monthMap) monthMap[key]++;
    }
    const monthlyData = Object.entries(monthMap).map(([month, count]) => ({ month, count }));

    // Most recent 5
    const recent = [...certificates].slice(0, 5);

    // Unique roles count
    const uniqueRoles = Object.keys(roleMap).length;

    // This month count
    const thisMonthKey = now.toLocaleString("default", { month: "short", year: "2-digit" });
    const thisMonth = monthMap[thisMonthKey] ?? 0;

    return { total, roleData, monthlyData, recent, uniqueRoles, thisMonth };
  }, [certificates]);

  // ── Handlers ────────────────────────────────────────────────────────────────
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

  const totalCertificates = certificates?.length ?? 0;
  const selectedCount = selectedIds.size;
  const hasSelectableCertificates = totalCertificates > 0 && selectedCount > 0;
  const headerSelectionState: CheckedState =
    totalCertificates === 0 ? false
    : selectedCount === totalCertificates ? true
    : selectedCount === 0 ? false
    : "indeterminate";

  const roleChartConfig = useMemo(() => {
    if (!analytics) return {};
    return Object.fromEntries(
      analytics.roleData.map((r, i) => [
        r.name,
        { label: r.name, color: NEON_COLORS[i % NEON_COLORS.length] },
      ]),
    );
  }, [analytics]);

  const barChartConfig = { count: { label: "Certificates", color: "#00ff88" } };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-20">
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

          {/* ── ANALYTICS TAB ─────────────────────────────────────────────── */}
          <TabsContent value="analytics" className="space-y-8">
            {!certificates ? (
              <div className="flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
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
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ staggerChildren: 0.1 }}
                >
                  {[
                    { label: "Total Interns", value: analytics.total, icon: Users, color: "text-primary", glow: "shadow-[0_0_15px_rgba(0,255,136,0.15)]" },
                    { label: "Unique Roles", value: analytics.uniqueRoles, icon: Award, color: "text-accent", glow: "shadow-[0_0_15px_rgba(0,136,255,0.15)]" },
                    { label: "This Month", value: analytics.thisMonth, icon: TrendingUp, color: "text-secondary", glow: "shadow-[0_0_15px_rgba(255,0,128,0.15)]" },
                    { label: "Top Role", value: analytics.roleData[0]?.name ?? "—", icon: BarChart3, color: "text-yellow-400", glow: "shadow-[0_0_15px_rgba(255,204,0,0.15)]", small: true },
                  ].map((kpi) => (
                    <Card key={kpi.label} className={`border-border/50 ${kpi.glow}`}>
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">{kpi.label}</p>
                            <p className={`font-bold ${kpi.small ? "text-lg leading-tight" : "text-3xl"} ${kpi.color}`}>
                              {kpi.value}
                            </p>
                          </div>
                          <kpi.icon className={`h-5 w-5 ${kpi.color} opacity-70`} />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </motion.div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Monthly Bar Chart */}
                  <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                    <Card className="border-border/50 shadow-[0_0_20px_rgba(0,255,136,0.08)]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Monthly Issuance (Last 12 Months)
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={barChartConfig} className="h-[260px]">
                          <BarChart data={analytics.monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#888" }} tickLine={false} axisLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: "#888" }} tickLine={false} axisLine={false} allowDecimals={false} />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="count" fill="#00ff88" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Roles Pie Chart */}
                  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
                    <Card className="border-border/50 shadow-[0_0_20px_rgba(0,136,255,0.08)]">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Interns by Role
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ChartContainer config={roleChartConfig} className="h-[260px]">
                          <PieChart>
                            <Pie
                              data={analytics.roleData}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={100}
                              paddingAngle={3}
                              dataKey="value"
                            >
                              {analytics.roleData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={NEON_COLORS[index % NEON_COLORS.length]} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <ChartLegend content={<ChartLegendContent />} />
                          </PieChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>

                {/* Role Breakdown Table + Recent Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Role Breakdown */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Role Breakdown
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analytics.roleData.map((r, i) => (
                          <div key={r.name} className="flex items-center gap-3">
                            <div
                              className="h-2.5 w-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: NEON_COLORS[i % NEON_COLORS.length] }}
                            />
                            <span className="flex-1 text-sm truncate">{r.name}</span>
                            <Badge variant="secondary" className="font-mono text-xs">{r.value}</Badge>
                            <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${(r.value / analytics.total) * 100}%`,
                                  backgroundColor: NEON_COLORS[i % NEON_COLORS.length],
                                }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-8 text-right">
                              {Math.round((r.value / analytics.total) * 100)}%
                            </span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>

                  {/* Recent Activity */}
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
                    <Card className="border-border/50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Recent Certificates
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {analytics.recent.map((cert, i) => (
                          <div key={cert._id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ backgroundColor: `${NEON_COLORS[i % NEON_COLORS.length]}20`, color: NEON_COLORS[i % NEON_COLORS.length] }}
                            >
                              {cert.candidateName.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{cert.candidateName}</p>
                              <p className="text-xs text-muted-foreground truncate">{cert.role}</p>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-muted-foreground">{new Date(cert.issueDate).toLocaleDateString()}</p>
                              <a href={`/c/${cert.accessCode}`} target="_blank" className="text-xs text-accent hover:underline">
                                View
                              </a>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </motion.div>
                </div>
              </>
            )}
          </TabsContent>

          {/* ── ISSUE & MANAGE TAB ────────────────────────────────────────── */}
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
                      <label className="text-sm font-medium">Role / Position</label>
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
                        placeholder="Jan 2024 - Mar 2024"
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
                          {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                          Select File
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-4 p-6 border border-muted rounded-lg flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                      <Download className="h-10 w-10 text-muted-foreground" />
                      <div>
                        <h3 className="font-semibold">Export Data</h3>
                        <p className="text-xs text-muted-foreground">Choose certificates below, then export with QR codes</p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleDownloadExcel}
                        disabled={!hasSelectableCertificates || isExporting}
                        className="w-full"
                      >
                        {isExporting ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Preparing...</>
                        ) : (
                          <><Download className="mr-2 h-4 w-4" /> Download Excel & QR</>
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

            {/* List */}
            <Card className="border-border">
              <CardHeader>
                <CardTitle>Issued Certificates</CardTitle>
              </CardHeader>
              <CardContent>
                {!certificates ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
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
                          <TableHead>Role</TableHead>
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
                              <a href={`/c/${cert.accessCode}`} target="_blank" className="text-accent hover:underline text-sm">
                                View Link
                              </a>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button variant="ghost" size="icon" aria-label={`Edit ${cert.candidateName}`} onClick={() => openEditDialog(cert)}>
                                  <Pencil className="h-4 w-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(cert._id)}>
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
            <DialogDescription>Update the intern's name, role, or duration.</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input value={editForm.candidateName} onChange={(e) => setEditForm((p) => ({ ...p, candidateName: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role / Position</label>
              <Input value={editForm.role} onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Input value={editForm.duration} onChange={(e) => setEditForm((p) => ({ ...p, duration: e.target.value }))} required />
            </div>
            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingCert(null)}>Cancel</Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">Save changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}