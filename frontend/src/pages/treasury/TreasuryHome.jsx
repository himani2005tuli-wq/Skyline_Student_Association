import { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  Wallet,
  Landmark,
  Info,
  Check,
  X,
  Download,
  Filter,
  Eye,
  Calendar,
  Building2,
  FileText,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  Ban,
  ShieldCheck,
} from 'lucide-react';
import { financeApi, clubsApi } from '@/api';
import { Card, StatCard } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import Modal from '@/components/ui/Modal';
import { Field, Input, Select, Textarea } from '@/components/ui/Field';
import { Badge, StatusPill, Tabs, DashboardSkeleton } from '@/components/ui/primitives';
import { inr, fmtDate } from '@/lib/format';

function exportLedgerToCsv(transactions) {
  const headers = [
    'Transaction ID',
    'Date',
    'Description',
    'Category',
    'Club',
    'Direction',
    'Amount (INR)',
    'Payment Method',
  ];
  const rows = transactions.map((t) => [
    `"${t.id || ''}"`,
    `"${fmtDate(t.date)}"`,
    `"${(t.description || '').replace(/"/g, '""')}"`,
    `"${t.category || ''}"`,
    `"${t.clubName || 'General Association'}"`,
    `"${t.dir === 'in' ? 'Receipt (+)' : 'Payment (-)'}"`,
    `"${t.amount}"`,
    `"${t.method || 'UPI / NetBanking'}"`,
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,' +
    [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute(
    'download',
    `skyline_treasury_ledger_${new Date().toISOString().slice(0, 10)}.csv`,
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function TreasuryHome() {
  const qc = useQueryClient();

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedClub, setSelectedClub] = useState('ALL');
  const [selectedDirection, setSelectedDirection] = useState('ALL');
  const [datePreset, setDatePreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Queue state
  const [reimTab, setReimTab] = useState('submitted');

  // Modals state
  const [inspectModal, setInspectModal] = useState({ open: false, claim: null });
  const [rejectModal, setRejectModal] = useState({ open: false, claim: null, reason: '' });
  const [busyActionId, setBusyActionId] = useState(null);

  // Queries
  const { data: clubs = [] } = useQuery({
    queryKey: ['clubs'],
    queryFn: clubsApi.list,
  });

  const { data: sum, isLoading: loadingSummary } = useQuery({
    queryKey: ['finance-summary', selectedClub],
    queryFn: () => financeApi.summary({ clubId: selectedClub === 'ALL' ? undefined : selectedClub }),
  });

  const { data: rawLedger = [], isLoading: loadingLedger } = useQuery({
    queryKey: ['finance-ledger', selectedClub, selectedCategory, startDate, endDate, selectedDirection],
    queryFn: () =>
      financeApi.ledger({
        clubId: selectedClub === 'ALL' ? undefined : selectedClub,
        category: selectedCategory === 'All' ? undefined : selectedCategory.toUpperCase().replace(/ /g, '_'),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        direction: selectedDirection === 'ALL' ? undefined : selectedDirection,
      }),
  });

  const { data: allReims = [], isLoading: loadingReims } = useQuery({
    queryKey: ['reimbursements'],
    queryFn: () => financeApi.reimbursements(),
  });

  // Calculate live date ranges based on preset
  const handleDatePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === '30days') {
      const past = new Date(now.getTime() - 30 * 86400000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    } else if (preset === '90days') {
      const past = new Date(now.getTime() - 90 * 86400000);
      setStartDate(past.toISOString().slice(0, 10));
      setEndDate(now.toISOString().slice(0, 10));
    }
  };

  // Approval actions
  const handleApprove = async (claim) => {
    setBusyActionId(claim.id);
    try {
      await financeApi.approveReimbursement(claim.id, 'Approved by Treasurer');
      await qc.invalidateQueries({ queryKey: ['reimbursements'] });
      await qc.invalidateQueries({ queryKey: ['finance-summary'] });
      await qc.invalidateQueries({ queryKey: ['finance-ledger'] });
      toast.success(`Claim for ${inr(claim.amount)} approved. Ready for payment disbursement!`);
    } catch {
      toast.error('Failed to approve reimbursement');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleOpenReject = (claim) => {
    setRejectModal({
      open: true,
      claim,
      reason: '',
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.reason.trim()) {
      toast.error('Please enter a rejection reason for the volunteer.');
      return;
    }
    const claim = rejectModal.claim;
    setBusyActionId(claim.id);
    try {
      await financeApi.rejectReimbursement(claim.id, rejectModal.reason.trim());
      await qc.invalidateQueries({ queryKey: ['reimbursements'] });
      await qc.invalidateQueries({ queryKey: ['finance-summary'] });
      await qc.invalidateQueries({ queryKey: ['finance-ledger'] });
      toast.success(`Claim rejected with feedback sent to ${claim.volunteer}.`);
      setRejectModal({ open: false, claim: null, reason: '' });
    } catch {
      toast.error('Failed to record rejection');
    } finally {
      setBusyActionId(null);
    }
  };

  const handleDisbursePayment = async (claim) => {
    setBusyActionId(claim.id);
    try {
      await financeApi.disburseReimbursement(claim.id);
      await qc.invalidateQueries({ queryKey: ['reimbursements'] });
      await qc.invalidateQueries({ queryKey: ['finance-summary'] });
      await qc.invalidateQueries({ queryKey: ['finance-ledger'] });
      toast.success(`Payment of ${inr(claim.amount)} recorded as PAID in ledger.`);
    } catch {
      toast.error('Failed to record reimbursement payout');
    } finally {
      setBusyActionId(null);
    }
  };

  if (loadingSummary || !sum) return <DashboardSkeleton />;

  // Filtered transactions for the ledger table
  const filteredTransactions = (rawLedger || []).filter((tx) => {
    if (selectedCategory !== 'All' && tx.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchDesc = (tx.description || '').toLowerCase().includes(q);
      const matchCat = (tx.category || '').toLowerCase().includes(q);
      const matchClub = (tx.clubName || '').toLowerCase().includes(q);
      if (!matchDesc && !matchCat && !matchClub) return false;
    }
    return true;
  });

  const categories = ['All', ...new Set((rawLedger || []).map((x) => x.category))];

  // Exact figures from backend:
  // opening: ₹4,80,000, total receipts, total payments (expenses + paid reimbursements), closing balance
  const openingBalance = sum.openingBalance;
  const totalIn = sum.totalIn;
  const totalOut = sum.totalOut;
  const closingBalance = sum.closingBalance;
  const pendingReimbursements = sum.pendingReimbursements;

  // Reimbursement claims counts and tabs
  const submittedClaims = allReims.filter((r) => r.status === 'submitted');
  const approvedClaims = allReims.filter((r) => r.status === 'approved');
  const paidClaims = allReims.filter((r) => r.status === 'paid');
  const rejectedClaims = allReims.filter((r) => r.status === 'rejected');

  const visibleReims =
    reimTab === 'submitted'
      ? submittedClaims
      : reimTab === 'approved'
        ? approvedClaims
        : reimTab === 'paid'
          ? paidClaims
          : reimTab === 'rejected'
            ? rejectedClaims
            : allReims;

  return (
    <div className="space-y-6" data-testid="treasury-dashboard">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-accent-dark">Treasury & Accounts</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            The money, in daylight.
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full border border-ink/10 bg-paper-card px-3 py-1.5 text-xs font-semibold text-ink/70">
            <ShieldCheck size={14} className="text-accent-dark" />
            <span>Authorized Treasurer Console</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            icon={Download}
            onClick={() => exportLedgerToCsv(filteredTransactions)}
            data-testid="export-ledger-button"
          >
            Export Ledger
          </Button>
        </div>
      </div>

      {/* Top 4 Stat Cards (Requirement 1 & 2: Real consistent figures, pending claims NOT mixed into cash balance) */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total receipts"
          value={inr(totalIn)}
          sub="cash actually received"
          icon={ArrowDownCircle}
          testid="stat-receipts"
        />
        <StatCard
          label="Total payments"
          value={inr(totalOut)}
          sub="paid expenses + disbursed claims"
          icon={ArrowUpCircle}
          testid="stat-payments"
        />
        <StatCard
          label="Closing balance"
          value={inr(closingBalance)}
          sub={`opening ${inr(openingBalance)}`}
          icon={Landmark}
          tone="accent"
          testid="stat-closing-balance"
        />
        <StatCard
          label="Pending reimbursements"
          value={inr(pendingReimbursements)}
          sub={`${submittedClaims.length} awaiting your review`}
          icon={Wallet}
          testid="stat-pending-reimbursements"
        />
      </div>

      {/* Revenue Category Breakdown (Requirement 1: Detailed income categories and refunds) */}
      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6" data-testid="revenue-breakdown">
        {[
          { l: 'Membership dues', v: sum.dues || 0 },
          { l: 'Ticket revenue', v: sum.ticketRevenue || 0 },
          { l: 'Merch revenue', v: sum.merchRevenue || 0 },
          { l: 'Fundraiser income', v: sum.fundraiserIncome || 0 },
          { l: 'Reimbursements paid', v: sum.reimbursementsPaid || 0 },
          { l: 'Refunds', v: sum.refunds || 0 },
        ].map((x) => (
          <div
            key={x.l}
            className="rounded-2xl border border-ink/10 bg-paper-card p-4 transition hover:border-ink/20"
            data-testid={`treasury-breakdown-${x.l.toLowerCase().replace(/ /g, '-')}`}
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">{x.l}</p>
            <p className="mt-2 font-mono text-lg font-bold text-ink">{inr(x.v)}</p>
          </div>
        ))}
      </div>

      {/* Loyalty points explanation banner */}
      <div
        className="flex items-start gap-3 rounded-2xl bg-info-soft px-5 py-4 text-sm font-medium text-info"
        data-testid="points-not-cash-note"
      >
        <Info size={16} className="mt-0.5 shrink-0" />
        Loyalty points redeemed at checkout are NOT cash revenue — only the net payment the club
        actually receives enters this ledger. Member discounts reduce recorded revenue to the amount
        collected.
      </div>

      {/* Main Grid: Ledger on Left (8 cols), Reimbursement Queue & Approvals on Right (4 cols) */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Ledger Section with Date, Club, Category Filters & Export (Requirement 5) */}
        <div className="space-y-4 lg:col-span-8" data-testid="ledger-section">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-2xl font-semibold text-ink">Ledger</h2>
              <p className="text-xs text-ink/50">
                Filtered: {filteredTransactions.length} of {rawLedger.length} entries
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="ghost"
                className="text-xs"
                onClick={() => {
                  setSelectedCategory('All');
                  setSelectedClub('ALL');
                  setSelectedDirection('ALL');
                  handleDatePresetChange('all');
                  setSearchQuery('');
                }}
              >
                Reset Filters
              </Button>
              <Button
                size="sm"
                variant="outline"
                icon={Download}
                onClick={() => exportLedgerToCsv(filteredTransactions)}
              >
                Export CSV
              </Button>
            </div>
          </div>

          {/* Ledger Filter Controls Bar */}
          <div className="rounded-2xl border border-ink/10 bg-paper-card p-4 space-y-3">
            <div className="grid gap-3 sm:grid-cols-3">
              {/* Search Bar */}
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 pointer-events-none"
                />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search description, reference…"
                  className="pl-8 text-xs"
                  data-testid="ledger-search-input"
                />
              </div>

              {/* Club Filter */}
              <div>
                <Select
                  value={selectedClub}
                  onChange={(e) => setSelectedClub(e.target.value)}
                  className="text-xs"
                  data-testid="ledger-club-filter"
                >
                  <option value="ALL">All Clubs & Chapter Accounts</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Direction Filter */}
              <div>
                <Select
                  value={selectedDirection}
                  onChange={(e) => setSelectedDirection(e.target.value)}
                  className="text-xs"
                  data-testid="ledger-direction-filter"
                >
                  <option value="ALL">All Directions (In & Out)</option>
                  <option value="in">Receipts Only (+ Inflows)</option>
                  <option value="out">Payments Only (− Outflows)</option>
                </Select>
              </div>
            </div>

            {/* Date Range Presets & Custom Pickers */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ink/8 pt-3">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-mono text-[10px] uppercase font-bold text-ink/45 mr-1">
                  Date Range:
                </span>
                {[
                  { id: 'all', label: 'All Time' },
                  { id: 'month', label: 'This Month' },
                  { id: '30days', label: 'Last 30 Days' },
                  { id: '90days', label: 'Last 90 Days' },
                  { id: 'custom', label: 'Custom' },
                ].map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleDatePresetChange(preset.id)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[11px] font-semibold transition ${
                      datePreset === preset.id
                        ? 'bg-ink text-paper'
                        : 'bg-ink/5 text-ink/60 hover:bg-ink/10'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                  <span className="text-xs text-ink/40">to</span>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8 text-xs w-36"
                  />
                </div>
              )}
            </div>

            {/* Category Pills Bar */}
            <div className="flex flex-wrap gap-1.5 border-t border-ink/8 pt-3">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setSelectedCategory(c)}
                  data-testid={`ledger-filter-${c.toLowerCase().replace(/ /g, '-')}`}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    selectedCategory === c
                      ? 'border-ink bg-ink text-paper shadow-xs'
                      : 'border-ink/10 bg-white text-ink/65 hover:border-ink/20'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* DataTable */}
          {loadingLedger ? (
            <div className="h-96 rounded-3xl skeleton-shimmer bg-ink/5" />
          ) : (
            <DataTable
              rows={filteredTransactions.map((x) => ({
                ...x,
                dateLabel: fmtDate(x.date),
                amountLabel: `${x.dir === 'in' ? '+' : '−'}${inr(x.amount)}`,
              }))}
              searchKeys={['description', 'category', 'method', 'clubName']}
              pageSize={9}
              rowTestid="ledger-row"
              columns={[
                { key: 'dateLabel', label: 'Date', width: '120px' },
                {
                  key: 'description',
                  label: 'Transaction',
                  render: (r) => (
                    <div>
                      <p className="font-semibold text-ink leading-snug">{r.description}</p>
                      <p className="mt-0.5 text-xs text-ink/50 flex items-center gap-1.5">
                        <span className="font-medium text-accent-dark">{r.clubName}</span>
                        <span>·</span>
                        <span>{r.method}</span>
                      </p>
                    </div>
                  ),
                },
                {
                  key: 'category',
                  label: 'Category',
                  render: (r) => (
                    <Badge tone={r.dir === 'in' ? 'success' : 'neutral'}>{r.category}</Badge>
                  ),
                },
                {
                  key: 'amountLabel',
                  label: 'Amount',
                  render: (r) => (
                    <span
                      className={`font-mono text-sm font-bold ${
                        r.dir === 'in' ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {r.amountLabel}
                    </span>
                  ),
                },
              ]}
              emptyMessage="No ledger transactions match your criteria."
            />
          )}
        </div>

        {/* Reimbursement Approvals Queue & Actions (Requirement 3 & 4) */}
        <div className="space-y-6 lg:col-span-4" data-testid="reimbursement-approvals">
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">Reimbursements</h2>
                <p className="text-xs text-ink/50">
                  {submittedClaims.length} awaiting review · {approvedClaims.length} ready to pay
                </p>
              </div>
              <Badge tone={submittedClaims.length > 0 ? 'warning' : 'neutral'}>
                {submittedClaims.length} pending
              </Badge>
            </div>

            {/* Queue Sub-Tabs */}
            <div className="flex flex-wrap gap-1 border-b border-ink/8 pb-2">
              {[
                { id: 'submitted', label: `Pending (${submittedClaims.length})` },
                { id: 'approved', label: `Approved (${approvedClaims.length})` },
                { id: 'paid', label: `Paid (${paidClaims.length})` },
                { id: 'rejected', label: `Rejected (${rejectedClaims.length})` },
                { id: 'all', label: `All (${allReims.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setReimTab(tab.id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                    reimTab === tab.id
                      ? 'bg-ink text-paper font-bold'
                      : 'text-ink/60 hover:bg-ink/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* List of Claims */}
            <div className="space-y-3">
              {loadingReims ? (
                <p className="py-6 text-center text-xs text-ink/40">Loading claims…</p>
              ) : visibleReims.length === 0 ? (
                <div className="py-10 text-center">
                  <CheckCircle2 size={24} className="mx-auto mb-2 text-ink/20" />
                  <p className="text-xs text-ink/50">
                    {reimTab === 'submitted'
                      ? 'Queue clear. Every submission has been reviewed.'
                      : 'No claims in this tab.'}
                  </p>
                </div>
              ) : (
                visibleReims.map((r) => (
                  <div
                    key={r.id}
                    className="rounded-2xl border border-ink/10 bg-white p-4 shadow-card transition hover:border-ink/20"
                    data-testid={`reimbursement-${r.id}`}
                  >
                    {/* Header: Volunteer, Club, Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-ink">{r.volunteer}</p>
                        <p className="text-[11px] text-ink/50 font-mono truncate max-w-[180px]">
                          {r.email || r.clubName}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-mono text-base font-bold text-ink">{inr(r.amount)}</span>
                        <div>
                          <StatusPill status={r.status} />
                        </div>
                      </div>
                    </div>

                    {/* Task Description */}
                    <p className="mt-2 text-xs text-ink/75 leading-relaxed">{r.task}</p>

                    {/* Date and Receipt Preview Button */}
                    <div className="mt-2.5 flex items-center justify-between text-[11px] border-t border-ink/6 pt-2">
                      <span className="font-mono text-ink/40">{fmtDate(r.submitted)}</span>
                      {r.receipt && (
                        <button
                          type="button"
                          onClick={() => setInspectModal({ open: true, claim: r })}
                          className="flex items-center gap-1 font-semibold text-accent-dark hover:underline"
                        >
                          <Eye size={12} /> Inspect receipt
                        </button>
                      )}
                    </div>

                    {/* Rejection Reason display if rejected */}
                    {r.status === 'rejected' && r.rejectionReason && (
                      <div className="mt-2.5 rounded-xl bg-danger-soft p-2.5 text-xs text-danger">
                        <p className="font-semibold flex items-center gap-1">
                          <AlertCircle size={12} /> Rejection Reason:
                        </p>
                        <p className="mt-0.5 leading-snug">{r.rejectionReason}</p>
                      </div>
                    )}

                    {/* Action buttons (Requirement 4: approve, reject with reason, record reimbursement payment) */}
                    {r.status === 'submitted' && (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          icon={Check}
                          className="flex-1 text-xs"
                          loading={busyActionId === r.id}
                          onClick={() => handleApprove(r)}
                          data-testid={`approve-reimbursement-${r.id}`}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          icon={X}
                          className="flex-1 text-xs"
                          loading={busyActionId === r.id}
                          onClick={() => handleOpenReject(r)}
                          data-testid={`reject-reimbursement-${r.id}`}
                        >
                          Reject
                        </Button>
                      </div>
                    )}

                    {r.status === 'approved' && (
                      <div className="mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          icon={CreditCard}
                          className="w-full text-xs font-bold text-accent-dark border-accent/30 hover:bg-accent/5"
                          loading={busyActionId === r.id}
                          onClick={() => handleDisbursePayment(r)}
                          data-testid={`disburse-reimbursement-${r.id}`}
                        >
                          Record Payment (Disburse {inr(r.amount)})
                        </Button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Inspect Receipt Modal */}
      {inspectModal.open && inspectModal.claim && (
        <Modal
          open={inspectModal.open}
          onClose={() => setInspectModal({ open: false, claim: null })}
          title={`Receipt: ${inspectModal.claim.task}`}
        >
          <div className="space-y-4">
            <div className="rounded-2xl border border-ink/10 bg-paper-deep/40 p-4 space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-ink/60">Submitted by:</span>
                <span className="font-bold text-ink">{inspectModal.claim.volunteer}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink/60">Claim Amount:</span>
                <span className="font-mono font-bold text-ink">{inr(inspectModal.claim.amount)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink/60">Club Account:</span>
                <span className="font-medium text-ink">{inspectModal.claim.clubName}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-ink/60">Date:</span>
                <span className="font-mono text-ink/70">{fmtDate(inspectModal.claim.submitted)}</span>
              </div>
            </div>

            {/* Receipt Image / PDF Viewer */}
            <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper-card max-h-[360px] flex items-center justify-center">
              {inspectModal.claim.receipt.endsWith('.pdf') ? (
                <div className="p-8 text-center space-y-2">
                  <FileText size={40} className="mx-auto text-accent" />
                  <p className="text-xs font-semibold text-ink">PDF Document Receipt</p>
                  <a
                    href={inspectModal.claim.receiptUrl || inspectModal.claim.receipt}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-accent-dark font-bold hover:underline"
                  >
                    Open Document in New Tab <ExternalLink size={12} />
                  </a>
                </div>
              ) : (
                <img
                  src={inspectModal.claim.receiptUrl || inspectModal.claim.receipt}
                  alt="Receipt Document"
                  className="w-full h-auto object-contain max-h-[340px]"
                />
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setInspectModal({ open: false, claim: null })}
              >
                Close
              </Button>
              {inspectModal.claim.status === 'submitted' && (
                <>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      const c = inspectModal.claim;
                      setInspectModal({ open: false, claim: null });
                      handleOpenReject(c);
                    }}
                  >
                    Reject Claim
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      const c = inspectModal.claim;
                      setInspectModal({ open: false, claim: null });
                      handleApprove(c);
                    }}
                  >
                    Approve Claim
                  </Button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* Reject Reason Modal (Requirement 4) */}
      {rejectModal.open && rejectModal.claim && (
        <Modal
          open={rejectModal.open}
          onClose={() => setRejectModal({ open: false, claim: null, reason: '' })}
          title="Reject Reimbursement Claim"
        >
          <div className="space-y-4">
            <p className="text-sm text-ink/70">
              Please state why this claim of{' '}
              <b className="text-ink">{inr(rejectModal.claim.amount)}</b> from{' '}
              <b className="text-ink">{rejectModal.claim.volunteer}</b> is being rejected. The reason
              will be sent to the volunteer and archived in the treasury ledger audit trail.
            </p>

            <Field label="Reason for rejection *" htmlFor="reject-reason">
              <Textarea
                id="reject-reason"
                value={rejectModal.reason}
                onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                placeholder="e.g., Ineligible personal purchase per §4.2, tax invoice missing, or duplicate claim."
                rows={3}
                data-testid="rejection-reason-input"
              />
            </Field>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                onClick={() => setRejectModal({ open: false, claim: null, reason: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                loading={busyActionId === rejectModal.claim.id}
                onClick={handleConfirmReject}
                data-testid="confirm-reject-button"
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
