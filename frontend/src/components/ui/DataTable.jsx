import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { EmptyState } from '@/components/ui/primitives';

/* Lightweight data table with search, pagination and empty state. */
export default function DataTable({
  columns,
  rows,
  searchKeys,
  pageSize: initialPageSize = 8,
  onPageSizeChange,
  emptyMessage = 'Nothing here yet.',
  toolbar,
  rowTestid,
}) {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(0);
  const [localPageSize, setLocalPageSize] = useState(initialPageSize);
  const pageSize = onPageSizeChange ? initialPageSize : localPageSize;

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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-ink/8 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] uppercase tracking-wider text-ink/45">
              Showing {safePage * pageSize + 1}–{Math.min(filtered.length, (safePage + 1) * pageSize)} of{' '}
              {filtered.length} entries
            </span>

            <div className="flex items-center gap-1.5 border-l border-ink/10 pl-3">
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink/35">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPage(0);
                  if (typeof onPageSizeChange === 'function') {
                    onPageSizeChange(Number(e.target.value));
                  } else {
                    setLocalPageSize(Number(e.target.value));
                  }
                }}
                aria-label="Rows per page"
                className="rounded-lg border border-ink/15 bg-white px-2 py-0.5 font-mono text-xs font-semibold text-ink outline-none focus:border-accent"
              >
                {[8, 15, 25, 50].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              data-testid="table-prev-page"
              aria-label="Previous page"
              disabled={safePage === 0}
              onClick={() => setPage(Math.max(0, safePage - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-ink/15 transition hover:bg-ink hover:text-paper disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page number buttons */}
            <div className="flex items-center gap-1">
              {Array.from({ length: pages }, (_, i) => i).map((p) => {
                // Show first, last, and window around safePage
                if (
                  pages <= 7 ||
                  p === 0 ||
                  p === pages - 1 ||
                  Math.abs(p - safePage) <= 1
                ) {
                  const isActive = p === safePage;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      aria-label={`Go to page ${p + 1}`}
                      className={`min-w-8 h-8 px-2 rounded-xl text-xs font-mono font-semibold transition ${
                        isActive
                          ? 'bg-ink text-paper shadow-sm'
                          : 'border border-ink/15 text-ink hover:border-ink/40 hover:bg-ink/5'
                      }`}
                    >
                      {p + 1}
                    </button>
                  );
                }
                if (p === 1 && safePage > 2) {
                  return <span key="dots-start" className="px-1 text-ink/30 select-none text-xs">…</span>;
                }
                if (p === pages - 2 && safePage < pages - 3) {
                  return <span key="dots-end" className="px-1 text-ink/30 select-none text-xs">…</span>;
                }
                return null;
              })}
            </div>

            <button
              data-testid="table-next-page"
              aria-label="Next page"
              disabled={safePage >= pages - 1}
              onClick={() => setPage(Math.min(pages - 1, safePage + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-ink/15 transition hover:bg-ink hover:text-paper disabled:opacity-30 disabled:pointer-events-none"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
