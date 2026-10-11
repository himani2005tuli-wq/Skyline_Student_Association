import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Download, ShieldCheck, UserCheck, Plus, Pencil, Trash2 } from 'lucide-react';
import { adminApi, clubsApi } from '@/api';
import DataTable from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Badge, StatusPill, DashboardSkeleton } from '@/components/ui/primitives';
import { fmtDate } from '@/lib/format';
import { useAuth } from '@/context/AuthContext';
import { useConfirm } from '@/context/ConfirmContext';

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
  const { confirm } = useConfirm();
  const [selectedUser, setSelectedUser] = useState(null);

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ['admin-members'],
    queryFn: adminApi.members,
  });

  const { data: matrixData } = useQuery({
    queryKey: ['role-authority-matrix'],
    queryFn: adminApi.getRoleAuthorityMatrix,
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: clubsApi.list,
  });

  // Create member state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    role: 'MEMBER',
    clubId: '',
  });

  // Edit member state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    role: 'MEMBER',
    clubId: '',
    isActive: true,
    password: '',
  });

  const handleCreateMember = async (e) => {
    e.preventDefault();
    setCreateSubmitting(true);
    try {
      await adminApi.createUser(createForm);
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success(`Member "${createForm.firstName} ${createForm.lastName}" created!`);
      setCreateModalOpen(false);
      setCreateForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        role: 'MEMBER',
        clubId: '',
      });
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to create member');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const handleOpenEditMember = (m) => {
    setEditingMember(m);
    setEditForm({
      firstName: m.firstName || (m.name ? m.name.split(' ')[0] : ''),
      lastName: m.lastName || (m.name ? m.name.split(' ').slice(1).join(' ') : ''),
      phone: m.phone || '',
      role: m.role || 'MEMBER',
      clubId: m.clubId || m.club?.id || '',
      isActive: m.isActive !== false,
      password: '',
    });
    setEditModalOpen(true);
  };

  const handleUpdateMember = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      await adminApi.updateUser(editingMember.id, editForm);
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success('Member details updated successfully!');
      setEditModalOpen(false);
      setEditingMember(null);
    } catch (err) {
      toast.error(err.response?.data?.error?.message || err.message || 'Failed to update member');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteMember = async (m) => {
    const ok = await confirm({
      title: 'Delete Member',
      description: `Are you sure you want to permanently delete "${m.name || m.email}"? All associated profile data will be permanently removed.`,
      confirmText: 'Delete Member',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await adminApi.deleteUser(m.id);
      queryClient.invalidateQueries({ queryKey: ['admin-members'] });
      toast.success(`Member "${m.name || m.email}" was deleted.`);
    } catch (err) {
      toast.error(err.friendly || err.response?.data?.error?.message || 'Failed to delete member.');
    }
  };

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
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setCreateModalOpen(true)}
            data-testid="add-member-button"
          >
            Add Member
          </Button>
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
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEditMember(r)}
                  className="rounded-lg p-1.5 text-ink/40 transition hover:bg-accent/10 hover:text-accent"
                  title="Edit member"
                  data-testid={`edit-member-${r.id}`}
                >
                  <Pencil size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteMember(r)}
                  className="rounded-lg p-1.5 text-ink/30 transition hover:bg-danger/10 hover:text-danger"
                  title="Delete member"
                  data-testid={`delete-member-${r.id}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ]}
        emptyMessage="No members match this search."
      />

      {/* Create Member Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add New Member / Staff"
      >
        <form onSubmit={handleCreateMember} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                First Name *
              </label>
              <input
                type="text"
                required
                value={createForm.firstName}
                onChange={(e) => setCreateForm({ ...createForm, firstName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={createForm.lastName}
                onChange={(e) => setCreateForm({ ...createForm, lastName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Email Address *
              </label>
              <input
                type="email"
                required
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Initial Password *
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Role
              </label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Phone
              </label>
              <input
                type="tel"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Chapter
              </label>
              <select
                value={createForm.clubId}
                onChange={(e) => setCreateForm({ ...createForm, clubId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">No chapter assigned</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-ink/10">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createSubmitting}
              className="rounded-full bg-accent px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-accent-dark disabled:opacity-50"
            >
              {createSubmitting ? 'Creating…' : 'Create Member'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Member Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Member: ${editingMember?.name || editingMember?.email || ''}`}
      >
        <form onSubmit={handleUpdateMember} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                First Name *
              </label>
              <input
                type="text"
                required
                value={editForm.firstName}
                onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Last Name *
              </label>
              <input
                type="text"
                required
                value={editForm.lastName}
                onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Role
              </label>
              <select
                value={editForm.role}
                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Phone
              </label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
                Chapter
              </label>
              <select
                value={editForm.clubId}
                onChange={(e) => setEditForm({ ...editForm, clubId: e.target.value })}
                className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
              >
                <option value="">No chapter</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
              Reset Password (leave empty to keep unchanged)
            </label>
            <input
              type="password"
              placeholder="New password (optional)"
              value={editForm.password}
              onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
              className="mt-1 w-full rounded-xl border border-ink/15 bg-white p-2.5 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={editForm.isActive}
              onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              className="h-4 w-4 rounded accent-accent"
            />
            <label htmlFor="isActiveCheck" className="text-xs font-semibold text-ink">
              Account Active (can log in and participate)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-ink/10">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="rounded-full border border-ink/15 px-4 py-2 text-xs font-semibold text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSubmitting}
              className="rounded-full bg-accent px-5 py-2 text-xs font-bold text-white shadow-md hover:bg-accent-dark disabled:opacity-50"
            >
              {editSubmitting ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

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
