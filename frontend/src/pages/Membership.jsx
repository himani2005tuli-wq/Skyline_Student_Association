import { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, Sparkles, ArrowRight, Building2 } from 'lucide-react';
import { membershipsApi, checkoutApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Badge } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/Reveal';
import { inr } from '@/lib/format';

const STEPS = [
  {
    n: '01',
    t: 'Create your account',
    b: 'Thirty seconds with your student email. Verification keeps the club student-only.',
  },
  {
    n: '02',
    t: 'Pick a plan, pay dues',
    b: "UPI or card. Your dues land straight in the treasurer's ledger — no notebook required.",
  },
  {
    n: '03',
    t: 'Flash your QR',
    b: 'Every ticket, check-in and member discount works from your phone.',
  },
];

export default function Membership() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setPlanIntent } = useCart();
  const isMember = user?.role === 'member';
  const [selectedClub, setSelectedClub] = useState('all');

  const { data: plans = [] } = useQuery({
    queryKey: ['plans'],
    queryFn: () => membershipsApi.getPlans(),
  });

  const clubOptions = useMemo(() => {
    const map = new Map();
    plans.forEach((p) => {
      if (p.clubName) map.set(p.clubName, p.clubSlug || p.clubName);
    });
    return Array.from(map.entries()).map(([name, slug]) => ({ name, slug }));
  }, [plans]);

  const filteredPlans = useMemo(() => {
    if (selectedClub === 'all') return plans;
    return plans.filter((p) => p.clubName === selectedClub || p.clubSlug === selectedClub);
  }, [plans, selectedClub]);

  const choose = async (plan) => {
    if (!user) {
      navigate('/login', { state: { from: '/membership' } });
      return;
    }
    await checkoutApi.beginPlan(plan.id);
    setPlanIntent(plan.id, `${plan.name} (${plan.clubName})`, plan.price);
    navigate('/checkout');
  };

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8" data-testid="membership-page">
      <p className="eyebrow flex items-center gap-3 text-accent-dark">
        <span className="rule-line" /> Membership Dues & Clubs
      </p>
      <h1 className="mt-4 max-w-2xl font-display text-4xl font-medium tracking-tight text-ink sm:text-6xl">
        Pay dues once. <em className="font-light italic">Save all year.</em>
      </h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink/55">
        Subscribe to official campus club chapters. Members receive discounted event tickets, exclusive merchandise rates, voting rights in chapter elections, and loyalty points on every purchase.
        {isMember && user.plan && (
          <span
            className="mt-3 block rounded-xl bg-success-soft px-4 py-3 text-[13px] font-semibold text-success"
            data-testid="membership-current-banner"
          >
            You are currently on the {user.plan} plan — renew below or join other club chapters anytime.
          </span>
        )}
      </p>

      {/* Club Filter Chips */}
      {clubOptions.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-2 border-b border-ink/8 pb-5">
          <span className="mr-2 flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-wider text-ink/40">
            <Building2 size={14} /> Chapters:
          </span>
          <button
            onClick={() => setSelectedClub('all')}
            className={`rounded-full px-4 py-1.5 font-mono text-xs font-semibold transition ${
              selectedClub === 'all'
                ? 'bg-ink text-paper shadow-xs'
                : 'bg-paper-card text-ink/60 hover:bg-ink/5 border border-ink/10'
            }`}
          >
            All Clubs ({plans.length})
          </button>
          {clubOptions.map(({ name, slug }) => {
            const count = plans.filter((p) => p.clubName === name).length;
            return (
              <button
                key={slug}
                onClick={() => setSelectedClub(name)}
                className={`rounded-full px-4 py-1.5 font-mono text-xs font-semibold transition ${
                  selectedClub === name
                    ? 'bg-ink text-paper shadow-xs'
                    : 'bg-paper-card text-ink/60 hover:bg-ink/5 border border-ink/10'
                }`}
              >
                {name} ({count})
              </button>
            );
          })}
        </div>
      )}

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPlans.map((plan, i) => {
          const current = isMember && plan.name === user?.plan;
          return (
            <Reveal key={plan.id} delay={i * 0.05}>
              <div
                className={`flex h-full flex-col rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift sm:p-8 ${plan.popular ? 'border-accent bg-paper-card shadow-[0_0_50px_-24px_rgba(255,77,28,0.5)]' : 'border-ink/10 bg-paper-card shadow-card'}`}
                data-testid={`plan-card-${plan.id}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="accent" className="text-[11px] font-bold">
                    {plan.clubName}
                  </Badge>
                  {plan.popular && <Badge tone="neutral">Popular</Badge>}
                  {current && <Badge tone="success">Your plan</Badge>}
                </div>

                <h2 className="mt-4 font-display text-2xl font-bold text-ink">{plan.name}</h2>
                <p className="mt-1 text-xs text-ink/50 line-clamp-2">
                  {plan.description || `Official membership tier for ${plan.clubName}.`}
                </p>
                <p className="mt-5 font-display text-5xl font-semibold text-ink">
                  {inr(plan.price)}
                  <span className="ml-2 font-mono text-xs font-normal uppercase tracking-[0.18em] text-ink/40">
                    / {plan.duration}
                  </span>
                </p>
                <div className="mt-5 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-ink/[0.04] px-3 py-2.5 text-center">
                    <p className="font-mono text-lg font-bold text-accent-dark">
                      {plan.ticketPct}%
                    </p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">
                      off tickets
                    </p>
                  </div>
                  <div className="rounded-xl bg-ink/[0.04] px-3 py-2.5 text-center">
                    <p className="font-mono text-lg font-bold text-accent-dark">{plan.merchPct}%</p>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-ink/45">
                      off merch
                    </p>
                  </div>
                </div>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-ink/70">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2.5">
                      <Check size={15} className="mt-0.5 shrink-0 text-success" /> {b}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => choose(plan)}
                  variant={current ? 'outline' : plan.popular ? 'accent' : 'ink'}
                  loadingText="Preparing checkout…"
                  flash={false}
                  size="lg"
                  className="mt-8 w-full"
                  data-testid={`plan-${plan.id}-select`}
                >
                  {current ? 'Renew this plan' : `Join ${plan.clubName || 'Chapter'} • ${inr(plan.price)}`}
                </Button>
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="mt-20 grid gap-10 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-medium tracking-tight text-ink">
            How membership works
          </h2>
          <div className="mt-8 space-y-6">
            {STEPS.map((s) => (
              <div key={s.n} className="flex gap-5">
                <span className="font-mono text-sm text-accent">{s.n}</span>
                <div>
                  <h3 className="font-semibold text-ink">{s.t}</h3>
                  <p className="mt-1 text-sm text-ink/55">{s.b}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-3xl bg-ink p-8 text-paper lg:p-10" data-testid="loyalty-intro">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-white">
            <Sparkles size={20} />
          </span>
          <h2 className="mt-6 font-display text-3xl font-medium">Points, explained plainly.</h2>
          <ul className="mt-6 space-y-4 text-sm text-paper/70">
            <li className="flex gap-3">
              <span className="font-mono text-accent">+1</span> point for every ₹10 you spend on
              tickets, merch or dues.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-accent">+5</span> bonus points when you check in at an
              event with your QR.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-accent">−1</span> rupee per point at checkout — up to
              30% of any purchase.
            </li>
            <li className="flex gap-3">
              <span className="font-mono text-accent">180</span> days to use them; oldest points
              leave first.
            </li>
          </ul>
          {isMember ? (
            <Link
              to="/member/loyalty"
              data-testid="loyalty-dashboard-link"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3.5 text-sm font-bold text-ink transition hover:bg-white"
            >
              Open my loyalty dashboard <ArrowRight size={15} />
            </Link>
          ) : (
            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3.5 text-sm font-bold text-ink transition hover:bg-white"
            >
              Start earning points <ArrowRight size={15} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
