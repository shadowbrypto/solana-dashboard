import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { format } from "date-fns";
import { Protocol } from '@/types/protocols';
import { ProtocolMetrics } from '@/utils/types';
import { DatePicker } from './ui/date-picker';

interface DailyMetricsTableProps {
  data: Record<string, Record<Protocol, ProtocolMetrics>>;
  protocols: Protocol[];
  date: Date;
  onDateChange: (date: Date) => void;
}

const formatValue = (value: number): string => {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  } else if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

export function DailyMetricsTable({ data, protocols, date, onDateChange }: DailyMetricsTableProps) {
  const metrics = [
    { key: 'total_volume_usd', label: 'Volume' },
    { key: 'daily_users', label: 'Daily Users' },
    { key: 'numberOfNewUsers', label: 'New Users' },
    { key: 'daily_trades', label: 'Trades' },
    { key: 'total_fees_usd', label: 'Fees' },
  ];

  const selectedDate = format(date, "dd/MM/yyyy");
  const dailyData = data[selectedDate] || {};

  return (
    <div className="space-y-4 rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h3 className="text-lg font-semibold">Protocol Metrics</h3>
        <DatePicker 
          date={date} 
          onDateChange={(newDate) => newDate && onDateChange(newDate)} 
        />
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
                    {dailyData[protocol] ? 
                      metric.key.includes('_usd') ? 
                        formatValue(dailyData[protocol][metric.key as keyof ProtocolMetrics]) :
                        dailyData[protocol][metric.key as keyof ProtocolMetrics].toLocaleString()
                      : '-'}
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
