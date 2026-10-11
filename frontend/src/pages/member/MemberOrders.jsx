import { useQuery } from '@tanstack/react-query';
import { Package } from 'lucide-react';
import { ordersApi } from '@/api';
import DataTable from '@/components/ui/DataTable';
import { StatusPill, DashboardSkeleton } from '@/components/ui/primitives';
import { inr, fmtDate } from '@/lib/format';

export default function MemberOrders() {
  const { data, isLoading } = useQuery({ queryKey: ['member-orders'], queryFn: ordersApi.getMyOrders });
  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6" data-testid="member-orders-page">
      <div>
        <p className="eyebrow text-accent-dark">Orders</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
          Order history.
        </h1>
      </div>
      <DataTable
        rows={(data || []).map((o) => ({ ...o, dateLabel: fmtDate(o.date), statusLabel: o.status }))}
        searchKeys={['id', 'items', 'status']}
        pageSize={6}
        rowTestid="order-row"
        columns={[
          {
            key: 'id',
            label: 'Order',
            render: (r) => <span className="font-mono text-xs font-bold text-ink">{r.id}</span>,
          },
          { key: 'dateLabel', label: 'Date' },
          { key: 'items', label: 'Items', className: 'max-w-md' },
          {
            key: 'total',
            label: 'Total',
            render: (r) => <span className="font-mono font-bold">{inr(r.total)}</span>,
          },
          { key: 'statusLabel', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
        ]}
        emptyMessage="Orders from the store and event tickets land here."
      />
    </div>
  );
}
