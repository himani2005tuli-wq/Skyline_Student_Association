import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, ShieldCheck, UserCheck } from 'lucide-react';
import { adminApi } from '@/api';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Badge, StatusPill, DashboardSkeleton } from '@/components/ui/primitives';
import { fmtDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';

const ROLES = [
  { value: 'MEMBER', label: 'Member', tone: 'neutral' },
  { value: 'VOLUNTEER', label: 'Volunteer', tone: 'info' },
  { value: 'EVENT_MANAGER', label: 'Event Manager', tone: 'warning' },
  { value: 'TREASURER', label: 'Treasurer', tone: 'accent' },
  { value: 'CLUB_ADMIN', label: 'Club Admin', tone: 'dark' },
  { value: 'SUPER_ADMIN', label: 'Super Admin', tone: 'danger' },
];

const TONE = {
  Active: 'success',
  'Expiring soon': 'warning',
  Expired: 'danger',
  'Not a member': 'neutral',
};

export default function AdminMembers() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['admin-members'],
    queryFn: adminApi.members,
  });

  const { data: matrixData } = useQuery({
    queryKey: ['role-authority-matrix'],
    queryFn: adminApi.getRoleAuthorityMatrix,
  });

  // Dynamic role change mutation
  const roleMutation = useMutation({
    mutationFn: ({ userId, role }) => adminApi.updateUserRole(userId, role),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success(`Role updated to ${data.role} in database`);
    },
    onError: (err) => {
      toast.error(err.friendly || 'Failed to update role');
    },
  });

  // Grant authority mutation
  const grantMutation = useMutation({
    mutationFn: ({ userId, authority }) => adminApi.grantUserAuthority(userId, authority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success('Authority granted in database');
    },
    onError: (err) => {
      toast.error(err.friendly || 'Failed to grant authority');
    },
  });

  // Revoke authority mutation
  const revokeMutation = useMutation({
    mutationFn: ({ userId, authority }) => adminApi.revokeUserAuthority(userId, authority),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success('Authority revoked in database');
    },
    onError: (err) => {
      toast.error(err.friendly || 'Failed to revoke authority');
    },
  });

  if (membersLoading) return <DashboardSkeleton />;

  const availableAuthorities = matrixData?.availableAuthorities || [];

  return (
    <div className="space-y-6" data-testid="admin-members-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-accent-dark">Access Control & People</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            Dynamic Members & Authority.
          </h1>
          {user?.club?.name ? (
            <p className="mt-1 font-mono text-xs text-accent-dark font-medium">
              Showing chapter roster for {user.club.name}
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink/60">
              Roles and permissions are stored dynamically in the database. Change any role or
              authority with zero code deploys.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={async () => {
              const r = await adminApi.exportMembers();
              toast(`Exported ${r.rows || members.length} members.`);
            }}
            data-testid="members-export-button"
          >
            Export CSV
          </Button>
        </div>
      </div>

      <DataTable
        rows={members.map((m) => ({
          ...m,
          expiresLabel: m.expires ? fmtDate(m.expires) : '—',
          tone: TONE[m.status] || 'neutral',
        }))}
        searchKeys={['name', 'email', 'plan', 'role', 'status']}
        pageSize={10}
        rowTestid="member-row"
        columns={[
          {
            key: 'name',
            label: 'Member',
            render: (r) => (
              <div>
                <p className="font-bold text-ink">{r.name}</p>
                <p className="text-xs text-ink/45">{r.email}</p>
              </div>
            ),
          },
          {
            key: 'role',
            label: 'Database Role',
            render: (r) => (
              <select
                value={r.role || 'MEMBER'}
                onChange={(e) => roleMutation.mutate({ userId: r.id, role: e.target.value })}
                disabled={roleMutation.isPending}
                className="rounded-lg border border-line-strong bg-paper px-2.5 py-1 text-xs font-semibold text-ink shadow-xs transition hover:border-accent-dark focus:border-accent-dark focus:outline-hidden"
              >
                {ROLES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ),
          },
          {
            key: 'authorities',
            label: 'Dynamic Authorities',
            render: (r) => (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-medium text-ink/70">
                  {r.effectiveAuthorities?.includes('*')
                    ? 'All (*)'
                    : `${r.effectiveAuthorities?.length || 0} permissions`}
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  icon={ShieldCheck}
                  onClick={() => setSelectedUser(r)}
                >
                  Manage
                </Button>
              </div>
            ),
          },
          {
            key: 'plan',
            label: 'Plan',
            render: (r) =>
              r.plan === '—' ? (
                <span className="text-ink/40">—</span>
              ) : (
                <Badge tone="dark">{r.plan}</Badge>
              ),
          },
          {
            key: 'status',
            label: 'Status',
            render: (r) => <StatusPill status={(r.status || 'Active').toLowerCase()} />,
          },
          { key: 'expiresLabel', label: 'Expires' },
          {
            key: 'points',
            label: 'Points',
            render: (r) => <span className="font-mono font-bold">{r.points}</span>,
          },
        ]}
        emptyMessage="No members match this search."
      />

      {/* Dynamic Authorities Management Modal */}
      {selectedUser && (
        <Modal
          open={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          title={`Authorities: ${selectedUser.name}`}
          wide
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-line bg-paper-subtle p-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-xs uppercase tracking-wider text-ink/45 font-bold">
                    Current Base Role
                  </p>
                  <p className="font-display text-lg font-semibold text-ink">{selectedUser.role}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider text-ink/45 font-bold">Email</p>
                  <p className="font-mono text-xs text-ink/75">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                Granular Database Authorities
              </h3>
              <p className="text-xs text-ink/55">
                Toggle authorities specifically granted to this user in PostgreSQL (`UserAuthority`
                table).
              </p>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-2 max-h-[380px] overflow-y-auto pr-1">
              {availableAuthorities.map((auth) => {
                const isRoleInherited =
                  selectedUser.role === 'SUPER_ADMIN' ||
                  (matrixData?.roleAuthorities?.[selectedUser.role] || []).includes(auth.id);
                const isDirectlyGranted = (selectedUser.directAuthorities || []).includes(auth.id);
                const isEffective = isRoleInherited || isDirectlyGranted;

                return (
                  <div
                    key={auth.id}
                    className={`flex items-start justify-between gap-3 rounded-xl border p-3 transition ${
                      isEffective
                        ? 'border-accent-dark/30 bg-accent-soft/30'
                        : 'border-line bg-paper'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-ink">{auth.name}</p>
                        {isRoleInherited && (
                          <Badge tone="neutral" className="text-[10px]">
                            Role Default
                          </Badge>
                        )}
                        {isDirectlyGranted && (
                          <Badge tone="accent" className="text-[10px]">
                            Direct DB Grant
                          </Badge>
                        )}
                      </div>
                      <p className="font-mono text-[11px] text-ink/50">{auth.id}</p>
                      <p className="text-xs text-ink/65">{auth.description}</p>
                    </div>

                    {!isRoleInherited && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isDirectlyGranted) {
                            revokeMutation.mutate({ userId: selectedUser.id, authority: auth.id });
                            setSelectedUser((prev) => ({
                              ...prev,
                              directAuthorities: (prev.directAuthorities || []).filter(
                                (a) => a !== auth.id,
                              ),
                              effectiveAuthorities: (prev.effectiveAuthorities || []).filter(
                                (a) => a !== auth.id,
                              ),
                            }));
                          } else {
                            grantMutation.mutate({ userId: selectedUser.id, authority: auth.id });
                            setSelectedUser((prev) => ({
                              ...prev,
                              directAuthorities: [...(prev.directAuthorities || []), auth.id],
                              effectiveAuthorities: [...(prev.effectiveAuthorities || []), auth.id],
                            }));
                          }
                        }}
                        className={`mt-1 text-xs font-semibold px-2.5 py-1 rounded-lg border transition ${
                          isDirectlyGranted
                            ? 'border-danger/30 text-danger hover:bg-danger/10'
                            : 'border-accent-dark text-accent-dark hover:bg-accent-soft'
                        }`}
                      >
                        {isDirectlyGranted ? 'Revoke' : 'Grant'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <Button variant="outline" size="sm" onClick={() => setSelectedUser(null)}>
                Done
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
