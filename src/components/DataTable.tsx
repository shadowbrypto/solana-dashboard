import { DailyData } from "../types";
import { useState } from "react";
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
    <div className="bg-black rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left p-4 text-sm font-medium text-gray-400">
                Date
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-400">
                Volume (USD)
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-400">
                Users
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-400">
                Trades
              </th>
              <th className="text-right p-4 text-sm font-medium text-gray-400">
                Fees (USD)
              </th>
            </tr>
          </thead>
          <tbody>
            {currentData.map((row) => (
              <tr
                key={row.formattedDay}
                className={`border-b border-gray-700 last:border-b-0`}
              >
                <td className="p-4 text-sm text-gray-300">
                  {row.formattedDay}
                </td>
                <td className="p-4 text-sm text-gray-300 text-right">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(row.total_volume_usd)}
                </td>
                <td className="p-4 text-sm text-gray-300 text-right">
                  {new Intl.NumberFormat("en-US").format(row.daily_users)}
                </td>
                <td className="p-4 text-sm text-gray-300 text-right">
                  {new Intl.NumberFormat("en-US").format(row.daily_trades)}
                </td>
                <td className="p-4 text-sm text-gray-300 text-right">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    maximumFractionDigits: 0,
                  }).format(row.total_fees_usd)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
