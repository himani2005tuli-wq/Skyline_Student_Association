import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, MapPin, ArrowUpRight, Search } from 'lucide-react';
import { eventsApi } from '@/api';
import { Badge, Skeleton, EmptyState } from '@/components/ui/primitives';
import { inr, fmtDate } from '@/lib/format';
import { SmartImage } from '@/components/ui/SmartImage';

function EventCard({ ev }) {
  const capacity = ev.capacity || 100;
  const sold = ev.sold || 0;
  const left = Math.max(0, capacity - sold);
  const pctSold = Math.round((sold / capacity) * 100);
  const ticketTypes = ev.ticketTypes && ev.ticketTypes.length > 0 ? ev.ticketTypes : [{ price: 500, memberOnly: false }];
  const memberPrice = ticketTypes.find((t) => t.memberOnly)?.price ?? ticketTypes[0]?.price ?? 0;
  const guestPrice = ticketTypes[0]?.price ?? 0;
  return (
    <Link
      to={`/events/${ev.id}`}
      data-testid={`event-card-${ev.id}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-ink/10 bg-paper-card shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:shadow-lift"
    >
      <div className="relative overflow-hidden">
        <SmartImage
          src={ev.poster}
          alt={ev.title}
          hoverZoom
          className="aspect-[16/10] w-full object-cover"
        />
        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <Badge tone="dark">{ev.category}</Badge>
          {left === 0 ? (
            <Badge tone="danger">Sold out</Badge>
          ) : left <= 60 ? (
            <Badge tone="accent">{pctSold}% sold</Badge>
          ) : (
            <Badge tone="success">Booking open</Badge>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/45">
          {fmtDate(ev.date)} · {ev.time}
        </p>
        <h3 className="mt-2 font-display text-2xl font-medium tracking-tight text-ink">
          {ev.title}
        </h3>
        <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-ink/50">
          <MapPin size={13} /> {ev.venue}
        </p>
        <div className="mt-auto flex items-center justify-between border-t border-ink/8 pt-4 pt-5">
          <div className="flex items-baseline gap-2 text-sm">
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
  );
}

export default function Events() {
  const { data, isLoading } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');
  const [when, setWhen] = useState('all');
  const [sort, setSort] = useState('date');

  const cats = useMemo(() => ['All', ...new Set((data || []).map((e) => e.category))], [data]);
  const list = useMemo(() => {
    let l = data || [];
    if (cat !== 'All') l = l.filter((e) => e.category === cat);
    if (q.trim()) l = l.filter((e) => e.title.toLowerCase().includes(q.toLowerCase()));
    const now = Date.now();
    if (when === 'week') l = l.filter((e) => new Date(e.date) - now < 7 * 864e5);
    if (when === 'month') l = l.filter((e) => new Date(e.date) - now < 31 * 864e5);
    if (sort === 'price')
      l = [...l].sort((a, b) => a.ticketTypes[0].price - b.ticketTypes[0].price);
    else l = [...l].sort((a, b) => new Date(a.date) - new Date(b.date));
    return l;
  }, [data, q, cat, when, sort]);

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8" data-testid="events-page">
      <p className="eyebrow flex items-center gap-3 text-accent-dark">
        <span className="rule-line" /> What's on
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-ink sm:text-6xl">
        The calendar.
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/55">
        Member pricing is applied automatically at checkout for active members. Every ticket is
        QR-scanned at the door — no printed lists.
      </p>

      <div className="mt-10 flex flex-wrap items-center gap-3" data-testid="events-filters">
        <div className="relative min-w-52 flex-1 sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35"
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search events…"
            aria-label="Search events"
            data-testid="events-search-input"
            className="h-11 w-full rounded-full border border-ink/15 bg-paper-card pl-10 pr-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
        <select
          value={when}
          onChange={(e) => setWhen(e.target.value)}
          aria-label="Filter by date"
          data-testid="events-date-filter"
          className="h-11 rounded-full border border-ink/15 bg-paper-card px-5 text-sm font-medium outline-none focus:border-accent"
        >
          <option value="all">Any date</option>
          <option value="week">This week</option>
          <option value="month">This month</option>
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort events"
          data-testid="events-sort"
          className="h-11 rounded-full border border-ink/15 bg-paper-card px-5 text-sm font-medium outline-none focus:border-accent"
        >
          <option value="date">Soonest first</option>
          <option value="price">Price: low first</option>
        </select>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            data-testid={`events-category-${c.toLowerCase()}`}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${cat === c ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-paper-card text-ink/60 hover:border-ink'}`}
          >
            {c}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-3xl" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            icon={CalendarDays}
            title="No events match"
            body="Try clearing the search or picking another category."
            testid="events-empty"
          />
        </div>
      ) : (
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3" data-testid="events-grid">
          {list.map((ev) => (
            <EventCard key={ev.id} ev={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
