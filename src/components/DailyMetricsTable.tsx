import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format } from "date-fns";
import { ProtocolMetrics, Protocol } from "../types";
import { DatePicker } from "./DatePicker";
import { useLoaderData } from "react-router-dom";

interface DailyMetricsTableProps {
  protocols: Protocol[];
}

type MetricKey = keyof ProtocolMetrics;

interface MetricDefinition {
  key: MetricKey;
  label: string;
  format: (value: number) => string;
}

const formatCurrency = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

export function DailyMetricsTable({ protocols }: DailyMetricsTableProps) {
  const data = useLoaderData();

  const [date, setDate] = useState<Date>(new Date());

  const metrics: MetricDefinition[] = [
    { key: "total_volume_usd", label: "Volume", format: formatCurrency },
    { key: "daily_users", label: "Daily Users", format: formatNumber },
    { key: "numberOfNewUsers", label: "New Users", format: formatNumber },
    { key: "daily_trades", label: "Trades", format: formatNumber },
    { key: "total_fees_usd", label: "Fees", format: formatCurrency },
  ];

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
    }
  };

  const selectedDate = format(date, "dd/MM/yyyy"); // Format matches the data structure
  const dailyData = data[selectedDate] || {};

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between pb-4">
        <h3 className="text-lg font-semibold">Protocol Metrics</h3>
        <div className="w-[240px]">
          <DatePicker date={date} onDateChange={handleDateChange} />
        </div>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Protocol</TableHead>
              {metrics.map((metric) => (
                <TableHead key={metric.key} className="text-right">
                  {metric.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {protocols.map((protocol) => (
              <TableRow key={protocol}>
                <TableCell className="font-medium">
                  {protocol.charAt(0).toUpperCase() + protocol.slice(1)}
                </TableCell>
                {metrics.map((metric) => (
                  <TableCell key={metric.key} className="text-right">
                    {metric.format(dailyData[protocol]?.[metric.key] || 0)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
