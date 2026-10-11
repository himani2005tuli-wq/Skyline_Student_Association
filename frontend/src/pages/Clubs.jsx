import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Compass,
  Search,
  Users,
  CalendarDays,
  Ticket,
  ArrowUpRight,
  ShieldCheck,
  Megaphone,
  Sparkles,
  Layers,
  Building2,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { clubsApi } from '@/api';
import { Badge, Skeleton, EmptyState } from '@/components/ui/primitives';
import { Reveal } from '@/components/Reveal';

const CATEGORIES = [
  'All',
  'Technology & Code',
  'Sustainability & Nature',
  'Arts & Culture',
  'Debate & Leadership',
];

function getClubMeta(club) {
  const slug = (club.slug || '').toLowerCase();
  if (slug.includes('tech') || slug.includes('robotics')) {
    return {
      category: 'Technology & Code',
      gradient: 'from-blue-600 via-indigo-600 to-violet-700',
      glow: 'rgba(99, 102, 241, 0.25)',
      accent: 'text-indigo-600',
      badgeTone: 'info',
      icon: '⚡',
    };
  }
  if (slug.includes('green') || slug.includes('eco') || slug.includes('nature')) {
    return {
      category: 'Sustainability & Nature',
      gradient: 'from-emerald-600 via-teal-600 to-green-700',
      glow: 'rgba(16, 185, 129, 0.25)',
      accent: 'text-emerald-600',
      badgeTone: 'success',
      icon: '🌿',
    };
  }
  if (slug.includes('culture') || slug.includes('art') || slug.includes('music')) {
    return {
      category: 'Arts & Culture',
      gradient: 'from-rose-500 via-pink-600 to-purple-700',
      glow: 'rgba(244, 63, 94, 0.25)',
      accent: 'text-rose-600',
      badgeTone: 'accent',
      icon: '🎭',
    };
  }
  if (slug.includes('debate') || slug.includes('literary') || slug.includes('model')) {
    return {
      category: 'Debate & Leadership',
      gradient: 'from-amber-500 via-orange-600 to-amber-700',
      glow: 'rgba(245, 158, 11, 0.25)',
      accent: 'text-amber-600',
      badgeTone: 'warning',
      icon: '🎙️',
    };
  }
  return {
    category: 'Student Chapter',
    gradient: 'from-slate-700 via-slate-800 to-zinc-900',
    glow: 'rgba(15, 23, 42, 0.25)',
    accent: 'text-ink',
    badgeTone: 'neutral',
    icon: '🏛️',
  };
}

