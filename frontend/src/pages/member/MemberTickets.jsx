import { useQuery } from '@tanstack/react-query';
import { QRCodeSVG } from 'qrcode.react';
import { Ticket as TicketIcon, ScanLine } from 'lucide-react';
import { ticketsApi, eventsApi } from '@/api';
import { Card } from '@/components/ui/Card';
import { Badge, StatusPill, EmptyState, DashboardSkeleton } from '@/components/ui/primitives';
import Pagination from '@/components/ui/Pagination';
import { SmartImage } from '@/components/ui/SmartImage';
import { inr, fmtDate } from '@/lib/format';
import { useState } from 'react';

export default function MemberTickets() {
  const { data: tickets, isLoading } = useQuery({
    queryKey: ['member-tickets'],
    queryFn: ticketsApi.getMyTickets,
  });
  const { data: events } = useQuery({ queryKey: ['events'], queryFn: eventsApi.list });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  if (isLoading) return <DashboardSkeleton />;

  const ticketList = tickets || [];
  const totalPages = Math.max(1, Math.ceil(ticketList.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedTickets = ticketList.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-6" data-testid="member-tickets-page">
      <div>
        <p className="eyebrow text-accent-dark">Ticketing</p>
        <h1 className="mt-2 font-display text-4xl font-medium tracking-tight text-ink">
          My tickets.
        </h1>
        <p className="mt-3 max-w-lg text-sm text-ink/55">
          The door is QR-scan only — no printed lists. Screenshot-proof: your booking reference
          works too.
        </p>
      </div>

      {ticketList.length === 0 ? (
        <EmptyState
          icon={TicketIcon}
          title="No tickets yet"
          body="Book an event and your QR ticket appears here instantly."
          testid="tickets-empty"
        />
      ) : (
        <>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {paginatedTickets.map((t) => {
            const ev = (events || []).find((e) => e.id === t.eventId);
            return (
              <Card key={t.ref} className="overflow-hidden" hover>
                <div className="relative">
                  {ev && <SmartImage src={ev.poster} alt="" className="h-32 w-full object-cover" />}
                  <span className="absolute left-3 top-3">
                    <Badge tone="dark">{ev?.category || 'Event'}</Badge>
                  </span>
                </div>
                <div className="p-5" data-testid={`ticket-card-${t.ref}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-display text-xl font-semibold text-ink">
                        {ev?.title || t.eventId}
                      </h2>
                      <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-ink/45">
                        {ev ? `${fmtDate(ev.date)} · ${ev.time}` : ''}
                      </p>
                    </div>
                    <StatusPill status={t.status} />
                  </div>
                  <div className="mt-5 flex items-center gap-5 border-t border-dashed border-ink/15 pt-5">
                    <div
                      className="rounded-xl bg-white p-2.5 shadow-card"
                      data-testid={`ticket-qr-${t.ref}`}
                    >
                      <QRCodeSVG value={t.ref} size={88} fgColor="#0B0E17" bgColor="#FFFFFF" />
                    </div>
                    <div className="text-sm">
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink/45">
                        Booking ref
                      </p>
                      <p className="mt-1 font-mono text-sm font-bold text-ink">{t.ref}</p>
                      <p className="mt-2 text-[13px] text-ink/60">
                        {t.type} · {t.price === 0 ? 'Free' : inr(t.price)}
                      </p>
                      {t.checkedIn && (
                        <Badge tone="neutral" className="mt-2">
                          Already checked in
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

          {ticketList.length > 0 && (
            <div className="mt-8 rounded-3xl border border-ink/10 bg-paper-card px-6 py-2 shadow-card">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                totalItems={ticketList.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={(sz) => {
                  setPageSize(sz);
                  setCurrentPage(1);
                }}
                summaryLabel="tickets"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
