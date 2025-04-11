import { DailyData } from "@/types";
import { useState } from "react";
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

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="w-full rounded-lg bg-black/95 border border-gray-800 hover:bg-black/90 transition-colors duration-200">
      <Table>
        <TableHeader>
          <TableRow className="border-gray-800 hover:bg-black/80">
            <TableHead className="text-gray-400">Date</TableHead>
            <TableHead className="text-right text-gray-400">Volume (USD)</TableHead>
            <TableHead className="text-right text-gray-400">Users</TableHead>
            <TableHead className="text-right text-gray-400">Trades</TableHead>
            <TableHead className="text-right text-gray-400">Fees (USD)</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {currentData.map((row, index) => (
            <TableRow
              key={index}
              className="border-gray-800 hover:bg-black/80"
            >
              <TableCell className="text-gray-300 font-medium">
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
              <TableCell className="text-gray-300 text-right">
                {new Intl.NumberFormat("en-US", {
                  style: "currency",
                  currency: "USD",
                  notation: "compact",
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 1,
                }).format(row.total_volume_usd)}
              </TableCell>
              <TableCell className="text-gray-300 text-right">
                {new Intl.NumberFormat("en-US").format(row.daily_users)}
              </TableCell>
              <TableCell className="text-gray-300 text-right">
                {new Intl.NumberFormat("en-US").format(row.daily_trades)}
              </TableCell>
              <TableCell className="text-gray-300 text-right">
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
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
        <div className="text-sm text-gray-400">
          Showing {startIndex + 1} to {Math.min(endIndex, data.length)} of{" "}
          {data.length} entries
        </div>
        <div className="flex gap-2">
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 1}
            className={`p-2 rounded-md ${currentPage === 1 ? 'text-gray-600' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <ChevronLeftIcon size={16} />
          </button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-white">{currentPage}</span>
            <span className="text-gray-600">/</span>
            <span className="text-gray-400">{totalPages}</span>
          </div>
          <button
            onClick={handleNextPage}
            disabled={currentPage === totalPages}
            className={`p-2 rounded-md ${currentPage === totalPages ? 'text-gray-600' : 'text-gray-400 hover:text-white hover:bg-gray-800'}`}
          >
            <ChevronRightIcon size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
