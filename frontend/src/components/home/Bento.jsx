import {
  IdCard,
  CalendarDays,
  Package,
  Wallet,
  ClipboardList,
  Megaphone,
  ArrowUpRight,
  Users,
  Compass,
} from 'lucide-react';
import { Reveal } from '@/components/Reveal';
import { SectionHead } from '@/components/ui/primitives';
import { SmartImage } from '@/components/ui/SmartImage';
import { Link } from 'react-router-dom';

function BentoCard({
  className = '',
  icon: Icon,
  title,
  body,
  link,
  children,
  dark = false,
  testid,
}) {
  return (
    <Reveal className={className}>
      <div
        data-testid={testid}
        className={`group flex h-full flex-col justify-between overflow-hidden rounded-3xl p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lift ${
          dark ? 'bg-ink text-paper' : 'border border-ink/10 bg-paper-card text-ink shadow-card'
        }`}
      >
        <div>
          <div className="flex items-start justify-between">
            <span
              className={`flex h-11 w-11 items-center justify-center rounded-2xl ${dark ? 'bg-accent text-white' : 'bg-ink text-paper'}`}
            >
              <Icon size={19} strokeWidth={2.2} />
            </span>
            {link && (
              <Link
                to={link}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-current opacity-40 transition group-hover:opacity-100 hover:bg-accent hover:text-white"
                aria-label={title}
              >
                <ArrowUpRight size={15} />
              </Link>
            )}
          </div>
          <h3 className="mt-5 font-display text-2xl font-medium tracking-tight">{title}</h3>
          <p
            className={`mt-2 max-w-sm text-sm leading-relaxed ${dark ? 'text-paper/60' : 'text-ink/55'}`}
          >
            {body}
          </p>
        </div>
        {children}
      </div>
    </Reveal>
  );
}

export default function Bento() {
  return (
    <section className="bg-paper py-24 lg:py-32" id="platform" data-testid="bento-section">
      <div className="mx-auto max-w-7xl px-5 lg:px-8">
        <SectionHead eyebrow="The platform" title="Everything the club runs on. One login.">
          <Reveal>
            <p className="max-w-xs text-sm leading-relaxed text-ink/55">
              No more spreadsheets, cash boxes, notebook ledgers or WhatsApp chains — six jobs, one
              system.
            </p>
          </Reveal>
        </SectionHead>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-12">
          <BentoCard
            className="md:col-span-7"
            dark
            icon={IdCard}
            title="Memberships that manage themselves"
            body="Sign-ups, dues, renewals and benefits in one member record. Expiring memberships nudge themselves — nobody chases a spreadsheet again."
            link="/membership"
            testid="bento-memberships"
          >
            <div className="mt-8 flex items-center gap-4 rounded-2xl border border-paper/10 bg-paper/5 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-white">
                412
              </span>
              <div className="flex flex-1 flex-wrap gap-2">
                {['Semester · 148', 'Annual · 236', 'Alumni · 28'].map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-paper/15 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-paper/60"
                  >
                    {p}
                  </span>
                ))}
              </div>
            </div>
          </BentoCard>

          <BentoCard
            className="md:col-span-5"
            icon={CalendarDays}
            title="Events & ticketing, minus the door queue"
            body="Member and guest pricing, seat limits, and QR check-in at the door — no printed lists, ever."
            link="/events"
            testid="bento-events"
          >
            <div className="mt-8 overflow-hidden rounded-2xl">
              <SmartImage
                src="https://images.unsplash.com/photo-1788629892553-cf85280ca421?q=80&w=1200&auto=format&fit=crop"
                alt="Spring Gala crowd under stage lights"
                hoverZoom
                className="aspect-[16/7] w-full object-cover"
              />
            </div>
          </BentoCard>

          <BentoCard
            className="md:col-span-4"
            icon={Package}
            title="Merch & inventory"
            body="Sizes, stock and member discounts, tracked per variant."
            link="/store"
            testid="bento-merch"
          >
            <div className="mt-6 overflow-hidden rounded-2xl">
              <SmartImage
                src="https://images.unsplash.com/photo-1610582144787-eda2e6f293b4?q=80&w=1200&auto=format&fit=crop"
                alt="Summit Hoodie"
                hoverZoom
                className="aspect-[16/8] w-full object-cover object-top"
              />
            </div>
          </BentoCard>

          <BentoCard
            className="md:col-span-4"
            icon={Wallet}
            title="Money, in daylight"
            body="Dues, ticket revenue, reimbursements — one ledger the whole committee can trust."
            link="/login"
            testid="bento-finance"
          >
            <div className="mt-6 flex h-20 items-end gap-2" aria-hidden="true">
              {[38, 52, 44, 66, 58, 82].map((h, i) => (
                <div
                  key={i}
                  className={`flex-1 rounded-t-md transition-all duration-500 ${i === 5 ? 'bg-accent' : 'bg-ink/12 group-hover:bg-ink/20'}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </BentoCard>

          <BentoCard
            className="md:col-span-4"
            icon={ClipboardList}
            title="Tasks & volunteers"
            body="Split the fundraiser into tasks, watch it finish itself."
            link="/login"
            testid="bento-tasks"
          >
            <div className="mt-6 space-y-2 text-[13px]">
              {['Bake 40 boxes', 'Buy packaging', 'Morning stall shift'].map((t, i) => (
                <div key={t} className="flex items-center gap-2.5">
                  <span
                    className={`h-4 w-4 rounded-full border ${i < 2 ? 'border-accent bg-accent' : 'border-ink/25'}`}
                  />
                  <span className={i < 2 ? 'text-ink/40 line-through' : 'text-ink/70'}>{t}</span>
                </div>
              ))}
            </div>
          </BentoCard>
        </div>

        <Reveal delay={0.1} className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div
              className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-paper-deep px-7 py-6"
              data-testid="bento-clubs"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent text-white">
                  <Compass size={19} />
                </span>
                <div>
                  <h3 className="font-display text-xl font-medium">
                    Clubs & Student Societies
                  </h3>
                  <p className="text-sm text-ink/55">
                    Explore active engineering chapters, ecology teams & arts guilds.
                  </p>
                </div>
              </div>
              <Link
                to="/clubs"
                data-testid="bento-clubs-link"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-bold text-paper transition hover:bg-ink-700"
              >
                Browse clubs <ArrowUpRight size={14} />
              </Link>
            </div>

            <div
              className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-ink/10 bg-paper-deep px-7 py-6"
              data-testid="bento-announcements"
            >
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-paper">
                  <Megaphone size={19} />
                </span>
                <div>
                  <h3 className="font-display text-xl font-medium">
                    Announcements & Bulletins
                  </h3>
                  <p className="text-sm text-ink/55">
                    One post reaches every member — dated, archived, findable.
                  </p>
                </div>
              </div>
              <Link
                to="/announcements"
                data-testid="bento-announcements-link"
                className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-3 text-[13px] font-bold text-paper transition hover:bg-ink-700"
              >
                <Users size={14} /> Read the board <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

