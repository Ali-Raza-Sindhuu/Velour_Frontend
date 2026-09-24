import { EmptyState } from "./EmptyState";
import { Inbox } from "lucide-react";

/**
 * columns: [{ key, label, render?: (row) => node, className? }]
 * rows: array of objects with a unique `id`
 */
export const DataTable = ({ columns, rows, loading, error, onRetry, emptyTitle = "Nothing here yet", emptyDescription, onRowClick }) => {
  if (loading) {
    return (
      <div className="overflow-hidden rounded-2xl border border-zs-beigeLine bg-white">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-zs-beigeLine/70 p-5 last:border-0">
            {columns.map((c) => <div key={c.key} className="h-3.5 flex-1 animate-pulse rounded bg-zs-beige" />)}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        <p className="font-medium">Couldn't load this data</p>
        <p className="mt-1 text-red-700/80">{error}</p>
        {onRetry ? <button onClick={onRetry} className="mt-3 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium hover:bg-red-100">Try again</button> : null}
      </div>
    );
  }

  if (!rows || rows.length === 0) {
    return <EmptyState icon={Inbox} title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zs-beigeLine bg-white">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-zs-beigeLine">
              {columns.map((c) => (
                <th key={c.key} className={"px-5 py-3.5 text-xs font-medium uppercase tracking-wide text-zs-charcoal/50 " + (c.className || "")}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={onRowClick ? "cursor-pointer hover:bg-zs-beige/30" : ""}
              >
                {columns.map((c) => (
                  <td key={c.key} className={"px-5 py-4 align-middle text-zs-charcoal " + (c.className || "")}>
                    {c.render ? c.render(row) : row[c.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};