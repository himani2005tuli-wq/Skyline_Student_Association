import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Percent, ShieldAlert, Save } from 'lucide-react';
import { adminApi } from '@/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/primitives';

export default function AdminSettings() {
  const { data: rules } = useQuery({ queryKey: ['loyalty-rules'], queryFn: adminApi.loyaltyRules });
  const { data: discounts } = useQuery({
    queryKey: ['discount-config'],
    queryFn: adminApi.discountConfig,
  });
  const [draft, setDraft] = useState({});
  const qc = useQueryClient();

  const saveDiscount = async (row) => {
    const pct = Number(draft[row.id] ?? row.memberPct);
    if (Number.isNaN(pct) || pct < 0 || pct > 50) {
      toast.error('Enter a discount between 0 and 50%.');
      return false;
    }
    await adminApi.saveDiscount(row.id, pct);
    qc.invalidateQueries({ queryKey: ['discount-config'] });
    toast.success(
      `${row.scope}: member discount set to ${pct}%. Change logged to the audit trail.`,
    );
  };

  return (
    <div className="space-y-6" data-testid="admin-settings-page">
      <div>
        <p className="eyebrow text-accent-dark">Governance</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
          Rules & discounts.
        </h1>
        <p className="mt-3 max-w-xl text-sm text-ink/55">
          Prices, discounts, membership status and loyalty rules are enforced server-side — these
          screens only submit proposals to the audited API.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-7" data-testid="loyalty-rules-card">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-accent" />
            <h2 className="font-display text-xl font-semibold text-ink">Loyalty rules</h2>
          </div>
          <div className="mt-5 space-y-3">
            {(rules || []).map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-2xl border border-ink/8 bg-white px-5 py-4"
                data-testid={`loyalty-rule-${r.id}`}
              >
                <div>
                  <p className="text-sm font-bold text-ink">{r.name}</p>
                  <p className="text-xs text-ink/50">{r.note}</p>
                </div>
                <span className="font-mono text-sm font-bold text-accent-dark">{r.value}</span>
              </div>
            ))}
          </div>
          <p
            className="mt-5 flex items-start gap-2 rounded-xl bg-warning-soft px-4 py-3 text-xs font-medium text-warning"
            data-testid="loyalty-rules-restriction"
          >
            <ShieldAlert size={14} className="mt-0.5 shrink-0" /> Only super admins can change
            earning or redemption rules.
          </p>
        </Card>

        <Card className="p-7" data-testid="discount-config-card">
          <div className="flex items-center gap-2">
            <Percent size={17} className="text-accent" />
            <h2 className="font-display text-xl font-semibold text-ink">Member discounts</h2>
          </div>
          <div className="mt-5 space-y-3">
            {(discounts || []).map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-ink/8 bg-white p-4"
                data-testid={`discount-row-${row.id}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-ink">{row.scope}</p>
                    <p className="text-xs text-ink/50">{row.appliesTo}</p>
                  </div>
                  <Badge tone="accent">{row.memberPct}%</Badge>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={draft[row.id] ?? row.memberPct}
                    onChange={(e) => setDraft((d) => ({ ...d, [row.id]: e.target.value }))}
                    aria-label={`${row.scope} discount percent`}
                    data-testid={`discount-input-${row.id}`}
                    className="h-9 w-20 rounded-lg border border-ink/15 bg-paper px-3 font-mono text-sm font-bold outline-none focus:border-accent"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Save}
                    loadingText="Saving…"
                    successText="Saved"
                    onClick={() => saveDiscount(row)}
                    data-testid={`discount-save-${row.id}`}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
