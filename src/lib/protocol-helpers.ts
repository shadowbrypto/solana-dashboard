// Helper functions for protocol data handling

// Normalize protocol ID for data keys (replace spaces with underscores)
export const normalizeProtocolId = (protocolId: string): string => {
  return protocolId.replace(/\s+/g, '_');
};

// Generate data key for a protocol metric
export const getProtocolDataKey = (protocolId: string, metric: string): string => {
  return `${normalizeProtocolId(protocolId)}_${metric}`;
};

// Get all protocol data keys for a specific metric
export const getAllProtocolKeys = (protocolIds: string[], metric: string): string[] => {
  return protocolIds.map(id => getProtocolDataKey(id, metric));
};