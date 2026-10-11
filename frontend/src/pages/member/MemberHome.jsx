import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles,
  Ticket,
  Package,
  IdCard,
  CalendarDays,
  ArrowRight,
  Megaphone,
  ScanLine,
  Gift,
  Store,
} from 'lucide-react';
import { memberApi, loyaltyApi, eventsApi, publicApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge, StatusPill, ProgressBar, DashboardSkeleton } from '@/components/ui/primitives';
import { inr, fmtDate, initials } from '@/lib/format';

const QUICK = [
  { to: '/events', icon: CalendarDays, label: 'Browse events' },
  { to: '/store', icon: Store, label: 'Buy merchandise' },
  { to: '/member/membership', icon: IdCard, label: 'Renew membership' },
  { to: '/member/loyalty', icon: Gift, label: 'Redeem points' },
  { to: '/member/tickets', icon: ScanLine, label: 'My tickets' },
  { to: '/member/orders', icon: Package, label: 'Order history' },
];

export default function MemberHome() {
  const { user } = useAuth();
  const { data: profile, isLoading: p } = useQuery({
    queryKey: ['member-profile'],
    queryFn: memberApi.profile,
  });
  const { data: tickets } = useQuery({ queryKey: ['member-tickets'], queryFn: memberApi.tickets });
  const { data: orders } = useQuery({ queryKey: ['member-orders'], queryFn: memberApi.orders });
  const { data: loyalty } = useQuery({ queryKey: ['loyalty'], queryFn: loyaltyApi.summary });
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const { data: anns } = useQuery({
    queryKey: ['announcements'],
    queryFn: publicApi.announcements,
  });

  if (p || !profile) return <DashboardSkeleton />;

  const daysLeft = Math.max(0, Math.round((new Date(profile.expires) - Date.now()) / 864e5));

  return (
    <div data-testid="member-dashboard">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow text-accent-dark">Member dashboard</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            Hi, {user?.name?.split(' ')[0] || profile.name.split(' ')[0]}.
          </h1>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-mono text-sm font-bold text-paper">
          {initials(profile.name)}
        </span>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl bg-ink p-6 text-paper" data-testid="membership-status-card">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-paper/50">
              Membership
            </p>
            {profile.hasActiveMembership ? (
              <Badge tone="accent">{profile.plan}</Badge>
            ) : (
              <Badge tone="dark">No Active Plan</Badge>
            )}
          </div>
          {profile.hasActiveMembership ? (
            <>
              <p className="mt-4 font-display text-2xl font-semibold">Active</p>
              <p className="mt-1 text-xs text-paper/55">
                Renews {fmtDate(profile.expires)} · {daysLeft} days left
              </p>
              <Link
                to="/member/membership"
                data-testid="renew-membership-link"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent-dark"
              >
                Renew <ArrowRight size={13} />
              </Link>
            </>
          ) : (
            <>
              <p className="mt-4 font-display text-2xl font-semibold text-paper/80">Inactive</p>
              <p className="mt-1 text-xs text-paper/55">
                Join a membership tier to unlock ticket discounts & perks.
              </p>
              <Link
                to="/member/membership"
                data-testid="renew-membership-link"
                className="mt-4 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-bold text-white transition hover:bg-accent-dark"
              >
                Subscribe Now <ArrowRight size={13} />
              </Link>
            </>
          )}
        </div>
        <StatCard
          label="Loyalty points"
          value={`${profile.points} pts`}
          sub={
            loyalty?.expiring
              ? `${loyalty.expiring.points} pts expire ${fmtDate(loyalty.expiring.by)}`
              : ''
          }
          icon={Sparkles}
          tone="accent"
          testid="points-balance-card"
        />
        <StatCard
          label="Upcoming tickets"
          value={tickets?.filter((t) => t.status === 'confirmed').length ?? '—'}
          sub="QR-ready at the door"
          icon={Ticket}
          testid="upcoming-tickets-card"
        />
        <StatCard
          label="Recent orders"
          value={orders?.length ?? '—'}
          sub="All channels"
          icon={Package}
          testid="recent-orders-card"
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <Card className="p-6 lg:col-span-8">
          <h2 className="font-display text-xl font-semibold text-ink">Quick actions</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {QUICK.map((q) => (
              <Link
                key={q.to + q.label}
                to={q.to}
                data-testid={`quick-action-${q.label.toLowerCase().replace(/ /g, '-')}`}
                className="flex flex-col items-start gap-3 rounded-2xl border border-ink/10 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-accent hover:shadow-card"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-paper">
                  <q.icon size={15} />
                </span>
                <span className="text-[13px] font-bold text-ink">{q.label}</span>
              </Link>
            ))}
          </div>

          <h2 className="mt-8 font-display text-xl font-semibold text-ink">Upcoming events</h2>
          <div className="mt-4 space-y-3">
            {(events || []).slice(0, 2).map((ev) => (
              <Link
                key={ev.id}
                to={`/events/${ev.id}`}
                data-testid={`dashboard-event-${ev.id}`}
                className="flex items-center gap-4 rounded-2xl border border-ink/8 bg-white p-3 transition hover:border-accent"
              >
                <img src={ev.poster} alt="" className="h-14 w-20 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="text-sm font-bold text-ink">{ev.title}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-ink/45">
                    {fmtDate(ev.date)} · {ev.venue}
                  </p>
                </div>
                <ArrowRight size={15} className="text-ink/30" />
              </Link>
            ))}
          </div>

          <h2 className="mt-8 font-display text-xl font-semibold text-ink">Recent orders</h2>
          <div className="mt-4 space-y-2">
            {(orders || []).slice(0, 3).map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-ink/8 bg-white px-4 py-3"
                data-testid={`dashboard-order-${o.id}`}
              >
                <div>
                  <p className="font-mono text-xs text-ink/50">{o.id}</p>
                  <p className="text-[13px] font-semibold text-ink">{o.items}</p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-mono text-sm font-bold text-ink">{inr(o.total)}</p>
                  <StatusPill status={o.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-6 lg:col-span-4">
          <Card className="p-6" data-testid="loyalty-progress-card">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-ink">Next reward</h2>
              <Sparkles size={16} className="text-accent" />
            </div>
            <p className="mt-3 text-sm text-ink/60">
              {profile.nextReward?.label || 'Free merch item'}
            </p>
            <p className="mt-4 font-mono text-3xl font-bold text-ink">
              {profile.points}
              <span className="text-base text-ink/40"> / {profile.nextReward?.at || 500}</span>
            </p>
            <ProgressBar
              value={profile.points}
              max={profile.nextReward?.at || 500}
              className="mt-3"
            />
            <Link
              to="/member/loyalty"
              className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-accent-dark"
            >
              Loyalty dashboard →
            </Link>
          </Card>

          <Card className="p-6" data-testid="dashboard-tickets-preview">
            <h2 className="font-display text-lg font-semibold text-ink">My tickets</h2>
            <div className="mt-4 space-y-3">
              {(tickets || []).slice(0, 2).map((t) => {
                const ev = (events || []).find((e) => e.id === t.eventId);
                return (
                  <div key={t.ref} className="rounded-2xl border border-ink/8 bg-white p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-[13px] font-bold text-ink">{ev?.title || t.eventId}</p>
                      <StatusPill status={t.status} />
                    </div>
                    <p className="mt-1 font-mono text-[11px] text-ink/45">
                      {t.ref} · {t.type}
                    </p>
                  </div>
                );
              })}
            </div>
            <Link
              to="/member/tickets"
              data-testid="dashboard-view-tickets-link"
              className="mt-4 inline-block font-mono text-[11px] uppercase tracking-[0.18em] text-accent-dark"
            >
              All tickets & QR →
            </Link>
          </Card>

          <Card className="p-6" data-testid="dashboard-announcements">
            <div className="flex items-center gap-2">
              <Megaphone size={16} className="text-accent" />
              <h2 className="font-display text-lg font-semibold text-ink">Announcements</h2>
            </div>
            <div className="mt-4 space-y-3">
              {(anns || []).slice(0, 2).map((a) => (
                <Link
                  key={a.id}
                  to="/announcements"
                  className="block rounded-xl bg-white p-3 transition hover:bg-accent-soft/40"
                >
                  <p className="font-mono text-[10px] uppercase tracking-wider text-ink/40">
                    {fmtDate(a.date)}
                  </p>
                  <p className="mt-1 text-[13px] font-semibold text-ink">{a.title}</p>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
