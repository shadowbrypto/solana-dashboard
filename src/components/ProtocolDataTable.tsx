import React, { useState } from "react";
import {
  Column,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Tabs, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "./ui/pagination";
import { ProtocolMetrics, Protocol } from "../types/protocol";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

type MetricKey = keyof ProtocolMetrics;

const metricLabels: Record<MetricKey, string> = {
  total_volume_usd: "Volume",
  daily_users: "Daily Active Users",
  numberOfNewUsers: "New Users",
  daily_trades: "Trades",
  total_fees_usd: "Fees",
} as const;

interface ProtocolDataTableProps {
  data: Record<string, Record<Protocol, ProtocolMetrics>>;
  protocols: Protocol[];
}

export function ProtocolDataTable({ data, protocols }: ProtocolDataTableProps) {
  const [selectedMetric, setSelectedMetric] =
    React.useState<MetricKey>("total_volume_usd");
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: "date", desc: true },
  ]);

  interface TableData {
    date: string;
    [key: string]: string | ProtocolMetrics;
  }

  const columns = React.useMemo<ColumnDef<TableData>[]>(
    () => [
      {
        accessorKey: "date",
        header: ({ column }: { column: Column<TableData> }) => {
          return (
            <button
              className="inline-flex items-center gap-2 hover:text-foreground"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              Date
              {column.getIsSorted() === "asc" ? (
                <span className="text-xs">↑</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="text-xs">↓</span>
              ) : null}
            </button>
          );
        },
        cell: ({ row }: { row: any }) => row.getValue("date"),
        sortingFn: (rowA: any, rowB: any) => {
          const dateA = rowA.getValue("date") as string;
          const dateB = rowB.getValue("date") as string;
          const [dayA, monthA, yearA] = dateA.split("/").map(Number);
          const [dayB, monthB, yearB] = dateB.split("/").map(Number);

          // Compare years first
          if (yearA !== yearB) return yearB - yearA;
          // If years are equal, compare months
          if (monthA !== monthB) return monthB - monthA;
          // If months are equal, compare days
          return dayB - dayA;
        },
      },
      ...protocols.map((protocol) => ({
        accessorKey: protocol,
        header: ({ column }: { column: Column<TableData> }) => {
          return (
            <button
              className="inline-flex items-center gap-2 hover:text-foreground"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === "asc")
              }
            >
              {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
              {column.getIsSorted() === "asc" ? (
                <span className="text-xs">↑</span>
              ) : column.getIsSorted() === "desc" ? (
                <span className="text-xs">↓</span>
              ) : null}
            </button>
          );
        },
        cell: ({ row }: { row: any }) => {
          const value = row.getValue(protocol) as ProtocolMetrics;
          return formatValue(value[selectedMetric]);
        },
        sortingFn: (rowA: any, rowB: any) => {
          const valueA = (rowA.getValue(protocol) as ProtocolMetrics)[
            selectedMetric
          ];
          const valueB = (rowB.getValue(protocol) as ProtocolMetrics)[
            selectedMetric
          ];
          return valueB - valueA; // Sort in descending order by default
        },
      })),
    ],
    [protocols, selectedMetric]
  );

  const tableData = React.useMemo(() => {
    if (!data || Object.keys(data).length === 0) return [];
    
    // Convert to array in chronological order (oldest to newest), then map to table format
    return Object.entries(data)
      .map(([date, protocolData]) => ({
        date,
        ...protocolData,
      }));
  }, [data]);

  const table = useReactTable<TableData>({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
    },
    // Set initial pagination state
    initialState: {
      pagination: {
        pageSize: 10, // Show 10 rows per page
      },
      sorting: [{ id: "date", desc: true }], // Ensure latest dates appear first
    },
  });

  const formatValue = (value: number): string => {
    if (selectedMetric.toString().includes("usd")) {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat("en-US").format(value);
  };

  return (
    <Card className="bg-background border-border rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-lg font-semibold tracking-tight">
            Protocol Stats
          </CardTitle>
          <Tabs
            value={selectedMetric}
            onValueChange={(value: string) =>
              setSelectedMetric(value as MetricKey)
            }
            className="w-fit ml-auto"
          >
            <TabsList className="inline-flex h-11 items-center justify-center rounded-xl bg-zinc-900/90 p-1 text-muted-foreground">
              {Object.entries(metricLabels).map(([key, label]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="inline-flex items-center justify-center whitespace-nowrap rounded-xl px-6 py-2.5 text-sm font-medium ring-offset-background transition-all hover:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-zinc-800 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead
                          key={header.id}
                          className="h-12 px-4 text-left align-middle font-medium text-muted-foreground hover:text-foreground [&:has([role=checkbox])]:pr-0"
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext()
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex items-center justify-between px-2">
            <div className="text-sm text-muted-foreground">
              {table.getFilteredRowModel().rows.length} total rows
            </div>

            <div className="flex items-center space-x-6">
              <Pagination>
                <PaginationContent className="gap-4">
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => table.previousPage()}
                      disabled={!table.getCanPreviousPage()}
                    />
                  </PaginationItem>
                  {table.getPageCount() <= 5 ? (
                    // If 5 or fewer pages, show all page numbers
                    [...Array(table.getPageCount())].map((_, i) => (
                      <PaginationItem key={i}>
                        <PaginationLink
                          onClick={() => table.setPageIndex(i)}
                          isActive={table.getState().pagination.pageIndex === i}
                        >
                          {i + 1}
                        </PaginationLink>
                      </PaginationItem>
                    ))
                  ) : (
                    // If more than 5 pages, show first, last, and pages around current
                    <>
                      <PaginationItem>
                        <PaginationLink
                          onClick={() => table.setPageIndex(0)}
                          isActive={table.getState().pagination.pageIndex === 0}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      {table.getState().pagination.pageIndex > 2 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      {table.getState().pagination.pageIndex > 1 && (
                        <PaginationItem>
                          <PaginationLink
                            onClick={() =>
                              table.setPageIndex(
                                table.getState().pagination.pageIndex - 1
                              )
                            }
                          >
                            {table.getState().pagination.pageIndex}
                          </PaginationLink>
                        </PaginationItem>
                      )}
                      {table.getState().pagination.pageIndex > 0 &&
                        table.getState().pagination.pageIndex <
                          table.getPageCount() - 1 && (
                          <PaginationItem>
                            <PaginationLink
                              isActive
                              onClick={() =>
                                table.setPageIndex(
                                  table.getState().pagination.pageIndex
                                )
                              }
                            >
                              {table.getState().pagination.pageIndex + 1}
                            </PaginationLink>
                          </PaginationItem>
                        )}
                      {table.getState().pagination.pageIndex <
                        table.getPageCount() - 2 && (
                        <PaginationItem>
                          <PaginationLink
                            onClick={() =>
                              table.setPageIndex(
                                table.getState().pagination.pageIndex + 1
                              )
                            }
                          >
                            {table.getState().pagination.pageIndex + 2}
                          </PaginationLink>
                        </PaginationItem>
                      )}
                      {table.getState().pagination.pageIndex <
                        table.getPageCount() - 3 && (
                        <PaginationItem>
                          <PaginationEllipsis />
                        </PaginationItem>
                      )}
                      {table.getState().pagination.pageIndex !==
                        table.getPageCount() - 1 && (
                        <PaginationItem>
                          <PaginationLink
                            onClick={() =>
                              table.setPageIndex(table.getPageCount() - 1)
                            }
                          >
                            {table.getPageCount()}
                          </PaginationLink>
                        </PaginationItem>
                      )}
                    </>
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={() => table.nextPage()}
                      disabled={!table.getCanNextPage()}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        </CardContent>
      </Card>
  );
}
