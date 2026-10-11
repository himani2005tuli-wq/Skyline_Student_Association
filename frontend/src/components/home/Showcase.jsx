import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, MapPin } from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { SectionHead } from '@/components/ui/primitives';
import { Badge, ProgressBar } from '@/components/ui/primitives';
import { inr, fmtDate } from '@/lib/format';
import { SmartImage } from '@/components/ui/SmartImage';
import { eventsApi, productsApi, fundraisersApi } from '@/api';

function EventCard({ ev }) {
  const capacity = ev.capacity || 100;
  const sold = ev.sold || 0;
  const left = Math.max(0, capacity - sold);
  const pctSold = Math.round((sold / capacity) * 100);
  const ticketTypes = ev.ticketTypes && ev.ticketTypes.length > 0
    ? ev.ticketTypes
    : [{ price: ev.guestPrice || 500, memberOnly: false }];
  const memberTicket = ticketTypes.find((t) => t.memberOnly);
  const memberPrice = memberTicket ? memberTicket.price : (ev.memberPrice ?? ticketTypes[0]?.price ?? 0);
  const guestPrice = ticketTypes[0]?.price ?? (ev.guestPrice ?? 0);

  return (
    <Reveal>
      <Link
        to={`/events/${ev.id}`}
        data-testid={`home-event-card-${ev.id}`}
        className="group block overflow-hidden rounded-3xl border border-ink/10 bg-paper-card shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
      >
        <div className="relative overflow-hidden">
          <SmartImage
            src={ev.poster}
            alt={ev.title}
            hoverZoom
            className="aspect-[16/10] w-full object-cover"
          />
          <div className="absolute left-4 top-4 flex gap-2">
            <Badge tone="dark">{ev.category || 'Event'}</Badge>
            {left <= 60 && <Badge tone="accent">{pctSold}% sold</Badge>}
          </div>
        </div>
        <div className="p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
            {fmtDate(ev.date)} · {ev.time || '6:00 PM'}
          </p>
          <h3 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">
            {ev.title}
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink/50">
            <MapPin size={13} /> {ev.venue || 'Campus Main Hall'}
          </p>
          <div className="mt-5 flex items-center justify-between border-t border-ink/8 pt-4">
            <div className="flex items-baseline gap-3 text-sm">
              <span className="font-bold text-ink">
                {memberPrice === 0 ? 'Free' : inr(memberPrice)}
              </span>
              <span className="text-ink/45">member</span>
              <span className="text-ink/25">/</span>
              <span className="text-ink/60">{guestPrice === 0 ? 'Free' : inr(guestPrice)}</span>
              <span className="text-ink/45">guest</span>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink transition group-hover:bg-accent group-hover:text-white">
              <ArrowUpRight size={15} />
            </span>
          </div>
        </div>
      </Link>
    </Reveal>
  );
}

export function EventsPreview() {
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });

  return (
    <section className="bg-paper py-24 lg:py-32" id="events" data-testid="home-events-section">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead eyebrow="What's on" title="This season on the calendar">
          <Link
            to="/events"
            data-testid="home-events-viewall"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-[13px] font-bold text-ink transition hover:bg-ink hover:text-paper"
          >
            All events <ArrowUpRight size={14} />
          </Link>
        </SectionHead>
        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.slice(0, 3).map((ev) => (
            <EventCard key={ev.id} ev={ev} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function MerchPreview() {
  const { data: products = [] } = useQuery({ queryKey: ['products'], queryFn: productsApi.list });

  return (
    <section className="bg-paper-deep py-24 lg:py-32" id="store" data-testid="home-merch-section">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead eyebrow="The store" title="Wear the peak.">
          <Link
            to="/store"
            data-testid="home-merch-viewall"
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 px-6 py-3 text-[13px] font-bold text-ink transition hover:bg-ink hover:text-paper"
          >
            Visit the store <ArrowUpRight size={14} />
          </Link>
        </SectionHead>
        <div className="mt-14 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {products.slice(0, 4).map((p, i) => (
            <Reveal key={p.id} delay={i * 0.06}>
              <Link
                to="/store"
                data-testid={`home-merch-card-${p.id}`}
                className="group block overflow-hidden rounded-3xl border border-ink/10 bg-paper-card shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
              >
                <div className="overflow-hidden">
                  <SmartImage
                    src={p.image}
                    alt={p.name}
                    hoverZoom
                    className="aspect-square w-full object-cover"
                  />
                </div>
                <div className="flex items-center justify-between p-4">
                  <div>
                    <h3 className="text-sm font-bold text-ink">{p.name}</h3>
                    <p className="mt-0.5 font-mono text-xs text-ink/50">{inr(p.price)}</p>
                  </div>
                  <Badge tone="accent">−15% members</Badge>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FundraiserStrip() {
  const { data: fundraisers = [] } = useQuery({ queryKey: ['fundraisers'], queryFn: fundraisersApi.list });
  const activeF = fundraisers[0];
  const f = {
    title: activeF?.title || 'Winter Bake Sale',
    goal: activeF?.targetAmountInPaise ? activeF.targetAmountInPaise / 100 : 50000,
    raised: activeF?.currentAmountInPaise ? activeF.currentAmountInPaise / 100 : 36240,
    desc: activeF?.description || 'Two hundred home-baked boxes, one very ambitious target — every rupee goes to the campus library fund.',
  };

  return (
    <section className="bg-paper pb-24" data-testid="home-fundraiser-section">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <Reveal>
          <div className="grid overflow-hidden rounded-3xl border border-ink/10 bg-paper-card shadow-card md:grid-cols-2">
            <SmartImage
              src="https://images.unsplash.com/photo-1609185915416-cc61ad0a560d?q=80&w=1600&auto=format&fit=crop"
              alt="Bake sale cookies"
              wrapperClassName="h-full min-h-64"
              className="h-full min-h-64 w-full object-cover"
            />
            <div className="p-8 lg:p-12">
              <Badge tone="warning">Fundraiser</Badge>
              <h3 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink">
                {f.title}
              </h3>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-ink/55">
                {f.desc}
              </p>
              <div className="mt-6">
                <div className="flex items-baseline justify-between">
                  <p className="font-display text-2xl font-semibold text-ink">
                    {inr(f.raised)}{' '}
                    <span className="font-mono text-sm font-normal text-ink/40">
                      of {inr(f.goal)}
                    </span>
                  </p>
                </div>
                <ProgressBar value={f.raised} max={f.goal} className="mt-3" />
              </div>
              <Link
                to="/volunteer"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[13px] font-bold text-paper transition hover:bg-ink-700"
                data-testid="home-fundraiser-volunteer-button"
              >
                Volunteer for a shift <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
