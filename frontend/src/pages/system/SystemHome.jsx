import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Database,
  Cpu,
  Clock,
  RefreshCw,
  Zap,
  Users,
  Calendar,
  Package,
  Wallet,
  Megaphone,
  Sliders,
  ArrowUpRight,
  ScrollText,
  KeyRound,
  CheckCircle2,
} from 'lucide-react';
import { systemApi } from '@/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import DataTable from '@/components/ui/DataTable';
import { Badge, StatusPill, Tabs, DashboardSkeleton } from '@/components/ui/primitives';
import { fmtDate } from '@/lib/format';
import { useConfirm } from '@/context/ConfirmContext';

const ROLE_OPTIONS = [
  'SUPER_ADMIN',
  'CLUB_ADMIN',
  'TREASURER',
  'EVENT_MANAGER',
  'VOLUNTEER',
  'MEMBER',
];

export default function SystemHome() {
  const qc = useQueryClient();
  const { confirm } = useConfirm();
  const [tab, setTab] = useState('users');
  const [confirmUser, setConfirmUser] = useState(null);
  const [newRole, setNewRole] = useState('MEMBER');

  // 1. Live Platform Overview
  const {
    data: overview,
    isLoading: loadingOverview,
    refetch: refetchOverview,
  } = useQuery({
    queryKey: ['system-overview'],
    queryFn: systemApi.getOverview,
    refetchInterval: 15000,
  });

  // 2. Real DB Users
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['system-users'],
    queryFn: systemApi.users,
  });

  // 3. Dynamic RBAC Matrix
  const { data: matrixData, isLoading: loadingMatrix } = useQuery({
    queryKey: ['system-matrix'],
    queryFn: systemApi.getRoleMatrix,
  });

  // 4. Audit Trail Logs
  const { data: auditLogs, isLoading: loadingLogs } = useQuery({
    queryKey: ['system-audit-logs'],
    queryFn: systemApi.auditLogs,
  });

  // 5. Real DB Clubs
  const { data: clubs, isLoading: loadingClubs } = useQuery({
    queryKey: ['system-clubs'],
    queryFn: systemApi.getClubs,
  });

  const [clubForm, setClubForm] = useState({ isOpen: false, type: 'create', data: {} });

  if (loadingOverview && !overview) {
    return <DashboardSkeleton />;
  }

  const metrics = overview?.metrics || {};
  const services = overview?.services || {};

  const handleUpdateRole = async () => {
    if (!confirmUser) return;
    try {
      await systemApi.changeRole(confirmUser.id, newRole);
      toast.success(`${confirmUser.email} role updated to ${newRole}`);
      qc.invalidateQueries({ queryKey: ['system-users'] });
      qc.invalidateQueries({ queryKey: ['system-overview'] });
      setConfirmUser(null);
    } catch (e) {
      toast.error('Failed to update role: ' + (e.friendly || e.message));
    }
  };

  return (
    <div className="space-y-8" data-testid="super-admin-system-dashboard">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col justify-between gap-4 border-b border-ink/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent-dark">
            <ShieldCheck size={16} /> Super Admin Control Center
          </div>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
            Platform Infrastructure & RBAC
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            Root command console for database telemetry, stateless JWT auth, cron schedules, and dynamic authorities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            size="sm"
            variant="primary"
            icon={RefreshCw}
            onClick={() => {
              refetchOverview();
              qc.invalidateQueries();
              toast.info('Telemetry refreshed');
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Executive Metric KPI Cards ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/45">Registered Accounts</span>
            <Users size={18} className="text-accent" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold text-ink">{metrics.totalUsers ?? 0}</span>
            <span className="text-xs text-ink/50">total in DB</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-mono text-ink/60">
            <span>Admin: {metrics.roleCounts?.CLUB_ADMIN || 0}</span> ·
            <span>Managers: {metrics.roleCounts?.EVENT_MANAGER || 0}</span> ·
            <span>Members: {metrics.roleCounts?.MEMBER || 0}</span>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/45">Financial Volume</span>
            <Wallet size={18} className="text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold text-ink">
              ₹{(metrics.totalRevenueInRupees || 0).toLocaleString('en-IN')}
            </span>
          </div>
          <p className="mt-2 text-xs text-ink/50">
            {metrics.totalTransactionsCount || 0} ledger transactions recorded
          </p>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/45">Events & Inventory</span>
            <Calendar size={18} className="text-blue-600" />
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-display text-3xl font-semibold text-ink">{metrics.totalEvents || 0}</span>
            <span className="text-xs text-ink/50">events</span>
            <span className="mx-1 text-ink/20">|</span>
            <span className="font-display text-3xl font-semibold text-ink">{metrics.totalProducts || 0}</span>
            <span className="text-xs text-ink/50">products</span>
          </div>
          <p className="mt-2 text-xs text-ink/50">
            {metrics.totalAnnouncements || 0} announcements · {metrics.totalFundraisers || 0} fundraisers
          </p>
        </Card>
      </div>

      {/* ── Navigation Tabs ── */}
      <Tabs
        tabs={[
          { value: 'users', label: 'Users & Role Assignment' },
          { value: 'clubs', label: 'Clubs Management' },
          { value: 'quicklinks', label: 'Management Suite Shortcuts' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── Tab 1: Platform & Services Telemetry ── */}
      {tab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Database Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-600">
                    <Database size={22} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">Neon PostgreSQL Database</h3>
                    <p className="text-xs text-ink/50">Serverless PostgreSQL Engine</p>
                  </div>
                </div>
                <StatusPill status="active" />
              </div>

              <div className="mt-5 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Status</span>
                  <span className="font-bold text-emerald-600">CONNECTED & IN SYNC</span>
                </div>
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Connection Mode</span>
                  <span className="font-mono text-ink/80">PgBouncer Pooler (port 6543) + Direct fallback</span>
                </div>
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Prisma Client</span>
                  <span className="font-mono text-ink/80">v6.4.1 (Active Connection Reconnection Guard)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-ink/50">Dynamic RBAC Tables</span>
                  <span className="font-bold text-ink">RoleAuthority, UserAuthority, Notification</span>
                </div>
              </div>
            </Card>

            {/* Cache Engine Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-amber-500/10 p-2.5 text-amber-600">
                    <Zap size={22} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">Redis Cache Engine</h3>
                    <p className="text-xs text-ink/50">Sub-5ms Response Acceleration</p>
                  </div>
                </div>
                <StatusPill status="active" />
              </div>

              <div className="mt-5 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Engine Status</span>
                  <span className="font-bold text-emerald-600">{services.cache?.status || 'ACTIVE'}</span>
                </div>
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Cached Endpoints</span>
                  <span className="font-mono text-ink/80">/events, /products, /plans, /announcements, /me</span>
                </div>
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Cache Invalidation</span>
                  <span className="font-bold text-ink">Real-time tag invalidation on mutation</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-ink/50">Response Time</span>
                  <span className="font-bold text-emerald-600">~2ms – 4ms (X-Cache: HIT)</span>
                </div>
              </div>
            </Card>

            {/* Cron Daemon Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-purple-500/10 p-2.5 text-purple-600">
                    <Clock size={22} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">Notification Cron Daemon</h3>
                    <p className="text-xs text-ink/50">Automated Background Scheduler</p>
                  </div>
                </div>
                <StatusPill status={services.cron?.status === 'RUNNING' ? 'active' : 'pending'} />
              </div>

              <div className="mt-5 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Daemon State</span>
                  <span className="font-bold text-emerald-600">{services.cron?.status || 'RUNNING'}</span>
                </div>
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Cron Expression</span>
                  <span className="font-mono text-ink/80">* * * * * (Every minute)</span>
                </div>
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Channels Supported</span>
                  <span className="font-bold text-ink">In-App Inbox, Email (Brevo), WhatsApp</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-ink/50">Queue Action</span>
                  <span className="text-ink/70">Scans Announcement.scheduledFor & cronPattern</span>
                </div>
              </div>
            </Card>

            {/* Security & JWT Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-500/10 p-2.5 text-emerald-600">
                    <KeyRound size={22} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-bold text-ink">Authentication & Security</h3>
                    <p className="text-xs text-ink/50">Stateless JWT + CSRF Guard</p>
                  </div>
                </div>
                <StatusPill status="active" />
              </div>

              <div className="mt-5 space-y-2.5 text-xs">
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Auth Scheme</span>
                  <span className="font-bold text-emerald-600">Stateless Bearer JWT (&lt;0.1ms verify)</span>
                </div>
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Token Lifespan</span>
                  <span className="font-mono text-ink/80">{services.security?.tokenExpiry || '7 days'}</span>
                </div>
                <div className="flex justify-between border-b border-ink/5 py-1.5">
                  <span className="text-ink/50">Password Algorithm</span>
                  <span className="font-mono text-ink/80">Argon2id (memoryCost: 64MB)</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-ink/50">Rate Limiter</span>
                  <span className="font-bold text-ink">Protected against brute-force</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Tab 1.5: Clubs Management ── */}
      {tab === 'clubs' && (
        <Card className="p-6">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Clubs Directory</h3>
              <p className="text-xs text-ink/60">
                Manage registered clubs on the platform.
              </p>
            </div>
            <Button size="sm" onClick={() => setClubForm({ isOpen: true, type: 'create', data: {} })}>
              + Create Club
            </Button>
          </div>
          
          {loadingClubs ? (
            <DashboardSkeleton />
          ) : (
            <DataTable
              rows={clubs || []}
              searchKeys={['name', 'slug', 'description']}
              pageSize={10}
              columns={[
                {
                  key: 'name',
                  label: 'Club Info',
                  render: (r) => (
                    <div>
                      <p className="font-bold text-ink">{r.name}</p>
                      <p className="text-xs text-ink/45">/{r.slug}</p>
                    </div>
                  ),
                },
                {
                  key: 'description',
                  label: 'Description',
                  render: (r) => (
                    <span className="text-xs text-ink/70">{r.description || 'No description'}</span>
                  ),
                },
                {
                  key: 'isActive',
                  label: 'Status',
                  render: (r) => (
                    <StatusPill status={r.isActive ? 'active' : 'inactive'} />
                  ),
                },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (r) => (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setClubForm({ isOpen: true, type: 'update', data: r })}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50"
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'Delete Club',
                            description: `Are you sure you want to delete "${r.name}"? This action cannot be undone and will cascade delete all associated events and merchandise.`,
                            confirmText: 'Delete Club',
                            tone: 'danger',
                          });
                          if (!ok) return;
                          try {
                            await systemApi.deleteClub(r.id);
                            toast.success('Club deleted');
                            qc.invalidateQueries({ queryKey: ['system-clubs'] });
                            qc.invalidateQueries({ queryKey: ['clubs'] });
                          } catch (err) {
                            toast.error(err.friendly || err.message);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          )}
        </Card>
      )}

      {/* ── Tab 2: Users & Role Assignment ── */}
      {tab === 'users' && (
        <Card className="p-6">
          <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h3 className="font-display text-xl font-bold text-ink">Live User Directory & Roles</h3>
              <p className="text-xs text-ink/60">
                All registered users pulled directly from Neon PostgreSQL with live role assignment.
              </p>
            </div>
            <Link to="/admin/members">
              <Button size="sm" variant="outline" icon={ArrowUpRight}>
                Granular Authority Manager
              </Button>
            </Link>
          </div>

          {loadingUsers ? (
            <DashboardSkeleton />
          ) : (
            <DataTable
              rows={(users || []).map((u) => ({
                ...u,
                fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
                createdLabel: fmtDate(u.createdAt),
              }))}
              searchKeys={['fullName', 'email', 'role']}
              pageSize={10}
              columns={[
                {
                  key: 'fullName',
                  label: 'User Name',
                  render: (r) => (
                    <div>
                      <p className="font-bold text-ink">{r.fullName}</p>
                      <p className="text-xs text-ink/45">{r.email}</p>
                    </div>
                  ),
                },
                {
                  key: 'role',
                  label: 'Current Role',
                  render: (r) => {
                    const tone =
                      r.role === 'SUPER_ADMIN'
                        ? 'accent'
                        : r.role === 'CLUB_ADMIN'
                          ? 'primary'
                          : r.role === 'TREASURER'
                            ? 'warning'
                            : 'dark';
                    return <Badge tone={tone}>{r.role}</Badge>;
                  },
                },
                {
                  key: 'effectiveAuthorities',
                  label: 'Authorities',
                  render: (r) => {
                    const auths = r.effectiveAuthorities || [];
                    if (auths.includes('*')) {
                      return <Badge tone="accent">Universal (*)</Badge>;
                    }
                    return (
                      <span className="text-xs font-mono text-ink/70">
                        {auths.length} assigned
                      </span>
                    );
                  },
                },
                { key: 'createdLabel', label: 'Registered' },
                {
                  key: 'actions',
                  label: 'Actions',
                  render: (r) => (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setConfirmUser(r);
                        setNewRole(r.role);
                      }}
                    >
                      Change Role
                    </Button>
                  ),
                },
              ]}
              emptyMessage="No users found in database."
            />
          )}
        </Card>
      )}


      {/* ── Tab 5: Management Suite Shortcuts ── */}
      {tab === 'quicklinks' && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/admin/members" className="group">
            <Card className="p-5 transition hover:border-accent">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-accent-soft p-3 text-accent-dark">
                  <Users size={22} />
                </div>
                <ArrowUpRight size={18} className="text-ink/30 transition group-hover:text-accent" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">Members & Role RBAC</h3>
              <p className="mt-1 text-xs text-ink/60">Manage student members, promote staff, and configure dynamic DB authorities.</p>
            </Card>
          </Link>

          <Link to="/admin/events" className="group">
            <Card className="p-5 transition hover:border-accent">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-blue-500/10 p-3 text-blue-600">
                  <Calendar size={22} />
                </div>
                <ArrowUpRight size={18} className="text-ink/30 transition group-hover:text-blue-600" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">Events & Ticketing</h3>
              <p className="mt-1 text-xs text-ink/60">Create hackathons, conferences, set ticket tiers and member discounts.</p>
            </Card>
          </Link>

          <Link to="/admin/announcements" className="group">
            <Card className="p-5 transition hover:border-accent">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-purple-500/10 p-3 text-purple-600">
                  <Megaphone size={22} />
                </div>
                <ArrowUpRight size={18} className="text-ink/30 transition group-hover:text-purple-600" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">Announcements & Push</h3>
              <p className="mt-1 text-xs text-ink/60">Send multi-channel alerts and schedule automated cron background jobs.</p>
            </Card>
          </Link>

          <Link to="/admin/products" className="group">
            <Card className="p-5 transition hover:border-accent">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-600">
                  <Package size={22} />
                </div>
                <ArrowUpRight size={18} className="text-ink/30 transition group-hover:text-emerald-600" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">Merchandise & Stock</h3>
              <p className="mt-1 text-xs text-ink/60">Catalog club hoodies, badges, track inventory and manage orders.</p>
            </Card>
          </Link>

          <Link to="/treasury" className="group">
            <Card className="p-5 transition hover:border-accent">
              <div className="flex items-center justify-between">
                <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600">
                  <Wallet size={22} />
                </div>
                <ArrowUpRight size={18} className="text-ink/30 transition group-hover:text-amber-600" />
              </div>
              <h3 className="mt-4 font-display text-lg font-bold text-ink">Treasury & Ledger</h3>
              <p className="mt-1 text-xs text-ink/60">Audit cash flow, view transaction logs, and approve committee reimbursements.</p>
            </Card>
          </Link>
        </div>
      )}

      {/* ── Change Role Modal ── */}
      <Modal
        open={!!confirmUser}
        onClose={() => setConfirmUser(null)}
        title="Elevate / Change Role in Database"
      >
        <div className="space-y-4">
          <p className="text-sm text-ink/70">
            Select the new system role for <b className="text-ink">{confirmUser?.fullName}</b> ({confirmUser?.email}). This immediately updates the PostgreSQL record and resolves dynamic authorities.
          </p>

          <label className="block text-xs font-bold uppercase tracking-wider text-ink/50">
            Target Role
          </label>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full rounded-xl border border-ink/20 bg-white p-3 text-sm font-semibold text-ink outline-none focus:border-accent"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setConfirmUser(null)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleUpdateRole}>
              Apply Role Update
            </Button>
          </div>
        </div>
      </Modal>
      {/* ── Club Create/Update Modal ── */}
      <Modal 
        isOpen={clubForm.isOpen}
        onClose={() => setClubForm({ isOpen: false, type: 'create', data: {} })}
        title={clubForm.type === 'create' ? 'Create New Club' : 'Update Club'}
      >
        <form
          className="space-y-4 pt-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const fd = new FormData(e.target);
            const payload = {
              name: fd.get('name'),
              slug: fd.get('slug'),
              description: fd.get('description'),
              isActive: fd.get('isActive') === 'true',
            };
            try {
              if (clubForm.type === 'create') {
                await systemApi.createClub(payload);
                toast.success('Club created');
              } else {
                await systemApi.updateClub(clubForm.data.id, payload);
                toast.success('Club updated');
              }
              qc.invalidateQueries({ queryKey: ['system-clubs'] });
              setClubForm({ isOpen: false, type: 'create', data: {} });
            } catch (err) {
              toast.error(err.friendly || err.message);
            }
          }}
        >
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink/70">Club Name</label>
            <input name="name" defaultValue={clubForm.data.name} required className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink/70">URL Slug</label>
            <input name="slug" defaultValue={clubForm.data.slug} required className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm outline-none focus:border-accent" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink/70">Description</label>
            <textarea name="description" defaultValue={clubForm.data.description} className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm outline-none focus:border-accent" rows={3} />
          </div>
          <div>
             <label className="mb-1 block text-xs font-semibold text-ink/70">Status</label>
             <select name="isActive" defaultValue={clubForm.data.isActive === false ? 'false' : 'true'} className="w-full rounded-lg border border-ink/20 px-3 py-2 text-sm outline-none focus:border-accent">
               <option value="true">Active</option>
               <option value="false">Inactive</option>
             </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="ghost" onClick={() => setClubForm({ isOpen: false, type: 'create', data: {} })}>Cancel</Button>
            <Button type="submit">Save Club</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
