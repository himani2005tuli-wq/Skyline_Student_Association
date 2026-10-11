import { useState, Suspense } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingCart, LayoutDashboard } from 'lucide-react';
import { Logo } from '@/components/Logo';
import { PageSkeleton } from '@/components/ui/primitives';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const LINKS = [
  { to: '/clubs', label: 'Clubs' },
  { to: '/events', label: 'Events' },
  { to: '/membership', label: 'Membership' },
  { to: '/store', label: 'Store' },
  { to: '/announcements', label: 'Announcements' },
];


function Navbar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { count } = useCart();
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-paper/10 bg-ink/85 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8"
        aria-label="Main"
      >
        <Link to="/" data-testid="nav-home-link" aria-label="Altitude home">
          <Logo />
        </Link>
        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              data-testid={`nav-${l.label.toLowerCase()}-link`}
              className={({ isActive }) =>
                `font-mono text-[11px] font-medium uppercase tracking-[0.2em] transition-colors ${isActive ? 'text-accent' : 'text-paper/65 hover:text-paper'}`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="hidden items-center gap-3 lg:flex">
          <Link
            to="/checkout"
            data-testid="nav-cart-button"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-paper/20 text-paper transition hover:bg-paper/10"
            aria-label={`Cart, ${count} items`}
          >
            <ShoppingCart size={16} />
            {count > 0 && (
              <span
                data-testid="nav-cart-count"
                className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-white"
              >
                {count}
              </span>
            )}
          </Link>
          {user ? (
            <Link
              to="/dashboard"
              data-testid="nav-dashboard-button"
              className="inline-flex items-center gap-2 rounded-full bg-paper px-5 py-2.5 text-[13px] font-bold text-ink transition hover:bg-white"
            >
              <LayoutDashboard size={15} /> Dashboard
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                data-testid="nav-signin-link"
                className="rounded-full px-4 py-2.5 text-[13px] font-semibold text-paper/80 transition hover:text-paper"
              >
                Sign in
              </Link>
              <Link
                to="/membership"
                data-testid="nav-join-button"
                className="rounded-full bg-accent px-5 py-2.5 text-[13px] font-bold text-white shadow-[0_10px_24px_-10px_rgba(255,77,28,0.6)] transition hover:bg-accent-dark"
              >
                Join the club
              </Link>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 lg:hidden">
          <Link
            to="/checkout"
            data-testid="nav-cart-button-mobile"
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-paper/20 text-paper transition hover:bg-paper/10"
            aria-label={`Cart, ${count} items`}
          >
            <ShoppingCart size={16} />
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 font-mono text-[10px] font-bold text-white">
                {count}
              </span>
            )}
          </Link>
          <button
            className="flex h-10 w-10 items-center justify-center rounded-full border border-paper/20 text-paper"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
            aria-expanded={open}
            data-testid="nav-mobile-toggle"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden border-t border-paper/10 bg-ink lg:hidden"
            data-testid="nav-mobile-menu"
          >
            <div className="flex flex-col gap-1 px-5 py-4">
              {LINKS.map((l, i) => (
                <motion.div
                  key={l.to}
                  initial={{ x: -16, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <NavLink
                    to={l.to}
                    onClick={() => setOpen(false)}
                    className="block rounded-xl px-3 py-3 font-display text-2xl text-paper transition hover:bg-paper/5"
                  >
                    {l.label}
                  </NavLink>
                </motion.div>
              ))}
              <div className="mt-3 flex gap-3 px-3 pb-2">
                {user ? (
                  <Link
                    to="/dashboard"
                    onClick={() => setOpen(false)}
                    className="flex-1 rounded-full bg-paper py-3 text-center text-sm font-bold text-ink"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-full border border-paper/25 py-3 text-center text-sm font-semibold text-paper"
                    >
                      Sign in
                    </Link>
                    <Link
                      to="/membership"
                      onClick={() => setOpen(false)}
                      className="flex-1 rounded-full bg-accent py-3 text-center text-sm font-bold text-white"
                    >
                      Join
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

function Footer() {
  return (
    <footer className="noise relative overflow-hidden bg-ink text-paper" data-testid="site-footer">
      <div className="mx-auto max-w-7xl px-5 pb-10 pt-16 lg:px-8 lg:pt-20">
        <div className="grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-paper/55">
              The digital backbone of the Skyline Student Association — memberships, events,
              merchandise and money, in one calm place.
            </p>
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-paper/40">
              hello@skyline.edu · Student Center, Level 2
            </p>
          </div>
          <div className="md:col-span-2">
            <p className="eyebrow text-accent">Explore</p>
            <ul className="mt-4 space-y-2.5 text-sm text-paper/65">
              {LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="transition hover:text-accent"
                    data-testid={`footer-${l.label.toLowerCase()}-link`}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="md:col-span-2">
            <p className="eyebrow text-accent">Platform</p>
            <ul className="mt-4 space-y-2.5 text-sm text-paper/65">
              <li>
                <Link to="/login" className="transition hover:text-accent">
                  Sign in
                </Link>
              </li>
              <li>
                <Link to="/register" className="transition hover:text-accent">
                  Create account
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="transition hover:text-accent">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link to="/unauthorized" className="transition hover:text-accent">
                  Access help
                </Link>
              </li>
            </ul>
          </div>
          <div className="md:col-span-3">
            <p className="eyebrow text-accent">Office hours</p>
            <p className="mt-4 text-sm leading-relaxed text-paper/65">
              Tue & Fri, 4–6 PM at the club room. Or find us at every event — usually behind the QR
              scanner.
            </p>
          </div>
        </div>
        <p
          className="mt-16 select-none font-display text-[16vw] font-semibold leading-[0.8] text-paper/[0.05] lg:text-[11rem]"
          aria-hidden="true"
        >
          ALTITUDE
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-paper/10 pt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-paper/35">
          <span>© 2026 Skyline Student Association</span>
          <span>Run on Altitude · Built by the Tech Chapter</span>
        </div>
      </div>
    </footer>
  );
}

export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-paper">
      <Navbar />
      <main>
        <Suspense fallback={<PageSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
}
