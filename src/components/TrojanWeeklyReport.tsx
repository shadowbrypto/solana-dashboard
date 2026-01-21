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
      <div className="rounded-lg border border-border bg-background animate-pulse">
        <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-border">
          <div className="h-6 bg-muted rounded w-48"></div>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!hasData) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 sm:py-4 border-b border-border">
        <div>
          <h3 className="text-headline font-semibold text-foreground">Trojan Ecosystem</h3>
          <p className="text-caption text-muted-foreground mt-0.5">
            {format(startDate, 'MMM d')} - {format(endDate, 'MMM d, yyyy')} • Weekly summary
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border">
              <TableHead className="w-[200px] py-3 text-xs pl-4 pr-4 font-medium text-muted-foreground uppercase tracking-wide">
                Protocol
              </TableHead>
              <TableHead className="text-right py-3 text-xs px-4 font-medium text-muted-foreground uppercase tracking-wide">
                Volume
              </TableHead>
              <TableHead className="text-right py-3 text-xs px-4 font-medium text-muted-foreground uppercase tracking-wide">
                New Users
              </TableHead>
              <TableHead className="text-right py-3 text-xs px-4 pr-6 font-medium text-muted-foreground uppercase tracking-wide">
                Trades
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Trojan On Solana */}
            <TableRow className="bg-gradient-to-r from-purple-200 via-purple-100 to-transparent dark:from-purple-800/50 dark:via-purple-900/30 dark:to-transparent hover:from-purple-300 hover:via-purple-150 dark:hover:from-purple-700/50 transition-colors">
              <TableCell className="pl-4 pr-4 py-3 border-l-4 border-l-purple-500 dark:border-l-purple-400">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-muted/10 rounded-lg overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                    <img
                      src={`/assets/logos/${getProtocolLogoFilename('trojanonsolana')}`}
                      alt="Trojan On Solana"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">{getProtocolName('trojanonsolana')}</span>
                </div>
              </TableCell>
              <TableCell className="text-right py-3 text-sm px-4 font-mono">
                {renderVolume(protocolData['trojanonsolana'])}
              </TableCell>
              <TableCell className="text-right py-3 text-sm px-4 font-mono">
                {renderNumber(protocolData['trojanonsolana']?.publicNewUsers)}
              </TableCell>
              <TableCell className="text-right py-3 text-sm px-4 pr-6 font-mono">
                {renderNumber(protocolData['trojanonsolana']?.trades)}
              </TableCell>
            </TableRow>

            {/* Trojan Terminal */}
            <TableRow className="bg-gradient-to-r from-purple-200 via-purple-100 to-transparent dark:from-purple-800/50 dark:via-purple-900/30 dark:to-transparent hover:from-purple-300 hover:via-purple-150 dark:hover:from-purple-700/50 transition-colors">
              <TableCell className="pl-4 pr-4 py-3 border-l-4 border-l-purple-500 dark:border-l-purple-400">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-muted/10 rounded-lg overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                    <img
                      src={`/assets/logos/${getProtocolLogoFilename('trojanterminal')}`}
                      alt="Trojan Terminal"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <span className="text-sm font-medium text-foreground">{getProtocolName('trojanterminal')}</span>
                </div>
              </TableCell>
              <TableCell className="text-right py-3 text-sm px-4 font-mono">
                {renderVolume(protocolData['trojanterminal'])}
              </TableCell>
              <TableCell className="text-right py-3 text-sm px-4 font-mono">
                {renderNumber(protocolData['trojanterminal']?.publicNewUsers)}
              </TableCell>
              <TableCell className="text-right py-3 text-sm px-4 pr-6 font-mono">
                {renderNumber(protocolData['trojanterminal']?.trades)}
              </TableCell>
            </TableRow>

            {/* Trojan Total */}
            <TableRow className="font-bold bg-gray-100 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700">
              <TableCell className="pl-4 pr-4 py-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 bg-muted/10 rounded-lg overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                    <img
                      src={`/assets/logos/${getProtocolLogoFilename('trojan')}`}
                      alt="Trojan Total"
                      className="w-full h-full object-cover"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-foreground">Trojan Total</span>
                </div>
              </TableCell>
              <TableCell className="text-right py-3 text-sm px-4 font-mono font-bold">
                {renderVolume(protocolData['trojan'])}
              </TableCell>
              <TableCell className="text-right py-3 text-sm px-4 font-mono font-bold">
                {renderNumber(protocolData['trojan']?.publicNewUsers)}
              </TableCell>
              <TableCell className="text-right py-3 text-sm px-4 pr-6 font-mono font-bold">
                {renderNumber(protocolData['trojan']?.trades)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
