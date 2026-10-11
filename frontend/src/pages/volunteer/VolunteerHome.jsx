import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  CheckCircle2,
  Circle,
  Loader,
  ReceiptIndianRupee,
  Upload,
  Calendar,
  AlertTriangle,
  Play,
  RotateCcw,
  ListTodo,
  Building2,
  FileText,
  ShieldCheck,
  ExternalLink,
  Clock,
  ScanLine,
} from 'lucide-react';
import { tasksApi } from '@/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Field, Input, Textarea, Select } from '@/components/ui/Field';
import { Badge, StatusPill, Tabs, DashboardSkeleton } from '@/components/ui/primitives';
import Pagination from '@/components/ui/Pagination';
import { inr, fmtDate } from '@/lib/format';

function isTaskOverdue(task) {
  if (task.status === 'done') return false;
  const deadline = task.due || task.deadline;
  if (!deadline) return false;
  return new Date(deadline).getTime() < Date.now();
}

function ExpenseModal({ open, onClose, tasks }) {
  const qc = useQueryClient();
  const [taskId, setTaskId] = useState(tasks[0]?.id || '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!amount || Number(amount) <= 0) {
      toast.error('Enter the amount you spent.');
      return;
    }
    setBusy(true);
    try {
      await tasksApi.submitExpense({
        taskId,
        amount: Number(amount),
        note,
        receiptUrl: receipt || 'receipt_sample.pdf',
      });
      toast.success(`Expense of ${inr(Number(amount))} submitted for reimbursement.`);
      qc.invalidateQueries({ queryKey: ['tasks'] });
      qc.invalidateQueries({ queryKey: ['my-expenses'] });
      onClose();
    } catch {
      toast.error('Failed to submit expense claim');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Submit expense" testid="expense-modal">
      <div className="space-y-4">
        <Field label="Task" htmlFor="ex-task">
          <Select
            id="ex-task"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
            data-testid="expense-task-select"
          >
            {tasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title} ({t.clubName || t.event})
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label="Amount spent (₹)"
          htmlFor="ex-amount"
          error={amount && Number(amount) <= 0 ? 'Must be more than zero' : ''}
        >
          <Input
            id="ex-amount"
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="612"
            data-testid="expense-amount-input"
          />
        </Field>
        <Field label="What was it for?" htmlFor="ex-note">
          <Textarea
            id="ex-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Bought packaging tape, badges and boxes at the wholesale store"
            data-testid="expense-note-input"
          />
        </Field>
        <Field label="Receipt" htmlFor="ex-receipt" hint="photo or pdf">
          <label className="flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-ink/25 bg-white px-4 py-3 text-sm text-ink/60 transition hover:border-accent">
            <span className="flex items-center gap-2 truncate">
              <Upload size={15} /> {receipt || 'Upload receipt'}
            </span>
            <input
              id="ex-receipt"
              type="file"
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => setReceipt(e.target.files?.[0]?.name || 'receipt.pdf')}
              data-testid="expense-receipt-input"
            />
            <Badge tone="accent">Browse</Badge>
          </label>
        </Field>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            loading={busy}
            loadingText="Submitting…"
            flash={false}
            data-testid="expense-submit-button"
          >
            Submit for reimbursement
          </Button>
        </div>
      </div>
    </Modal>
  );
}

const COLUMNS = [
  { key: 'todo', label: 'To do', icon: Circle },
  { key: 'doing', label: 'In progress', icon: Loader },
  { key: 'done', label: 'Done', icon: CheckCircle2 },
];

