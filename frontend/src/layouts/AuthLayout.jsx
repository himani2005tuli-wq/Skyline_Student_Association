import { Outlet, Link, Navigate } from 'react-router-dom';
import { Logo } from '@/components/Logo';
import { CLUB } from '@/data/mock';
import { useAuth } from '@/context/AuthContext';

export default function AuthLayout() {
  const { user } = useAuth();

  // If already authenticated, redirect to corresponding role dashboard
  if (user) {
    const roleRoutes = {
      super_admin: '/system',
      admin: '/admin',
      treasurer: '/treasury',
      event_manager: '/manage',
      volunteer: '/volunteer',
      member: '/member',
    };
    return <Navigate to={roleRoutes[user.role] || '/member'} replace />;
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="noise relative hidden flex-col justify-between overflow-hidden bg-ink p-10 text-paper lg:flex">
        <Link to="/" aria-label="Back home" data-testid="auth-brand-link">
          <Logo />
        </Link>
        <div className="relative z-10">
          <p className="eyebrow text-accent">{CLUB.name}</p>
          <h1 className="mt-6 max-w-md font-display text-5xl font-medium leading-[1.05] tracking-tight">
            Where good clubs <em className="font-light italic text-accent">run themselves.</em>
          </h1>
          <p className="mt-6 max-w-sm text-sm leading-relaxed text-paper/60">
            One login for memberships, tickets, merchandise, tasks and money — so the committee can
            get back to the fun parts.
          </p>
        </div>
        <div className="relative z-10 flex gap-10 font-mono text-xs uppercase tracking-[0.18em] text-paper/45">
          <div>
            <p className="text-2xl text-paper">{CLUB.stats.members}</p>members
          </div>
          <div>
            <p className="text-2xl text-paper">{CLUB.stats.eventsPerYear}</p>events a year
          </div>
          <div>
            <p className="text-2xl text-paper">{CLUB.stats.volunteers}</p>volunteers
          </div>
        </div>
        <svg
          className="absolute bottom-0 left-0 w-full opacity-25"
          viewBox="0 0 600 200"
          aria-hidden="true"
        >
          <path
            d="M0 200 L120 90 L200 150 L300 40 L380 130 L460 70 L600 200"
            fill="none"
            stroke="#FF4D1C"
            strokeWidth="2"
          />
          <path
            d="M0 200 L120 110 L200 165 L300 70 L380 150 L460 95 L600 200"
            fill="none"
            stroke="#F6F2E9"
            strokeWidth="1"
            opacity="0.4"
          />
        </svg>
      </div>
      <div className="flex flex-col bg-paper">
        <div className="flex items-center justify-between p-5 lg:hidden">
          <Link to="/" aria-label="Back home">
            <Logo dark />
          </Link>
          <Link to="/" className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink/50">
            Back to site
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-5 py-10 lg:px-16">
          <div className="w-full max-w-md">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
