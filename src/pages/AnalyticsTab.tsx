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
  ArrowUpRight,
  ArrowDownRight,
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
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4, delay, ease: [0.22, 1, 0.36, 1] },
});

const barConfig: ChartConfig = { count: { label: "Issued", color: "#00ff88" } };
const areaConfig: ChartConfig = { count: { label: "Issued", color: "#0088ff" } };

export default function AnalyticsTab({ analytics }: Props) {
  const peakMonth = analytics.monthlyData.reduce(
    (best, m) => (m.count > best.count ? m : best),
    { month: "—", count: 0 }
  );
  const avgPerActiveMonth = (() => {
    const active = analytics.monthlyData.filter((m) => m.count > 0);
    if (active.length === 0) return 0;
    return Math.round(active.reduce((s, m) => s + m.count, 0) / active.length);
  })();
  const activeMonths = analytics.monthlyData.filter((m) => m.count > 0).length;

  return (
    <div className="space-y-6">

      {/* ── ROW 1: 4 Primary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Interns",
            value: analytics.total,
            sub: "all time",
            icon: Users,
            accent: "#00ff88",
            glow: "rgba(0,255,136,0.18)",
          },
          {
            label: "Unique Domains",
            value: analytics.uniqueDomains,
            sub: "distinct roles",
            icon: Layers,
            accent: "#0088ff",
            glow: "rgba(0,136,255,0.18)",
          },
          {
            label: "This Month",
            value: analytics.thisMonth,
            sub: analytics.growthRate >= 0 ? `+${analytics.growthRate}% vs last` : `${analytics.growthRate}% vs last`,
            icon: analytics.growthRate >= 0 ? ArrowUpRight : ArrowDownRight,
            accent: analytics.growthRate >= 0 ? "#00ff88" : "#ff3333",
            glow: analytics.growthRate >= 0 ? "rgba(0,255,136,0.18)" : "rgba(255,51,51,0.18)",
          },
          {
            label: "Top Domain",
            value: analytics.topDomain,
            sub: `${analytics.topDomainCount} interns`,
            icon: Award,
            accent: "#ffcc00",
            glow: "rgba(255,204,0,0.18)",
            small: true,
          },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(i * 0.07)}>
            <Card
              className="relative overflow-hidden border h-full"
              style={{
                borderColor: `${kpi.accent}30`,
                boxShadow: `0 0 32px ${kpi.glow}, inset 0 1px 0 ${kpi.accent}20`,
                background: "linear-gradient(145deg, #141414 0%, #0d0d0d 100%)",
              }}
            >
              <div
                className="absolute top-0 right-0 w-20 h-20 opacity-[0.07] rounded-bl-full"
                style={{ background: kpi.accent }}
              />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    {kpi.label}
                  </span>
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${kpi.accent}20`, border: `1px solid ${kpi.accent}35` }}
                  >
                    <kpi.icon className="h-4 w-4" style={{ color: kpi.accent }} />
                  </div>
                </div>
                <p
                  className={`font-black leading-none mb-2 ${(kpi as { small?: boolean }).small ? "text-2xl" : "text-5xl"}`}
                  style={{ color: kpi.accent }}
                >
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground font-medium">{kpi.sub}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── ROW 2: 4 Secondary KPI Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Last Month",
            value: analytics.lastMonth,
            sub: "certificates issued",
            icon: Clock,
            accent: "#aa00ff",
          },
          {
            label: "Avg / Month",
            value: avgPerActiveMonth,
            sub: "per active month",
            icon: Activity,
            accent: "#00ccff",
          },
          {
            label: "Peak Month",
            value: peakMonth.month,
            sub: `${peakMonth.count} issued`,
            icon: Zap,
            accent: "#ff6600",
            small: true,
          },
          {
            label: "Active Months",
            value: `${activeMonths}/12`,
            sub: "of last 12 months",
            icon: Target,
            accent: "#ff0080",
            small: true,
          },
        ].map((kpi, i) => (
          <motion.div key={kpi.label} {...fadeUp(0.28 + i * 0.07)}>
            <Card
              className="border h-full"
              style={{
                borderColor: `${kpi.accent}22`,
                boxShadow: `0 0 20px ${kpi.accent}18`,
                background: "#0f0f0f",
              }}
            >
              <CardContent className="p-5 flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${kpi.accent}18`, border: `1px solid ${kpi.accent}28` }}
                >
                  <kpi.icon className="h-5 w-5" style={{ color: kpi.accent }} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">{kpi.label}</p>
                  <p
                    className={`font-black leading-tight ${(kpi as { small?: boolean }).small ? "text-lg" : "text-2xl"}`}
                    style={{ color: kpi.accent }}
                  >
                    {kpi.value}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{kpi.sub}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* ── ROW 3: Area Trend Chart (full width) ── */}
      <motion.div {...fadeUp(0.56)}>
        <Card
          className="border"
          style={{
            borderColor: "#00ff8825",
            boxShadow: "0 0 40px rgba(0,255,136,0.07)",
            background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)",
          }}
        >
          <CardHeader className="pb-0 pt-5 px-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 rounded-full bg-primary" />
              <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">
                Certificate Issuance Trend — Last 12 Months
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-6 pb-5 pt-3">
            <ChartContainer config={areaConfig} className="h-[220px]">
              <AreaChart data={analytics.monthlyData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00ff88" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#00ff88" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e1e1e" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} allowDecimals={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#00ff88"
                  strokeWidth={2.5}
                  fill="url(#areaGrad)"
                  dot={{ fill: "#00ff88", r: 4, strokeWidth: 0 }}
                  activeDot={{ r: 6, fill: "#00ff88", stroke: "#000", strokeWidth: 2 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* ── ROW 4: Donut + Domain Breakdown (50/50) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut */}
        <motion.div {...fadeUp(0.64)}>
          <Card
            className="border h-full"
            style={{
              borderColor: "#0088ff25",
              boxShadow: "0 0 32px rgba(0,136,255,0.08)",
              background: "#0f0f0f",
            }}
          >
            <CardHeader className="pb-0 pt-5 px-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full" style={{ background: "#0088ff" }} />
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">
                  Domain Distribution
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5 pt-3">
              <div className="flex flex-col items-center">
                <div className="relative">
                  <ChartContainer config={{}} className="h-[200px] w-[200px]">
                    <PieChart>
                      <Pie
                        data={analytics.domainData}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={95}
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
                              <p className="font-bold text-foreground">{d.name}</p>
                              <p className="text-muted-foreground">{d.value} interns · {d.pct}%</p>
                            </div>
                          );
                        }}
                      />
                    </PieChart>
                  </ChartContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-4xl font-black text-foreground">{analytics.total}</p>
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">total</p>
                  </div>
                </div>
                <div className="w-full mt-4 grid grid-cols-2 gap-x-6 gap-y-2">
                  {analytics.domainData.slice(0, 8).map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 min-w-0">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: NEON_COLORS[i % NEON_COLORS.length] }} />
                      <span className="text-xs text-muted-foreground truncate flex-1">{d.name}</span>
                      <span className="text-xs font-bold shrink-0" style={{ color: NEON_COLORS[i % NEON_COLORS.length] }}>{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Domain Breakdown Progress Bars */}
        <motion.div {...fadeUp(0.70)}>
          <Card
            className="border h-full"
            style={{
              borderColor: "#ffcc0020",
              boxShadow: "0 0 28px rgba(255,204,0,0.06)",
              background: "#0f0f0f",
            }}
          >
            <CardHeader className="pb-0 pt-5 px-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full" style={{ background: "#ffcc00" }} />
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">
                  Domain Breakdown
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5 pt-4 space-y-4">
              {analytics.domainData.slice(0, 8).map((d, i) => (
                <div key={d.name} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground/90 truncate max-w-[55%]">{d.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold" style={{ color: NEON_COLORS[i % NEON_COLORS.length] }}>{d.value}</span>
                      <Badge
                        variant="outline"
                        className="text-[11px] px-2 py-0 border-0 font-bold"
                        style={{
                          color: NEON_COLORS[i % NEON_COLORS.length],
                          background: `${NEON_COLORS[i % NEON_COLORS.length]}15`,
                        }}
                      >
                        {d.pct}%
                      </Badge>
                    </div>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: NEON_COLORS[i % NEON_COLORS.length] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${d.pct}%` }}
                      transition={{ duration: 0.8, delay: 0.7 + i * 0.06, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* ── ROW 5: Monthly Bar + Recent Activity (60/40) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Monthly Bar Chart */}
        <motion.div className="lg:col-span-3" {...fadeUp(0.76)}>
          <Card
            className="border h-full"
            style={{
              borderColor: "#ff008020",
              boxShadow: "0 0 28px rgba(255,0,128,0.06)",
              background: "linear-gradient(180deg, #111 0%, #0a0a0a 100%)",
            }}
          >
            <CardHeader className="pb-0 pt-5 px-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full" style={{ background: "#ff0080" }} />
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">
                  Monthly Volume
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5 pt-3">
              <ChartContainer config={barConfig} className="h-[220px]">
                <BarChart data={analytics.monthlyData} margin={{ top: 8, right: 8, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {analytics.monthlyData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={
                          entry.count === Math.max(...analytics.monthlyData.map((m) => m.count))
                            ? "#ff0080"
                            : "#00ff8855"
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div className="lg:col-span-2" {...fadeUp(0.80)}>
          <Card
            className="border h-full"
            style={{
              borderColor: "#aa00ff20",
              boxShadow: "0 0 24px rgba(170,0,255,0.06)",
              background: "#0f0f0f",
            }}
          >
            <CardHeader className="pb-0 pt-5 px-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 rounded-full" style={{ background: "#aa00ff" }} />
                <CardTitle className="text-sm font-bold text-foreground uppercase tracking-widest">
                  Recent Activity
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-5 pt-4 space-y-3">
              {analytics.recent.map((cert, i) => (
                <motion.div
                  key={cert.accessCode}
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "#ffffff07", border: "1px solid #ffffff0a" }}
                  initial={{ opacity: 0, x: 12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.85 + i * 0.07 }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
                    style={{
                      background: `${NEON_COLORS[i % NEON_COLORS.length]}20`,
                      color: NEON_COLORS[i % NEON_COLORS.length],
                      border: `1px solid ${NEON_COLORS[i % NEON_COLORS.length]}35`,
                    }}
                  >
                    {cert.candidateName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground truncate">{cert.candidateName}</p>
                    <p className="text-xs text-muted-foreground truncate">{cert.role}</p>
                  </div>
                  <a
                    href={`/c/${cert.accessCode}`}
                    target="_blank"
                    className="text-xs font-semibold shrink-0 hover:underline"
                    style={{ color: "#0088ff" }}
                  >
                    View →
                  </a>
                </motion.div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </div>
  );
}