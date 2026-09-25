import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { EmptyState, LoadingState } from "./states";
import type { TableColumn, PaginationState } from "@/types";

// ============================================================
// DATA TABLE
// ============================================================

interface DataTableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  pagination?: PaginationState;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, direction: "asc" | "desc") => void;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  selectable?: boolean;
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
  getRowId?: (row: T) => string;
  className?: string;
  onRowClick?: (row: T) => void;
}

function DataTable<T>({
  columns,
  data,
  loading,
  emptyTitle = "No data found",
  emptyDescription,
  pagination,
  onPageChange,
  onSort,
  sortKey,
  sortDirection,
  selectable,
  selectedIds = [],
  onSelect,
  getRowId,
  className,
  onRowClick,
}: DataTableProps<T>) {
  const handleSortClick = (key: string, sortable?: boolean) => {
    if (!sortable || !onSort) return;
    const dir =
      sortKey === key && sortDirection === "asc" ? "desc" : "asc";
    onSort(key, dir);
  };

  const handleSelectAll = () => {
    if (!getRowId || !onSelect) return;
    const allIds = data.map(getRowId);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    onSelect(allSelected ? [] : allIds);
  };

  const handleRowSelect = (id: string) => {
    if (!onSelect) return;
    const next = selectedIds.includes(id)
      ? selectedIds.filter((s) => s !== id)
      : [...selectedIds, id];
    onSelect(next);
  };

  const allSelected =
    getRowId && data.length > 0 && data.every((r) => selectedIds.includes(getRowId(r)));

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="overflow-x-auto rounded-[var(--radius-lg)] border border-[var(--border)]">
        <table className="w-full text-[13px] border-collapse">
          <thead>
            <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    onChange={handleSelectAll}
                    className="rounded border-[var(--border)] accent-[var(--primary)]"
                    aria-label="Select all rows"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "px-4 py-3 text-left font-semibold text-[var(--foreground-muted)] uppercase tracking-wide text-[11px]",
                    col.sortable && "cursor-pointer hover:text-[var(--foreground)] select-none",
                    col.width
                  )}
                  onClick={() => handleSortClick(String(col.key), col.sortable)}
                  aria-sort={
                    col.sortable && sortKey === String(col.key)
                      ? sortDirection === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined
                  }
                >
                  <div className="flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && (
                      <span className="text-[var(--foreground-subtle)]">
                        {sortKey === String(col.key) ? (
                          sortDirection === "asc" ? "↑" : "↓"
                        ) : (
                          <span className="opacity-40">↕</span>
                        )}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="text-center py-0"
                >
                  <LoadingState size="md" />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="text-center py-0"
                >
                  <EmptyState title={emptyTitle} description={emptyDescription} size="md" />
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => {
                const rowId = getRowId ? getRowId(row) : String(rowIndex);
                const isSelected = selectedIds.includes(rowId);
                return (
                  <tr
                    key={rowId}
                    className={cn(
                      "border-b border-[var(--border)] last:border-0",
                      "transition-colors",
                      isSelected
                        ? "bg-[var(--primary-subtle)]"
                        : "hover:bg-[var(--surface-hover)]",
                      onRowClick && "cursor-pointer"
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {selectable && (
                      <td
                        className="w-10 px-4 py-3"
                        onClick={(e) => { e.stopPropagation(); handleRowSelect(rowId); }}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRowSelect(rowId)}
                          className="rounded border-[var(--border)] accent-[var(--primary)]"
                          aria-label={`Select row ${rowIndex + 1}`}
                        />
                      </td>
                    )}
                    {columns.map((col) => {
                      const rawValue = (row as Record<string, unknown>)[String(col.key)];
                      return (
                        <td
                          key={String(col.key)}
                          className={cn("px-4 py-3 text-[var(--foreground)]", col.width)}
                        >
                          {col.render
                            ? col.render(rawValue, row)
                            : rawValue != null
                            ? String(rawValue)
                            : "—"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && onPageChange && (
        <Pagination
          {...pagination}
          onPageChange={onPageChange}
          className="mt-4"
        />
      )}
    </div>
  );
}

// ============================================================
// PAGINATION
// ============================================================

interface PaginationProps extends PaginationState {
  onPageChange: (page: number) => void;
  className?: string;
}

const Pagination = ({
  page,
  pageSize,
  total,
  onPageChange,
  className,
}: PaginationProps) => {
  const totalPages = Math.ceil(total / pageSize);
  const start = Math.min((page - 1) * pageSize + 1, total);
  const end = Math.min(page * pageSize, total);

  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <p className="text-[13px] text-[var(--foreground-muted)]">
        Showing {start}–{end} of {total} results
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </Button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="px-2 text-[var(--foreground-muted)] text-[13px]">
              …
            </span>
          ) : (
            <Button
              key={p}
              variant={p === page ? "primary" : "ghost"}
              size="icon-sm"
              onClick={() => onPageChange(p as number)}
              aria-label={`Page ${p}`}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Button>
          )
        )}
        <Button
          variant="outline"
          size="icon-sm"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </Button>
      </div>
    </div>
  );
};

export { DataTable, Pagination };
export type { DataTableProps, TableColumn };
