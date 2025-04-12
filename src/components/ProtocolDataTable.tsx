import React, { useState } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Protocol } from '@/types/protocols';
import { ProtocolMetrics } from '@/types';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type MetricKey = keyof ProtocolMetrics;

const metricLabels: Record<MetricKey, string> = {
  total_volume_usd: 'Volume',
  daily_users: 'Daily Active Users',
  numberOfNewUsers: 'New Users',
  daily_trades: 'Trades',
  total_fees_usd: 'Fees'
} as const;

interface ProtocolDataTableProps {
  data: Record<string, Record<Protocol, ProtocolMetrics>>;
  protocols: Protocol[];
}

export function ProtocolDataTable({ data, protocols }: ProtocolDataTableProps) {
  const [selectedMetric, setSelectedMetric] = React.useState<MetricKey>('total_volume_usd');
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'date', desc: true }]);

  interface TableData {
    date: string;
    [key: string]: string | ProtocolMetrics;
  }

  const columns = React.useMemo<ColumnDef<TableData>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: ({ row }: { row: any }) => row.getValue('date'),
        sortingFn: (rowA, rowB) => {
          const dateA = rowA.getValue('date') as string;
          const dateB = rowB.getValue('date') as string;
          const [dayA, monthA, yearA] = dateA.split('/');
          const [dayB, monthB, yearB] = dateB.split('/');
          const dateObjA = new Date(`${yearA}-${monthA}-${dayA}`);
          const dateObjB = new Date(`${yearB}-${monthB}-${dayB}`);
          return dateObjA.getTime() - dateObjB.getTime();
        }
      },
      ...protocols.map((protocol) => ({
        accessorKey: protocol,
        header: protocol,
        cell: ({ row }: { row: any }) => {
          const value = row.getValue(protocol) as ProtocolMetrics;
          return formatValue(value[selectedMetric]);
        }
      }))
    ],
    [protocols, selectedMetric]
  );

  const tableData = React.useMemo(() => {
    return Object.entries(data).map(([date, protocolData]) => ({
      date,
      ...protocolData
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
    },
  });

  const formatValue = (value: number): string => {
    if (selectedMetric.toString().includes('usd')) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    }
    return new Intl.NumberFormat('en-US').format(value);
  };

  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium text-card-foreground">Protocol Stats</CardTitle>
        <div className="flex items-center space-x-4">
          <Select
            value={selectedMetric}
            onValueChange={(value) => setSelectedMetric(value as MetricKey)}
          >
            <SelectTrigger className="w-[200px] bg-background text-foreground border-border hover:bg-muted/50 transition-colors rounded-xl">
              <SelectValue placeholder="Select metric" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border text-foreground rounded-xl">
              {Object.entries(metricLabels).map(([key, label]) => (
                <SelectItem
                  key={key}
                  value={key}
                  className="text-foreground hover:bg-muted/50 focus:bg-muted/50 rounded-xl"
                >
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    return (
                      <TableHead key={header.id}>
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
                            table.setPageIndex(table.getState().pagination.pageIndex - 1)
                          }
                        >
                          {table.getState().pagination.pageIndex}
                        </PaginationLink>
                      </PaginationItem>
                    )}
                    {table.getState().pagination.pageIndex > 0 &&
                      table.getState().pagination.pageIndex < table.getPageCount() - 1 && (
                        <PaginationItem>
                          <PaginationLink
                            isActive
                            onClick={() =>
                              table.setPageIndex(table.getState().pagination.pageIndex)
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
                            table.setPageIndex(table.getState().pagination.pageIndex + 1)
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
                          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
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
