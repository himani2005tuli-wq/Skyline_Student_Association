import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/primitives';

/* Lightweight data table with search, pagination and empty state. */
export default function DataTable({
  columns,
  rows,
  searchKeys,
  pageSize = 8,
  emptyMessage = 'Nothing here yet.',
  toolbar,
  rowTestid,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    if (!query.trim() || !searchKeys) return rows;
    const q = query.toLowerCase();
    return rows.filter((r) =>
      searchKeys.some((k) =>
        String(r[k] ?? '')
          .toLowerCase()
          .includes(q),
      ),
    );
  }, [rows, query, searchKeys]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const view = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);

  return (
    <div
      className="overflow-hidden rounded-2xl border border-ink/10 bg-paper-card shadow-card"
      data-testid="data-table"
    >
      {(searchKeys || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink/8 px-5 py-4">
          {searchKeys && (
            <div className="relative min-w-56 flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35"
              />
              <input
                data-testid="table-search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
                placeholder="Search…"
                aria-label="Search table"
                className="h-10 w-full rounded-full border border-ink/15 bg-white pl-10 pr-4 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}
          {toolbar}
        </div>
      )}
      <div className="overflow-x-auto" data-lenis-prevent>
        {view.length === 0 ? (
          <EmptyState title="No matches" body={emptyMessage} testid="table-empty" />
        ) : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-ink/8">
                {columns.map((c) => (
                  <th
                    key={c.key}
                    className={`px-5 py-3 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink/45 ${c.className || ''}`}
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.map((row, i) => (
                <tr
                  key={row.id || i}
                  className="border-b border-ink/5 transition-colors last:border-0 hover:bg-ink/[0.025]"
                  data-testid={rowTestid ? `${rowTestid}-${i}` : undefined}
                >
                  {columns.map((c) => (
                    <td key={c.key} className={`px-5 py-3.5 align-middle ${c.className || ''}`}>
                      {c.render ? c.render(row) : row[c.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-ink/8 px-5 py-3">
          <span className="font-mono text-[11px] uppercase tracking-wider text-ink/45">
            {safePage * pageSize + 1}\u2013{Math.min(filtered.length, (safePage + 1) * pageSize)} of{' '}
            {filtered.length}{' '}
          </span>
          <div className="flex gap-2">
            <button
              data-testid="table-prev-page"
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 transition hover:bg-ink hover:text-paper disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              data-testid="table-next-page"
              aria-label="Next page"
              disabled={safePage >= pages - 1}
              onClick={() => setPage(safePage + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 transition hover:bg-ink hover:text-paper disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
