import { inr } from '@/lib/format';
import { Badge } from '@/components/ui/primitives';

/* Renders the server-confirmed price breakdown. The amounts passed in are
   the API's quote — the frontend never invents discounts here. */
export default function PriceBreakdown({ quote, testid = 'price-breakdown' }) {
  if (!quote) return null;
  const rows = [{ label: 'Original price', value: inr(quote.original) }];
  if (quote.memberDiscount > 0)
    rows.push({
      label: `Member discount (${quote.memberPct}%)`,
      value: `\u2212${inr(quote.memberDiscount)}`,
      tone: 'text-success',
    });
  if (quote.pointsRedeemed > 0)
    rows.push({
      label: 'Points redeemed',
      value: `\u2212${inr(quote.pointsRedeemed)}`,
      tone: 'text-success',
    });
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-5" data-testid={testid}>
      {rows.map((r) => (
        <div
          key={r.label}
          className="flex items-center justify-between border-b border-ink/6 py-2.5 text-sm last:border-0"
        >
          <span className="text-ink/60">{r.label}</span>
          <span className={`font-mono font-semibold ${r.tone || 'text-ink'}`}>{r.value}</span>
        </div>
      ))}
      <div className="mt-3 flex items-center justify-between border-t-2 border-ink pt-4">
        <span className="text-sm font-bold uppercase tracking-wide text-ink">Final payable</span>
        <span
          className="font-display text-2xl font-semibold text-ink"
          data-testid={`${testid}-final`}
        >
          {inr(quote.final)}
        </span>
      </div>
      {quote.pointsToEarn > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-success-soft px-4 py-2.5">
          <span className="text-xs font-medium text-success">Points you'll earn after payment</span>
          <Badge tone="success" testid="">
            +{quote.pointsToEarn} pts
          </Badge>
        </div>
      )}
    </div>
  );
}
