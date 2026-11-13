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

   API pehle jaisi hi hai — sirf UI badli hai, to purane saare use waise hi chalenge.
   ===================================================================== */

import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
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
  /** Bahut saare pages ho to "Go to" box dikhao (default: true, sirf >7 pages par dikhta hai) */
  showJump?: boolean;
  /** true karo to sirf 1 page hone par pager chhup jata hai (purana behaviour). Default: false = hamesha dikhta hai */
  hideWhenSinglePage?: boolean;
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

/* ---------- styles ---------- */
const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/40 focus-visible:ring-offset-1";

// Base for every clickable control (h-10 on touch screens, h-9 from sm up)
const btn =
  "inline-flex h-10 min-w-10 select-none items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium tabular-nums " +
  "transition-colors duration-150 sm:h-9 sm:min-w-9 " + focusRing + " " +
  "disabled:cursor-not-allowed disabled:opacity-40";

// Prev / Next / First / Last — raised, bordered
const btnNav =
  "border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 " +
  "disabled:hover:border-slate-200 disabled:hover:bg-white disabled:hover:text-slate-700";

// Numbered pages — quiet until hovered
const btnPage =
  "border-transparent text-slate-600 hover:border-slate-200 hover:bg-white hover:text-slate-900";

// Current page — solid
const btnActive = "border-slate-900 bg-slate-900 text-white shadow-sm hover:bg-slate-900";

/* ---------- small piece: jump to page ---------- */
function PageJump({ totalPages, onGo }: { totalPages: number; onGo: (page: number) => void }) {
  const [value, setValue] = useState("");
  const inputId = useId();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = parseInt(value, 10);
    if (Number.isFinite(n)) onGo(Math.min(Math.max(1, n), totalPages));
    setValue("");
  };

  return (
    <form onSubmit={submit} className="ml-3 hidden items-center gap-2 border-l border-slate-200 pl-3 text-sm text-slate-500 xl:flex">
      <label htmlFor={inputId}>Go to</label>
      <input
        id={inputId}
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/\D/g, "").slice(0, 6))}
        placeholder={`1–${totalPages}`}
        aria-label={`Go to page, 1 to ${totalPages}`}
        className={`h-9 w-16 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm tabular-nums text-slate-700 shadow-sm outline-none transition placeholder:text-slate-300 hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20`}
      />
    </form>
  );
}

