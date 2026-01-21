import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Users } from 'lucide-react';
import { cn, formatNumber } from '../lib/utils';
import { protocolApi } from '../lib/api';
import { protocolConfigs, getProtocolById, getProtocolLogoFilename, getAllCategories } from '../lib/protocol-config';
import { ProtocolLogo } from '../components/ui/logo-with-fallback';

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

export default function UserMilestones() {
  const [milestoneData, setMilestoneData] = useState<MilestoneResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProtocol, setSelectedProtocol] = useState<string>('trojanonsolana');
  const [dataType] = useState<'public' | 'private'>('public');

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
  const selectedProtocolConfig = getProtocolById(selectedProtocol);

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="text-center">
        <h1 className="text-title-1 font-semibold text-foreground">User Milestones</h1>
        <p className="text-subhead text-muted-foreground mt-1">Track user acquisition milestones across protocols</p>
      </div>

      {/* Protocol Selector - Centered */}
      <div className="flex justify-center">
        <Select value={selectedProtocol} onValueChange={setSelectedProtocol}>
          <SelectTrigger className="w-[280px] h-11 bg-secondary/50 border-0 rounded-xl">
            <SelectValue placeholder="Select a protocol">
              {selectedProtocol && (
                <div className="flex items-center gap-3">
                  <ProtocolLogo
                    src={`/assets/logos/${getProtocolLogoFilename(selectedProtocol)}`}
                    alt={selectedProtocolConfig?.name || selectedProtocol}
                    size="md"
                    clean
                  />
                  <span className="font-medium">{selectedProtocolConfig?.name || selectedProtocol}</span>
                </div>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent className="max-h-80 overflow-y-auto">
            {getAllCategories().map((category) => {
              const protocolsInCategory = availableProtocols.filter(protocol => {
                const config = getProtocolById(protocol);
                return config?.category === category;
              });

              if (protocolsInCategory.length === 0) return null;

              return (
                <SelectGroup key={category}>
                  <SelectLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2">
                    {category}
                  </SelectLabel>
                  {protocolsInCategory.map((protocol) => {
                    const config = getProtocolById(protocol);
                    return (
                      <SelectItem key={protocol} value={protocol} className="px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <ProtocolLogo
                            src={`/assets/logos/${getProtocolLogoFilename(protocol)}`}
                            alt={config?.name || protocol}
                            size="md"
                            clean
                          />
                          <span className="font-medium">{config?.name || protocol}</span>
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

      {/* Main Content Card */}
      <div className="rounded-xl border border-border bg-background">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 sm:px-6 border-b border-border">
          <div className="flex items-center gap-3">
            <ProtocolLogo
              src={`/assets/logos/${getProtocolLogoFilename(selectedProtocol)}`}
              alt={selectedProtocolConfig?.name || selectedProtocol}
              size="lg"
              clean
            />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                {selectedProtocolConfig?.name || selectedProtocol}
              </h3>
              <p className="text-xs text-muted-foreground">
                {selectedProtocolConfig?.category}
              </p>
            </div>
          </div>

          {/* Summary Stats in Header */}
          {milestoneData && !loading && (
            <div className="flex items-center divide-x divide-border">
              <div className="px-4 text-center">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Users</div>
                <div className="font-semibold font-mono text-sm">{formatNumber(milestoneData.totalUsers)}</div>
              </div>
              {milestoneData.firstDataDate && (
                <div className="px-4 text-center">
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Since</div>
                  <div className="font-semibold text-sm">{format(new Date(milestoneData.firstDataDate), 'MMM yyyy')}</div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-muted border-t-primary rounded-full animate-spin" />
                <span className="text-muted-foreground text-sm">Loading...</span>
              </div>
            </div>
          ) : error ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <p>{error}</p>
            </div>
          ) : reachedMilestones.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5">Milestone</th>
                    <th className="text-left text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5">Date</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5">Days</th>
                    <th className="text-right text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2.5">+Days</th>
                  </tr>
                </thead>
                <tbody>
                  {reachedMilestones.map((milestone, index) => (
                    <tr
                      key={milestone.milestone}
                      className="border-t border-border/50"
                    >
                      <td className="px-3 py-2.5">
                        <span className="font-semibold text-foreground text-sm">{milestone.milestoneLabel}</span>
                      </td>
                      <td className="px-3 py-2.5 text-sm">
                        <span className="text-foreground">
                          {format(new Date(milestone.dateReached!), 'MMM d, yyyy')}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        <span className="text-foreground">{milestone.daysFromStart}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-sm">
                        {milestone.daysFromPrevious !== null ? (
                          <span className="text-muted-foreground">+{milestone.daysFromPrevious}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No milestone data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
