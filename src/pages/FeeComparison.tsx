import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Copy, Eye, EyeOff } from 'lucide-react';
// @ts-ignore
import domtoimage from 'dom-to-image';
import { fetchFeeConfig, getProtocolFee, ProtocolFeeConfig } from '@/lib/fee-config-api';
import { protocolConfigs, getProtocolLogoFilename } from '@/lib/protocol-config';

export default function FeeComparison() {
  const [feeConfig, setFeeConfig] = useState<ProtocolFeeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hiddenProtocols, setHiddenProtocols] = useState<Set<string>>(new Set());

  // Fetch fee config from API
  useEffect(() => {
    async function loadFeeConfig() {
      try {
        setLoading(true);
        const config = await fetchFeeConfig();
        setFeeConfig(config);
        setError(null);
      } catch (err) {
        console.error('Error loading fee config:', err);
        setError(err instanceof Error ? err.message : 'Failed to load fee configuration');
      } finally {
        setLoading(false);
      }
    }

    loadFeeConfig();
  }, []);

  // Get all protocols that have fees configured, with Trojan at the top
  const allProtocolsWithFees = feeConfig
    ? protocolConfigs.filter(protocol => feeConfig[protocol.id] && !hiddenProtocols.has(protocol.id))
    : [];

  const trojanProtocol = allProtocolsWithFees.find(p => p.id === 'trojan');
  const otherProtocols = allProtocolsWithFees
    .filter(p => p.id !== 'trojan')
    .sort((a, b) => a.name.localeCompare(b.name));

  const protocolsWithFees = trojanProtocol
    ? [trojanProtocol, ...otherProtocols]
    : otherProtocols;

  // Toggle protocol visibility
  const toggleProtocolVisibility = (protocolId: string) => {
    setHiddenProtocols(prev => {
      const newSet = new Set(prev);
      if (newSet.has(protocolId)) {
        newSet.delete(protocolId);
      } else {
        newSet.add(protocolId);
      }
      return newSet;
    });
  };

  // Download table as image
  const downloadReport = async () => {
    const tableElement = document.querySelector('[data-table="fee-comparison"]') as HTMLElement;

    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      try {
        const scale = 2;
        const dataUrl = await Promise.race([
          domtoimage.toPng(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: (tableElement.scrollWidth + 40) * scale,
            height: (tableElement.scrollHeight + 40) * scale,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              overflow: 'visible',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout after 10 seconds')), 10000)
          )
        ]) as string;

        const link = document.createElement('a');
        link.download = `Fee Comparison.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Download error:', error);
      }
    }
  };

  // Copy table to clipboard
  const copyToClipboard = async () => {
    const tableElement = document.querySelector('[data-table="fee-comparison"]') as HTMLElement;

    if (tableElement) {
      const rect = tableElement.getBoundingClientRect();

      if (rect.width === 0 || rect.height === 0) {
        return;
      }

      try {
        const scale = 2;
        const blob = await Promise.race([
          domtoimage.toBlob(tableElement, {
            quality: 1,
            bgcolor: '#ffffff',
            width: (tableElement.scrollWidth + 40) * scale,
            height: (tableElement.scrollHeight + 40) * scale,
            style: {
              transform: `scale(${scale})`,
              transformOrigin: 'top left',
              overflow: 'visible',
              padding: '20px',
              borderRadius: '12px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }
          }),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout after 10 seconds')), 10000)
          )
        ]) as Blob;

        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
      } catch (error) {
        console.error('Copy error:', error);
      }
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fee Comparison</h1>
        <p className="text-muted-foreground">
          Compare trading fees across all protocols
        </p>
      </div>

      <div data-table="fee-comparison">
      <Card className="rounded-xl border">
        <CardHeader className="p-4 pb-0">
          <CardTitle>Trading Fees</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px] h-10 pl-2 pr-1"></TableHead>
                <TableHead className="h-10 pl-1 pr-2">Protocol</TableHead>
                <TableHead className="text-right h-10 px-4">Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8 px-4">
                    Loading fee data...
                  </TableCell>
                </TableRow>
              ) : error ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-red-500 py-8 px-4">
                    {error}
                  </TableCell>
                </TableRow>
              ) : protocolsWithFees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground py-8 px-4">
                    No fee data configured
                  </TableCell>
                </TableRow>
              ) : (
                protocolsWithFees.map((protocol) => {
                  const fee = feeConfig ? getProtocolFee(feeConfig, protocol.id) : 'N/A';
                  const logoFilename = getProtocolLogoFilename(protocol.id);
                  const isTrojan = protocol.id === 'trojan';

                  return (
                    <TableRow
                      key={protocol.id}
                      className={`group ${isTrojan
                        ? "relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 hover:from-primary/10 hover:via-primary/15 hover:to-primary/10 border-l-4 border-l-primary"
                        : "hover:bg-muted/50"}`}
                    >
                      <TableCell className="py-2 pl-2 pr-1">
                        <button
                          onClick={() => toggleProtocolVisibility(protocol.id)}
                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-opacity"
                          title="Hide protocol"
                        >
                          <EyeOff className="h-4 w-4" />
                        </button>
                      </TableCell>
                      <TableCell className="py-2 pl-1 pr-2">
                        <div className="flex items-center gap-3">
                          <img
                            src={`/assets/logos/${logoFilename}`}
                            alt={protocol.name}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                          <div className="flex flex-col">
                            <span className="font-medium">{protocol.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {protocol.category}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-2 px-4">
                        <Badge
                          variant="outline"
                          className="font-semibold"
                        >
                          {fee}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Download and Copy Buttons */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={downloadReport}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/50 border border-border rounded-lg transition-colors"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground bg-background hover:bg-muted/50 border border-border rounded-lg transition-colors"
        >
          <Copy className="h-4 w-4" />
          Copy
        </button>
      </div>
      </div>
    </div>
  );
}