export default function VolunteerHome() {
  const qc = useQueryClient();
  const { data = [], isLoading } = useQuery({ queryKey: ['tasks'], queryFn: tasksApi.list });
  const { data: myExpenses = [], isLoading: loadingExpenses } = useQuery({
    queryKey: ['my-expenses'],
    queryFn: tasksApi.getMyExpenses,
  });

  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [actionTaskId, setActionTaskId] = useState(null);
  const [expPage, setExpPage] = useState(1);
  const [expPageSize, setExpPageSize] = useState(5);

  const totalExpPages = Math.max(1, Math.ceil(myExpenses.length / expPageSize));
  const safeExpPage = Math.min(expPage, totalExpPages);
  const paginatedExpenses = myExpenses.slice((safeExpPage - 1) * expPageSize, safeExpPage * expPageSize);

  if (isLoading) return <DashboardSkeleton />;

  // Real summary counts from backend
  const assignedCount = data.length;
  const inProgressCount = data.filter((t) => t.status === 'doing').length;
  const completedCount = data.filter((t) => t.status === 'done').length;
  const overdueCount = data.filter((t) => isTaskOverdue(t)).length;

  const handleStart = async (t) => {
    setActionTaskId(t.id);
    try {
      await tasksApi.start(t.id);
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`"${t.title}" started. Moved to in-progress!`);
    } catch {
      toast.error('Could not update task status');
    } finally {
      setActionTaskId(null);
    }
  };

  const handleComplete = async (t) => {
    setActionTaskId(t.id);
    try {
      await tasksApi.complete(t.id);
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`"${t.title}" marked done. Great work!`);
    } catch {
      toast.error('Could not complete task');
    } finally {
      setActionTaskId(null);
    }
  };

  const handleReopen = async (t) => {
    setActionTaskId(t.id);
    try {
      await tasksApi.reopen(t.id);
      await qc.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`"${t.title}" reopened into in-progress.`);
    } catch {
      toast.error('Could not reopen task');
    } finally {
      setActionTaskId(null);
    }
  };

  const visible =
    filter === 'all'
      ? data
      : filter === 'overdue'
        ? data.filter((t) => isTaskOverdue(t))
        : data.filter((t) => t.status === filter);

  return (
    <div className="space-y-6" data-testid="volunteer-dashboard">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-accent-dark">Volunteering</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            Your tasks.
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link to="/manage/checkin">
            <Button
              size="sm"
              variant="outline"
              icon={ScanLine}
              data-testid="volunteer-open-checkin"
            >
              Laptop QR Scanner
            </Button>
          </Link>
          <Button
            size="sm"
            icon={ReceiptIndianRupee}
            onClick={() => setModal(true)}
            data-testid="open-expense-modal"
          >
            Submit an expense
          </Button>
        </div>
      </div>

      {/* Summary Row (Requirement 3: Assigned, In-progress, Completed, Overdue counts from backend) */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4" data-testid="volunteer-summary-row">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            filter === 'all'
              ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
              : 'border-ink/10 bg-paper-card hover:border-ink/20'
          }`}
          data-testid="summary-card-assigned"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-ink/60">Assigned Tasks</span>
            <ListTodo size={16} className="text-accent" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
            {assignedCount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink/40">Total across clubs</p>
        </button>

        <button
          type="button"
          onClick={() => setFilter('doing')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            filter === 'doing'
              ? 'border-warning bg-warning/5 ring-1 ring-warning/30'
              : 'border-ink/10 bg-paper-card hover:border-ink/20'
          }`}
          data-testid="summary-card-in-progress"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-ink/60">In Progress</span>
            <Loader size={16} className="text-warning animate-spin-slow" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
            {inProgressCount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink/40">Active ongoing work</p>
        </button>

        <button
          type="button"
          onClick={() => setFilter('done')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            filter === 'done'
              ? 'border-success bg-success/5 ring-1 ring-success/30'
              : 'border-ink/10 bg-paper-card hover:border-ink/20'
          }`}
          data-testid="summary-card-completed"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-ink/60">Completed</span>
            <CheckCircle2 size={16} className="text-success" />
          </div>
          <p className="mt-3 font-display text-3xl font-bold tracking-tight text-ink">
            {completedCount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink/40">Finished tasks</p>
        </button>

        <button
          type="button"
          onClick={() => setFilter('overdue')}
          className={`flex flex-col justify-between rounded-2xl border p-4 text-left transition ${
            filter === 'overdue'
              ? 'border-danger bg-danger/5 ring-1 ring-danger/30'
              : 'border-ink/10 bg-paper-card hover:border-ink/20'
          }`}
          data-testid="summary-card-overdue"
        >
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-ink/60">Overdue Tasks</span>
            <AlertTriangle
              size={16}
              className={overdueCount > 0 ? 'text-danger' : 'text-ink/30'}
            />
          </div>
          <p
            className={`mt-3 font-display text-3xl font-bold tracking-tight ${
              overdueCount > 0 ? 'text-danger' : 'text-ink'
            }`}
          >
            {overdueCount}
          </p>
          <p className="mt-1 font-mono text-[11px] text-ink/40">Past scheduled deadline</p>
        </button>
      </div>

      {/* Task Filter Tabs */}
      <Tabs
        tabs={[
          { value: 'all', label: `All (${assignedCount})` },
          { value: 'todo', label: `To do (${data.filter((t) => t.status === 'todo').length})` },
          { value: 'doing', label: `In progress (${inProgressCount})` },
          { value: 'done', label: `Done (${completedCount})` },
          { value: 'overdue', label: `Overdue (${overdueCount})` },
        ]}
        active={filter}
        onChange={setFilter}
        data-testid="task-filter-tabs"
      />

      {/* Task Board Columns (Requirement 2: Task cards with title, club/event, deadline, priority, description, status) */}
      <div className="grid gap-4 md:grid-cols-3" data-testid="task-board">
        {COLUMNS.map((col) => {
          const items = visible.filter((t) => t.status === col.key);
          return (
            <div
              key={col.key}
              className="flex flex-col rounded-3xl border border-ink/10 bg-paper-deep/60 p-4"
              data-testid={`task-column-${col.key}`}
            >
              <div className="flex items-center justify-between px-2 pb-3">
                <p className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink/55">
                  <col.icon size={13} /> {col.label}
                </p>
                <Badge>{items.length}</Badge>
              </div>

              <div className="space-y-3">
                {items.map((t) => {
                  const overdue = isTaskOverdue(t);
                  return (
                    <div
                      key={t.id}
                      className="group relative flex flex-col justify-between rounded-2xl border border-ink/10 bg-paper-card p-4 shadow-card transition hover:border-ink/20 hover:shadow-lift"
                      data-testid={`task-card-${t.id}`}
                    >
                      {/* Top row: Club/Event & Priority Badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-dark">
                          <Building2 size={13} className="shrink-0 text-accent/70" />
                          <span className="truncate">{t.clubName || 'Student Club'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {overdue && <Badge tone="danger">Overdue</Badge>}
                          <Badge
                            tone={
                              t.priority === 'High'
                                ? 'danger'
                                : t.priority === 'Medium'
                                  ? 'warning'
                                  : 'neutral'
                            }
                          >
                            {t.priority}
                          </Badge>
                        </div>
                      </div>

                      {/* Event / Campaign Tag */}
                      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-ink/45 truncate">
                        {t.event}
                      </p>

                      {/* Task Title */}
                      <h3
                        className={`mt-2 text-sm font-bold leading-snug ${
                          t.status === 'done' ? 'text-ink/45 line-through' : 'text-ink'
                        }`}
                      >
                        {t.title}
                      </h3>

                      {/* Description */}
                      {t.description && (
                        <p className="mt-1.5 text-xs leading-relaxed text-ink/65 line-clamp-3">
                          {t.description}
                        </p>
                      )}

                      {/* Deadline & Current Status pill */}
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-ink/8 pt-2.5">
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Calendar
                            size={12}
                            className={overdue ? 'text-danger' : 'text-ink/40'}
                          />
                          <span
                            className={`font-mono text-[11px] ${
                              overdue ? 'font-bold text-danger' : 'text-ink/50'
                            }`}
                          >
                            due {fmtDate(t.due)}
                          </span>
                        </div>
                        <StatusPill status={t.status} />
                      </div>

                      {/* Action buttons based on status */}
                      <div className="mt-3 flex items-center gap-2">
                        {t.status === 'todo' && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-1/2 border border-ink/10 text-xs"
                              loading={actionTaskId === t.id}
                              onClick={() => handleStart(t)}
                              icon={Play}
                              data-testid={`task-start-${t.id}`}
                            >
                              Start
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-1/2 text-xs"
                              loading={actionTaskId === t.id}
                              onClick={() => handleComplete(t)}
                              icon={CheckCircle2}
                              data-testid={`task-complete-${t.id}`}
                            >
                              Complete
                            </Button>
                          </>
                        )}

                        {t.status === 'doing' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full text-xs"
                            loading={actionTaskId === t.id}
                            onClick={() => handleComplete(t)}
                            icon={CheckCircle2}
                            data-testid={`task-complete-${t.id}`}
                          >
                            Mark complete
                          </Button>
                        )}

                        {t.status === 'done' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="w-full border border-ink/10 text-xs text-ink/60 hover:text-ink"
                            loading={actionTaskId === t.id}
                            onClick={() => handleReopen(t)}
                            icon={RotateCcw}
                            data-testid={`task-reopen-${t.id}`}
                          >
                            Reopen task
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ink/15 py-10 px-4 text-center">
                    <p className="text-xs font-medium text-ink/40">No tasks in this column.</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Reimbursement Information & Self Status (Requirement 1 & 5: restricted finance access) */}
      <Card className="p-6 space-y-4" data-testid="expense-note-card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <ReceiptIndianRupee size={18} className="text-accent" />
              <h2 className="font-display text-base font-bold text-ink">
                Reimbursements, minus the chasing.
              </h2>
            </div>
            <p className="mt-1 text-sm text-ink/65">
              Upload the receipt when you submit — the treasurer approves it and the payment lands
              with the next batch. You can monitor your submitted claims below. Private club financial
              ledgers and approvals remain restricted to authorized club treasurers.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-ink/5 px-3 py-2 text-xs font-medium text-ink/70">
            <ShieldCheck size={16} className="text-accent-dark" />
            <span>Finance Access: Member Claims Only</span>
          </div>
        </div>

        {/* Volunteer's submitted reimbursement claims */}
        <div className="border-t border-ink/8 pt-4">
          <div className="flex items-center justify-between pb-3">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink/50">
              Your Submitted Claims ({myExpenses.length})
            </p>
            <Button
              size="sm"
              variant="ghost"
              className="text-xs text-accent-dark"
              onClick={() => setModal(true)}
            >
              + New Claim
            </Button>
          </div>

          {loadingExpenses ? (
            <p className="py-4 text-xs text-ink/40">Loading claims…</p>
          ) : myExpenses.length === 0 ? (
            <p className="py-4 text-xs text-ink/40">
              No reimbursement claims submitted yet. Use "Submit an expense" above to file a claim.
            </p>
          ) : (
            <>
              <div className="space-y-2.5" data-testid="volunteer-expenses-list">
                {paginatedExpenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink/8 bg-paper p-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <p className="font-semibold text-ink">{exp.description}</p>
                      <p className="font-mono text-[11px] text-ink/40">
                        Submitted {fmtDate(exp.createdAt)}
                      </p>
                      {exp.rejectionReason && (
                        <p className="text-[11px] text-danger font-medium">
                          Reason: {exp.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm font-bold text-ink">
                        {inr(exp.amountInPaise / 100)}
                      </span>
                      <StatusPill status={exp.status} />
                    </div>
                  </div>
                ))}
              </div>

              {myExpenses.length > expPageSize && (
                <div className="mt-3 border-t border-ink/8 pt-2">
                  <Pagination
                    currentPage={safeExpPage}
                    totalPages={totalExpPages}
                    totalItems={myExpenses.length}
                    pageSize={expPageSize}
                    onPageChange={setExpPage}
                    summaryLabel="claims"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      <ExpenseModal open={modal} onClose={() => setModal(false)} tasks={data} />
    </div>
  );
}
