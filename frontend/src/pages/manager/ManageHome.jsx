import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ScanLine,
  MapPin,
  ArrowUpRight,
  Users,
  Calendar,
  CalendarDays,
  ClipboardList,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  History,
  Keyboard,
  Camera,
  Plus,
  UserCheck,
  Building2,
  Tag,
  Search,
  Check,
  Send,
  Sparkles,
} from 'lucide-react';
import { eventsApi, checkinApi, tasksApi, fundraisersApi } from '@/api';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select, Textarea, Field } from '@/components/ui/Field';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { Badge, ProgressBar, StatusPill, Tabs, DashboardSkeleton } from '@/components/ui/primitives';
import { fmtDate } from '@/lib/format';
import QrCheckinConsole from '@/components/checkin/QrCheckinConsole';

function ResultPanel({ result, onReset }) {
  const map = {
    valid: {
      tone: 'border-success/40 bg-success-soft',
      icon: CheckCircle2,
      color: 'text-success',
      title: 'Welcome in!',
      testid: 'checkin-result-valid',
    },
    already: {
      tone: 'border-warning/40 bg-warning-soft',
      icon: AlertTriangle,
      color: 'text-warning',
      title: 'Already checked in',
      testid: 'checkin-result-already',
    },
    cancelled: {
      tone: 'border-danger/40 bg-danger-soft',
      icon: XCircle,
      color: 'text-danger',
      title: 'Ticket cancelled',
      testid: 'checkin-result-cancelled',
    },
    invalid: {
      tone: 'border-danger/40 bg-danger-soft',
      icon: XCircle,
      color: 'text-danger',
      title: 'Invalid ticket',
      testid: 'checkin-result-invalid',
    },
  }[result.result] || {
    tone: 'border-danger/40 bg-danger-soft',
    icon: XCircle,
    color: 'text-danger',
    title: 'Validation error',
    testid: 'checkin-result-error',
  };

  const Icon = map.icon;
  return (
    <div className={`rounded-2xl border-2 p-6 ${map.tone}`} data-testid={map.testid}>
      <div className="flex items-center gap-3">
        <Icon size={26} className={map.color} />
        <div>
          <h3 className={`font-display text-xl font-semibold ${map.color}`}>{map.title}</h3>
          {result.name && (
            <p className="text-sm font-semibold text-ink">
              {result.name} · {result.type}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 space-y-1 text-sm text-ink/70">
        {result.event && (
          <p>
            Event: <b>{result.event}</b>
          </p>
        )}
        {result.checkedInAt && (
          <p>
            Checked in at <b>{result.checkedInAt}</b> — attendance recorded.
          </p>
        )}
        {result.result === 'already' && (
          <p>This ticket was scanned earlier. Entry already counted once.</p>
        )}
        {result.result === 'cancelled' && (
          <p>The attendee cancelled (refunded). Deny entry and point them to support desk.</p>
        )}
        {result.result === 'invalid' && (
          <p>
            No ticket matches this code on this event. Double-check the reference or use manual
            lookup.
          </p>
        )}
        <p className="font-mono text-[11px] uppercase tracking-wider text-ink/45">
          Validated by the server — a scan alone never authorizes entry.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="mt-5"
        onClick={onReset}
        data-testid="checkin-reset-button"
      >
        Scan next ticket
      </Button>
    </div>
  );
}

export default function ManageHome() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('events');

  // Checkin states
  const [code, setCode] = useState('');
  const [result, setResult] = useState(null);
  const [busyScan, setBusyScan] = useState(false);
  const [history, setHistory] = useState([]);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [checkinSubTab, setCheckinSubTab] = useState('scanner');

  // Task states
  const [taskFilter, setTaskFilter] = useState('all');
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    deadline: '',
    fundraiserId: '',
    volunteerId: '',
  });

  // Queries
  const { data: events = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['events'],
    queryFn: eventsApi.list,
  });

  const { data: attendees = [], isLoading: loadingAttendees } = useQuery({
    queryKey: ['attendees'],
    queryFn: () => checkinApi.attendees(),
  });

  const { data: rawTasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ['volunteer-tasks'],
    queryFn: () => tasksApi.list(),
  });

  const { data: volunteers = [] } = useQuery({
    queryKey: ['volunteers-list'],
    queryFn: () => tasksApi.listVolunteers(),
  });

  const { data: fundraisers = [] } = useQuery({
    queryKey: ['fundraisers'],
    queryFn: () => fundraisersApi.list(),
  });

  // Check-in scan logic
  const handleScan = async (rawCode) => {
    const value = (rawCode ?? code).trim();
    if (!value) return;
    setBusyScan(true);
    try {
      const r = await checkinApi.scan(value);
      setResult({ ...r, code: value });
      if (r.result === 'valid') {
        toast.success(`Checked in: ${r.name}`);
        qc.invalidateQueries({ queryKey: ['attendees'] });
        qc.invalidateQueries({ queryKey: ['events'] });
      } else if (r.result === 'invalid') {
        toast.error('Invalid ticket — entry denied.');
      } else {
        toast(
          r.result === 'already' ? 'Ticket was already used.' : 'Ticket cancelled — entry denied.',
        );
      }
      setHistory((prev) => [
        {
          code: value,
          name: r.name || 'Unknown',
          result: r.result,
          at: new Date().toLocaleTimeString('en-IN'),
        },
        ...prev.slice(0, 7),
      ]);
    } finally {
      setBusyScan(false);
      setCode('');
    }
  };

  const startCamera = async () => {
    try {
      toast.info('Requesting camera… If blocked, use manual lookup with booking reference.');
      const { Html5Qrcode } = await import('html5-qrcode');
      const scanner = new Html5Qrcode('manager-qr-reader');
      await scanner.start({ facingMode: 'environment' }, { fps: 10, qrbox: 220 }, (decoded) => {
        handleScan(decoded);
        scanner.stop().catch(() => {});
      });
    } catch {
      toast.error('Camera unavailable — use manual lookup with booking reference.', {
        description: 'Ensure camera permission is enabled on your device.',
      });
    }
  };

  // Task creation and assignment mutation
  const assignTaskMutation = useMutation({
    mutationFn: async (payload) => {
      // Find or default fundraiserId
      let fId = payload.fundraiserId;
      if (!fId && fundraisers.length > 0) {
        fId = fundraisers[0].id;
      }
      if (!fId) throw new Error('No club project / fundraiser available for task assignment.');

      return tasksApi.createTask(fId, {
        title: payload.title,
        description: payload.description,
        priority: payload.priority,
        deadline: payload.deadline || null,
        userId: payload.volunteerId || undefined,
      });
    },
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: ['volunteer-tasks'] });
      const assignedVol = volunteers.find((v) => v.id === variables.volunteerId);
      toast.success(
        assignedVol
          ? `Task "${variables.title}" assigned to ${assignedVol.name}!`
          : `Task "${variables.title}" created in volunteer queue!`,
      );
      setAssignModalOpen(false);
      setTaskForm({
        title: '',
        description: '',
        priority: 'Medium',
        deadline: '',
        fundraiserId: '',
        volunteerId: '',
      });
    },
    onError: (err) => {
      toast.error(err.friendly || err.message || 'Failed to assign task');
    },
  });

  // Task status update mutation
  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }) => {
      return tasksApi.updateStatus(taskId, status);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['volunteer-tasks'] });
      toast.success('Task status updated');
    },
  });

  if (loadingEvents || loadingTasks) return <DashboardSkeleton />;

  // Filter tasks
  const filteredTasks = rawTasks.filter((t) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'todo') return t.status === 'todo';
    if (taskFilter === 'doing') return t.status === 'doing';
    if (taskFilter === 'done') return t.status === 'done';
    return true;
  });

  // Calculate metrics
  const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
  const totalSold = events.reduce((sum, e) => sum + (e.sold || 0), 0);
  const avgTurnout = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;
  const validScans = history.filter((h) => h.result === 'valid').length;

  return (
    <div className="space-y-6" data-testid="manager-dashboard">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-accent-dark">Event Management & Operations</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            Doors, tasks & execution.
          </h1>
          <p className="mt-2 text-sm text-ink/60">
            Coordinate doors, verify check-ins, and assign task rosters to volunteers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            icon={ScanLine}
            onClick={() => setActiveTab('checkin')}
            data-testid="switch-to-checkin-tab"
          >
            QR Check-in Console
          </Button>
          <Button
            size="sm"
            icon={Plus}
            onClick={() => setAssignModalOpen(true)}
            data-testid="open-assign-task-modal"
          >
            Assign Volunteer Task
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { value: 'events', label: `My Events (${events.length})` },
          { value: 'checkin', label: `QR Check-in & Doors (${attendees.length} Attendees)` },
          { value: 'tasks', label: `Volunteer Tasks (${rawTasks.length})` },
        ]}
        active={activeTab}
        onChange={setActiveTab}
        data-testid="manager-main-tabs"
      />

      {/* TAB 1: MY EVENTS */}
      {activeTab === 'events' && (
        <div className="space-y-6" data-testid="my-events-tab">
          {/* Summary Row */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Assigned events"
              value={events.length}
              sub="active productions"
              icon={CalendarDays}
            />
            <StatCard
              label="Total venue capacity"
              value={totalCapacity.toLocaleString()}
              sub="admissible attendees"
              icon={Users}
            />
            <StatCard
              label="Tickets reserved"
              value={totalSold.toLocaleString()}
              sub="confirmed registrations"
              icon={CheckCircle2}
              tone="accent"
            />
            <StatCard
              label="Registration turnout"
              value={`${avgTurnout}%`}
              sub="capacity filled"
              icon={Sparkles}
            />
          </div>

          {/* Event Cards Grid */}
          <div className="grid gap-6 md:grid-cols-2">
            {events.map((ev) => (
              <div
                key={ev.id}
                className="overflow-hidden rounded-3xl border border-ink/10 bg-paper-card shadow-card transition hover:border-ink/20"
                data-testid={`managed-event-${ev.id}`}
              >
                <div className="relative">
                  <SmartImage
                    src={ev.poster || ev.imageUrl}
                    alt=""
                    className="h-44 w-full object-cover"
                  />
                  <span className="absolute left-3 top-3">
                    <Badge tone="dark">{ev.category || 'Event'}</Badge>
                  </span>
                  <span className="absolute right-3 top-3">
                    <Badge tone={ev.status === 'PUBLISHED' ? 'success' : 'neutral'}>
                      {ev.status || 'Active'}
                    </Badge>
                  </span>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <h2 className="font-display text-2xl font-semibold text-ink leading-snug">
                      {ev.title}
                    </h2>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink/45">
                      {fmtDate(ev.date || ev.startDate)} {ev.time ? `· ${ev.time}` : ''}
                    </p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink/60">
                      <MapPin size={13} className="text-accent-dark" /> {ev.venue || ev.location || 'Campus Center'}
                    </p>
                  </div>

                  {/* Attendance Progress */}
                  <div className="rounded-2xl bg-ink/[0.03] p-4">
                    <div className="flex items-baseline justify-between text-xs font-semibold text-ink/70">
                      <span className="flex items-center gap-1.5">
                        <Users size={13} /> Ticket Capacity & Doors
                      </span>
                      <span className="font-mono">
                        {ev.sold || 0} / {ev.capacity || 200} ({Math.round(((ev.sold || 0) / (ev.capacity || 200)) * 100)}%)
                      </span>
                    </div>
                    <ProgressBar
                      value={ev.sold || 0}
                      max={ev.capacity || 200}
                      className="mt-2"
                    />
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="flex items-center gap-2 pt-1 border-t border-ink/8">
                    <Button
                      size="sm"
                      variant="outline"
                      icon={ScanLine}
                      className="flex-1 text-xs"
                      onClick={() => setActiveTab('checkin')}
                    >
                      Doors & QR Check-in
                    </Button>
                    <Button
                      size="sm"
                      icon={Plus}
                      className="flex-1 text-xs"
                      onClick={() => {
                        setTaskForm((prev) => ({
                          ...prev,
                          fundraiserId: fundraisers[0]?.id || '',
                          title: `Support for ${ev.title}`,
                        }));
                        setAssignModalOpen(true);
                      }}
                    >
                      Assign Volunteers
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: QR CHECK-IN & DOORS CONSOLE (Requirements: QR Check-in, Attendee List, Session Summary, Check-in History, Manual Lookup) */}
      {activeTab === 'checkin' && (
        <div className="space-y-6" data-testid="checkin-tab-view">
          {/* Sub-tabs: Scanner vs Attendee List */}
          <div className="flex items-center justify-between gap-4 border-b border-ink/8 pb-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setCheckinSubTab('scanner')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  checkinSubTab === 'scanner'
                    ? 'bg-ink text-paper'
                    : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                }`}
                data-testid="subtab-scanner"
              >
                QR Scanner & Manual Lookup
              </button>
              <button
                type="button"
                onClick={() => setCheckinSubTab('attendees')}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${
                  checkinSubTab === 'attendees'
                    ? 'bg-ink text-paper'
                    : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                }`}
                data-testid="subtab-attendees"
              >
                Attendee List & Search ({attendees.length})
              </button>
            </div>
            <p className="font-mono text-[11px] text-ink/45">
              Live Session: {validScans} validated scans
            </p>
          </div>

          {checkinSubTab === 'scanner' ? (
            <QrCheckinConsole
              attendees={attendees}
              onCheckinSuccess={() => {
                qc.invalidateQueries({ queryKey: ['manager-attendees'] });
                refetchAttendees();
              }}
              htmlIdPrefix="manage-home"
            />
          ) : (
            /* Attendee List Table */
            <div className="space-y-4">
              <DataTable
                rows={(attendees || []).map((a) => ({
                  ...a,
                  priceLabel: a.type?.includes('Guest') ? 'Guest' : 'Member',
                }))}
                searchKeys={['ref', 'name', 'type', 'status', 'email']}
                pageSize={8}
                rowTestid="attendee-row"
                columns={[
                  {
                    key: 'ref',
                    label: 'Booking Ref',
                    render: (r) => (
                      <span className="font-mono text-xs font-bold text-ink">{r.ref}</span>
                    ),
                  },
                  {
                    key: 'name',
                    label: 'Attendee',
                    render: (r) => (
                      <div>
                        <p className="font-bold text-ink leading-tight">{r.name}</p>
                        <p className="text-[11px] text-ink/45 font-mono">{r.email}</p>
                      </div>
                    ),
                  },
                  { key: 'type', label: 'Ticket Type' },
                  {
                    key: 'status',
                    label: 'Status',
                    render: (r) => <StatusPill status={r.status} />,
                  },
                  {
                    key: 'action',
                    label: 'Action',
                    render: (r) =>
                      r.status === 'confirmed' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          loadingText="Verifying…"
                          flash={false}
                          onClick={() => handleScan(r.ref)}
                          data-testid={`attendee-checkin-${r.ref}`}
                        >
                          Check in
                        </Button>
                      ) : (
                        <span className="font-mono text-[11px] text-ink/40">
                          {r.status === 'checked_in' ? 'Checked in ✓' : '—'}
                        </span>
                      ),
                  },
                ]}
                emptyMessage="No attendees registered for this event yet."
              />
            </div>
          )}
        </div>
      )}

      {/* TAB 3: VOLUNTEER TASKS & ASSIGN TO VOLUNTEER */}
      {activeTab === 'tasks' && (
        <div className="space-y-6" data-testid="volunteer-tasks-tab">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">Volunteer Task Roster</h2>
              <p className="text-xs text-ink/50">
                Assign volunteer shifts, logistics, check-in booths and directional tasks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                icon={Plus}
                onClick={() => setAssignModalOpen(true)}
                data-testid="create-task-button"
              >
                Assign Task to Volunteer
              </Button>
            </div>
          </div>

          {/* Kanban / Status Filters */}
          <div className="flex flex-wrap gap-1.5 border-b border-ink/8 pb-3">
            {[
              { id: 'all', label: `All Tasks (${rawTasks.length})` },
              { id: 'todo', label: `To Do (${rawTasks.filter((t) => t.status === 'todo').length})` },
              { id: 'doing', label: `In Progress (${rawTasks.filter((t) => t.status === 'doing').length})` },
              { id: 'done', label: `Completed (${rawTasks.filter((t) => t.status === 'done').length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTaskFilter(tab.id)}
                className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                  taskFilter === tab.id
                    ? 'bg-ink text-paper font-bold'
                    : 'bg-ink/5 text-ink/65 hover:bg-ink/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tasks Grid */}
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center rounded-3xl border border-dashed border-ink/15 bg-paper-card">
              <ClipboardList size={32} className="mx-auto mb-2 text-ink/20" />
              <p className="text-sm font-semibold text-ink">No tasks match this filter</p>
              <p className="mt-1 text-xs text-ink/50">
                Click &ldquo;Assign Task to Volunteer&rdquo; to create a new task.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col justify-between rounded-2xl border border-ink/10 bg-paper-card p-5 shadow-card transition hover:border-ink/20"
                  data-testid={`task-card-${task.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        tone={
                          task.priority === 'High'
                            ? 'danger'
                            : task.priority === 'Medium'
                              ? 'warning'
                              : 'neutral'
                        }
                      >
                        {task.priority} Priority
                      </Badge>
                      <StatusPill status={task.status} />
                    </div>

                    <div>
                      <h3 className="font-display text-base font-bold text-ink leading-snug">
                        {task.title}
                      </h3>
                      <p className="mt-1 text-xs text-ink/70 leading-relaxed">
                        {task.description || 'Event operation assignment'}
                      </p>
                    </div>

                    <div className="space-y-1 font-mono text-[11px] text-ink/50 border-t border-ink/6 pt-2">
                      <p className="flex items-center gap-1.5">
                        <Building2 size={12} className="text-accent-dark" /> {task.event || task.clubName}
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar size={12} /> Deadline: {fmtDate(task.deadline || task.due)}
                      </p>
                    </div>
                  </div>

                  {/* Assignee Information and Actions */}
                  <div className="mt-4 pt-3 border-t border-ink/8 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-ink/50 font-medium">Assigned to:</span>
                      {task.assigneeName ? (
                        <span className="font-bold text-ink flex items-center gap-1">
                          <UserCheck size={13} className="text-success" />
                          {task.assigneeName}
                        </span>
                      ) : (
                        <span className="text-ink/40 italic">Open / Unassigned</span>
                      )}
                    </div>

                    {/* Status Toggle / Complete Button */}
                    <div className="flex items-center gap-2">
                      {task.status !== 'done' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          icon={Check}
                          className="w-full text-xs"
                          onClick={() =>
                            updateTaskMutation.mutate({ taskId: task.id, status: 'done' })
                          }
                        >
                          Mark Complete
                        </Button>
                      ) : (
                        <div className="w-full py-1 text-center font-mono text-xs font-bold text-success flex items-center justify-center gap-1">
                          <CheckCircle2 size={14} /> Completed
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ASSIGN TASK TO VOLUNTEER MODAL */}
      {assignModalOpen && (
        <Modal
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Task to Volunteer"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!taskForm.title.trim()) {
                toast.error('Please enter a task title');
                return;
              }
              assignTaskMutation.mutate(taskForm);
            }}
            className="space-y-4"
          >
            <Field label="Event / Project *" htmlFor="task-event">
              <Select
                id="task-event"
                value={taskForm.fundraiserId}
                onChange={(e) =>
                  setTaskForm((prev) => ({ ...prev, fundraiserId: e.target.value }))
                }
              >
                <option value="">Select event project…</option>
                {fundraisers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.title} ({f.club?.name || 'Club'})
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Task Title *" htmlFor="task-title">
              <Input
                id="task-title"
                value={taskForm.title}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g. Check-in table scanner operator or Badge distribution"
                data-testid="task-title-input"
              />
            </Field>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Priority" htmlFor="task-priority">
                <Select
                  id="task-priority"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, priority: e.target.value }))}
                >
                  <option value="High">High Priority</option>
                  <option value="Medium">Medium Priority</option>
                  <option value="Low">Low Priority</option>
                </Select>
              </Field>

              <Field label="Deadline" htmlFor="task-deadline">
                <Input
                  id="task-deadline"
                  type="date"
                  value={taskForm.deadline}
                  onChange={(e) => setTaskForm((prev) => ({ ...prev, deadline: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Task Instructions / Description" htmlFor="task-desc">
              <Textarea
                id="task-desc"
                value={taskForm.description}
                onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Specific operational instructions for the volunteer on the event floor…"
                rows={3}
              />
            </Field>

            <Field label="Assign To Volunteer *" htmlFor="task-volunteer">
              <Select
                id="task-volunteer"
                value={taskForm.volunteerId}
                onChange={(e) =>
                  setTaskForm((prev) => ({ ...prev, volunteerId: e.target.value }))
                }
                data-testid="task-volunteer-select"
              >
                <option value="">Select volunteer…</option>
                {volunteers.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name} ({v.email}) · {v.assignedCount} active task(s)
                  </option>
                ))}
              </Select>
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => setAssignModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                loading={assignTaskMutation.isPending}
                icon={Send}
                data-testid="submit-assign-task"
              >
                Assign & Notify Volunteer
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
