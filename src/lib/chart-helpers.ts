import { getAllProtocols } from './protocol-categories';
import { getProtocolName } from './protocol-config';
import { getProtocolColor } from './colors';

// Helper functions for chart data generation

export const generateHorizontalBarChartData = (data: any[], metric: string) => {
  const allProtocolIds = getAllProtocols();
  
  return allProtocolIds.map(protocolId => ({
    name: getProtocolName(protocolId),
    values: data.map(item => ({
      value: item[`${protocolId.replace(/\s+/g, '_')}_${metric}`] || 0,
      date: item.date
    })),
    value: data.reduce((sum, item) => sum + (item[`${protocolId.replace(/\s+/g, '_')}_${metric}`] || 0), 0),
    color: getProtocolColor(protocolId)
  }));
};

export const generateStackedBarChartConfig = (metric: string) => {
  const allProtocolIds = getAllProtocols();
  
  return {
    dataKeys: allProtocolIds.map(id => `${id.replace(/\s+/g, '_')}_${metric}`),
    labels: allProtocolIds.map(id => getProtocolName(id))
  };
};

export const generateStackedAreaChartKeys = (suffix: string = 'dominance') => {
  const allProtocolIds = getAllProtocols();
  return allProtocolIds.map(id => `${id.replace(/\s+/g, '_')}_${suffix}`);
};

export const normalizeProtocolId = (protocolId: string): string => {
  return protocolId.replace(/\s+/g, '_');
};