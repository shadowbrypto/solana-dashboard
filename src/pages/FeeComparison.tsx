import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PROTOCOL_FEES, getProtocolFee } from '@/lib/fee-config';
import { protocolConfigs, getProtocolById, getProtocolLogoFilename } from '@/lib/protocol-config';

export default function FeeComparison() {
  // Get all protocols that have fees configured
  const protocolsWithFees = protocolConfigs
    .filter(protocol => PROTOCOL_FEES[protocol.id])
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fee Comparison</h1>
        <p className="text-muted-foreground">
          Compare trading fees across all protocols
        </p>
      </div>

      <Card className="rounded-xl border">
        <CardHeader>
          <CardTitle>Protocol Fees</CardTitle>
        </CardHeader>
        <CardContent className="px-6 pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Protocol</TableHead>
                <TableHead className="text-right">Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {protocolsWithFees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8">
                    No fee data configured
                  </TableCell>
                </TableRow>
              ) : (
                protocolsWithFees.map((protocol) => {
                  const fee = getProtocolFee(protocol.id);
                  const logoFilename = getProtocolLogoFilename(protocol.id);

                  return (
                    <TableRow key={protocol.id} className="hover:bg-muted/50">
                      <TableCell>
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
                      <TableCell className="text-right">
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

          {protocolsWithFees.length > 0 && (
            <div className="mt-6 pt-6 border-t">
              <div className="text-sm text-muted-foreground">
                <p>
                  <strong>Total Protocols:</strong> {protocolsWithFees.length}
                </p>
                <p className="mt-2">
                  Fee percentages are applied to the trade volume. Fees may vary based on trade size,
                  user tier, or other factors. Check each protocol's documentation for complete fee details.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
