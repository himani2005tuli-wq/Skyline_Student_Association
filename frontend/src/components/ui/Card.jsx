export function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={`rounded-2xl border border-ink/10 bg-paper-card shadow-card ${hover ? 'transition-all duration-300 hover:-translate-y-1 hover:shadow-lift' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, sub, icon: Icon, tone = 'ink', testid }) {
  const tones = {
    ink: 'bg-ink text-paper',
    accent: 'bg-accent text-white',
    light: 'bg-white text-ink border border-ink/10',
  };
  return (
    <Card className="p-5" hover>
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-ink/45">
          {label}
        </p>
        {Icon && (
          <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tones[tone]}`}>
            <Icon size={15} strokeWidth={2.2} />
          </span>
        )}
      </div>
      <p
        className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink"
        data-testid={testid}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-ink/50">{sub}</p>}
    </Card>
  );
}

export function DetailRow({ label, value, tone = '' }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-ink/6 py-2.5 text-sm last:border-0">
      <span className="text-ink/55">{label}</span>
      <span className={`font-semibold ${tone}`}>{value}</span>
    </div>
  );
}
