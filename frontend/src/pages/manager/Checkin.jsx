import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Check, Users } from 'lucide-react';
import { checkinApi } from '@/api';
import { Button } from '@/components/ui/Button';
import DataTable from '@/components/ui/DataTable';
import { Tabs, StatusPill } from '@/components/ui/primitives';
import QrCheckinConsole from '@/components/checkin/QrCheckinConsole';

export default function Checkin() {
  const [tab, setTab] = useState('scan');
  const { data: attendees = [], refetch } = useQuery({
    queryKey: ['attendees'],
    queryFn: checkinApi.attendees,
  });

  return (
    <div className="space-y-6" data-testid="checkin-page">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-accent-dark">Doors & Entrance</p>
          <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
            QR Check-In Console
          </h1>
          <p className="mt-1 text-xs text-ink/60">
            Scan QR passes via laptop webcam, upload QR image/screenshot, or search and check in with 1 click.
          </p>
        </div>
        <Link
          to="/manage"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-dark hover:underline"
          data-testid="back-to-events-link"
        >
          <ArrowLeft size={14} /> Back to My Events
        </Link>
      </div>

      <Tabs
        tabs={[
          { value: 'scan', label: 'Laptop Scanner & Lookup' },
          { value: 'attendees', label: `Attendee List (${attendees.length})` },
        ]}
        active={tab}
        onChange={setTab}
        data-testid="checkin-tabs"
      />

      {tab === 'scan' ? (
        <QrCheckinConsole
          attendees={attendees}
          onCheckinSuccess={() => refetch()}
          htmlIdPrefix="checkin-page"
        />
      ) : (
        <DataTable
          rows={(attendees || []).map((a) => ({
            ...a,
            priceLabel: a.type?.includes('Guest') ? 'Guest' : 'Member',
          }))}
          searchKeys={['ref', 'name', 'type', 'status', 'email']}
          pageSize={8}
          rowTestid="attendee-row"
          columns={[
            {
              key: 'ref',
              label: 'Booking Ref',
              render: (r) => <span className="font-mono text-xs font-bold">{r.ref || r.code}</span>,
            },
            {
              key: 'name',
              label: 'Attendee',
              render: (r) => (
                <div>
                  <span className="font-bold text-ink block">{r.name}</span>
                  {r.email && <span className="font-mono text-[11px] text-ink/45">{r.email}</span>}
                </div>
              ),
            },
            { key: 'type', label: 'Ticket Tier' },
            { key: 'status', label: 'Status', render: (r) => <StatusPill status={r.status} /> },
            {
              key: 'action',
              label: '',
              render: (r) =>
                r.status === 'confirmed' || r.status === 'VALID' ? (
                  <Button
                    size="sm"
                    variant="primary"
                    icon={Check}
                    onClick={async () => {
                      await checkinApi.scan(r.ref || r.code);
                      refetch();
                    }}
                    data-testid={`attendee-checkin-${r.ref}`}
                  >
                    Check in
                  </Button>
                ) : (
                  <span className="font-mono text-[11px] text-success font-semibold flex items-center gap-1">
                    ✓ Checked in
                  </span>
                ),
            },
          ]}
          emptyMessage="No attendees registered for this event yet."
        />
      )}
    </div>
  );
}
