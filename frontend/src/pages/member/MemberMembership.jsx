import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Download, Sparkles, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { memberApi, checkoutApi, membershipsApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Card } from '@/components/ui/Card';
import { Badge, StatusPill, ProgressBar, DashboardSkeleton } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { inr, fmtDate } from '@/lib/format';

export default function MemberMembership() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setPlanIntent } = useCart();
  const { data: profile, isLoading } = useQuery({
    queryKey: ['member-profile'],
    queryFn: memberApi.profile,
  });
  const { data: plansData } = useQuery({
    queryKey: ['membership-plans'],
    queryFn: membershipsApi.getPlans,
  });

  if (isLoading || !profile) return <DashboardSkeleton />;

  const plans = Array.isArray(plansData) ? plansData : plansData?.plans || [];
  const activePlan = profile.planDetails || plans.find((p) => p.name === profile.plan);
  const hasActive = Boolean(profile.hasActiveMembership && activePlan);

  const subscribeToPlan = async (selectedPlan) => {
    const price = (selectedPlan.priceInPaise || 50000) / 100;
    await checkoutApi.beginPlan(selectedPlan.id);
    setPlanIntent(selectedPlan.id, selectedPlan.name, price);
    navigate('/checkout');
  };

  return (
    <div className="space-y-8" data-testid="member-membership-page">
      <div>
        <p className="eyebrow text-accent-dark">Club Membership</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
          {hasActive ? 'Your membership.' : 'Choose your membership.'}
        </h1>
        <p className="mt-2 text-sm text-ink/60">
          {hasActive
            ? `Your account is enrolled in the ${activePlan.name}.`
            : 'You do not have an active membership yet. Select a plan below to activate member discounts.'}
        </p>
      </div>

      {/* ── Active Membership Card (When User Has Active Plan) ── */}
      {hasActive && (
        <div className="grid gap-6 lg:grid-cols-12">
          <Card className="p-7 lg:col-span-7" data-testid="current-plan-card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <Badge tone="accent" className="mb-2 text-xs font-bold">
                  {profile.activeClub?.name || activePlan.club?.name || 'Your Chapter'}
                </Badge>
                <h2 className="font-display text-2xl font-semibold text-ink">{activePlan.name}</h2>
              </div>
              <Badge tone="success">Active</Badge>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { l: 'Started', v: fmtDate(profile.joined) },
                { l: 'Expires', v: fmtDate(profile.expires) },
                { l: 'Points balance', v: `${profile.points} pts` },
              ].map((x) => (
                <div key={x.l} className="rounded-2xl bg-ink/[0.04] p-4">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
                    {x.l}
                  </p>
                  <p className="mt-1.5 font-mono text-sm font-bold text-ink">{x.v}</p>
                </div>
              ))}
            </div>

            <h3 className="mt-8 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/45">
              What your plan includes
            </h3>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              <li className="flex items-start gap-2.5 text-sm text-ink/70">
                <Check size={15} className="mt-0.5 shrink-0 text-success" />
                {activePlan.benefits?.ticketDiscount ?? 15}% Discount on all event tickets
              </li>
              <li className="flex items-start gap-2.5 text-sm text-ink/70">
                <Check size={15} className="mt-0.5 shrink-0 text-success" />
                {activePlan.benefits?.merchDiscount ?? 10}% Discount on club merchandise
              </li>
              <li className="flex items-start gap-2.5 text-sm text-ink/70">
                <Check size={15} className="mt-0.5 shrink-0 text-success" />
                Priority window for high-demand events
              </li>
              <li className="flex items-start gap-2.5 text-sm text-ink/70">
                <Check size={15} className="mt-0.5 shrink-0 text-success" />
                Loyalty points earned on every purchase
              </li>
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-accent-soft px-5 py-4">
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles size={15} className="text-accent" /> Redeem points toward membership renewal
              </p>
              <Button
                size="sm"
                onClick={() => subscribeToPlan(activePlan)}
                loadingText="Preparing…"
                flash={false}
                data-testid="renew-plan-button"
              >
                Renew Membership
              </Button>
            </div>
          </Card>

          <div className="space-y-6 lg:col-span-5">
            <Card className="p-7" data-testid="discounts-card">
              <h2 className="font-display text-xl font-semibold text-ink">Active discounts</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <div className="flex justify-between text-sm font-semibold text-ink">
                    <span>Event tickets</span>
                    <span className="font-mono text-accent-dark">
                      −{activePlan.benefits?.ticketDiscount ?? 15}%
                    </span>
                  </div>
                  <ProgressBar value={activePlan.benefits?.ticketDiscount ?? 15} max={30} className="mt-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm font-semibold text-ink">
                    <span>Merchandise</span>
                    <span className="font-mono text-accent-dark">
                      −{activePlan.benefits?.merchDiscount ?? 10}%
                    </span>
                  </div>
                  <ProgressBar value={activePlan.benefits?.merchDiscount ?? 10} max={30} className="mt-2" />
                </div>
              </div>
              <p className="mt-5 text-xs leading-relaxed text-ink/50">
                Applied automatically at checkout — verified by the server on every transaction.
              </p>
            </Card>

            <Card className="p-7" data-testid="payment-history-card">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold text-ink">Dues payment history</h2>
                <Download size={15} className="text-ink/40" />
              </div>
              <div className="mt-4 divide-y divide-ink/6">
                {(profile.payments || []).length === 0 ? (
                  <p className="py-4 text-xs text-ink/40">No dues payment records yet.</p>
                ) : (
                  (profile.payments || []).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between py-3"
                      data-testid="membership-payment-row"
                    >
                      <div>
                        <p className="text-[13px] font-semibold text-ink">{p.label}</p>
                        <p className="font-mono text-[11px] text-ink/45">{fmtDate(p.date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-mono text-sm font-bold text-ink">{inr(p.amount)}</p>
                        <StatusPill status={p.status} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── Club Subscription Charges & Membership Plans (For New Users & Additional Clubs) ── */}
      <div className="space-y-6 pt-2">
        {!hasActive && (
          <Card className="border-warning/30 bg-warning/5 p-6">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="mt-0.5 shrink-0 text-warning" />
              <div>
                <h3 className="font-display text-lg font-bold text-ink">No Active Chapter Membership</h3>
                <p className="mt-1 text-sm text-ink/70">
                  You are registered on the platform, but have not subscribed to an active club chapter. Pick any club below to pay annual dues, get verified membership benefits, and enjoy member ticket discounts!
                </p>
              </div>
            </div>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-ink/8 pb-4">
          <div>
            <h3 className="font-display text-2xl font-bold text-ink">
              {hasActive ? 'Join Additional Club Chapters' : 'Select Club Chapter Subscription'}
            </h3>
            <p className="text-xs text-ink/60">
              {hasActive
                ? 'Expand your network and unlock benefits across multiple student organizations.'
                : 'All official student club chapters with annual dues under the Skyline Student Association.'}
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-ink/40">
            {plans.length} Membership Plans Available
          </span>
        </div>

        {/* Membership Tier Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((p) => {
            const price = p.price ?? ((p.priceInPaise || 0) / 100);
            const isCurrent = hasActive && (activePlan?.id === p.id || activePlan?.name === p.name);
            const isPopular = (p.name || '').includes('Annual') || (p.name || '').includes('Tech');
            const clubName = p.clubName || p.club?.name || 'Skyline Club';

            return (
              <Card
                key={p.id}
                className={`flex flex-col justify-between p-7 transition hover:-translate-y-1 hover:shadow-card ${
                  isCurrent ? 'border-2 border-success/40 bg-success/[0.02]' : isPopular ? 'border-2 border-accent shadow-md' : ''
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone="accent" className="text-[11px] font-bold">
                      {clubName}
                    </Badge>
                    {isCurrent ? (
                      <Badge tone="success">Your Chapter</Badge>
                    ) : isPopular ? (
                      <Badge tone="neutral">Popular</Badge>
                    ) : null}
                  </div>

                  <h3 className="mt-4 font-display text-2xl font-bold text-ink">{p.name}</h3>
                  <p className="mt-1 text-xs text-ink/60 line-clamp-2">
                    {p.description || `Official membership tier for ${clubName}.`}
                  </p>

                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-display text-3xl font-extrabold text-ink">
                      {inr(price)}
                    </span>
                    <span className="text-xs text-ink/50">/ {p.durationDays || 365} days</span>
                  </div>

                  <div className="my-5 border-t border-ink/10" />

                  <ul className="space-y-2.5 text-xs text-ink/80">
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>
                        <b>{p.ticketPct ?? p.benefits?.ticketDiscount ?? 15}% off</b> event tickets
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>
                        <b>{p.merchPct ?? p.benefits?.merchDiscount ?? 10}% off</b> club merchandise
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Priority registration & club voting rights</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check size={14} className="text-emerald-600 shrink-0" />
                      <span>Earn 1 loyalty pt per ₹10 spent</span>
                    </li>
                  </ul>
                </div>

                <div className="mt-7">
                  <Button
                    className="w-full"
                    variant={isCurrent ? 'outline' : isPopular ? 'primary' : 'ink'}
                    icon={ArrowRight}
                    onClick={() => subscribeToPlan(p)}
                  >
                    {isCurrent ? 'Renew Membership' : `Join ${clubName} • ${inr(price)}`}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
