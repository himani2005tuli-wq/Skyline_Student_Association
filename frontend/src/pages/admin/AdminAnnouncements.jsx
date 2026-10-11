import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus, Pin, Clock, Bell, Trash2, Play, Pencil } from 'lucide-react';
import { adminApi, publicApi, communicationApi, clubsApi } from '@/api';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Badge, DashboardSkeleton } from '@/components/ui/primitives';
import { fmtDate } from '@/lib/format';
import { useConfirm } from '@/context/ConfirmContext';
import { useAuth } from '@/context/AuthContext';

const annSchema = z.object({
  title: z.string().min(5, 'Say what this is about'),
  category: z.string().min(1, 'Pick a category'),
  body: z.string().min(10, 'A little more detail, please'),
  pinned: z.boolean().default(false),
  scheduledFor: z.string().optional(),
  channelEmail: z.boolean().default(true),
  channelWhatsApp: z.boolean().default(false),
  channelInApp: z.boolean().default(true),
});

const pushSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  message: z.string().min(1, 'Message is required'),
  type: z.enum(['INFO', 'EVENT', 'ANNOUNCEMENT', 'MERCH', 'REMINDER']).default('ANNOUNCEMENT'),
  link: z.string().optional().or(z.literal('')),
});

export default function AdminAnnouncements() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const isSuperAdmin = user?.role === 'super_admin' || user?.rawRole === 'SUPER_ADMIN';

  const [open, setOpen] = useState(false);
  const [pushOpen, setPushOpen] = useState(false);
  const [targetClubId, setTargetClubId] = useState('platform');
  const [pushTargetClubId, setPushTargetClubId] = useState('platform');

  const [editOpen, setEditOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const {
    register: registerEdit,
    handleSubmit: handleEditSubmit,
    reset: resetEdit,
    formState: { errors: editErrors, isSubmitting: isEditSubmitting },
  } = useForm({
    resolver: zodResolver(annSchema),
  });

  const handleOpenEdit = (ann) => {
    setEditingAnnouncement(ann);
    resetEdit({
      title: ann.title || '',
      category: ann.category || 'General',
      body: ann.body || ann.content || '',
      pinned: ann.pinned || false,
      channelEmail: true,
      channelInApp: true,
      channelWhatsApp: false,
    });
    setEditOpen(true);
  };

  const onEditSubmit = async (payload) => {
    if (!editingAnnouncement) return;
    try {
      await communicationApi.updateAnnouncement(editingAnnouncement.id, {
        title: payload.title,
        body: payload.body,
        content: payload.body,
        audience: {
          category: payload.category,
          pinned: payload.pinned,
        },
      });
      qc.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement updated successfully.');
      setEditOpen(false);
      setEditingAnnouncement(null);
    } catch (err) {
      toast.error(err.friendly || err.message || 'Failed to update announcement');
    }
  };

  const { data = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: publicApi.announcements,
  });

  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: clubsApi.list,
  });

  const { data: scheduledData } = useQuery({
    queryKey: ['scheduled-announcements'],
    queryFn: communicationApi.getScheduledAnnouncements,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(annSchema),
    defaultValues: {
      pinned: false,
      channelEmail: true,
      channelInApp: true,
      channelWhatsApp: false,
    },
  });

  const {
    register: registerPush,
    handleSubmit: handlePushSubmit,
    reset: resetPush,
    formState: { errors: pushErrors, isSubmitting: isPushSubmitting },
  } = useForm({
    resolver: zodResolver(pushSchema),
    defaultValues: { type: 'ANNOUNCEMENT' },
  });

  // Cancel scheduled announcement mutation
  const cancelMutation = useMutation({
    mutationFn: (id) => communicationApi.cancelScheduledAnnouncement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      toast.success('Scheduled notification cancelled');
    },
    onError: (err) => {
      toast.error(err.friendly || 'Failed to cancel scheduled announcement');
    },
  });

  // Delete live published announcement mutation
  const deleteAnnouncementMutation = useMutation({
    mutationFn: (id) => communicationApi.deleteAnnouncement(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement deleted');
    },
    onError: (err) => {
      toast.error(err.friendly || 'Failed to delete announcement');
    },
  });

  // Trigger cron manually mutation
  const triggerCronMutation = useMutation({
    mutationFn: () => communicationApi.triggerScheduledCron(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['scheduled-announcements'] });
      qc.invalidateQueries({ queryKey: ['announcements'] });
      toast.success(`Cron executed: ${res?.processed ?? 0} notifications dispatched`);
    },
  });

  const onSubmit = async (payload) => {
    const channels = [];
    if (payload.channelEmail) channels.push('EMAIL');
    if (payload.channelInApp) channels.push('IN_APP');
    if (payload.channelWhatsApp) channels.push('WHATSAPP');

    const scheduledDate = payload.scheduledFor
      ? new Date(payload.scheduledFor).toISOString()
      : null;

    const isPlatform = isSuperAdmin && targetClubId === 'platform';
    const chosenClubId = isPlatform
      ? (clubs[0]?.id || user?.clubId || user?.club?.id)
      : (isSuperAdmin ? targetClubId : (user?.clubId || user?.club?.id));

    await adminApi.createAnnouncement({
      title: payload.title,
      content: payload.body,
      isPublished: !scheduledDate,
      scheduledFor: scheduledDate,
      clubId: chosenClubId,
      channels,
      audience: {
        scope: isPlatform ? 'PLATFORM' : 'CLUB',
        isPlatform,
        category: payload.category,
        pinned: payload.pinned,
        channels,
      },
    });

    qc.invalidateQueries({ queryKey: ['announcements'] });
    qc.invalidateQueries({ queryKey: ['scheduled-announcements'] });

    if (scheduledDate) {
      toast.success(
        `Announcement scheduled for automated Cron dispatch at ${fmtDate(scheduledDate)}`,
      );
    } else {
      toast.success(
        isPlatform
          ? 'Platform announcement published across university!'
          : `Chapter announcement published for ${user?.club?.name || 'club members'}!`,
      );
    }

    reset();
    setOpen(false);
  };

  const onPushSubmit = async (payload) => {
    try {
      const isPlatform = isSuperAdmin && pushTargetClubId === 'platform';
      const chosenClubId = isPlatform
        ? null
        : (isSuperAdmin ? pushTargetClubId : (user?.clubId || user?.club?.id));

      await communicationApi.pushNotification({
        title: payload.title,
        message: payload.message,
        type: payload.type,
        link: payload.link || null,
        clubId: chosenClubId || undefined,
      });

      qc.invalidateQueries({ queryKey: ['announcements'] });
      qc.invalidateQueries({ queryKey: ['my-notifications'] });

      toast.success(
        isPlatform
          ? 'Platform alert pushed to all member inboxes!'
          : `Push notification sent to ${user?.club?.name || 'chapter'} members!`,
      );
      resetPush();
      setPushOpen(false);
    } catch (err) {
      toast.error(err.friendly || 'Failed to dispatch push notification alert');
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  const scheduledList = scheduledData?.scheduled || [];
  const cronStatus = scheduledData?.cronStatus;

  return (
    <div className="space-y-6" data-testid="admin-announcements-page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-accent-dark">Communication & Notifications</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            Announcements & Push.
          </h1>
          {user?.club?.name ? (
            <p className="mt-1 font-mono text-xs text-accent-dark font-medium">
              Managing broadcasts & alerts for {user.club.name}
            </p>
          ) : (
            <p className="mt-1 text-sm text-ink/60">
              Publish live announcements, trigger automated cron delivery schedules, or push direct
              notifications.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-3">
          <Button size="sm" variant="outline" icon={Bell} onClick={() => setPushOpen(true)}>
            Push Direct Alert
          </Button>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setOpen(true)}
            data-testid="create-announcement-button"
          >
            New Announcement / Schedule
          </Button>
        </div>
      </div>

      {/* Scheduled Notifications Queue (Cron) */}
      {scheduledList.length > 0 && (
        <div className="rounded-2xl border border-accent-dark/30 bg-accent-soft/20 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent-dark animate-pulse" />
              <h3 className="font-display text-lg font-semibold text-ink">
                Automated Cron Schedule Queue ({scheduledList.length})
              </h3>
              {cronStatus?.isRunning && (
                <Badge tone="success" className="text-xs">
                  Cron Engine Active (Every 1m)
                </Badge>
              )}
            </div>
            <Button
              size="xs"
              variant="outline"
              icon={Play}
              loading={triggerCronMutation.isPending}
              onClick={() => triggerCronMutation.mutate()}
            >
              Run Cron Now
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {scheduledList.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-line bg-paper p-3.5 shadow-xs"
              >
                <div>
                  <p className="font-semibold text-sm text-ink">{item.title}</p>
                  <p className="text-xs text-ink/60 mt-0.5 line-clamp-1">{item.content}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs font-mono text-accent-dark font-medium">
                      ⏰{' '}
                      {item.scheduledFor ? new Date(item.scheduledFor).toLocaleString() : 'Pending'}
                    </span>
                    <Badge tone="dark" className="text-[10px]">
                      Scheduled
                    </Badge>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => cancelMutation.mutate(item.id)}
                  title="Cancel scheduled dispatch"
                  className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Published Announcements Table */}
      <DataTable
        rows={data}
        searchKeys={['title', 'category', 'body']}
        pageSize={8}
        rowTestid="announcement-row"
        columns={[
          {
            key: 'title',
            label: 'Title',
            render: (r) => (
              <div className="flex items-center gap-2">
                {r.pinned && <Pin className="h-3.5 w-3.5 text-[#FF4D1C] shrink-0" />}
                <div>
                  <p className="font-bold text-ink">{r.title}</p>
                  <p className="text-xs text-ink/45 line-clamp-1">{r.body}</p>
                </div>
              </div>
            ),
          },
          {
            key: 'category',
            label: 'Category',
            render: (r) => <Badge tone="neutral">{r.category}</Badge>,
          },
          {
            key: 'date',
            label: 'Published',
            render: (r) => <span className="text-xs">{fmtDate(r.date)}</span>,
          },
          {
            key: 'status',
            label: 'Status',
            render: () => <Badge tone="success">Live</Badge>,
          },
          {
            key: 'actions',
            label: '',
            render: (r) => (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(r)}
                  title="Edit announcement"
                  className="p-1.5 text-ink/40 hover:text-ink hover:bg-ink/5 rounded-lg transition"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const ok = await confirm({
                      title: 'Delete Announcement',
                      description: `Are you sure you want to delete "${r.title}"? This cannot be undone.`,
                      confirmText: 'Delete Announcement',
                      tone: 'danger',
                    });
                    if (ok) {
                      deleteAnnouncementMutation.mutate(r.id);
                    }
                  }}
                  title="Delete announcement"
                  className="p-1.5 text-danger hover:bg-danger/10 rounded-lg transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ),
          },
        ]}
        emptyMessage="No announcements match this search."
      />

      {/* Create / Schedule Announcement Modal */}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Create or Schedule Announcement"
        wide
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          noValidate
          data-testid="create-announcement-form"
        >
          {/* Chapter / Scope Indicator */}
          {!isSuperAdmin ? (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper font-display text-sm font-bold">
                  {(user?.club?.name || 'My Chapter').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-wider text-accent font-bold">
                    Publishing for Chapter
                  </p>
                  <p className="font-display text-base font-semibold text-ink">
                    {user?.club?.name || 'Your Chapter'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Badge tone="accent">Chapter Announcement</Badge>
                <p className="mt-1 font-mono text-[11px] text-ink/50">
                  Visible to members & followers of this club
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-paper-subtle p-3.5 space-y-2">
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink/60">
                Announcement Scope / Publishing Authority
              </label>
              <select
                value={targetClubId}
                onChange={(e) => setTargetClubId(e.target.value)}
                className="w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-accent-dark focus:outline-hidden"
              >
                <option value="platform">Platform Announcement (University-Wide / All Users)</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} Announcement
                  </option>
                ))}
              </select>
              <p className="text-xs text-ink/50">
                {targetClubId === 'platform'
                  ? 'University-wide notice visible to all intended users on the platform.'
                  : `Chapter notice visible to the selected audience for this club.`}
              </p>
            </div>
          )}

          <Field label="Title" htmlFor="an-title" error={errors.title?.message}>
            <Input
              id="an-title"
              placeholder="Spring Gala tickets are live"
              data-testid="create-announcement-title"
              {...register('title')}
            />
          </Field>
          <Field label="Category" htmlFor="an-cat" error={errors.category?.message}>
            <Select
              id="an-cat"
              data-testid="create-announcement-category"
              {...register('category')}
            >
              <option value="">Select…</option>
              {['Events', 'Volunteering', 'Merch', 'Loyalty', 'Governance'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </Select>
          </Field>
          <Field label="Body" htmlFor="an-body" error={errors.body?.message}>
            <Textarea
              id="an-body"
              className="min-h-24"
              placeholder="Write the message content to broadcast to members."
              data-testid="create-announcement-body"
              {...register('body')}
            />
          </Field>

          {/* Cron Scheduling Option */}
          <div className="rounded-xl border border-line bg-paper-subtle p-3.5 space-y-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-accent-dark" /> Automated Cron Scheduling (Optional)
            </label>
            <p className="text-xs text-ink/55">
              Leave blank to publish immediately. Or pick a future date/time for the background cron
              to dispatch automatically.
            </p>
            <input
              type="datetime-local"
              className="w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-accent-dark focus:outline-hidden"
              {...register('scheduledFor')}
            />
          </div>

          {/* Delivery Channels */}
          <div className="space-y-1.5">
            <p className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Dispatch Channels
            </p>
            <div className="flex flex-wrap gap-4 text-sm font-semibold text-ink pt-1">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#FF4D1C]"
                  {...register('channelInApp')}
                />
                In-App Push
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#FF4D1C]"
                  {...register('channelEmail')}
                />
                Email (Brevo)
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#FF4D1C]"
                  {...register('channelWhatsApp')}
                />
                WhatsApp (Meta API)
              </label>
            </div>
          </div>

          <label
            className="flex items-center gap-3 text-sm font-semibold text-ink pt-1"
            data-testid="create-announcement-pinned-label"
          >
            <input type="checkbox" className="h-4 w-4 accent-[#FF4D1C]" {...register('pinned')} />{' '}
            Pin to the top of the board
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              loading={isSubmitting}
              loadingText="Saving…"
              data-testid="create-announcement-submit"
            >
              Submit / Schedule
            </Button>
          </div>
        </form>
      </Modal>

      {/* Push Direct Notification Modal */}
      <Modal open={pushOpen} onClose={() => setPushOpen(false)} title="Push Direct In-App Alert">
        <form onSubmit={handlePushSubmit(onPushSubmit)} className="space-y-4">
          {!isSuperAdmin ? (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3 flex items-center justify-between">
              <div>
                <span className="font-mono text-[10px] uppercase tracking-wider text-accent font-bold block">
                  Target Audience
                </span>
                <span className="font-semibold text-sm text-ink">
                  Members of {user?.club?.name || 'Your Chapter'}
                </span>
              </div>
              <Badge tone="accent">Chapter Inboxes Only</Badge>
            </div>
          ) : (
            <div className="rounded-xl border border-line bg-paper-subtle p-3 space-y-1.5">
              <label className="block font-mono text-xs font-bold uppercase tracking-wider text-ink/60">
                Target Audience
              </label>
              <select
                value={pushTargetClubId}
                onChange={(e) => setPushTargetClubId(e.target.value)}
                className="w-full rounded-lg border border-line-strong bg-paper px-3 py-2 text-sm text-ink focus:border-accent-dark focus:outline-hidden"
              >
                <option value="platform">All Platform Members (University-Wide)</option>
                {clubs.map((c) => (
                  <option key={c.id} value={c.id}>
                    Members of {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <Field label="Alert Title" error={pushErrors?.title?.message}>
            <Input placeholder="Flash Reminder" {...registerPush('title')} />
          </Field>
          <Field label="Notification Type" error={pushErrors?.type?.message}>
            <Select {...registerPush('type')}>
              <option value="ANNOUNCEMENT">Announcement</option>
              <option value="EVENT">Event Alert</option>
              <option value="MERCH">Merch Drop</option>
              <option value="REMINDER">Reminder</option>
              <option value="INFO">General Info</option>
            </Select>
          </Field>
          <Field label="Message" error={pushErrors?.message?.message}>
            <Textarea
              placeholder="Short message displayed in notification tray"
              {...registerPush('message')}
            />
          </Field>
          <Field label="Action Link (Optional)" error={pushErrors?.link?.message}>
            <Input placeholder="/events or /store" {...registerPush('link')} />
          </Field>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setPushOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isPushSubmitting}>
              Send Push Alert
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Announcement Modal */}
      <Modal
        open={editOpen}
        onClose={() => {
          setEditOpen(false);
          setEditingAnnouncement(null);
        }}
        title="Edit Announcement"
        testid="edit-announcement-modal"
      >
        <form onSubmit={handleEditSubmit(onEditSubmit)} className="space-y-4">
          <Field label="Subject / Headline" error={editErrors.title?.message}>
            <Input
              placeholder="e.g., Campus Center renovations scheduled"
              {...registerEdit('title')}
            />
          </Field>

          <Field label="Category" error={editErrors.category?.message}>
            <Select {...registerEdit('category')}>
              <option value="">Select category…</option>
              <option value="Governance">Governance</option>
              <option value="Events">Events</option>
              <option value="Facilities">Facilities</option>
              <option value="Elections">Elections</option>
              <option value="Emergency">Emergency</option>
              <option value="General">General</option>
            </Select>
          </Field>

          <Field label="Content / Body" error={editErrors.body?.message}>
            <Textarea
              rows={4}
              placeholder="Write the full text of your announcement…"
              {...registerEdit('body')}
            />
          </Field>

          <label className="flex items-center gap-2 cursor-pointer pt-1">
            <input
              type="checkbox"
              className="rounded border-line text-accent focus:ring-accent"
              {...registerEdit('pinned')}
            />
            <span className="text-sm font-medium text-ink">Pin this announcement to top</span>
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditOpen(false);
                setEditingAnnouncement(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" loading={isEditSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
