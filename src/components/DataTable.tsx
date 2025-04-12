import { DailyData } from "@/types";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

interface DataTableProps {
  data: DailyData[];
}

export function DataTable({ data }: DataTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const totalPages = Math.ceil(data.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <Card className="bg-card border-border rounded-xl">
      <CardHeader>
        <CardTitle className="text-base font-medium text-card-foreground">Daily Stats</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-muted border-border first:rounded-t-xl">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-right text-muted-foreground">Volume</TableHead>
                <TableHead className="text-right text-muted-foreground">Users</TableHead>
                <TableHead className="text-right text-muted-foreground">Trades</TableHead>
                <TableHead className="text-right text-muted-foreground">Fees</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentData.map((row, index) => (
                <TableRow key={index} className="hover:bg-muted/50 border-border last:rounded-b-xl">
                  <TableCell className="text-foreground">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(
                      new Date(
                        row.formattedDay.split("-").reverse().join("-")
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-foreground text-right">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                    }).format(row.total_volume_usd)}
                  </TableCell>
                  <TableCell className="text-foreground text-right">
                    {new Intl.NumberFormat("en-US").format(row.daily_users)}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {new Intl.NumberFormat("en-US").format(row.daily_trades)}
                  </TableCell>
                  <TableCell className="text-right text-foreground">
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: "USD",
                      notation: "compact",
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 1,
                    }).format(row.total_fees_usd)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
      <div className="flex items-center justify-between px-4 py-3 border-t border-border">
        <div className="text-sm text-muted-foreground">
          Page {currentPage} of {totalPages}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreviousPage}
            disabled={currentPage === 1}
            className="p-1 rounded-lg transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(pageNum => {
                // Show first page, last page, current page and one page before and after current
                return pageNum === 1 || 
                       pageNum === totalPages || 
                       Math.abs(pageNum - currentPage) <= 1;
              })
              .map((pageNum, idx, arr) => {
                // If there's a gap in the sequence, show ellipsis
                if (idx > 0 && pageNum - arr[idx - 1] > 1) {
                  return [
                    <span key={`ellipsis-${pageNum}`} className="px-2 text-muted-foreground">...</span>,
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-sm transition-colors
                        ${currentPage === pageNum 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted text-muted-foreground'}`}
                    >
                      {pageNum}
                    </button>
                  ];
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-md text-sm transition-colors
                      ${currentPage === pageNum 
                        ? 'bg-primary text-primary-foreground' 
                        : 'hover:bg-muted text-muted-foreground'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
          </div>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className="p-1 rounded-lg transition-colors hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}
