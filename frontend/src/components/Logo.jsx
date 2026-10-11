export function Logo({ dark = false, compact = false }) {
  return (
    <span className="inline-flex items-center gap-2.5" data-testid="brand-logo">
      <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" rx="14" fill={dark ? '#F6F2E9' : '#0B0E17'} />
        <path
          d="M13 47 L27 21 L35 35 L41 25 L51 47 Z"
          fill="none"
          stroke="#FF4D1C"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <circle cx="47" cy="15" r="3.5" fill={dark ? '#0B0E17' : '#F6F2E9'} />
      </svg>
      {!compact && (
        <span className="leading-none">
          <span
            className={`block font-display text-lg font-semibold ${dark ? 'text-ink' : 'text-paper'}`}
          >
            Altitude
          </span>
          <span
            className={`block font-mono text-[9px] uppercase tracking-[0.22em] ${dark ? 'text-ink/50' : 'text-paper/50'}`}
          >
            Skyline Student Assn.
          </span>
        </span>
      )}
    </span>
  );
}
