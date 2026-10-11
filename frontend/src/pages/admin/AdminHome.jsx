import { useQuery } from '@tanstack/react-query';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { Users, UserCheck, Timer, TrendingUp, Activity } from 'lucide-react';
import { adminApi } from '@/api';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge, DashboardSkeleton } from '@/components/ui/primitives';
import { fmtDate } from '@/lib/format';

export default function AdminHome() {
  const { data, isLoading } = useQuery({ queryKey: ['admin-stats'], queryFn: adminApi.stats });
  if (isLoading || !data) return <DashboardSkeleton />;

  return (
    <div className="space-y-6" data-testid="admin-dashboard">
      <div>
        <p className="eyebrow text-accent-dark">Administration</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
          Club overview.
        </h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total members"
          value={data.totalMembers}
          sub="all-time sign-ups"
          icon={Users}
          testid="stat-total-members"
        />
        <StatCard
          label="Active members"
          value={data.activeMembers}
          sub="dues paid & valid"
          icon={UserCheck}
          tone="accent"
          testid="stat-active-members"
        />
        <StatCard
          label="Pending renewals"
          value={data.pendingRenewals}
          sub="expiry within 14 days"
          icon={Timer}
          testid="stat-pending-renewals"
        />
        <StatCard
          label="New this month"
          value={data.newThisMonth}
          sub="vs 24 last month"
          icon={TrendingUp}
          testid="stat-new-members"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-8" data-testid="revenue-chart-card">
          <h2 className="font-display text-xl font-semibold text-ink">Revenue, last 6 months</h2>
          <p className="mt-1 text-xs text-ink/50">
            Dues + tickets + merch + fundraisers, net of points redeemed
          </p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.revenueByMonth} margin={{ left: -12, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FF4D1C" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#FF4D1C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(11,14,23,0.07)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'rgba(11,14,23,0.5)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'rgba(11,14,23,0.5)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `${v / 1000}k`}
                />
                <Tooltip
                  formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(11,14,23,0.1)',
                    fontFamily: 'Manrope',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#FF4D1C"
                  strokeWidth={2.5}
                  fill="url(#rev)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 lg:col-span-4" data-testid="sources-chart-card">
          <h2 className="font-display text-xl font-semibold text-ink">By source</h2>
          <p className="mt-1 text-xs text-ink/50">This month's mix</p>
          <div className="mt-6 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.revenueBySource}
                layout="vertical"
                margin={{ left: -18, right: 12 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(11,14,23,0.07)"
                  horizontal={false}
                />
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: 'rgba(11,14,23,0.7)' }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                />
                <Tooltip
                  formatter={(v) => [`₹${v.toLocaleString('en-IN')}`, 'Collected']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid rgba(11,14,23,0.1)',
                    fontFamily: 'Manrope',
                  }}
                />
                <Bar dataKey="value" fill="#0B0E17" radius={[0, 8, 8, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card className="p-6" data-testid="recent-activity-card">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-accent" />
          <h2 className="font-display text-xl font-semibold text-ink">Recent activity</h2>
        </div>
        <div className="mt-4 divide-y divide-ink/6">
          {(data.recentActivity || []).slice(0, 4).map((l) => (
            <div
              key={l.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
              data-testid={`activity-log-${l.id}`}
            >
              <div>
                <p className="text-[13px] font-semibold text-ink">{l.action}</p>
                <p className="font-mono text-[11px] text-ink/45">
                  {l.actor} · {fmtDate(l.time)}
                </p>
              </div>
              <Badge>{l.scope}</Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
