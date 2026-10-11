import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, ArrowUpRight, Trash2 } from 'lucide-react';
import { adminApi, eventsApi, clubsApi } from '@/api';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Badge, ProgressBar, DashboardSkeleton } from '@/components/ui/primitives';
import { fmtDate, inr } from '@/lib/format';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';

const eventSchema = z.object({
  title: z.string().min(3, 'Give the event a name'),
  category: z.string().min(1, 'Pick a category'),
  date: z.string().min(1, 'Pick a date'),
  venue: z.string().min(3, 'Where is it happening?'),
  capacity: z.coerce.number().int().min(1, 'At least 1 seat').max(5000, "That's too many"),
  memberPrice: z.coerce.number().min(0),
  guestPrice: z.coerce.number().min(0),
  desc: z.string().min(10, 'A sentence or two helps'),
});

export default function AdminEvents() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const isSuperAdmin = user?.role === 'super_admin' || user?.rawRole === 'SUPER_ADMIN';

  const { data, isLoading } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const { data: clubs = [] } = useQuery({ queryKey: ['clubs'], queryFn: clubsApi.list });

  const [open, setOpen] = useState(false);
  const [selectedClubId, setSelectedClubId] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(eventSchema) });

  const deleteMutation = useMutation({
    mutationFn: (id) => eventsApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['events'] });
      toast.success('Event deleted');
    },
    onError: (err) => {
      toast.error(err.friendly || 'Failed to delete event');
    },
  });

  const onSubmit = async (payload) => {
    const chosenClubId = isSuperAdmin
      ? (selectedClubId || clubs[0]?.id || user?.clubId || user?.club?.id)
      : (user?.clubId || user?.club?.id);

    await adminApi.createEvent({
      ...payload,
      clubId: chosenClubId,
    });
    qc.invalidateQueries({ queryKey: ['events'] });
    toast.success(`"${payload.title}" published to the calendar.`);
    reset();
    setOpen(false);
  };

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6" data-testid="admin-events-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-accent-dark">Programming</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            Events.
          </h1>
          {user?.club?.name && (
            <p className="mt-1 font-mono text-xs text-accent-dark font-medium">
              Managing chapter events for {user.club.name}
            </p>
          )}
        </div>
        <Button
          size="sm"
          icon={Plus}
          onClick={() => setOpen(true)}
          data-testid="create-event-button"
        >
          Create event
        </Button>
      </div>

      <DataTable
        rows={data.map((e) => ({
          ...e,
          dateLabel: fmtDate(e.date),
          soldLabel: `${e.sold}/${e.capacity}`,
        }))}
        searchKeys={['title', 'category', 'venue']}
        pageSize={6}
        rowTestid="admin-event-row"
        columns={[
          {
            key: 'title',
            label: 'Event',
            render: (r) => (
              <Link
                to={`/events/${r.id}`}
                data-testid={`admin-event-link-${r.id}`}
                className="group flex items-center gap-3"
              >
                <img src={r.poster} alt="" className="h-10 w-14 rounded-lg object-cover" />
                <div>
                  <p className="font-bold text-ink group-hover:text-accent-dark">{r.title}</p>
                  <p className="text-xs text-ink/45">{r.venue}</p>
                </div>
              </Link>
            ),
          },
          { key: 'category', label: 'Category', render: (r) => <Badge>{r.category}</Badge> },
          { key: 'dateLabel', label: 'Date' },
          {
            key: 'soldLabel',
            label: 'Sold',
            render: (r) => (
              <div className="w-28">
                <p className="font-mono text-xs font-bold">{r.soldLabel}</p>
                <ProgressBar value={r.sold} max={r.capacity} className="mt-1.5 h-1.5" />
              </div>
            ),
          },
          {
            key: 'pricing',
            label: 'Pricing',
            render: (r) => (
              <span className="font-mono text-xs text-ink/70">
                {r.ticketTypes[0].price === 0
                  ? 'Free'
                  : `${inr(r.ticketTypes[0].price)} / ${inr(r.ticketTypes[1]?.price ?? 0)}`}
              </span>
            ),
          },
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={async (e) => {
                    e.stopPropagation();
                    const ok = await confirm({
                      title: 'Delete Event',
                      description: `Are you sure you want to delete event "${r.title}"? All reservations and ticket tiers will be removed.`,
                      confirmText: 'Delete Event',
                      tone: 'danger',
                    });
                    if (ok) {
                      deleteMutation.mutate(r.id);
                    }
                  }}
                  title="Delete event"
                  className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
                <Link to={`/events/${r.id}`} className="p-1.5 text-ink/40 hover:text-ink">
                  <ArrowUpRight size={14} />
                </Link>
              </div>
            ),
          },
        ]}
        emptyMessage="No events yet — create the first one."
      />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create event"
        wide
        testid="create-event-modal"
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 sm:grid-cols-2"
          noValidate
          data-testid="create-event-form"
        >
          {/* Chapter / Hosting Org Scope */}
          <div className="sm:col-span-2">
            {!isSuperAdmin ? (
              <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper font-display text-sm font-bold">
                    {(user?.club?.name || 'Club').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <span className="block font-mono text-[10px] uppercase tracking-wider text-accent font-bold">
                      Hosting Chapter
                    </span>
                    <span className="font-display text-base font-semibold text-ink">
                      {user?.club?.name || 'My Chapter'}
                    </span>
                  </div>
                </div>
                <Badge tone="accent">Chapter Event</Badge>
              </div>
            ) : (
              <Field label="Hosting Chapter">
                <Select
                  value={selectedClubId || clubs[0]?.id || ''}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                >
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>

          <div className="sm:col-span-2">
            <Field label="Event title" htmlFor="ev-title" error={errors.title?.message}>
              <Input
                id="ev-title"
                placeholder="Spring Gala"
                data-testid="create-event-title"
                {...register('title')}
              />
            </Field>
          </div>
          <Field label="Category" htmlFor="ev-cat" error={errors.category?.message}>
            <Select id="ev-cat" data-testid="create-event-category" {...register('category')}>
              <option value="">Select…</option>
              {['Social', 'Culture', 'Outdoors', 'Tech', 'Community', 'Fundraiser'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Date" htmlFor="ev-date" error={errors.date?.message}>
            <Input id="ev-date" type="date" data-testid="create-event-date" {...register('date')} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Venue" htmlFor="ev-venue" error={errors.venue?.message}>
              <Input
                id="ev-venue"
                placeholder="Grand Ballroom"
                data-testid="create-event-venue"
                {...register('venue')}
              />
            </Field>
          </div>
          <Field label="Capacity" htmlFor="ev-cap" error={errors.capacity?.message}>
            <Input
              id="ev-cap"
              type="number"
              min="1"
              data-testid="create-event-capacity"
              {...register('capacity')}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Member ₹" htmlFor="ev-mprice" error={errors.memberPrice?.message}>
              <Input
                id="ev-mprice"
                type="number"
                min="0"
                data-testid="create-event-member-price"
                {...register('memberPrice')}
              />
            </Field>
            <Field label="Guest ₹" htmlFor="ev-gprice" error={errors.guestPrice?.message}>
              <Input
                id="ev-gprice"
                type="number"
                min="0"
                data-testid="create-event-guest-price"
                {...register('guestPrice')}
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Description" htmlFor="ev-desc" error={errors.desc?.message}>
              <Textarea
                id="ev-desc"
                placeholder="What makes this one unmissable?"
                data-testid="create-event-desc"
                {...register('desc')}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-3 sm:col-span-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              loadingText="Publishing…"
              data-testid="create-event-submit"
            >
              Publish event
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
