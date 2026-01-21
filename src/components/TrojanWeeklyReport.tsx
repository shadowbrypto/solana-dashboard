import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';
import { protocolApi } from '../lib/api';
import { Skeleton } from './ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { getProtocolLogoFilename, getProtocolName } from '../lib/protocol-config';

interface TrojanWeeklyReportProps {
  endDate: Date;
}

interface TrojanProtocolData {
  volume: number;
  adjustedVolume: number;
  publicNewUsers: number;
  trades: number;
}

const TROJAN_PROTOCOLS = ['trojanonsolana', 'trojanterminal'] as const;

const formatCurrency = (value: number): string => {
  if (value >= 1e9) {
    return `$${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `$${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `$${(value / 1e3).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

const formatNumber = (value: number): string => {
  return value.toLocaleString();
};

export function TrojanWeeklyReport({ endDate }: TrojanWeeklyReportProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [protocolData, setProtocolData] = useState<Record<string, TrojanProtocolData>>({});

  const startDate = subDays(endDate, 6);

  useEffect(() => {
    const fetchTrojanWeeklyData = async () => {
      setIsLoading(true);
      try {
        // Fetch both private (for volume, trades) and public (for new users*) data
        const [privateResponse, publicResponse] = await Promise.all([
          protocolApi.getWeeklyMetrics(endDate, 'solana', 'private'),
          protocolApi.getWeeklyMetrics(endDate, 'solana', 'public')
        ]);

        if (privateResponse && privateResponse.weeklyData) {
          const data: Record<string, TrojanProtocolData> = {};

          TROJAN_PROTOCOLS.forEach((protocol) => {
            const pData = privateResponse.weeklyData[protocol];
            const publicData = publicResponse?.weeklyData?.[protocol];

            if (pData?.weeklyTotals) {
              data[protocol] = {
                volume: pData.weeklyTotals.volume || 0,
                adjustedVolume: pData.weeklyTotals.adjustedVolume || pData.weeklyTotals.projectedVolume || pData.weeklyTotals.volume || 0,
                publicNewUsers: publicData?.weeklyTotals?.newUsers || 0,
                trades: pData.weeklyTotals.trades || 0,
              };
            }
          });

          const trojanTotal = privateResponse.weeklyData['trojan'];
          const trojanTotalPublic = publicResponse?.weeklyData?.['trojan'];

          if (trojanTotal?.weeklyTotals) {
            data['trojan'] = {
              volume: trojanTotal.weeklyTotals.volume || 0,
              adjustedVolume: trojanTotal.weeklyTotals.adjustedVolume || trojanTotal.weeklyTotals.projectedVolume || trojanTotal.weeklyTotals.volume || 0,
              publicNewUsers: trojanTotalPublic?.weeklyTotals?.newUsers || 0,
              trades: trojanTotal.weeklyTotals.trades || 0,
            };
          }

          setProtocolData(data);
        }
      } catch (error) {
        console.error('Error fetching Trojan weekly data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrojanWeeklyData();
  }, [endDate]);

  const hasData = Object.keys(protocolData).length > 0;

  const renderVolume = (data: TrojanProtocolData | undefined) => {
    if (!data) return <span className="text-muted-foreground">-</span>;

    // Use adjusted volume (like Adj. Volume column in daily report)
    const volume = data.adjustedVolume || data.volume;
    if (volume === 0) return <span className="text-muted-foreground">-</span>;

    return formatCurrency(volume);
  };

  const renderNumber = (value: number | undefined) => {
    if (value === undefined || value === 0) return <span className="text-muted-foreground">-</span>;
    return formatNumber(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-2 sm:space-y-4">
        <div className="flex items-center gap-2 sm:gap-4">
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="rounded-xl border border-gray-400 dark:border-gray-500 bg-gradient-to-b from-background to-muted/10 p-4">
          <div className="space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return null;
  }

  return (
    <div className="space-y-2 sm:space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm sm:text-lg font-semibold text-foreground">Trojan Weekly Report</h3>
        <span className="px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 rounded-md">
          {format(startDate, 'MMM d')} - {format(endDate, 'MMM d')}
        </span>
      </div>

      <div className="rounded-xl border border-gray-400 dark:border-gray-500 bg-gradient-to-b from-background to-muted/10 overflow-x-auto">
        <Table className="min-w-[600px] sm:min-w-[800px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50 bg-muted/30">
              <TableHead className="w-[140px] sm:w-[220px] py-3 text-[10px] sm:text-sm pl-3 sm:pl-6 pr-1 sm:pr-4 font-semibold text-muted-foreground">
                Trojan Ecosystem
              </TableHead>
              <TableHead className="text-right py-3 text-[10px] sm:text-sm px-2 sm:px-4 font-semibold text-muted-foreground">
                Volume
              </TableHead>
              <TableHead className="text-right py-3 text-[10px] sm:text-sm px-2 sm:px-4 font-semibold text-muted-foreground">
                New Users
              </TableHead>
              <TableHead className="text-right py-3 text-[10px] sm:text-sm px-2 sm:px-4 pr-3 sm:pr-6 font-semibold text-muted-foreground">
                Trades
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Trojan On Solana */}
            <TableRow className="group/row transition-colors hover:bg-muted/30 border-b border-border/30">
              <TableCell className="pl-3 sm:pl-6 pr-1 sm:pr-4 py-3 sm:py-4 text-muted-foreground text-[10px] sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                    <img
                      src={`/assets/logos/${getProtocolLogoFilename('trojanonsolana')}`}
                      alt="Trojan On Solana"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <span className="truncate">{getProtocolName('trojanonsolana')}</span>
                </div>
              </TableCell>
              <TableCell className="text-right py-3 sm:py-4 text-[10px] sm:text-sm px-2 sm:px-4">
                {renderVolume(protocolData['trojanonsolana'])}
              </TableCell>
              <TableCell className="text-right py-3 sm:py-4 text-[10px] sm:text-sm px-2 sm:px-4">
                {renderNumber(protocolData['trojanonsolana']?.publicNewUsers)}
              </TableCell>
              <TableCell className="text-right py-3 sm:py-4 text-[10px] sm:text-sm px-2 sm:px-4 pr-3 sm:pr-6">
                {renderNumber(protocolData['trojanonsolana']?.trades)}
              </TableCell>
            </TableRow>

            {/* Trojan Terminal */}
            <TableRow className="group/row transition-colors hover:bg-muted/30 border-b border-border/30">
              <TableCell className="pl-3 sm:pl-6 pr-1 sm:pr-4 py-3 sm:py-4 text-muted-foreground text-[10px] sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                    <img
                      src={`/assets/logos/${getProtocolLogoFilename('trojanterminal')}`}
                      alt="Trojan Terminal"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <span className="truncate">{getProtocolName('trojanterminal')}</span>
                </div>
              </TableCell>
              <TableCell className="text-right py-3 sm:py-4 text-[10px] sm:text-sm px-2 sm:px-4">
                {renderVolume(protocolData['trojanterminal'])}
              </TableCell>
              <TableCell className="text-right py-3 sm:py-4 text-[10px] sm:text-sm px-2 sm:px-4">
                {renderNumber(protocolData['trojanterminal']?.publicNewUsers)}
              </TableCell>
              <TableCell className="text-right py-3 sm:py-4 text-[10px] sm:text-sm px-2 sm:px-4 pr-3 sm:pr-6">
                {renderNumber(protocolData['trojanterminal']?.trades)}
              </TableCell>
            </TableRow>

            {/* Trojan Total */}
            <TableRow className="group/row transition-colors hover:bg-muted/30 font-semibold bg-muted/20">
              <TableCell className="pl-3 sm:pl-6 pr-1 sm:pr-4 py-3 sm:py-4 text-[10px] sm:text-sm">
                <div className="flex items-center gap-1.5 sm:gap-2.5">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                    <img
                      src={`/assets/logos/${getProtocolLogoFilename('trojan')}`}
                      alt="Trojan Total"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <span className="truncate font-bold">Trojan Total</span>
                </div>
              </TableCell>
              <TableCell className="text-right py-3 sm:py-4 text-[10px] sm:text-sm px-2 sm:px-4 font-bold">
                {renderVolume(protocolData['trojan'])}
              </TableCell>
              <TableCell className="text-right py-3 sm:py-4 text-[10px] sm:text-sm px-2 sm:px-4 font-bold">
                {renderNumber(protocolData['trojan']?.publicNewUsers)}
              </TableCell>
              <TableCell className="text-right py-3 sm:py-4 text-[10px] sm:text-sm px-2 sm:px-4 pr-3 sm:pr-6 font-bold">
                {renderNumber(protocolData['trojan']?.trades)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
