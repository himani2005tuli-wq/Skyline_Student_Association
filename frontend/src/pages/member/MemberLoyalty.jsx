import { useQuery } from '@tanstack/react-query';
import { Sparkles, TrendingUp, TrendingDown, Timer, Gift } from 'lucide-react';
import { loyaltyApi } from '@/api';
import { Card, StatCard } from '@/components/ui/Card';
import { Badge, ProgressBar, EmptyState, DashboardSkeleton } from '@/components/ui/primitives';
import { fmtDate } from '@/lib/format';

export default function MemberLoyalty() {
  const { data, isLoading } = useQuery({ queryKey: ['loyalty'], queryFn: loyaltyApi.summary });
  if (isLoading || !data) return <DashboardSkeleton />;

  const goal = data.nextReward?.at || 500;

  return (
    <div className="space-y-6" data-testid="loyalty-page">
      <div>
        <p className="eyebrow text-accent-dark">Loyalty</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
          Points that pay you back.
        </h1>
      </div>

      {data.balance === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="No points yet"
          body="Points land here after your first confirmed purchase or event check-in."
          testid="loyalty-empty"
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Available balance"
            value={`${data.balance} pts`}
            sub="1 pt = ₹1 at checkout"
            icon={Sparkles}
            tone="accent"
            testid="loyalty-balance-card"
          />
          <StatCard
            label="Earned (all time)"
            value={`${data.earned} pts`}
            sub="Purchases + check-ins"
            icon={TrendingUp}
            testid="loyalty-earned-card"
          />
          <StatCard
            label="Redeemed"
            value={`${data.redeemed} pts`}
            sub="Cashed in for savings"
            icon={TrendingDown}
            testid="loyalty-redeemed-card"
          />
          <StatCard
            label="Expiring soon"
            value={`${data.expiring.points} pts`}
            sub={`on ${fmtDate(data.expiring.by)}`}
            icon={Timer}
            testid="loyalty-expiring-card"
          />
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-12">
        <Card className="p-7 lg:col-span-5" data-testid="next-reward-card">
          <div className="flex items-center gap-2">
            <Gift size={17} className="text-accent" />
            <h2 className="font-display text-xl font-semibold text-ink">
              Progress to your next reward
            </h2>
          </div>
          <p className="mt-4 text-sm text-ink/60">{data.nextReward.label}</p>
          <p className="mt-4 font-mono text-4xl font-bold text-ink">
            {data.balance}
            <span className="text-lg text-ink/40"> / {goal} pts</span>
          </p>
          <ProgressBar value={data.balance} max={goal} className="mt-4" />
          <p className="mt-4 text-xs leading-relaxed text-ink/50">
            Points are credited by the server after a purchase is confirmed — never before. Redeem
            up to 30% of any checkout.
          </p>
        </Card>

        <Card className="p-7 lg:col-span-7" data-testid="loyalty-rules-card">
          <h2 className="font-display text-xl font-semibold text-ink">How points work</h2>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {data.rules.map((r) => (
              <div key={r.id} className="rounded-2xl border border-ink/8 bg-white p-4">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
                  {r.name}
                </p>
                <p className="mt-1.5 font-mono text-sm font-bold text-accent-dark">{r.value}</p>
                <p className="mt-1 text-xs text-ink/50">{r.note}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-7" data-testid="loyalty-transactions-card">
        <h2 className="font-display text-xl font-semibold text-ink">Recent transactions</h2>
        <div className="mt-4 divide-y divide-ink/6">
          {data.txns.map((t) => (
            <div
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3"
              data-testid={`loyalty-txn-${t.id}`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${t.type === 'earn' ? 'bg-success-soft text-success' : 'bg-accent-soft text-accent-dark'}`}
                >
                  {t.type === 'earn' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-ink">{t.label}</p>
                  <p className="font-mono text-[11px] text-ink/45">{fmtDate(t.date)}</p>
                </div>
              </div>
              <Badge tone={t.type === 'earn' ? 'success' : 'accent'}>
                {t.points > 0 ? '+' : ''}
                {t.points} pts
              </Badge>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
