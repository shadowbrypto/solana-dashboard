import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PROTOCOL_FEES, getProtocolFee } from '@/lib/fee-config';
import { protocolConfigs, getProtocolById, getProtocolLogoFilename } from '@/lib/protocol-config';
import { ComponentActions } from '@/components/ComponentActions';

export default function FeeComparison() {
  // Get all protocols that have fees configured, with Trojan at the top
  const allProtocolsWithFees = protocolConfigs
    .filter(protocol => PROTOCOL_FEES[protocol.id]);

  const trojanProtocol = allProtocolsWithFees.find(p => p.id === 'trojan');
  const otherProtocols = allProtocolsWithFees
    .filter(p => p.id !== 'trojan')
    .sort((a, b) => a.name.localeCompare(b.name));

  const protocolsWithFees = trojanProtocol
    ? [trojanProtocol, ...otherProtocols]
    : otherProtocols;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Fee Comparison</h1>
        <p className="text-muted-foreground">
          Compare trading fees across all protocols
        </p>
      </div>

      <ComponentActions
        componentName="Fee Comparison"
        filename="fee-comparison"
      >
        <Card className="rounded-xl border">
        <CardHeader className="p-4 pb-0">
          <CardTitle>Trading Fees</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%] h-10 px-4">Protocol</TableHead>
                <TableHead className="text-right h-10 px-4">Fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {protocolsWithFees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground py-8 px-4">
                    No fee data configured
                  </TableCell>
                </TableRow>
              ) : (
                protocolsWithFees.map((protocol) => {
                  const fee = getProtocolFee(protocol.id);
                  const logoFilename = getProtocolLogoFilename(protocol.id);
                  const isTrojan = protocol.id === 'trojan';

                  return (
                    <TableRow
                      key={protocol.id}
                      className={isTrojan
                        ? "relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 hover:from-primary/10 hover:via-primary/15 hover:to-primary/10 border-l-4 border-l-primary"
                        : "hover:bg-muted/50"}
                    >
                      <TableCell className="py-2 px-4">
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
      </ComponentActions>
    </div>
  );
}
