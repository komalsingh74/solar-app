"use client";

/* =====================================================================
   DataPagination — ERP + CRM ke har table ke liye common pagination.
   Path: components/ui/data-pagination.tsx

   Quick use:
     const pg = usePagination(rows, { resetKey: `${q}|${status}` });
     {pg.pageItems.map(...)}
     <DataPagination {...pg.props} itemLabel="customers" />

   Server-side (API) pagination: hook mat lo, seedha props do:
     <DataPagination page totalItems pageSize onPageChange onPageSizeChange />
   ===================================================================== */

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, MoreHorizontal } from "lucide-react";

export type DataPaginationProps = {
  page: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSize?: boolean;
  showTotal?: boolean;
  /** summary me dikhne wala naam: "customers", "invoices"… */
  itemLabel?: string;
  className?: string;
};

type PageItem = number | "start-ellipsis" | "end-ellipsis";

export function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 4) return [1, 2, 3, 4, 5, "end-ellipsis", totalPages];
  if (currentPage >= totalPages - 3) return [1, "start-ellipsis", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, "start-ellipsis", currentPage - 1, currentPage, currentPage + 1, "end-ellipsis", totalPages];
}

/* ---------- hook: client-side pagination ---------- */
export function usePagination<T>(items: T[], opts: { initialPageSize?: number; pageSizeOptions?: number[]; resetKey?: unknown } = {}) {
  const { initialPageSize = 10, pageSizeOptions, resetKey } = opts;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages); // delete / filter ke baad out-of-range na ho

  useEffect(() => { setPage(1); }, [resetKey]); // search / filter badle to page 1

  const pageItems = useMemo(() => items.slice((safePage - 1) * pageSize, safePage * pageSize), [items, safePage, pageSize]);

  return {
    pageItems,
    page: safePage,
    pageSize,
    totalItems,
    totalPages,
    props: {
      page: safePage,
      pageSize,
      totalItems,
      pageSizeOptions,
      onPageChange: setPage,
      onPageSizeChange: (n: number) => { setPageSizeState(n); setPage(1); },
    } as DataPaginationProps,
  };
}

/* ---------- UI ---------- */
// Joined button-group styling (professional "segmented" look)
const seg =
  "relative inline-flex h-9 min-w-9 select-none items-center justify-center gap-1 px-3 text-sm font-medium tabular-nums transition-colors " +
  "focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-indigo-500/50 " +
  "disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-300";
const segIdle = "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900";
const segActive = "bg-slate-950 text-white hover:bg-slate-950";

export default function DataPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showTotal = true,
  itemLabel = "records",
  className = "",
}: DataPaginationProps) {
  const safeTotal = Math.max(0, totalItems);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageItems = useMemo(() => getPageItems(currentPage, totalPages), [currentPage, totalPages]);

  const startItem = safeTotal === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const endItem = Math.min(currentPage * safePageSize, safeTotal);
  const atStart = currentPage === 1;
  const atEnd = currentPage === totalPages;

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages || next === currentPage) return;
    onPageChange(next);
  };

  return (
    <div className={`flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between ${className}`}>
      {/* ---------- left: summary + rows per page ---------- */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {showTotal && (
          <p className="text-sm text-slate-500" aria-live="polite">
            {safeTotal === 0 ? (
              <>No {itemLabel} to show</>
            ) : (
              <>
                Showing <span className="font-semibold tabular-nums text-slate-900">{startItem.toLocaleString("en-IN")}–{endItem.toLocaleString("en-IN")}</span> of{" "}
                <span className="font-semibold tabular-nums text-slate-900">{safeTotal.toLocaleString("en-IN")}</span> {itemLabel}
              </>
            )}
          </p>
        )}

        {showPageSize && onPageSizeChange && safeTotal > 0 && (
          <label className="flex items-center gap-2 text-sm text-slate-500">
            <span>Rows per page</span>
            <span className="relative">
              <select
                value={safePageSize}
                onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
                aria-label="Rows per page"
                className="h-9 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium tabular-nums text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20"
              >
                {pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </span>
          </label>
        )}
      </div>

      {/* ---------- right: navigation ---------- */}
      {safeTotal > 0 && totalPages > 1 && (
        <nav aria-label="Table pagination" className="flex items-center justify-between gap-3 lg:justify-end">
          {/* mobile: "Page 2 of 6" */}
          <span className="text-sm text-slate-500 sm:hidden">
            Page <span className="font-semibold tabular-nums text-slate-900">{currentPage}</span> of <span className="tabular-nums">{totalPages}</span>
          </span>

          <div className="inline-flex divide-x divide-slate-200 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <button type="button" aria-label="First page" title="First page" disabled={atStart} onClick={() => goToPage(1)} className={`${seg} ${segIdle} hidden px-2.5 sm:inline-flex`}>
              <ChevronsLeft className="h-4 w-4" />
            </button>

            <button type="button" aria-label="Previous page" title="Previous page" disabled={atStart} onClick={() => goToPage(currentPage - 1)} className={`${seg} ${segIdle} pl-2.5`}>
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Previous</span>
            </button>

            {pageItems.map((item, index) => {
              if (typeof item !== "number") {
                return (
                  <span key={`${item}-${index}`} aria-hidden="true" className="hidden h-9 w-9 items-center justify-center bg-white text-slate-400 sm:inline-flex">
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                );
              }
              const isActive = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  aria-label={`Page ${item}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => goToPage(item)}
                  className={`${seg} ${isActive ? segActive : segIdle} hidden sm:inline-flex`}
                >
                  {item}
                </button>
              );
            })}

            <button type="button" aria-label="Next page" title="Next page" disabled={atEnd} onClick={() => goToPage(currentPage + 1)} className={`${seg} ${segIdle} pr-2.5`}>
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>

            <button type="button" aria-label="Last page" title="Last page" disabled={atEnd} onClick={() => goToPage(totalPages)} className={`${seg} ${segIdle} hidden px-2.5 sm:inline-flex`}>
              <ChevronsRight className="h-4 w-4" />
            </button>
          </div>
        </nav>
      )}
    </div>
  );
}