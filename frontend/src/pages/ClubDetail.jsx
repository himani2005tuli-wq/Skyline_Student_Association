import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarDays,
  Ticket,
  Megaphone,
  ShieldCheck,
  Check,
  Sparkles,
  Share2,
  Clock,
  MapPin,
  ArrowUpRight,
  HeartHandshake,
  Building2,
  Users,
} from 'lucide-react';
import { clubsApi, checkoutApi } from '@/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { Badge, Skeleton, EmptyState } from '@/components/ui/primitives';
import { Button } from '@/components/ui/Button';
import { Reveal } from '@/components/Reveal';
import { inr, fmtDate } from '@/lib/format';

function getClubTheme(club) {
  const slug = (club?.slug || '').toLowerCase();
  if (slug.includes('tech') || slug.includes('robotics')) {
    return {
      gradient: 'from-blue-600 via-indigo-600 to-violet-700',
      icon: '⚡',
      category: 'Technology & Code',
    };
  }
  if (slug.includes('green') || slug.includes('eco')) {
    return {
      gradient: 'from-emerald-600 via-teal-600 to-green-700',
      icon: '🌿',
      category: 'Sustainability & Nature',
    };
  }
  if (slug.includes('culture') || slug.includes('art')) {
    return {
      gradient: 'from-rose-500 via-pink-600 to-purple-700',
      icon: '🎭',
      category: 'Arts & Culture',
    };
  }
  if (slug.includes('debate') || slug.includes('literary')) {
    return {
      gradient: 'from-amber-500 via-orange-600 to-amber-700',
      icon: '🎙️',
      category: 'Debate & Leadership',
    };
  }
  return {
    gradient: 'from-slate-700 via-slate-800 to-zinc-900',
    icon: '🏛️',
    category: 'Student Chapter',
  };
}