function ClubCard({ club, index }) {
  const meta = getClubMeta(club);
  const eventsCount = club._count?.events || 0;
  const plansCount = club._count?.membershipPlans || 0;
  const bulletinsCount = club._count?.announcements || 0;

  return (
    <Reveal delay={index * 0.05}>
      <Link
        to={`/clubs/${club.slug || club.id}`}
        data-testid={`club-card-${club.slug || club.id}`}
        className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-ink/10 bg-paper-card p-7 shadow-card transition-all duration-300 hover:-translate-y-1.5 hover:border-ink/25 hover:shadow-lift"
      >
        {/* Ambient background glow on hover */}
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl transition-opacity duration-500 opacity-0 group-hover:opacity-100"
          style={{ background: meta.glow }}
        />

        {/* Top Header: Monogram Avatar & Badges */}
        <div className="flex items-start justify-between gap-4">
          <div
            className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${meta.gradient} text-2xl shadow-md text-white transition-transform duration-300 group-hover:scale-105`}
          >
            <span>{meta.icon}</span>
          </div>

          <div className="flex flex-col items-end gap-1.5">
            <Badge tone="success" className="font-mono text-[10px] uppercase tracking-wider">
              <ShieldCheck size={11} className="inline mr-1" />
              Official Chapter
            </Badge>
            <span className="font-mono text-[11px] text-ink/40">
              #{club.slug || 'club'}
            </span>
          </div>
        </div>

        {/* Club Title & Tagline */}
        <div className="mt-5">
          <h3 className="font-display text-2xl font-semibold tracking-tight text-ink transition-colors duration-200 group-hover:text-accent">
            {club.name}
          </h3>
          <p className="mt-2.5 text-sm leading-relaxed text-ink/65 line-clamp-3">
            {club.description || 'Dedicated student society focused on community, events, and skill development.'}
          </p>
        </div>

        {/* Key Activity Indicators */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-ink/8 pt-5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/8 bg-ink/[0.03] px-3 py-1 font-mono text-[11px] text-ink/70">
            <CalendarDays size={12} className="text-accent" />
            <strong className="text-ink font-semibold">{eventsCount}</strong> {eventsCount === 1 ? 'Event' : 'Events'}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/8 bg-ink/[0.03] px-3 py-1 font-mono text-[11px] text-ink/70">
            <Ticket size={12} className="text-accent" />
            <strong className="text-ink font-semibold">{plansCount}</strong> {plansCount === 1 ? 'Tier' : 'Tiers'}
          </span>
          {bulletinsCount > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-ink/8 bg-ink/[0.03] px-3 py-1 font-mono text-[11px] text-ink/70">
              <Megaphone size={12} className="text-accent" />
              <strong className="text-ink font-semibold">{bulletinsCount}</strong> News
            </span>
          )}
        </div>

        {/* Card Footer: Explore CTA */}
        <div className="mt-auto flex items-center justify-between pt-6">
          <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-accent transition-colors group-hover:text-accent-dark">
            Explore Chapter
          </span>
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-ink/15 text-ink transition-all duration-300 group-hover:border-accent group-hover:bg-accent group-hover:text-white">
            <ArrowUpRight size={15} />
          </span>
        </div>
      </Link>
    </Reveal>
  );
}

export default function Clubs() {
  const { data: clubs = [], isLoading } = useQuery({
    queryKey: ['clubs'],
    queryFn: clubsApi.list,
  });

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('All');

  const filteredClubs = useMemo(() => {
    return clubs.filter((c) => {
      const meta = getClubMeta(c);
      const matchesCategory = selectedCat === 'All' || meta.category === selectedCat;
      const matchesSearch =
        search.trim() === '' ||
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.description || '').toLowerCase().includes(search.toLowerCase()) ||
        (c.slug || '').toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [clubs, selectedCat, search]);

  const totalEvents = useMemo(
    () => clubs.reduce((acc, c) => acc + (c._count?.events || 0), 0),
    [clubs]
  );
  const totalPlans = useMemo(
    () => clubs.reduce((acc, c) => acc + (c._count?.membershipPlans || 0), 0),
    [clubs]
  );

  return (
    <div className="mx-auto max-w-7xl px-5 pb-28 pt-28 lg:px-8" data-testid="clubs-page">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6 border-b border-ink/8 pb-10">
        <div>
          <p className="eyebrow flex items-center gap-3 text-accent-dark">
            <span className="rule-line" /> Campus Organizations
          </p>
          <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-ink sm:text-6xl">
            Clubs & Societies.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink/65">
            Discover student-led engineering chapters, environmental initiatives, performing arts,
            and debating societies operating autonomously under the Skyline Student Association.
          </p>
        </div>

        {/* Quick Highlights Stats Pill */}
        <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-paper-card p-3 shadow-sm sm:gap-6 sm:px-6 sm:py-3.5">
          <div className="text-center sm:text-left">
            <span className="block font-display text-2xl font-bold text-ink">
              {clubs.length}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
              Active Chapters
            </span>
          </div>
          <div className="h-8 w-px bg-ink/10 hidden sm:block" />
          <div className="text-center sm:text-left">
            <span className="block font-display text-2xl font-bold text-accent">
              {totalEvents}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
              Live Events
            </span>
          </div>
          <div className="h-8 w-px bg-ink/10 hidden sm:block" />
          <div className="text-center sm:text-left">
            <span className="block font-display text-2xl font-bold text-success">
              100%
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-ink/45">
              Student-Run
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar & Search */}
      <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2" data-testid="club-category-filters">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCat(cat)}
              data-testid={`category-filter-${cat.toLowerCase().replace(/[^a-z]+/g, '-')}`}
              className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${
                selectedCat === cat
                  ? 'border-ink bg-ink text-paper shadow-sm'
                  : 'border-ink/15 bg-paper-card text-ink/65 hover:border-ink/40 hover:text-ink'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Live Search Input */}
        <div className="relative min-w-[260px] md:w-72">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/40"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs or keywords…"
            data-testid="clubs-search-input"
            className="w-full rounded-full border border-ink/15 bg-paper-card py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink/40 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink/40 hover:text-ink"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Clubs Grid */}
      <div className="mt-10">
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-72 rounded-3xl border border-ink/10 bg-paper-card p-6 shadow-card"
              >
                <Skeleton className="h-14 w-14 rounded-2xl" />
                <Skeleton className="mt-6 h-6 w-3/4" />
                <Skeleton className="mt-3 h-4 w-full" />
                <Skeleton className="mt-2 h-4 w-5/6" />
                <Skeleton className="mt-8 h-8 w-1/2" />
              </div>
            ))}
          </div>
        ) : filteredClubs.length === 0 ? (
          <EmptyState
            icon={Compass}
            title="No clubs found"
            description={
              search
                ? `No clubs matched "${search}". Try searching for another topic or clear the search filter.`
                : 'No clubs are active under this category.'
            }
          />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredClubs.map((club, idx) => (
              <ClubCard key={club.id} club={club} index={idx} />
            ))}
          </div>
        )}
      </div>

      {/* Launch a Chapter CTA Box */}
      <section className="mt-20 overflow-hidden rounded-3xl border border-ink/10 bg-gradient-to-br from-ink via-ink to-ink/95 p-8 text-paper shadow-2xl lg:p-12">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
          <div className="lg:col-span-8">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">
              Campus Charter & Incubation
            </span>
            <h2 className="mt-2 font-display text-3xl font-bold tracking-tight text-paper sm:text-4xl">
              Want to start a new club or chapter?
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-paper/70">
              The Skyline Student Association provides student organizations with dedicated budget
              ledgers, automated event ticketing, membership dues collection, and campus space booking.
              Gather 10 founding members and apply for official charter recognition.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-6 text-xs text-paper/50">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-success" /> Autonomous Ledger & Banking
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-success" /> Zero-Fee Dues Processing
              </span>
              <span className="flex items-center gap-2">
                <CheckCircle2 size={15} className="text-success" /> Guaranteed Auditorium Booking
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4 lg:items-end">
            <Link
              to="/announcements"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-bold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:bg-accent-dark"
            >
              Charter Guidelines <ArrowRight size={16} />
            </Link>
            <span className="font-mono text-[11px] text-paper/40">
              Charter council reviews applications on the 1st of every month
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
