import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Trophy, Users, Calendar, Clock, TrendingUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { protocolApi } from '../lib/api';
import { protocolConfigs, getProtocolById, getProtocolLogoFilename, getAllCategories } from '../lib/protocol-config';

interface MilestoneData {
  milestone: number;
  milestoneLabel: string;
  dateReached: string | null;
  daysFromStart: number | null;
  daysFromPrevious: number | null;
}

interface MilestoneResponse {
  milestones: MilestoneData[];
  totalUsers: number;
  firstDataDate: string | null;
}

const formatNumber = (value: number | string | undefined | null): string => {
  const num = Math.round(Number(value) || 0);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(2)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toLocaleString();
};

const getCategoryBadgeStyle = (category: string): string => {
  switch (category) {
    case 'Telegram Bot':
    case 'Telegram Bots':
      return 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border-blue-200 dark:border-blue-800';
    case 'Trading Terminal':
    case 'Trading Terminals':
      return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border-green-200 dark:border-green-800';
    case 'Mobile App':
    case 'Mobile Apps':
      return 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200 border-purple-200 dark:border-purple-800';
    case 'EVM':
      return 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-200 border-orange-200 dark:border-orange-800';
    default:
      return 'bg-muted text-muted-foreground border-muted';
  }
};

const getMilestoneColor = (milestoneLabel: string, reached: boolean): string => {
  if (!reached) return 'bg-muted/30 border-muted text-muted-foreground';

  // Color based on milestone size
  if (milestoneLabel.includes('10M')) return 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-800 dark:text-purple-200';
  if (milestoneLabel.includes('5M') || milestoneLabel.includes('6M') || milestoneLabel.includes('7M') || milestoneLabel.includes('8M') || milestoneLabel.includes('9M'))
    return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
  if (milestoneLabel.includes('3M') || milestoneLabel.includes('4M'))
    return 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-800 dark:text-cyan-200';
  if (milestoneLabel.includes('2M'))
    return 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-800 dark:text-green-200';
  if (milestoneLabel.includes('1M') || milestoneLabel.includes('1.5M'))
    return 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200';
  return 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-800 dark:text-orange-200';
};

