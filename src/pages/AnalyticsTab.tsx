import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
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
  AreaChart,
  Area,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  ResponsiveContainer,
} from "recharts";
import { motion } from "framer-motion";
import {
  Users,
  Award,
  TrendingUp,
  Layers,
  Activity,
  Clock,
  Zap,
  Target,
} from "lucide-react";

const NEON_COLORS = [
  "#00ff88", "#0088ff", "#ff0080", "#ffcc00",
  "#aa00ff", "#00ccff", "#ff6600", "#ff4488",
  "#44ffcc", "#8844ff",
];

interface DomainEntry {
  name: string;
  value: number;
  pct: number;
  color: string;
}

interface Analytics {
  total: number;
  uniqueDomains: number;
  topDomain: string;
  topDomainCount: number;
  thisMonth: number;
  lastMonth: number;
  growthRate: number;
  domainData: DomainEntry[];
  monthlyData: { month: string; count: number }[];
  recent: Array<{ candidateName: string; role: string; duration: string; accessCode: string }>;
}

interface Props {
  analytics: Analytics;
}

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] },
});

const barConfig: ChartConfig = { count: { label: "Issued", color: "#00ff88" } };
const areaConfig: ChartConfig = { count: { label: "Issued", color: "#0088ff" } };

export default function AnalyticsTab({ analytics }: Props) {
  const top8Domains = analytics.domainData.slice(0, 8);
  const radarData = top8Domains.map((d) => ({ domain: d.name.length > 10 ? d.name.slice(0, 10) + "…" : d.name, value: d.value }));

  const kpis = [
    {
      label: "Total Interns",
      value: analytics.total,
      sub: "all time",
      icon: Users,
      accent: "#00ff88",
      glow: "rgba(0,255,136,0.15)",
    },
    {
      label: "Unique Domains",
      value: analytics.uniqueDomains,
      sub: "distinct roles",
      icon: Layers,
      accent: "#0088ff",
      glow: "rgba(0,136,255,0.15)",
    },
    {
      label: "This Month",
      value: analytics.thisMonth,
      sub: analytics.growthRate >= 0 ? `+${analytics.growthRate}% vs last` : `${analytics.growthRate}% vs last`,
      icon: TrendingUp,
      accent: analytics.growthRate >= 0 ? "#00ff88" : "#ff3333",
      glow: analytics.growthRate >= 0 ? "rgba(0,255,136,0.15)" : "rgba(255,51,51,0.15)",
    },
    {
      label: "Top Domain",
      value: analytics.topDomain,
      sub: `${analytics.topDomainCount} interns`,
      icon: Award,
      accent: "#ffcc00",
      glow: "rgba(255,204,0,0.15)",
      small: true,
    },
    {
      label: "Last Month",
      value: analytics.lastMonth,
      sub: "certificates issued",
      icon: Clock,
      accent: "#aa00ff",
      glow: "rgba(170,0,255,0.15)",
    },
    {
      label: "Avg / Month",
      value: analytics.monthlyData.length > 0
        ? Math.round(analytics.monthlyData.reduce((s, m) => s + m.count, 0) / analytics.monthlyData.filter(m => m.count > 0).length || 1)
        : 0,
      sub: "active months",
      icon: Activity,
      accent: "#00ccff",
      glow: "rgba(0,204,255,0.15)",
    },
    {
      label: "Peak Month",
      value: analytics.monthlyData.reduce((best, m) => m.count > best.count ? m : best, { month: "—", count: 0 }).month,
      sub: `${analytics.monthlyData.reduce((best, m) => m.count > best.count ? m : best, { month: "—", count: 0 }).count} issued`,
      icon: Zap,
      accent: "#ff6600",
      glow: "rgba(255,102,0,0.15)",
      small: true,
    },
    {
      label: "Coverage",
      value: `${analytics.monthlyData.filter(m => m.count > 0).length}/12`,
      sub: "active months",
      icon: Target,
      accent: "#ff0080",
      glow: "rgba(255,0,128,0.15)",
      small: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* ── ROW 1: 4-column KPI grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.slice(0, 4).map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(i * 0.06)}>
            <Card
              className="relative overflow-hidden border h-full"
              style={{
                borderColor: `${kpi.accent}22`,
                boxShadow: `0 0 24px ${kpi.glow}, inset 0 1px 0 ${kpi.accent}18`,
                background: "linear-gradient(135deg, #111 0%, #0d0d0d 100%)",
              }}
            >
              {/* Corner accent */}
              <div
                className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-bl-full"
                style={{ background: kpi.accent }}
              />
              <CardContent className="p-5 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {kpi.label}
                  </span>
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${kpi.accent}18`, border: `1px solid ${kpi.accent}30` }}
                  >
                    <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.accent }} />
                  </div>
                </div>
                <p
                  className={`font-black mb-1 leading-none ${kpi.small ? "text-2xl" : "text-4xl"}`}
                  style={{ color: kpi.accent }}
                >
                  {kpi.value}
                </p>
                <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── ROW 2: 4-column secondary KPI grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpis.slice(4, 8).map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(0.24 + i * 0.06)}>
            <Card
              className="relative overflow-hidden border h-full"
              style={{
                borderColor: `${kpi.accent}18`,
                boxShadow: `0 0 16px ${kpi.glow}`,
                background: "#0e0e0e",
              }}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${kpi.accent}15`, border: `1px solid ${kpi.accent}25` }}
                >
                  <kpi.icon className="h-4 w-4" style={{ color: kpi.accent }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider truncate">{kpi.label}</p>
                  <p className={`font-bold leading-tight ${kpi.small ? "text-base" : "text-xl"}`} style={{ color: kpi.accent }}>
                    {kpi.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate">{kpi.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── ROW 3: Area chart (full width) ── */}
      <motion.div {...fadeUp(0.48)}>
        <Card
          className="border"
          style={{
            borderColor: "#00ff8820",
            boxShadow: "0 0 30px rgba(0,255,136,0.06)",
            background: "linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)",
          }}
        >
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <div className="w-1 h-5 rounded-full bg-primary" />
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Certificate Issuance Trend — Last 12 Months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={areaConfig} className="h-[200px]">
              <AreaChart data={analytics.monthlyData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#555" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#555" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#00ff88"
                  strokeWidth={2}
                  fill="url(#areaGrad)"
                  dot={{ fill: "#00ff88", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: "#00ff88", stroke: "#000", strokeWidth: 2 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── ROW 4: Donut + Radar (symmetric 50/50) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut */}
        <motion.div {...fadeUp(0.56)}>
          <Card
            className="border h-full"
            style={{
              borderColor: "#0088ff20",
              boxShadow: "0 0 28px rgba(0,136,255,0.07)",
              background: "#0e0e0e",
            }}
          >
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: "#0088ff" }} />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Domain Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center">
              <div className="relative">
                <ChartContainer config={{}} className="h-[220px] w-[220px]">
                  <PieChart>
                    <Pie
                      data={analytics.domainData}
                      cx="50%"
                      cy="50%"
                      innerRadius={68}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {analytics.domainData.map((_, idx) => (
                        <Cell key={idx} fill={NEON_COLORS[idx % NEON_COLORS.length]} />
                      ))}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as DomainEntry;
                        return (
                          <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
                            <p className="font-semibold text-foreground">{d.name}</p>
                            <p className="text-muted-foreground">{d.value} interns · {d.pct}%</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ChartContainer>
                {/* Center label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-black text-foreground">{analytics.total}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">total</p>
                </div>
              </div>
              {/* Legend */}
              <div className="w-full mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {analytics.domainData.slice(0, 8).map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2 min-w-0">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: NEON_COLORS[i % NEON_COLORS.length] }} />
                    <span className="text-[11px] text-muted-foreground truncate">{d.name}</span>
                    <span className="text-[11px] font-semibold ml-auto shrink-0" style={{ color: NEON_COLORS[i % NEON_COLORS.length] }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Radar */}
        <motion.div {...fadeUp(0.62)}>
          <Card
            className="border h-full"
            style={{
              borderColor: "#aa00ff20",
              boxShadow: "0 0 28px rgba(170,0,255,0.07)",
              background: "#0e0e0e",
            }}
          >
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: "#aa00ff" }} />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Domain Radar
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={{ value: { label: "Interns", color: "#aa00ff" } }} className="h-[280px]">
                <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                  <PolarGrid stroke="#222" />
                  <PolarAngleAxis dataKey="domain" tick={{ fontSize: 10, fill: "#666" }} />
                  <Radar
                    dataKey="value"
                    stroke="#aa00ff"
                    fill="#aa00ff"
                    fillOpacity={0.18}
                    strokeWidth={2}
                    dot={{ fill: "#aa00ff", r: 3, strokeWidth: 0 }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                </RadarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── ROW 5: Horizontal bar + Recent activity (symmetric 60/40) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Horizontal domain bar */}
        <motion.div className="lg:col-span-3" {...fadeUp(0.68)}>
          <Card
            className="border h-full"
            style={{
              borderColor: "#ffcc0018",
              boxShadow: "0 0 24px rgba(255,204,0,0.05)",
              background: "#0e0e0e",
            }}
          >
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: "#ffcc00" }} />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Domain Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {analytics.domainData.slice(0, 8).map((d, i) => (
                <div key={d.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground/80 truncate max-w-[60%]">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold" style={{ color: NEON_COLORS[i % NEON_COLORS.length] }}>{d.value}</span>
                      <Badge
                        variant="outline"
                        className="text-[10px] px-1.5 py-0 border-0 font-mono"
                        style={{ color: NEON_COLORS[i % NEON_COLORS.length], background: `${NEON_COLORS[i % NEON_COLORS.length]}12` }}
                      >
                        {d.pct}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: NEON_COLORS[i % NEON_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      transition={{ duration: 0.7, delay: 0.7 + i * 0.05, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent activity */}
        <motion.div className="lg:col-span-2" {...fadeUp(0.72)}>
          <Card
            className="border h-full"
            style={{
              borderColor: "#ff008018",
              boxShadow: "0 0 24px rgba(255,0,128,0.05)",
              background: "#0e0e0e",
            }}
          >
            <CardHeader className="pb-2 flex flex-row items-center gap-2">
              <div className="w-1 h-5 rounded-full" style={{ background: "#ff0080" }} />
              <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {analytics.recent.map((cert, i) => (
                <motion.div
                  key={cert.accessCode}
                  className="flex items-start gap-3 p-2.5 rounded-lg"
                  style={{ background: "#ffffff06", border: "1px solid #ffffff08" }}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 + i * 0.06 }}
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                    style={{
                      background: `${NEON_COLORS[i % NEON_COLORS.length]}18`,
                      color: NEON_COLORS[i % NEON_COLORS.length],
                      border: `1px solid ${NEON_COLORS[i % NEON_COLORS.length]}30`,
                    }}
                  >
                    {cert.candidateName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{cert.candidateName}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{cert.role}</p>
                    <p className="text-[10px] text-muted-foreground/60">{cert.duration}</p>
                  </div>
                  <a
                    href={`/c/${cert.accessCode}`}
                    target="_blank"
                    className="text-[10px] shrink-0 mt-0.5 hover:underline"
                    style={{ color: "#0088ff" }}
                  >
                    View
                  </a>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── ROW 6: Monthly bar chart (full width, detailed) ── */}
      <motion.div {...fadeUp(0.76)}>
        <Card
          className="border"
          style={{
            borderColor: "#ff008018",
            boxShadow: "0 0 28px rgba(255,0,128,0.05)",
            background: "linear-gradient(180deg, #0f0f0f 0%, #0a0a0a 100%)",
          }}
        >
          <CardHeader className="pb-2 flex flex-row items-center gap-2">
            <div className="w-1 h-5 rounded-full" style={{ background: "#ff0080" }} />
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
              Monthly Bar — Certificate Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={barConfig} className="h-[180px]">
              <BarChart data={analytics.monthlyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#555" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#555" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="count" radius={[3, 3, 0, 0]}>
                  {analytics.monthlyData.map((entry, idx) => (
                    <Cell
                      key={idx}
                      fill={entry.count === Math.max(...analytics.monthlyData.map(m => m.count)) ? "#ff0080" : "#00ff8866"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
