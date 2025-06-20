import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { protocolConfigs, getAllCategories } from '../lib/protocol-config';
import { Button } from './ui/button';
import { Code2, Copy, Check, RefreshCcw, AlertCircle, X } from 'lucide-react';
import { dataSyncApi } from '../lib/api';
import { useToast } from '../hooks/useToast';
import { Toast } from './ui/toast';

export function ProtocolManagement() {
  const [copied, setCopied] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toasts, removeToast, success, error: showError } = useToast();
  const categories = getAllCategories();

  const generateNewProtocolTemplate = () => {
    return `{ 
  id: 'protocol-id', 
  name: 'Protocol Name', 
  icon: IconName, // Import from lucide-react
  category: 'Telegram Bots' // or 'Trading Terminals' or 'Mobile Apps'
}`;
  };

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(generateNewProtocolTemplate());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleHardRefresh = async () => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    try {
      const result = await dataSyncApi.syncData();
      success(`Data refresh completed! Fetched ${result.csvFilesFetched} files.`);
    } catch (error) {
      showError(error instanceof Error ? error.message : 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Protocol Configuration</CardTitle>
          <CardDescription>
            Current protocols organized by category. To add a new protocol, update the protocol-config.ts file.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {categories.map(category => {
              const categoryProtocols = protocolConfigs.filter(p => p.category === category);
              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold mb-3">{category}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryProtocols.map(protocol => (
                      <div key={protocol.id} className="flex items-center gap-2 p-3 border rounded-lg">
                        <protocol.icon className="h-5 w-5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="font-medium">{protocol.name}</p>
                          <p className="text-sm text-muted-foreground">{protocol.id}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adding New Protocols</CardTitle>
          <CardDescription>
            Follow these steps to add a new protocol to the dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">1. Update Backend</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Add the protocol to PROTOCOL_SOURCES in server/src/services/dataManagementService.ts
            </p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm">
              "protocol-name": QUERY_ID
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">2. Update Frontend Config</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Add the protocol to src/lib/protocol-config.ts
            </p>
            <div className="bg-muted p-3 rounded-lg font-mono text-sm relative">
              <pre>{generateNewProtocolTemplate()}</pre>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2"
                onClick={handleCopyTemplate}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">3. Choose an Icon</h3>
            <p className="text-sm text-muted-foreground mb-2">
              Browse available icons at{' '}
              <a 
                href="https://lucide.dev/icons" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                lucide.dev/icons
              </a>
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">4. Sync Data</h3>
            <p className="text-sm text-muted-foreground">
              Run the data sync to fetch CSV files and update the database
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Available Categories</CardTitle>
          <CardDescription>
            Protocols are organized into these categories
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <Badge key={category} variant="outline">
                {category}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Force refresh all protocol data from Dune Analytics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 border rounded-lg bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-orange-900 dark:text-orange-100">
                    Hard Refresh Warning
                  </p>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    This will force a complete data refresh from Dune Analytics, bypassing all time restrictions. 
                    Use this only when necessary as it may impact API rate limits.
                  </p>
                </div>
              </div>
            </div>
            
            <Button
              onClick={handleHardRefresh}
              disabled={isRefreshing}
              variant="outline"
              className="w-full"
            >
              {isRefreshing ? (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                  Refreshing Data...
                </>
              ) : (
                <>
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Force Refresh All Data
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Toast notifications */}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          variant={toast.variant}
          className="flex items-center justify-between gap-2"
        >
          <span>{toast.message}</span>
          <Button
            variant="ghost"
            size="icon"
            className="h-4 w-4 p-0"
            onClick={() => removeToast(toast.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </Toast>
      ))}
    </div>
  );
}