export default function UserMilestones() {
  const [milestoneData, setMilestoneData] = useState<MilestoneResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('trojan');
  const [dataType] = useState<'public' | 'private'>('public'); // Always use public for user milestones

  // Get available protocols (only Solana for now since milestones data is primarily for Solana)
  const availableProtocols = protocolConfigs
    .filter(config => config.chain === 'solana')
    .map(config => config.id)
    .filter(protocol => protocol !== 'all');

  useEffect(() => {
    fetchMilestones();
  }, [selectedProtocol]);

  const fetchMilestones = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await protocolApi.getUserMilestones(selectedProtocol, dataType);
      setMilestoneData(data);
    } catch (err) {
      console.error('Error fetching milestones:', err);
      setError('Failed to load milestone data');
    } finally {
      setLoading(false);
    }
  };

  const reachedMilestones = milestoneData?.milestones.filter(m => m.dateReached) || [];
  const nextMilestone = milestoneData?.milestones.find(m => !m.dateReached);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Milestones</h1>
          <p className="text-muted-foreground mt-1">
            Track when protocols reached major user acquisition milestones
          </p>
        </div>
      </div>

      {/* Controls */}
      <Card className="p-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Protocol</label>
          <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
            <SelectTrigger className="w-full max-w-md h-10">
              <SelectValue placeholder="Select a protocol">
                {selectedProtocol && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                      <img
                        src={`/assets/logos/${getProtocolLogoFilename(selectedProtocol)}`}
                        alt={getProtocolById(selectedProtocol)?.name || selectedProtocol}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    </div>
                    <span>{getProtocolById(selectedProtocol)?.name || selectedProtocol}</span>
                  </div>
                )}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-60 overflow-y-auto">
              {getAllCategories().map((category) => {
                const protocolsInCategory = availableProtocols.filter(protocol => {
                  const config = getProtocolById(protocol);
                  return config?.category === category;
                });

                if (protocolsInCategory.length === 0) return null;

                return (
                  <SelectGroup key={category}>
                    <SelectLabel className="text-xs font-semibold text-muted-foreground px-2 py-1.5">
                      {category}
                    </SelectLabel>
                    {protocolsInCategory.map((protocol) => {
                      const config = getProtocolById(protocol);
                      return (
                        <SelectItem key={protocol} value={protocol} className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-muted/10 rounded overflow-hidden ring-1 ring-border/20 flex-shrink-0">
                              <img
                                src={`/assets/logos/${getProtocolLogoFilename(protocol)}`}
                                alt={config?.name || protocol}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  target.style.display = 'none';
                                }}
                              />
                            </div>
                            <span>{config?.name || protocol}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Stats Cards */}
      {milestoneData && !loading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Users</p>
                  <p className="text-2xl font-bold">{formatNumber(milestoneData.totalUsers)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Trophy className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Milestones Reached</p>
                  <p className="text-2xl font-bold">{reachedMilestones.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Milestone</p>
                  <p className="text-2xl font-bold">{nextMilestone?.milestoneLabel || 'All reached!'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Milestones Timeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted/10 rounded-lg overflow-hidden ring-1 ring-border/20">
                <img
                  src={`/assets/logos/${getProtocolLogoFilename(selectedProtocol)}`}
                  alt={getProtocolById(selectedProtocol)?.name || selectedProtocol}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
              <div>
                <CardTitle className="text-lg">
                  {getProtocolById(selectedProtocol)?.name || selectedProtocol} Milestones
                </CardTitle>
                {milestoneData?.firstDataDate && (
                  <p className="text-sm text-muted-foreground">
                    Tracking since {format(new Date(milestoneData.firstDataDate), 'MMM d, yyyy')}
                  </p>
                )}
              </div>
            </div>
            <Badge
              variant="outline"
              className={getCategoryBadgeStyle(getProtocolById(selectedProtocol)?.category || '')}
            >
              {getProtocolById(selectedProtocol)?.category}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin"></div>
                <span className="text-muted-foreground">Loading milestones...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>{error}</p>
            </div>
          ) : milestoneData?.milestones && milestoneData.milestones.length > 0 ? (
            <div className="space-y-6">
              {/* Visual Timeline */}
              <div className="flex flex-wrap gap-3 pb-6 border-b">
                {milestoneData.milestones.map((milestone) => (
                  <div
                    key={milestone.milestone}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-xl border-2 min-w-[100px] transition-all",
                      getMilestoneColor(milestone.milestoneLabel, !!milestone.dateReached),
                      milestone.dateReached ? 'shadow-sm' : 'opacity-50'
                    )}
                  >
                    <Trophy className={cn(
                      "h-6 w-6 mb-1",
                      milestone.dateReached ? '' : 'text-muted-foreground'
                    )} />
                    <span className="text-lg font-bold">{milestone.milestoneLabel}</span>
                    {milestone.dateReached ? (
                      <>
                        <span className="text-xs mt-1">
                          {format(new Date(milestone.dateReached), 'MMM d, yyyy')}
                        </span>
                        <span className="text-xs font-semibold mt-0.5">
                          {milestone.daysFromStart} days
                        </span>
                      </>
                    ) : (
                      <span className="text-xs mt-1">Not reached</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Detailed Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[120px]">Milestone</TableHead>
                    <TableHead>Date Reached</TableHead>
                    <TableHead className="text-right">Days from Start</TableHead>
                    <TableHead className="text-right">Days from Previous</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {milestoneData.milestones.map((milestone, index) => (
                    <TableRow
                      key={milestone.milestone}
                      className={cn(
                        milestone.dateReached ? '' : 'opacity-50'
                      )}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Trophy className={cn(
                            "h-4 w-4",
                            milestone.dateReached ? 'text-amber-500' : 'text-muted-foreground'
                          )} />
                          <span className="font-semibold">{milestone.milestoneLabel}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {milestone.dateReached ? (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(milestone.dateReached), 'MMMM d, yyyy')}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {milestone.daysFromStart !== null ? (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
                            <Clock className="h-3 w-3 mr-1" />
                            {milestone.daysFromStart} days
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {milestone.daysFromPrevious !== null ? (
                          <Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300">
                            +{milestone.daysFromPrevious} days
                          </Badge>
                        ) : milestone.daysFromStart !== null && index === 0 ? (
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">
                            First milestone
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No milestone data available for {getProtocolById(selectedProtocol)?.name || selectedProtocol}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
