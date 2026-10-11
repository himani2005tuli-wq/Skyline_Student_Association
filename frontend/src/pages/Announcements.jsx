import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { communicationApi } from '@/api';
import { Badge, Skeleton, EmptyState } from '@/components/ui/primitives';
import Pagination from '@/components/ui/Pagination';
import { Megaphone, Mail, BellRing, Pin } from 'lucide-react';
import { fmtDate } from '@/lib/format';

const CATS = ['All', 'Events', 'Volunteering', 'Merch', 'Loyalty', 'Governance'];

export default function Announcements() {
  const { data, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: communicationApi.getAnnouncements,
  });
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState(null);
  const [prefs, setPrefs] = useState({ email: true, reminders: true });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);

  const list = (data || [])
    .filter((a) => cat === 'All' || a.category === cat)
    .sort((a, b) =>
      a.pinned === b.pinned ? new Date(b.date) - new Date(a.date) : a.pinned ? -1 : 1,
    );

  const totalPages = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedAnnouncements = list.slice((safePage - 1) * pageSize, safePage * pageSize);

  const togglePref = (key) => {
    setPrefs((p) => {
      const next = { ...p, [key]: !p[key] };
      try {
        sessionStorage.setItem('altitude.prefs', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-5xl px-5 pb-24 pt-28 lg:px-8" data-testid="announcements-page">
      <p className="eyebrow flex items-center gap-3 text-accent-dark">
        <span className="rule-line" /> The board
      </p>
      <h1 className="mt-4 font-display text-4xl font-medium tracking-tight text-ink sm:text-6xl">
        Announcements.
      </h1>
      <p className="mt-4 max-w-lg text-sm leading-relaxed text-ink/55">
        One post reaches every member — dated, archived and findable. No more WhatsApp chains.
      </p>

      <div className="mt-8 flex flex-wrap gap-2" data-testid="announcement-filters">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => {
              setCat(c);
              setCurrentPage(1);
            }}
            data-testid={`announcement-category-${c.toLowerCase()}`}
            className={`rounded-full border px-4 py-2 text-[13px] font-semibold transition ${cat === c ? 'border-ink bg-ink text-paper' : 'border-ink/15 bg-paper-card text-ink/60 hover:border-ink'}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="mt-10 space-y-4">
        {isLoading
          ? [...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-3xl" />)
          : paginatedAnnouncements.map((a) => (
              <article
                key={a.id}
                className="rounded-3xl border border-ink/10 bg-paper-card p-6 shadow-card"
                data-testid={`announcement-${a.id}`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="dark">{a.category}</Badge>
                  {a.pinned && (
                    <Badge tone="accent">
                      <Pin size={11} /> Pinned
                    </Badge>
                  )}
                  <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.18em] text-ink/40">
                    {fmtDate(a.date)}
                  </span>
                </div>
                <h2 className="mt-3 font-display text-2xl font-medium tracking-tight text-ink">
                  {a.title}
                </h2>
                {open === a.id ? (
                  <>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink/65">{a.body}</p>
                    <button
                      onClick={() => setOpen(null)}
                      data-testid={`announcement-${a.id}-collapse`}
                      className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-dark"
                    >
                      Show less −
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setOpen(a.id)}
                    data-testid={`announcement-${a.id}-expand`}
                    className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-accent-dark"
                  >
                    Read more +
                  </button>
                )}
              </article>
            ))}
        {!isLoading && list.length === 0 && (
          <EmptyState
            icon={Megaphone}
            title="Nothing posted yet"
            body="Announcements land here the moment the committee publishes them."
          />
        )}

        {list.length > 0 && (
          <div className="rounded-3xl border border-ink/10 bg-paper-card px-6 py-2 shadow-card">
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={list.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={(sz) => {
                setPageSize(sz);
                setCurrentPage(1);
              }}
              summaryLabel="announcements"
            />
          </div>
        )}
      </div>

      <div
        className="mt-14 rounded-3xl bg-ink p-8 text-paper"
        data-testid="communication-preferences"
      >
        <h2 className="font-display text-2xl font-medium">Stay in the loop</h2>
        <p className="mt-2 text-sm text-paper/60">
          Members can fine-tune what lands in their inbox.
        </p>
        <div className="mt-6 space-y-3">
          {[
            { key: 'email', label: 'Email me announcements', icon: Mail },
            { key: 'reminders', label: 'Remind me before my events', icon: BellRing },
          ].map((p) => (
            <label
              key={p.key}
              className="flex cursor-pointer items-center justify-between rounded-2xl border border-paper/12 bg-paper/5 px-5 py-4"
            >
              <span className="flex items-center gap-3 text-sm font-semibold">
                <p.icon size={16} className="text-accent" /> {p.label}
              </span>
              <input
                type="checkbox"
                checked={prefs[p.key]}
                onChange={() => togglePref(p.key)}
                data-testid={`pref-${p.key}-toggle`}
                className="h-5 w-5 accent-[#FF4D1C]"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