export default function ClubDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setPlanIntent } = useCart();
  const [activeTab, setActiveTab] = useState('plans');

  const { data: club, isLoading, isError } = useQuery({
    queryKey: ['club', id],
    queryFn: () => clubsApi.detail(id),
  });

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Chapter link copied to clipboard!');
    }
  };

  const choosePlan = async (plan) => {
    if (!user) {
      navigate('/login', { state: { from: `/clubs/${id}` } });
      return;
    }
    try {
      await checkoutApi.beginPlan(plan.id);
      const price = (plan.priceInPaise || 50000) / 100;
      setPlanIntent(plan.id, `${club?.name} - ${plan.name}`, price);
      navigate('/checkout');
    } catch (err) {
      toast.error('Unable to initialize plan checkout. Please try again.');
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8">
        <Skeleton className="h-4 w-32" />
        <div className="mt-8 grid gap-8 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="mt-8 h-10 w-64" />
            <Skeleton className="mt-4 h-6 w-full" />
            <Skeleton className="mt-2 h-6 w-3/4" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-80 w-full rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !club) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-32 text-center">
        <Building2 className="mx-auto h-16 w-16 text-ink/30" />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">Chapter Not Found</h1>
        <p className="mt-2 text-sm text-ink/60">
          We couldn't locate this student club or organization. It may have been archived or renamed.
        </p>
        <Link
          to="/clubs"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-ink px-6 py-2.5 text-sm font-semibold text-paper"
        >
          <ArrowLeft size={16} /> Back to all clubs
        </Link>
      </div>
    );
  }

  const theme = getClubTheme(club);
  const plans = club.membershipPlans || [];
  const events = club.events || [];
  const announcements = club.announcements || [];

  return (
    <div className="mx-auto max-w-7xl px-5 pb-24 pt-28 lg:px-8" data-testid="club-detail-page">
      {/* Back Link & Breadcrumb */}
      <Link
        to="/clubs"
        className="inline-flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-[0.18em] text-ink/50 transition hover:text-ink"
        data-testid="back-to-clubs-link"
      >
        <ArrowLeft size={14} /> All Clubs & Chapters
      </Link>

      {/* Hero Section */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-ink/10 bg-paper-card p-6 shadow-card sm:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div
              className={`flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-3xl bg-gradient-to-br ${theme.gradient} text-4xl shadow-xl text-white`}
            >
              <span>{theme.icon}</span>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <Badge tone="success" className="font-mono text-[10px] uppercase tracking-wider">
                  <ShieldCheck size={12} className="inline mr-1" />
                  Official Chapter
                </Badge>
                <Badge tone="dark">{theme.category}</Badge>
                <span className="font-mono text-xs text-ink/40">#{club.slug}</span>
              </div>

              <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
                {club.name}
              </h1>

              <p className="mt-3.5 max-w-3xl text-base leading-relaxed text-ink/70">
                {club.description || 'Dedicated student organization operating under Skyline Student Association charter.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-paper px-4 py-2 text-xs font-semibold text-ink shadow-sm transition hover:border-ink/40"
            title="Share Chapter"
          >
            <Share2 size={13} /> Share Chapter
          </button>
        </div>

        {/* Quick Highlights Counters Strip */}
        <div className="mt-8 flex flex-wrap gap-3 border-t border-ink/8 pt-6">
          <span className="inline-flex items-center gap-2 rounded-2xl border border-ink/8 bg-ink/[0.03] px-4 py-2 text-sm text-ink/70">
            <Ticket size={16} className="text-accent" />
            <strong className="text-ink font-bold">{plans.length}</strong> Membership {plans.length === 1 ? 'Tier' : 'Tiers'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl border border-ink/8 bg-ink/[0.03] px-4 py-2 text-sm text-ink/70">
            <CalendarDays size={16} className="text-accent" />
            <strong className="text-ink font-bold">{events.length}</strong> Upcoming {events.length === 1 ? 'Event' : 'Events'}
          </span>
          <span className="inline-flex items-center gap-2 rounded-2xl border border-ink/8 bg-ink/[0.03] px-4 py-2 text-sm text-ink/70">
            <Megaphone size={16} className="text-accent" />
            <strong className="text-ink font-bold">{announcements.length}</strong> Published Bulletins
          </span>
        </div>
      </div>

      {/* Main Grid: Tabs and Sidebar */}
      <div className="mt-10 grid gap-10 lg:grid-cols-12">
        {/* Left Column: Interactive Navigation Tabs & Content */}
        <div className="lg:col-span-8">
          <div className="flex border-b border-ink/10 pb-2 gap-2" role="tablist">
            <button
              onClick={() => setActiveTab('plans')}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                activeTab === 'plans'
                  ? 'bg-ink text-paper shadow-sm'
                  : 'text-ink/60 hover:text-ink hover:bg-paper-card'
              }`}
            >
              Membership Plans ({plans.length})
            </button>
            <button
              onClick={() => setActiveTab('events')}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                activeTab === 'events'
                  ? 'bg-ink text-paper shadow-sm'
                  : 'text-ink/60 hover:text-ink hover:bg-paper-card'
              }`}
            >
              Upcoming Events ({events.length})
            </button>
            <button
              onClick={() => setActiveTab('announcements')}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${
                activeTab === 'announcements'
                  ? 'bg-ink text-paper shadow-sm'
                  : 'text-ink/60 hover:text-ink hover:bg-paper-card'
              }`}
            >
              Bulletins ({announcements.length})
            </button>
          </div>

          {/* TAB 1: MEMBERSHIP PLANS */}
          {activeTab === 'plans' && (
            <div className="mt-8 space-y-6">
              {plans.length === 0 ? (
                <EmptyState
                  icon={Ticket}
                  title="No active membership tiers"
                  description="This club currently has free open enrollment or plans are being updated."
                />
              ) : (
                <div className="grid gap-6 sm:grid-cols-2">
                  {plans.map((p, idx) => {
                    const price = (p.priceInPaise || 0) / 100;
                    const benefitsList = Array.isArray(p.benefits)
                      ? p.benefits
                      : ['Official voting rights in elections', 'Access to member-only workshops', 'Discounted merchandise & priority tickets'];

                    return (
                      <div
                        key={p.id}
                        className="flex flex-col rounded-3xl border border-ink/10 bg-paper-card p-6 shadow-card transition-all duration-300 hover:shadow-lift"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
                            {p.durationDays} Days Active
                          </span>
                          <Badge tone="accent">Official Tier</Badge>
                        </div>

                        <h3 className="mt-3 font-display text-2xl font-bold text-ink">
                          {p.name}
                        </h3>
                        <p className="mt-1 text-xs text-ink/60">
                          {p.description || 'Full annual chapter membership.'}
                        </p>

                        <div className="mt-6 flex items-baseline gap-1 border-t border-ink/8 pt-5">
                          <span className="font-display text-3xl font-extrabold text-ink">
                            {price === 0 ? 'Free' : inr(price)}
                          </span>
                          <span className="text-xs text-ink/50">/ academic year</span>
                        </div>

                        <ul className="mt-5 space-y-2.5 text-xs text-ink/75 flex-1">
                          {benefitsList.map((b, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <Check size={14} className="mt-0.5 text-success flex-shrink-0" />
                              <span>{typeof b === 'string' ? b : JSON.stringify(b)}</span>
                            </li>
                          ))}
                        </ul>

                        <button
                          onClick={() => choosePlan(p)}
                          className="mt-6 w-full rounded-full bg-ink py-3 text-center text-xs font-bold uppercase tracking-wider text-paper transition hover:bg-accent hover:text-white"
                        >
                          Join {club.name}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EVENTS */}
          {activeTab === 'events' && (
            <div className="mt-8 space-y-4">
              {events.length === 0 ? (
                <EmptyState
                  icon={CalendarDays}
                  title="No upcoming events"
                  description="This chapter has no public events scheduled right now. Check back soon!"
                />
              ) : (
                events.map((ev) => (
                  <Link
                    key={ev.id}
                    to={`/events/${ev.id}`}
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-paper-card p-6 shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-ink/30 hover:shadow-lift"
                  >
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-ink/50">
                        <CalendarDays size={13} className="text-accent" />
                        <span>{fmtDate(ev.startDate)}</span>
                        {ev.location && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-1">
                              <MapPin size={12} /> {ev.location}
                            </span>
                          </>
                        )}
                      </div>
                      <h4 className="mt-2 font-display text-xl font-semibold text-ink group-hover:text-accent transition-colors">
                        {ev.title}
                      </h4>
                      <p className="mt-1 text-xs text-ink/60 line-clamp-1">
                        {ev.description || 'Student event.'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      <span className="font-mono text-xs font-semibold text-ink/70">
                        View Event
                      </span>
                      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink group-hover:bg-accent group-hover:text-white transition">
                        <ArrowUpRight size={14} />
                      </span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          )}

          {/* TAB 3: ANNOUNCEMENTS */}
          {activeTab === 'announcements' && (
            <div className="mt-8 space-y-4">
              {announcements.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No bulletins posted"
                  description="No public announcements posted yet by this chapter."
                />
              ) : (
                announcements.map((a) => (
                  <article
                    key={a.id}
                    className="rounded-3xl border border-ink/10 bg-paper-card p-6 shadow-card"
                  >
                    <div className="flex items-center justify-between">
                      <Badge tone="dark">Bulletin</Badge>
                      <span className="font-mono text-xs text-ink/40">
                        {fmtDate(a.createdAt)}
                      </span>
                    </div>
                    <h4 className="mt-3 font-display text-xl font-semibold text-ink">
                      {a.title}
                    </h4>
                    <p className="mt-2 text-sm leading-relaxed text-ink/70">
                      {a.content}
                    </p>
                  </article>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column: Chapter Charter & Affiliation Info */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-3xl border border-ink/10 bg-paper-card p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold text-ink">Chapter Charter</h3>
            <p className="mt-2 text-xs leading-relaxed text-ink/65">
              This organization is officially registered and ratified under the Skyline Student
              Association constitution. All dues collected are deposited straight into the chapter's
              supervised treasury ledger.
            </p>

            <div className="mt-6 space-y-3.5 border-t border-ink/8 pt-5 text-xs text-ink/75">
              <div className="flex items-center justify-between">
                <span className="text-ink/50">Charter Status</span>
                <span className="font-semibold text-success flex items-center gap-1">
                  <ShieldCheck size={13} /> Active & Good Standing
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/50">Audited Ledger</span>
                <span className="font-mono font-medium text-ink">Verified</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-ink/50">Meeting Location</span>
                <span className="font-medium text-ink">Student Union, Level 2</span>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-accent/20 bg-accent-soft/30 p-6">
            <Sparkles className="h-6 w-6 text-accent" />
            <h4 className="mt-3 font-display text-base font-semibold text-ink">
              Student Membership Benefits
            </h4>
            <p className="mt-1.5 text-xs text-ink/70 leading-relaxed">
              Joining a chapter unlocks specialized workshops, mentorship networks, and discounted
              access to Skyline's marquee annual events.
            </p>
            <Link
              to="/membership"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-accent-dark hover:underline"
            >
              Learn about campus-wide membership →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
