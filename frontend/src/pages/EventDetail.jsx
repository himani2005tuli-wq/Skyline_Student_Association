import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, CalendarDays, Clock, MapPin, User, Minus, Plus, Ticket } from 'lucide-react';
import { eventsApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Badge, Skeleton, ProgressBar } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { SmartImage } from '@/components/ui/SmartImage';
import { inr, fmtDate } from '@/lib/format';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setTicketIntent } = useCart();
  const { data: ev, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsApi.detail(id),
  });
  const [qty, setQty] = useState(1);
  const [typeId, setTypeId] = useState(null);

  if (isLoading) {
    return (
      <div
        className="mx-auto max-w-7xl px-5 pt-28 lg:px-8"
        role="status"
        aria-label="Loading event"
        data-testid="event-skeleton"
      >
        <Skeleton className="h-3 w-24" />
        <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <Skeleton className="aspect-[16/10] w-full rounded-3xl" />
            <Skeleton className="mt-8 h-6 w-32 rounded-full" />
            <Skeleton className="mt-4 h-12 w-3/4" />
            <Skeleton className="mt-5 h-3 w-full" />
            <Skeleton className="mt-2 h-3 w-5/6" />
          </div>
          <div className="lg:col-span-5">
            <Skeleton className="h-[28rem] rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  const left = ev.capacity - ev.sold;
  const pctSold = Math.round((ev.sold / ev.capacity) * 100);
  const soldOut = left <= 0;
  const isMember = user?.role === 'member';
  const selected = ev.ticketTypes.find((t) => t.id === (typeId || defaultType(ev, isMember)));
  const price = selected ? selected.price * Math.min(qty, left || 1) : 0;

  async function book() {
    if (!user) {
      toast('Sign in to book — member pricing applies automatically.', {
        description: 'You can also continue as a guest at checkout.',
        action: {
          label: 'Sign in',
          onClick: () => navigate('/login', { state: { from: `/events/${id}` } }),
        },
      });
      return;
    }
    const n = Math.min(qty, left || 1);
    try {
      await eventsApi.hold(ev.id, selected.id, n);
    } catch (e) {
      toast.error(e.friendly || 'Could not reserve those seats.');
      return;
    }
    setTicketIntent(ev.id, ev.title, selected.id, selected.label, selected.price, n);
    navigate('/checkout');
  }

  const bookLabel = soldOut ? 'Sold out' : `Book tickets · ${price === 0 ? 'Free' : inr(price)}`;

  return (
    <div
      className="mx-auto max-w-7xl px-5 pb-32 pt-24 lg:px-8 lg:pb-24"
      data-testid="event-detail-page"
    >
      <Link
        to="/events"
        data-testid="event-back-link"
        className="mt-4 inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50 transition hover:text-ink"
      >
        <ArrowLeft size={14} /> All events
      </Link>
      <div className="mt-6 grid gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-7">
          <SmartImage
            src={ev.poster}
            alt={ev.title}
            wrapperClassName="rounded-3xl shadow-card"
            className="aspect-[16/10] w-full object-cover"
          />
          <div className="mt-8">
            <div className="flex flex-wrap gap-2">
              <Badge tone="dark">{ev.category}</Badge>
              {soldOut ? (
                <Badge tone="danger">Sold out</Badge>
              ) : (
                <Badge tone="success">Registration open</Badge>
              )}
              {isMember && <Badge tone="accent">Member pricing active</Badge>}
            </div>
            <h1 className="mt-4 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl lg:text-5xl">
              {ev.title}
            </h1>
            <p className="mt-5 max-w-2xl text-sm leading-relaxed text-ink/65 sm:text-base">
              {ev.desc}
            </p>
            <dl className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                {
                  icon: CalendarDays,
                  label: 'Date',
                  value: fmtDate(ev.date, {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }),
                },
                { icon: Clock, label: 'Time', value: ev.time },
                { icon: MapPin, label: 'Venue', value: ev.venue },
                { icon: User, label: 'Organizer', value: ev.organizer },
              ].map((r) => (
                <div
                  key={r.label}
                  className="flex items-start gap-3 rounded-2xl border border-ink/10 bg-paper-card p-4"
                >
                  <r.icon size={16} className="mt-0.5 text-accent" />
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/40">
                      {r.label}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-ink">{r.value}</dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <aside className="lg:col-span-5">
          <div
            className="rounded-3xl border border-ink/10 bg-paper-card p-5 shadow-card sm:p-7 lg:sticky lg:top-24"
            data-testid="event-booking-card"
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-semibold text-ink">Tickets</h2>
              <p className="font-mono text-xs text-ink/45">
                {ev.sold} / {ev.capacity} sold
              </p>
            </div>
            <ProgressBar value={ev.sold} max={ev.capacity} className="mt-3" />
            <p className="mt-2 text-xs text-ink/50">
              {soldOut ? 'Waitlist only.' : `${left} left at this price.`}
            </p>

            <div className="mt-6 space-y-3">
              {ev.ticketTypes.map((t) => {
                const active = (typeId || defaultType(ev, isMember)) === t.id;
                const discountPct =
                  isMember && t.memberOnly
                    ? Math.round(
                        ((t.price - selectedPriceFor(t, isMember)) / Math.max(t.price, 1)) * 100,
                      )
                    : 0;
                const shown = shownPrice(t, isMember);
                return (
                  <button
                    key={t.id}
                    onClick={() => setTypeId(t.id)}
                    data-testid={`event-ticket-type-${t.id}`}
                    className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${active ? 'border-accent bg-accent-soft/60' : 'border-ink/12 bg-white hover:border-ink/30'}`}
                  >
                    <div>
                      <p className="text-sm font-bold text-ink">{t.label}</p>
                      {t.memberOnly && (
                        <p className="mt-0.5 text-[11px] text-ink/50">Requires active membership</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-sm font-bold text-ink">
                        {shown === 0 ? 'Free' : inr(shown)}
                      </p>
                      {isMember && t.memberOnly && t.price > 0 && (
                        <p className="text-[11px] text-success">
                          {inr(t.price)} <span className="line-through">non-member</span>
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm font-semibold text-ink">Quantity</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  aria-label="Decrease quantity"
                  data-testid="ticket-qty-minus"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 transition hover:bg-ink hover:text-paper"
                >
                  <Minus size={14} />
                </button>
                <span
                  className="w-8 text-center font-mono font-bold"
                  data-testid="ticket-qty-value"
                >
                  {qty}
                </span>
                <button
                  onClick={() => setQty(Math.min(Math.max(left, 1), qty + 1))}
                  aria-label="Increase quantity"
                  data-testid="ticket-qty-plus"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 transition hover:bg-ink hover:text-paper"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <Button
              onClick={book}
              disabled={soldOut}
              loadingText="Checking availability…"
              flash={false}
              className="mt-6 w-full"
              size="lg"
              icon={Ticket}
              data-testid="event-book-button"
            >
              {bookLabel}
            </Button>
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40">
              Pricing & availability confirmed by the server at checkout
            </p>
          </div>
        </aside>
      </div>

      {/* mobile sticky action bar */}
      <div
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/92 px-4 py-3 backdrop-blur-md lg:hidden"
        data-testid="event-mobile-bar"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-ink">
              {selected?.label} × {qty}
            </p>
            <p className="font-mono text-sm font-bold text-ink">
              {price === 0 ? 'Free' : inr(price)}
            </p>
          </div>
          <Button
            onClick={book}
            disabled={soldOut}
            loadingText="Checking…"
            flash={false}
            size="md"
            icon={Ticket}
            className="shrink-0"
            data-testid="event-book-button-mobile"
          >
            {soldOut ? 'Sold out' : 'Book'}
          </Button>
        </div>
      </div>
    </div>
  );
}

function defaultType(ev, isMember) {
  const pref = isMember
    ? ev.ticketTypes.find((t) => t.memberOnly)
    : ev.ticketTypes.find((t) => !t.memberOnly);
  return (pref || ev.ticketTypes[0]).id;
}
function memberPct(user) {
  if (user?.role !== 'member') return 0;
  return user.plan === 'Alumni Circle' ? 25 : 20;
}
function shownPrice(t, isMember) {
  return isMember && t.memberOnly ? Math.round(t.price * (1 - 0.2)) : t.price;
}
function selectedPriceFor(t, isMember) {
  return shownPrice(t, isMember);
}
