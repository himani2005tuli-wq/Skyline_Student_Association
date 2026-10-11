import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { ArrowRight, ArrowUpRight } from 'lucide-react';
import HeroScene from '@/components/home/HeroScene';
import { MaskLines, EASE } from '@/components/Reveal';
import { CLUB } from '@/data/mock';
import { clubsApi, eventsApi, membershipsApi } from '@/api';

export default function Hero() {
  const { data: clubs = [] } = useQuery({ queryKey: ['clubs'], queryFn: clubsApi.list });
  const { data: events = [] } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: membershipsApi.getPlans });

  const stats = [
    { value: `${clubs.length || 0}`, label: 'Active chapters' },
    { value: `${events.length || 0}`, label: 'Events published' },
    { value: `${Array.isArray(plans) ? plans.length : 0}`, label: 'Membership tiers' },
    { value: '100%', label: 'Live ecosystem' },
  ];
  return (
    <section
      className="noise relative flex min-h-[100svh] flex-col overflow-hidden bg-ink"
      data-testid="hero-section"
    >
      <HeroScene />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink to-transparent"
        aria-hidden="true"
      />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-5 pt-32 lg:px-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="eyebrow flex items-center gap-3 text-accent"
        >
          <span className="rule-line" aria-hidden="true" /> {CLUB.name} — est. 2019
        </motion.p>
        <h1
          className="mt-6 max-w-4xl font-display text-[clamp(2.7rem,7vw,5.6rem)] font-medium leading-[1.02] tracking-tight text-paper"
          data-testid="hero-headline"
        >
          <MaskLines
            delay={0.25}
            lines={[
              'The operating system',
              <>
                for <em className="font-light italic text-accent">student life.</em>
              </>,
            ]}
          />
        </h1>
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.85, ease: EASE }}
          className="mt-7 max-w-md text-base leading-relaxed text-paper/65"
        >
          Altitude is the club OS for the Skyline Student Association — memberships, events,
          tickets, merchandise and money, finally in one calm place.
        </motion.p>
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1, ease: EASE }}
          className="mt-9 flex flex-wrap items-center gap-4"
        >
          <Link
            to="/membership"
            data-testid="hero-join-button"
            className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-4 text-sm font-bold text-white shadow-[0_14px_30px_-12px_rgba(255,77,28,0.65)] transition-all hover:bg-accent-dark active:scale-[0.98]"
          >
            Become a member <ArrowRight size={16} />
          </Link>
          <Link
            to="/events"
            data-testid="hero-events-button"
            className="inline-flex items-center gap-2 rounded-full border border-paper/25 px-7 py-4 text-sm font-semibold text-paper transition-all hover:bg-paper/10 active:scale-[0.98]"
          >
            Browse events <ArrowUpRight size={16} />
          </Link>
        </motion.div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.15 }}
        className="relative z-10 border-t border-paper/10"
      >
        <div
          className="mx-auto grid max-w-7xl grid-cols-2 gap-y-6 px-5 py-7 md:grid-cols-4 lg:px-8"
          data-testid="hero-stats"
        >
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.2 + i * 0.08, ease: EASE }}
            >
              <p className="font-mono text-2xl font-semibold text-accent md:text-3xl">{s.value}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-paper/45">
                {s.label}
              </p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}
