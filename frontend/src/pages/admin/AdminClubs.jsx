import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  ShieldCheck,
  CalendarDays,
  Ticket,
  Megaphone,
  ArrowUpRight,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { clubsApi, systemApi } from '@/api';
import { Card } from '@/components/ui/Card';
import { Badge, EmptyState, DashboardSkeleton, StatusPill } from '@/components/ui/primitives';
import Modal from '@/components/ui/Modal';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';

export default function AdminClubs() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const isSuperAdmin = user?.role === 'super_admin' || user?.rawRole === 'SUPER_ADMIN';
  const canManageClubs =
    isSuperAdmin ||
    user?.role === 'club_admin' ||
    user?.role === 'admin' ||
    user?.rawRole === 'CLUB_ADMIN' ||
    user?.rawRole === 'ADMIN';
  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: clubsApi.list,
  });

  const [modalMode, setModalMode] = useState(null); // 'create' | 'edit' | null
  const [selectedClub, setSelectedClub] = useState(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    isActive: true,
  });
  const [submitting, setSubmitting] = useState(false);

  const openCreate = () => {
    setForm({
      name: '',
      slug: '',
      description: '',
      isActive: true,
    });
    setModalMode('create');
  };

  const openEdit = (club) => {
    setSelectedClub(club);
    setForm({
      name: club.name,
      slug: club.slug,
      description: club.description || '',
      isActive: club.isActive,
    });
    setModalMode('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.slug.trim()) {
      toast.error('Name and slug are required');
      return;
    }

    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await systemApi.createClub({
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          description: form.description.trim(),
          isActive: form.isActive,
        });
        toast.success(`Chapter "${form.name}" was successfully registered!`);
      } else {
        await systemApi.updateClub(selectedClub.id, {
          name: form.name.trim(),
          slug: form.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
          description: form.description.trim(),
          isActive: form.isActive,
        });
        toast.success(`Chapter "${form.name}" was updated!`);
      }
      qc.invalidateQueries({ queryKey: ['clubs'] });
      setModalMode(null);
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Failed to save club';
      toast.error(`Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (club) => {
    const ok = await confirm({
      title: 'Delete Chapter',
      description: `Are you sure you want to delete chapter "${club.name}"? This will permanently remove all associated events, announcements, and merchandise.`,
      confirmText: 'Delete Chapter',
      tone: 'danger',
    });
    if (!ok) return;

    try {
      await systemApi.deleteClub(club.id);
      qc.invalidateQueries({ queryKey: ['clubs'] });
      qc.invalidateQueries({ queryKey: ['system-clubs'] });
      toast.success(`"${club.name}" was deleted.`);
    } catch (err) {
      const msg = err.friendly || err.response?.data?.error?.message || err.message || 'Failed to delete club';
      toast.error(msg);
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6" data-testid="admin-clubs-page">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow text-accent-dark">Governance</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            Clubs & Chapters.
          </h1>
          <p className="mt-3 max-w-xl text-sm text-ink/55">
            {isSuperAdmin
              ? 'Manage student organizations, affiliated societies, charter configurations, and membership plans running under the Skyline Student Association.'
              : `Managing charter settings and membership plans for ${clubs[0]?.name || user?.club?.name || 'your chapter'}.`}
          </p>
        </div>

        {canManageClubs && (
          <button
            onClick={openCreate}
            data-testid="add-club-button"
            className="inline-flex items-center gap-2 self-start rounded-full bg-accent px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-accent-dark sm:self-center"
          >
            <Plus size={16} /> New Chapter
          </button>
        )}
      </div>

      {/* Clubs Grid */}
      {clubs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No clubs registered"
          body="Create your first chapter to begin hosting events and collecting dues."
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {clubs.map((club) => {
            const eventsCount = club._count?.events || 0;
            const plansCount = club._count?.membershipPlans || 0;
            const bulletinsCount = club._count?.announcements || 0;
            const merchCount = club._count?.products || 0;

            return (
              <Card
                key={club.id}
                className="flex flex-col justify-between p-6 transition-all duration-200 hover:shadow-lift"
                data-testid={`admin-club-${club.id}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-paper font-display text-lg font-bold">
                        {club.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h2 className="font-display text-xl font-semibold text-ink">
                          {club.name}
                        </h2>
                        <span className="font-mono text-xs text-ink/45">
                          #{club.slug}
                        </span>
                      </div>
                    </div>

                    <Badge tone={club.isActive ? 'success' : 'neutral'}>
                      {club.isActive ? 'Active Charter' : 'Inactive'}
                    </Badge>
                  </div>

                  <p className="mt-4 text-xs leading-relaxed text-ink/65 line-clamp-3">
                    {club.description || 'No description provided.'}
                  </p>

                  <div className="mt-5 grid grid-cols-2 gap-2 border-t border-ink/8 pt-4 sm:grid-cols-4 font-mono text-[11px]">
                    <div className="rounded-xl border border-ink/8 bg-white p-2 text-center">
                      <span className="block font-bold text-ink">{plansCount}</span>
                      <span className="text-[10px] uppercase text-ink/40">Plans</span>
                    </div>
                    <div className="rounded-xl border border-ink/8 bg-white p-2 text-center">
                      <span className="block font-bold text-ink">{eventsCount}</span>
                      <span className="text-[10px] uppercase text-ink/40">Events</span>
                    </div>
                    <div className="rounded-xl border border-ink/8 bg-white p-2 text-center">
                      <span className="block font-bold text-ink">{bulletinsCount}</span>
                      <span className="text-[10px] uppercase text-ink/40">News</span>
                    </div>
                    <div className="rounded-xl border border-ink/8 bg-white p-2 text-center">
                      <span className="block font-bold text-ink">{merchCount}</span>
                      <span className="text-[10px] uppercase text-ink/40">Merch</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-ink/8 pt-4">
                  <Link
                    to={`/clubs/${club.slug || club.id}`}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold uppercase tracking-wider text-accent transition hover:text-accent-dark"
                  >
                    View Public Page <ArrowUpRight size={13} />
                  </Link>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEdit(club)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-ink/15 px-3 py-1.5 font-mono text-xs font-medium text-ink transition hover:bg-ink hover:text-paper"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    {canManageClubs && (
                      <button
                        onClick={() => handleDelete(club)}
                        className="rounded-lg p-1.5 text-ink/30 transition hover:bg-danger/10 hover:text-danger"
                        title="Delete chapter"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalMode !== null}
        onClose={() => setModalMode(null)}
        title={modalMode === 'create' ? 'Register New Chapter' : 'Edit Chapter Details'}
        testid="club-modal"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
              Chapter Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Skyline Aero & Rocketry"
              value={form.name}
              onChange={(e) => {
                const val = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  name: val,
                  slug: modalMode === 'create' ? val.toLowerCase().replace(/[^a-z0-9]+/g, '-') : prev.slug,
                }));
              }}
              className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div>
            <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
              Unique Slug *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. aero-rocketry"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 font-mono text-sm text-ink outline-none focus:border-accent"
            />
            <span className="mt-1 block font-mono text-[10px] text-ink/40">
              URL path: /clubs/{form.slug || 'slug'}
            </span>
          </div>

          <div>
            <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-ink/60">
              Chapter Charter & Mission
            </label>
            <textarea
              rows={3}
              placeholder="Mission, member requirements, and activities."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1.5 w-full rounded-xl border border-ink/15 bg-white p-3 text-sm text-ink outline-none focus:border-accent"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="isActiveClub"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              className="h-4 w-4 rounded border-ink/20 text-accent focus:ring-accent"
            />
            <label htmlFor="isActiveClub" className="text-xs font-semibold text-ink cursor-pointer">
              Active Charter (visible on public directory and able to host events)
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-ink/10">
            <button
              type="button"
              onClick={() => setModalMode(null)}
              className="rounded-full border border-ink/15 px-5 py-2.5 text-xs font-semibold text-ink transition hover:bg-ink/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-full bg-accent px-6 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-accent-dark disabled:opacity-50"
            >
              {submitting ? 'Saving…' : modalMode === 'create' ? 'Register Chapter' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
