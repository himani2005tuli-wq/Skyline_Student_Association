import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function Pagination({
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [8, 12, 24, 48],
  totalItems,
  className = '',
  showSummary = true,
  summaryLabel = 'results',
}) {
  if (totalPages <= 1 && (!totalItems || totalItems <= (pageSize || 8))) {
    return null;
  }

  // Calculate items range
  const startItem = pageSize ? (currentPage - 1) * pageSize + 1 : null;
  const endItem = pageSize && totalItems ? Math.min(currentPage * pageSize, totalItems) : null;

  // Build page pills list with smart truncation
  const getPages = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPages();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-4 ${className}`}
      data-testid="pagination-control"
    >
      {/* Summary and rows-per-page selector */}
      <div className="flex items-center gap-3 text-xs text-ink/55 font-mono">
        {showSummary && totalItems !== undefined && (
          <span>
            Showing <strong className="text-ink font-semibold">{startItem}</strong>–
            <strong className="text-ink font-semibold">{endItem}</strong> of{' '}
            <strong className="text-ink font-semibold">{totalItems}</strong> {summaryLabel}
          </span>
        )}

        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-ink/40 uppercase tracking-wider text-[10px]">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-ink/15 bg-paper-card px-2 py-1 text-xs font-semibold text-ink outline-none focus:border-accent"
              aria-label="Select page size"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page navigation controls */}
      <div className="flex items-center gap-1.5">
        {/* First Page */}
        {totalPages > 7 && (
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            aria-label="First page"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-ink/15 text-ink transition hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronsLeft size={14} />
          </button>
        )}

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          aria-label="Previous page"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-ink/15 text-ink transition hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-25 disabled:pointer-events-none"
        >
          <ChevronLeft size={14} />
        </button>

        {/* Page Number Pills */}
        <div className="flex items-center gap-1">
          {pages.map((p, idx) => {
            if (p === '...') {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-ink/35 select-none font-mono text-xs"
                >
                  …
                </span>
              );
            }

            const isActive = p === currentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-8 h-8 px-2 rounded-xl text-xs font-mono font-semibold transition-all ${
                  isActive
                    ? 'bg-ink text-paper shadow-sm scale-105'
                    : 'border border-ink/15 text-ink hover:border-ink/40 hover:bg-ink/5'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          className="flex h-8 w-8 items-center justify-center rounded-xl border border-ink/15 text-ink transition hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-25 disabled:pointer-events-none"
        >
          <ChevronRight size={14} />
        </button>

        {/* Last Page */}
        {totalPages > 7 && (
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            aria-label="Last page"
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-ink/15 text-ink transition hover:border-ink hover:bg-ink hover:text-paper disabled:opacity-25 disabled:pointer-events-none"
          >
            <ChevronsRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
