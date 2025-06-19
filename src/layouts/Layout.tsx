import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { LayoutGrid, CalendarDays, ChevronDown, ChevronRight, Brain, Settings } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';
import { Separator } from '../components/ui/separator';
import { protocolCategories } from '../lib/protocol-categories';
import { DataSyncButton } from '../components/DataSyncButton';
import { protocolConfigs } from '../lib/protocol-config';

// Generate protocols array from centralized config
const protocols = [
  ...protocolConfigs,
  { id: 'all', name: 'All Protocols', icon: LayoutGrid, category: 'Overview' as const }
];

const overviewPages = [
  { id: 'weekly-insights', name: 'Weekly Insights', icon: Brain, path: '/overview/weekly-insights' }
];

const reports = [
  { id: 'daily', name: 'Daily Report', icon: CalendarDays, path: '/reports/daily' }
];

const adminPages = [
  { id: 'protocols', name: 'Protocol Management', icon: Settings, path: '/admin/protocols' }
];

export function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Only highlight protocol if we're on the main page
  const isMainPage = location.pathname === '/';
  const currentProtocol = isMainPage ? (searchParams.get('protocol')?.toLowerCase() || 'trojan') : '';

  const handleProtocolChange = (protocolId: string) => {
    navigate('/?protocol=' + protocolId);
  };

  const handleReportChange = (path: string) => {
    navigate(path);
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-muted/10 flex flex-col">
        {/* Logo */}
        <div className="p-4 flex items-center">
          <span className="font-bold text-xl text-foreground">Trading Apps</span>
        </div>

        <Separator className="bg-border" />

        {/* Protocol Selection */}
        <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto">
          {/* Overview Section */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Overview</h3>
            <Button
              key="all"
              variant="ghost"
              className={cn(
                "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-start px-2 gap-3",
                currentProtocol === 'all' && "bg-muted text-foreground font-medium"
              )}
              onClick={() => handleProtocolChange('all')}
            >
              <LayoutGrid className="h-4 w-4" />
              All Protocols
            </Button>
            
            {overviewPages.map((page) => {
              const Icon = page.icon;
              return (
                <Button
                  key={page.id}
                  variant="ghost"
                  className={cn(
                    "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-start px-2 gap-3",
                    location.pathname === page.path && "bg-muted text-foreground font-medium"
                  )}
                  onClick={() => handleReportChange(page.path)}
                >
                  <Icon className="h-4 w-4" />
                  {page.name}
                </Button>
              );
            })}
          </div>

          {/* Protocol Categories */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Categories</h3>
            {protocolCategories.map((category) => {
              const [isExpanded, setIsExpanded] = useState(false);
              return (
                <div key={category.name} className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-between px-2"
                    onClick={() => setIsExpanded(!isExpanded)}
                  >
                    <div className="flex items-center gap-3">
                      {category.name}
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  </Button>
                  {isExpanded && (
                    <div className="ml-4 space-y-1">
                      {category.protocols.map(protocolId => {
                        const protocol = protocols.find(p => p.id === protocolId);
                        if (!protocol) return null;
                        const Icon = protocol.icon;
                        return (
                          <Button
                            key={protocol.id}
                            variant="ghost"
                            className={cn(
                              "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-start px-2 gap-3",
                              currentProtocol === protocol.id && "bg-muted text-foreground font-medium"
                            )}
                            onClick={() => handleProtocolChange(protocol.id)}
                          >
                            <Icon className="h-4 w-4" />
                            {protocol.name}
                          </Button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Reports Section */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Reports</h3>
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <Button
                  key={report.id}
                  variant="ghost"
                  className={cn(
                    "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-start px-2 gap-3",
                    location.pathname === report.path && "bg-muted text-foreground font-medium"
                  )}
                  onClick={() => handleReportChange(report.path)}
                >
                  <Icon className="h-4 w-4" />
                  {report.name}
                </Button>
              );
            })}
          </div>

          {/* Admin Section */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Admin</h3>
            {adminPages.map((page) => {
              const Icon = page.icon;
              return (
                <Button
                  key={page.id}
                  variant="ghost"
                  className={cn(
                    "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-start px-2 gap-3",
                    location.pathname === page.path && "bg-muted text-foreground font-medium"
                  )}
                  onClick={() => handleReportChange(page.path)}
                >
                  <Icon className="h-4 w-4" />
                  {page.name}
                </Button>
              );
            })}
          </div>
        </nav>

        {/* Data Sync Button */}
        <div className="p-4 border-t border-border">
          <DataSyncButton isCollapsed={false} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-muted/20 overflow-y-auto">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
