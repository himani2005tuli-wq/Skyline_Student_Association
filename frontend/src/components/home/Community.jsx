import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { Reveal, EASE } from '@/components/Reveal';
import { Badge, ProgressBar, SectionHead } from '@/components/ui/primitives';
import { inr, fmtDate } from '@/lib/format';
import { membershipsApi, communicationApi } from '@/api';

export function MembershipPreview() {
  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: membershipsApi.getPlans });

  return (
    <section
      className="noise relative overflow-hidden bg-ink py-24 text-paper lg:py-32"
      id="membership"
      data-testid="home-membership-section"
    >
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead dark eyebrow="Membership" title="Join once. Pay less all year.">
          <Link
            to="/membership"
            data-testid="home-membership-compare"
            className="inline-flex items-center gap-2 rounded-full border border-paper/25 px-6 py-3 text-[13px] font-bold text-paper transition hover:bg-paper hover:text-ink"
          >
            Compare plans <ArrowRight size={14} />
          </Link>
        </SectionHead>

        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {plans.slice(0, 2).map((plan, i) => (
            <Reveal key={plan.id} delay={i * 0.08}>
              <div
                className={`flex h-full flex-col rounded-3xl border p-8 ${plan.popular ? 'border-accent bg-paper/[0.06] shadow-[0_0_60px_-20px_rgba(255,77,28,0.4)]' : 'border-paper/12 bg-paper/[0.03]'}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-2xl font-medium">{plan.name}</h3>
                  {plan.popular && <Badge tone="accent">Most popular</Badge>}
                </div>
                <p className="mt-5 font-display text-5xl font-semibold">
                  {inr(plan.price)}
                  <span className="ml-2 font-mono text-xs font-normal uppercase tracking-[0.2em] text-paper/45">
                    / {plan.duration}
                  </span>
                </p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-paper/70">
                  {plan.benefits.slice(0, 4).map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <Check size={15} className="mt-0.5 shrink-0 text-accent" /> {b}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/membership"
                  data-testid={`home-plan-${plan.id}-button`}
                  className="mt-8 rounded-full bg-paper py-3.5 text-center text-sm font-bold text-ink transition hover:bg-white"
                >
                  Get {plan.name}
                </Link>
              </div>
            </Reveal>
          ))}
        </div>

        <div className="mt-16 grid gap-4 lg:grid-cols-3">
          {[
            { n: '01', t: 'Create your account', b: 'Thirty seconds with your student email.' },
            {
              n: '02',
              t: 'Pick a plan and pay',
              b: 'UPI, card — dues recorded instantly in the ledger.',
            },
            {
              n: '03',
              t: 'Flash your QR everywhere',
              b: 'Tickets, check-ins and discounts — all from your phone.',
            },
          ].map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08}>
              <div className="h-full rounded-3xl border border-paper/10 p-7">
                <p className="font-mono text-sm text-accent">{s.n}</p>
                <h4 className="mt-4 font-display text-xl">{s.t}</h4>
                <p className="mt-2 text-sm text-paper/55">{s.b}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-4">
          <div
            className="flex flex-wrap items-center justify-between gap-6 rounded-3xl bg-accent p-7 text-ink lg:px-10"
            data-testid="home-loyalty-strip"
          >
            <div className="flex items-center gap-5">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-ink text-accent">
                <Sparkles size={20} />
              </span>
              <div>
                <h3 className="font-display text-2xl font-medium">Loyalty, baked in.</h3>
                <p className="text-sm text-ink/70">
                  Earn 1 point per ₹10 spent, 5 per event attended. Points pay for merch, tickets,
                  even membership.
                </p>
              </div>
            </div>
            <Link
              to="/register"
              data-testid="home-loyalty-join"
              className="rounded-full bg-ink px-6 py-3.5 text-[13px] font-bold text-paper transition hover:bg-ink-700"
            >
              Start earning
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function NewsPreview() {
  const { data: announcements = [] } = useQuery({
    queryKey: ['announcements'],
    queryFn: communicationApi.getAnnouncements,
  });

  return (
    <section className="bg-paper py-24 lg:py-32" id="news" data-testid="home-news-section">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead eyebrow="The board" title="Announcements, on the record.">
          <Link
            to="/announcements"
            data-testid="home-news-viewall"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-[13px] font-bold text-ink transition hover:bg-ink hover:text-paper"
          >
            All announcements <ArrowRight size={14} />
          </Link>
        </SectionHead>
        <div className="mt-12 divide-y divide-ink/8 border-y border-ink/8">
          {announcements.slice(0, 3).map((a, i) => (
            <Reveal key={a.id} delay={i * 0.05}>
              <Link
                to="/announcements"
                data-testid={`home-news-item-${a.id}`}
                className="group grid gap-2 py-6 transition-colors hover:bg-ink/[0.02] md:grid-cols-12 md:items-baseline"
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40 md:col-span-3">
                  {fmtDate(a.date)}
                </p>
                <h3 className="font-display text-xl font-medium text-ink md:col-span-7 md:group-hover:text-accent-dark">
                  {a.title}
                </h3>
                <Badge className="md:col-span-2 md:justify-self-end">{a.category || 'General'}</Badge>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaBand() {
  return (
    <section className="bg-accent" data-testid="home-cta-section">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-8 px-5 py-16 lg:px-8 lg:py-20">
        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="max-w-2xl font-display text-4xl font-medium leading-[1.05] tracking-tight text-ink sm:text-5xl"
          data-testid="home-cta-headline"
        >
          Everything your student club needs to thrive.{' '}
          <em className="font-light italic">Your turn.</em>
        </motion.h2>
        <div className="flex gap-3">
          <Link
            to="/register"
            data-testid="home-cta-register"
            className="rounded-full bg-ink px-8 py-4 text-sm font-bold text-paper transition hover:bg-ink-700"
          >
            Create account
          </Link>
          <Link
            to="/membership"
            data-testid="home-cta-plans"
            className="rounded-full border-2 border-ink px-8 py-4 text-sm font-bold text-ink transition hover:bg-ink hover:text-paper"
          >
            See plans
          </Link>
        </div>
      </div>
    </section>
  );
}
