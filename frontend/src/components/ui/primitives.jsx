import { Loader2 } from 'lucide-react';

const tones = {
  neutral: 'bg-ink/6 text-ink/70 border-ink/10',
  accent: 'bg-accent-soft text-accent-dark border-accent/25',
  success: 'bg-success-soft text-success border-success/25',
  warning: 'bg-warning-soft text-warning border-warning/25',
  danger: 'bg-danger-soft text-danger border-danger/25',
  info: 'bg-info-soft text-info border-info/25',
  dark: 'bg-ink text-paper border-ink',
};

export function Badge({ tone = 'neutral', children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-tight ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const STATUS_TONES = {
  active: 'success',
  confirmed: 'success',
  delivered: 'success',
  operational: 'success',
  done: 'success',
  approved: 'success',
  paid: 'success',
  checked_in: 'success',
  pending: 'warning',
  processing: 'warning',
  degraded: 'warning',
  doing: 'warning',
  expiring: 'warning',
  'expiring soon': 'warning',
  cancelled: 'danger',
  rejected: 'danger',
  expired: 'danger',
  refunded: 'danger',
  failed: 'danger',
  todo: 'neutral',
  'not a member': 'neutral',
  used: 'neutral',
};

export function StatusPill({ status }) {
  return (
    <Badge tone={STATUS_TONES[String(status).toLowerCase()] || 'neutral'}>
      {String(status).replace('_', ' ')}
    </Badge>
  );
}

export function Spinner({ label = 'Loading' }) {
  return (
    <div
      className="flex items-center justify-center gap-3 py-16 text-ink/50"
      role="status"
      aria-label={label}
      data-testid="loading-spinner"
    >
      <Loader2 size={20} className="animate-spin" />
      <span className="font-mono text-xs uppercase tracking-[0.2em]">{label}</span>
    </div>
  );
}

export function Skeleton({ className = '' }) {
  return <div className={`skeleton-shimmer rounded-xl bg-ink/5 ${className}`} />;
}

/* Structured placeholder for dashboard pages: heading, stat cards, table. */
export function DashboardSkeleton({ stats = 4, table = true }) {
  return (
    <div
      className="space-y-6"
      role="status"
      aria-label="Loading dashboard"
      data-testid="dashboard-skeleton"
    >
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-3 w-80 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[...Array(stats)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-ink/10 bg-paper-card p-5">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-4 h-8 w-28" />
            <Skeleton className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
      {table && (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper-card">
          <div className="border-b border-ink/8 px-5 py-4">
            <Skeleton className="h-10 w-full max-w-xs" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-6 border-b border-ink/5 px-5 py-4 last:border-0"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="hidden h-4 w-20 sm:block" />
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* Placeholder for public pages while a lazy route chunk loads. */
export function PageSkeleton() {
  return (
    <div
      className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8"
      role="status"
      aria-label="Loading page"
      data-testid="page-skeleton"
    >
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-5 h-14 w-80 max-w-full" />
      <Skeleton className="mt-4 h-3 w-96 max-w-full" />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="aspect-[16/11] rounded-3xl" />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, body, action, testid = 'empty-state' }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-ink/15 bg-paper-card px-6 py-14 text-center"
      data-testid={testid}
    >
      {Icon && (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink/5 text-ink/40">
          <Icon size={22} />
        </div>
      )}
      <h3 className="font-display text-lg font-semibold text-ink">{title}</h3>
      {body && <p className="max-w-sm text-sm text-ink/55">{body}</p>}
      {action}
    </div>
  );
}

export function ProgressBar({ value, max = 100, className = '' }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div
      className={`h-2 w-full overflow-hidden rounded-full bg-ink/8 ${className}`}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      data-testid="progress-bar"
    >
      <div
        className="h-full rounded-full bg-accent transition-[width] duration-700"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Tabs({ tabs, active, onChange, className = '' }) {
  return (
    <div
      className={`flex max-w-full gap-1 overflow-x-auto rounded-full border border-ink/10 bg-paper-card p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
      role="tablist"
      data-testid="tabs"
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={active === t.value}
          data-testid={`tab-${t.value}`}
          onClick={() => onChange(t.value)}
          className={`shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-[13px] font-semibold transition-all ${active === t.value ? 'bg-ink text-paper' : 'text-ink/60 hover:text-ink'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export function SectionHead({ eyebrow, title, children, dark = false, className = '' }) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-6 ${className}`}>
      <div className="max-w-2xl">
        <p
          className={`eyebrow flex items-center gap-3 ${dark ? 'text-accent' : 'text-accent-dark'}`}
        >
          <span className="rule-line" aria-hidden="true" /> {eyebrow}
        </p>
        <h2
          className={`mt-4 font-display text-3xl font-medium leading-[1.08] tracking-tight sm:text-4xl ${dark ? 'text-paper' : 'text-ink'}`}
        >
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}
