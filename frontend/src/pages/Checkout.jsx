import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ShieldCheck,
  Minus,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  Ticket,
  Package,
  IdCard,
  Lock,
  CreditCard,
  Smartphone,
  X,
  ArrowRight,
} from 'lucide-react';
import { quote, checkoutApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Button } from '@/components/ui/Button';
import { Badge, EmptyState } from '@/components/ui/primitives';
import PriceBreakdown from '@/components/ui/PriceBreakdown';
import { SmartImage } from '@/components/ui/SmartImage';
import { inr } from '@/lib/format';
import { Logo } from '@/components/Logo';

const KIND_META = {
  ticket: { icon: Ticket, title: 'Event tickets' },
  plan: { icon: IdCard, title: 'Membership' },
  merch: { icon: Package, title: 'Merchandise order' },
};

export default function Checkout() {
  const navigate = useNavigate();
  const { user, refreshPoints } = useAuth();
  const { items, intent, setQty, removeItem, clear, merchTotal, count } = useCart();
  const [redeem, setRedeem] = useState(false);
  const [paying, setPaying] = useState(false);
  const [done, setDone] = useState(null);
  const [countdown, setCountdown] = useState(3);

  const kind = intent?.kind || (items.length ? 'merch' : null);

  // Auto-redirect to the respective page after purchase
  useEffect(() => {
    if (!done) return;
    const effectiveKind = done.purchasedKind || kind || 'ticket';
    const targetPath =
      effectiveKind === 'ticket'
        ? '/member/tickets'
        : effectiveKind === 'plan'
          ? '/member/membership'
          : '/member/orders';

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          navigate(targetPath, { replace: true });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [done, kind, navigate]);

  const quoteKey = [
    'quote',
    kind,
    intent?.eventId,
    intent?.typeId,
    intent?.planId,
    merchTotal,
    count,
    user?.role,
    user?.plan,
    user?.points,
    redeem,
  ];
  const { data: quoteData } = useQuery({
    queryKey: quoteKey,
    queryFn: async () => {
      if (kind === 'merch') return quote({ kind, price: merchTotal, qty: 1 }, user, redeem);
      if (kind === 'ticket')
        return quote({ kind, price: intent?.price || 0, qty: intent?.qty || 1 }, user, redeem);
      if (kind === 'plan')
        return quote({ kind, price: intent?.price || 0, qty: 1, planId: intent?.planId }, user, redeem);
      return null;
    },
  });

  const handleInitiatePay = () => {
    if (!user && kind === 'plan') {
      toast.error('Sign in to purchase a membership.');
      return;
    }
    executePayment();
  };

  const executePayment = async () => {
    setPaying(true);
    const currentKind = kind || 'ticket';
    try {
      const payload =
        kind === 'merch'
          ? { kind, price: merchTotal, qty: 1, redeem, items }
          : kind === 'ticket'
            ? { kind, ...intent, price: intent?.price, qty: intent?.qty, redeem }
            : { kind, ...intent, planId: intent?.planId, redeem };
      const res = await checkoutApi.pay(payload, user);
      const newBalance = checkoutApi.pointsAfterPayment(user, res.breakdown);
      if (user) refreshPoints(newBalance);
      setDone({ ...res, purchasedKind: currentKind, newBalance: user ? newBalance : null });
      clear();
      toast.success('Payment completed successfully!');
    } catch (e) {
      toast.error(e.friendly || e.message || 'Payment failed. No money moved.');
      return false;
    } finally {
      setPaying(false);
    }
  };

  /* ---------- success ---------- */
  if (done) {
    const effectiveKind = done.purchasedKind || kind || 'ticket';
    const meta = KIND_META[effectiveKind] || KIND_META.ticket;
    const destinationPath =
      effectiveKind === 'ticket'
        ? '/member/tickets'
        : effectiveKind === 'plan'
          ? '/member/membership'
          : '/member/orders';
    const destinationLabel =
      effectiveKind === 'ticket'
        ? 'Go to My Tickets'
        : effectiveKind === 'plan'
          ? 'Go to My Membership'
          : 'Go to My Orders';

    return (
      <div
        className="mx-auto flex min-h-screen max-w-2xl flex-col items-center justify-center px-5 py-16 text-center"
        data-testid="checkout-success"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-success">
          <CheckCircle2 size={30} />
        </span>
        <h1 className="mt-6 font-display text-4xl font-medium tracking-tight text-ink">
          Payment confirmed.
        </h1>
        <p className="mt-2 text-sm text-ink/55">
          Reference <span className="font-mono font-bold text-ink">{done.ref}</span> · {meta.title}{' '}
          · {new Date(done.paidAt).toLocaleString('en-IN')}
        </p>

        {/* Auto-redirect countdown banner */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5 font-mono text-xs font-semibold text-accent-dark">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
          <span>
            Redirecting to {effectiveKind === 'ticket' ? 'My Tickets' : effectiveKind === 'plan' ? 'My Membership' : 'My Orders'} in {countdown}s…
          </span>
        </div>

        <div className="mt-6 w-full text-left">
          <PriceBreakdown quote={done.breakdown} testid="success-price-breakdown" />
        </div>
        {done.newBalance !== null && (
          <div
            className="mt-4 flex w-full items-center justify-between rounded-2xl bg-ink px-5 py-4 text-paper"
            data-testid="success-points-note"
          >
            <span className="flex items-center gap-2 text-sm">
              <Sparkles size={15} className="text-accent" /> Loyalty balance after this purchase
            </span>
            <span className="font-mono font-bold">{done.newBalance} pts</span>
          </div>
        )}
        {kind === 'ticket' && user && (
          <p className="mt-4 text-sm text-ink/60">
            Your QR ticket is ready in My Tickets — flash it at the entrance scanner.
          </p>
        )}
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {user ? (
            <Button onClick={() => navigate(destinationPath)} data-testid="success-view-tickets">
              {destinationLabel}
            </Button>
          ) : (
            <Button onClick={() => navigate('/login')} data-testid="success-signin">
              Sign in
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => navigate('/store')}
            data-testid="success-back-store"
          >
            Back to store
          </Button>
          {user && (
            <Button variant="ghost" onClick={() => navigate('/dashboard')}>
              Dashboard
            </Button>
          )}
        </div>
      </div>
    );
  }

  /* ---------- empty ---------- */
  if (!kind) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-32">
        <EmptyState
          icon={Package}
          title="Your cart is empty"
          body="Grab a hoodie, book a gala table or pick a membership plan — then come back here."
          action={
            <Link
              to="/store"
              data-testid="checkout-empty-store-link"
              className="rounded-full bg-ink px-6 py-3 text-sm font-bold text-paper"
            >
              Browse the store
            </Link>
          }
          testid="checkout-empty"
        />
      </div>
    );
  }

  const meta = KIND_META[kind];
  return (
    <div className="min-h-screen bg-paper" data-testid="checkout-page">
      <header className="sticky top-0 z-40 border-b border-ink/8 bg-paper/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <Link to="/" aria-label="Altitude home">
            <Logo dark />
          </Link>
          <span className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink/50">
            <Lock size={12} /> Secure checkout
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 pb-32 pt-8 sm:pt-10 lg:pb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
            Checkout
          </h1>
          {user && (
            <Link
              to="/member/tickets"
              className="inline-flex items-center gap-1.5 rounded-full border border-ink/10 bg-white px-4 py-2 text-xs font-semibold text-ink shadow-xs transition hover:bg-paper-card hover:text-accent-dark"
              data-testid="checkout-header-my-tickets"
            >
              <Ticket size={14} className="text-accent" /> View My Tickets
            </Link>
          )}
        </div>
        {!user && (
          <div
            className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-accent/30 bg-accent-soft px-5 py-4"
            data-testid="checkout-signin-banner"
          >
            <p className="text-sm font-semibold text-ink">
              Have an account? Members save on every purchase and earn points.
            </p>
            <Link
              to="/login"
              state={{ from: '/checkout' }}
              data-testid="checkout-signin-link"
              className="rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-paper"
            >
              Sign in
            </Link>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div
              className="rounded-3xl border border-ink/10 bg-paper-card p-6 shadow-card"
              data-testid="checkout-items"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-paper">
                  <meta.icon size={17} />
                </span>
                <h2 className="font-display text-xl font-semibold text-ink">{meta.title}</h2>
              </div>
              {kind === 'merch' ? (
                <ul className="mt-5 divide-y divide-ink/6">
                  {items.map((it) => (
                    <li
                      key={`${it.productId}-${it.size}`}
                      className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4 sm:flex-nowrap"
                      data-testid="checkout-merch-line"
                    >
                      <SmartImage
                        src={it.image}
                        alt={it.name}
                        wrapperClassName="h-16 w-16 shrink-0 rounded-xl"
                        className="h-16 w-16 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-ink">{it.name}</p>
                        <p className="font-mono text-xs text-ink/50">
                          Size {it.size} · {inr(it.price)}
                        </p>
                      </div>
                      <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setQty(it.productId, it.size, it.qty - 1)}
                            aria-label="Decrease"
                            data-testid="cart-qty-minus"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 transition hover:bg-ink hover:text-paper sm:h-8 sm:w-8"
                          >
                            <Minus size={12} />
                          </button>
                          <span
                            className="w-6 text-center font-mono text-sm font-bold"
                            data-testid="cart-qty-value"
                          >
                            {it.qty}
                          </span>
                          <button
                            onClick={() => setQty(it.productId, it.size, it.qty + 1)}
                            aria-label="Increase"
                            data-testid="cart-qty-plus"
                            className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 transition hover:bg-ink hover:text-paper sm:h-8 sm:w-8"
                          >
                            <Plus size={12} />
                          </button>
                        </div>
                        <p className="w-20 text-right font-mono text-sm font-bold text-ink">
                          {inr(it.price * it.qty)}
                        </p>
                        <button
                          onClick={() => removeItem(it.productId, it.size)}
                          aria-label="Remove item"
                          data-testid="cart-remove-item"
                          className="flex h-9 w-9 items-center justify-center rounded-full text-ink/35 transition hover:bg-danger-soft hover:text-danger"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : kind === 'ticket' ? (
                <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink" data-testid="checkout-ticket-event">
                        {intent.eventTitle}
                      </p>
                      <p className="mt-1 font-mono text-xs text-ink/50">
                        {intent.typeLabel} × {intent.qty}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-bold text-ink">
                      {inr(intent.price * intent.qty)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-ink/10 bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-ink" data-testid="checkout-plan-name">
                        {intent.planName} membership
                      </p>
                      <p className="mt-1 text-xs text-ink/50">
                        Member discounts & points start immediately
                      </p>
                    </div>
                    <p className="font-mono text-sm font-bold text-ink">{inr(intent.price)}</p>
                  </div>
                </div>
              )}

              {user?.points > 0 && quoteData && quoteData.maxRedeemable > 0 && (
                <label
                  className="mt-6 flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-success/30 bg-success-soft p-5"
                  data-testid="checkout-redemption-box"
                >
                  <span>
                    <span className="flex items-center gap-2 text-sm font-bold text-ink">
                      <Sparkles size={15} className="text-success" /> Redeem loyalty points
                    </span>
                    <span className="mt-1 block text-xs text-ink/60">
                      Balance <b>{user.points} pts</b> — up to {quoteData.maxRedeemable} pts (
                      {inr(quoteData.maxRedeemable)}) on this purchase. 1 pt = ₹1.
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={redeem}
                    onChange={() => setRedeem(!redeem)}
                    data-testid="checkout-redeem-toggle"
                    className="mt-1 h-5 w-5 accent-[#178A50]"
                  />
                </label>
              )}
              {user &&
                user.points > 0 &&
                quoteData &&
                quoteData.maxRedeemable === 0 &&
                kind === 'plan' && (
                  <p
                    className="mt-6 rounded-2xl bg-ink/[0.04] px-5 py-4 text-xs text-ink/55"
                    data-testid="checkout-redemption-note"
                  >
                    Points redemption opens once membership pricing is confirmed by the server.
                  </p>
                )}
            </div>
          </div>

          <aside className="lg:col-span-5">
            <div className="space-y-4 lg:sticky lg:top-24">
              <PriceBreakdown quote={quoteData} testid="checkout-price-breakdown" />

              <Button
                onClick={handleInitiatePay}
                loading={paying}
                loadingText="Processing payment…"
                size="lg"
                icon={ShieldCheck}
                className="hidden w-full lg:inline-flex"
                data-testid="checkout-pay-button"
              >
                {quoteData ? `Pay ${inr(quoteData.final)}` : 'Pay'}
              </Button>
              <p className="hidden text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink/40 lg:block">
                Secure checkout — pricing verified by server
              </p>
            </div>
          </aside>
        </div>
      </div>

      {/* mobile sticky pay bar */}
      <div
        className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-paper/92 px-4 py-3 backdrop-blur-md lg:hidden"
        data-testid="checkout-mobile-bar"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink/45">
              Total due
            </p>
            <p
              className="font-mono text-base font-bold text-ink"
              data-testid="checkout-mobile-total"
            >
              {quoteData ? inr(quoteData.final) : '—'}
            </p>
          </div>
          <Button
            onClick={handleInitiatePay}
            loading={paying}
            loadingText="Processing…"
            size="md"
            icon={ShieldCheck}
            className="shrink-0"
            data-testid="checkout-pay-button-mobile"
          >
            Pay now
          </Button>
        </div>
      </div>
    </div>
  );
}