/* ---------- UI ---------- */
export default function DataPagination({
  page,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  showPageSize = true,
  showTotal = true,
  showJump = true,
  hideWhenSinglePage = false,
  itemLabel = "records",
  className = "",
}: DataPaginationProps) {
  const safeTotal = Math.max(0, totalItems);
  const safePageSize = Math.max(1, pageSize);
  const totalPages = Math.max(1, Math.ceil(safeTotal / safePageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pageItems = useMemo(() => getPageItems(currentPage, totalPages), [currentPage, totalPages]);
  const sizeId = useId(); // ek page par multiple tables ho to bhi ids unique rahein

  // agar current pageSize options me nahi hai (e.g. 25) to bhi select me dikhe
  const sizeOptions = useMemo(
    () => (pageSizeOptions.includes(safePageSize) ? pageSizeOptions : [...pageSizeOptions, safePageSize].sort((a, b) => a - b)),
    [pageSizeOptions, safePageSize]
  );

  const startItem = safeTotal === 0 ? 0 : (currentPage - 1) * safePageSize + 1;
  const endItem = Math.min(currentPage * safePageSize, safeTotal);
  const atStart = currentPage === 1;
  const atEnd = currentPage === totalPages;
  const hasNav = safeTotal > 0 && (totalPages > 1 || !hideWhenSinglePage);

  const goToPage = (next: number) => {
    if (next < 1 || next > totalPages || next === currentPage) return;
    onPageChange(next);
  };

  const num = (n: number) => n.toLocaleString("en-IN");

  return (
    <div
      className={`flex flex-col gap-3 border-t border-slate-200 bg-slate-50/60 px-4 py-3 sm:px-6 md:flex-row md:items-center md:justify-between ${className}`}
    >
      {/* ---------- left: summary + rows per page ---------- */}
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 md:justify-start">
        {showTotal && (
          <p className="text-sm text-slate-500" aria-live="polite">
            {safeTotal === 0 ? (
              <>No {itemLabel} to show</>
            ) : (
              <>
                Showing{" "}
                <span className="font-semibold tabular-nums text-slate-900">
                  {num(startItem)}–{num(endItem)}
                </span>{" "}
                of <span className="font-semibold tabular-nums text-slate-900">{num(safeTotal)}</span> {itemLabel}
              </>
            )}
          </p>
        )}

        {showPageSize && onPageSizeChange && safeTotal > 0 && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <label htmlFor={sizeId} className="whitespace-nowrap">
              Rows per page
            </label>
            <div className="relative">
              <select
                id={sizeId}
                value={safePageSize}
                onChange={(e) => {
                  onPageSizeChange(Number(e.target.value));
                  onPageChange(1);
                }}
                className={`h-9 cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white pl-3 pr-8 text-sm font-medium tabular-nums text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20`}
              >
                {sizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          </div>
        )}
      </div>

      {/* ---------- right: navigation ---------- */}
      {hasNav && (
        <nav aria-label="Table pagination">
          {/* mobile: [ Prev ]  Page 2 of 6  [ Next ] */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:hidden">
            <button
              type="button"
              aria-label="Previous page"
              disabled={atStart}
              onClick={() => goToPage(currentPage - 1)}
              className={`${btn} ${btnNav} justify-self-start pr-4`}
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              Prev
            </button>

            <span className="text-sm text-slate-500" aria-live="polite">
              Page <span className="font-semibold tabular-nums text-slate-900">{currentPage}</span> of{" "}
              <span className="tabular-nums">{totalPages}</span>
            </span>

            <button
              type="button"
              aria-label="Next page"
              disabled={atEnd}
              onClick={() => goToPage(currentPage + 1)}
              className={`${btn} ${btnNav} justify-self-end pl-4`}
            >
              Next
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>
          </div>

          {/* tablet / desktop */}
          <div className="hidden items-center gap-1 sm:flex md:justify-end">
            <button
              type="button"
              aria-label="First page"
              title="First page"
              disabled={atStart}
              onClick={() => goToPage(1)}
              className={`${btn} ${btnNav} px-2`}
            >
              <ChevronsLeft aria-hidden className="h-4 w-4" />
            </button>

            <button
              type="button"
              aria-label="Previous page"
              title="Previous page"
              disabled={atStart}
              onClick={() => goToPage(currentPage - 1)}
              className={`${btn} ${btnNav} pl-2.5 pr-3.5`}
            >
              <ChevronLeft aria-hidden className="h-4 w-4" />
              <span className="hidden lg:inline">Previous</span>
            </button>

            <div className="mx-1 flex items-center gap-0.5">
              {pageItems.map((item, index) => {
                if (typeof item !== "number") {
                  return (
                    <span key={`${item}-${index}`} aria-hidden="true" className="inline-flex h-9 w-7 items-center justify-center text-slate-400">
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
                    className={`${btn} ${isActive ? btnActive : btnPage}`}
                  >
                    {item}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              aria-label="Next page"
              title="Next page"
              disabled={atEnd}
              onClick={() => goToPage(currentPage + 1)}
              className={`${btn} ${btnNav} pl-3.5 pr-2.5`}
            >
              <span className="hidden lg:inline">Next</span>
              <ChevronRight aria-hidden className="h-4 w-4" />
            </button>

            <button
              type="button"
              aria-label="Last page"
              title="Last page"
              disabled={atEnd}
              onClick={() => goToPage(totalPages)}
              className={`${btn} ${btnNav} px-2`}
            >
              <ChevronsRight aria-hidden className="h-4 w-4" />
            </button>

            {showJump && totalPages > 7 && <PageJump totalPages={totalPages} onGo={goToPage} />}
          </div>
        </nav>
      )}
    </div>
  );
}