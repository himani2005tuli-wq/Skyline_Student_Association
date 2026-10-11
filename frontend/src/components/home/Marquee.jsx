const ITEMS = [
  'Memberships',
  'Events',
  'Ticketing',
  'Merchandise',
  'Fundraisers',
  'Loyalty rewards',
  'Announcements',
  'Volunteers',
];

/* One slow editorial marquee — single sequence + one aria-hidden clone for the seamless loop. */
export default function Marquee() {
  return (
    <div
      className="overflow-hidden border-y border-ink/20 bg-accent py-4"
      data-testid="marquee-band"
    >
      <div className="marquee-track flex w-max">
        {[0, 1].map((copy) => (
          <div key={copy} aria-hidden={copy === 1} className="flex items-center">
            {ITEMS.map((t) => (
              <span
                key={t}
                className="flex items-center font-mono text-sm font-semibold uppercase tracking-[0.32em] text-ink"
              >
                <span className="px-7">{t}</span>
                <span className="h-1.5 w-1.5 rounded-full bg-ink" aria-hidden="true" />
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
