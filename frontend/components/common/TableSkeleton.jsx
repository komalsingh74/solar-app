import { Skeleton } from "@/components/ui/skeleton";

const TableSkeleton = ({
  rows = 5,
  columns = 5,
  embedded = false,
}) => {
  const gridStyle = { gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` };
  const widths = ["w-3/4", "w-1/2", "w-2/3", "w-5/6", "w-1/3"];
  const cellSkeletons = (row) => Array.from({ length: columns }).map((_, column) => (
    <div
      key={column}
      className={embedded ? "min-w-0 px-4 py-4" : "min-w-0"}
    >
      <Skeleton
        className={`h-3.5 ${widths[(row + column) % widths.length]} !bg-slate-200`}
      />
    </div>
  ));

  return (
    <div
      className={embedded ? "w-full" : "w-full overflow-hidden rounded-xl border border-slate-200 bg-white"}
      role="status"
      aria-label="Loading table"
      aria-busy="true"
    >
      {!embedded && (
        <div
          className="grid items-center gap-4 border-b bg-slate-50/70 px-4 py-3"
          style={gridStyle}
          aria-hidden="true"
        >
          {Array.from({ length: columns }).map((_, column) => (
            <Skeleton key={column} className="h-3.5 w-2/3 !bg-slate-200" />
          ))}
        </div>
      )}
      {Array.from({ length: rows }).map((_, row) => (
        <div
          key={row}
          className={embedded
            ? "grid items-center border-b border-slate-100 last:border-0"
            : "grid items-center gap-4 border-b border-slate-100 px-4 py-4 last:border-0"}
          style={gridStyle}
          aria-hidden="true"
        >
          {cellSkeletons(row)}
        </div>
      ))}
    </div>
  );
};

export default TableSkeleton;
