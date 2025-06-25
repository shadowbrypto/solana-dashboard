import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { LayoutGrid, CalendarDays, ChevronDown, ChevronRight, Brain, Settings, Menu, X, GitCompare } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';
import { Separator } from '../components/ui/separator';
import { protocolCategories } from '../lib/protocol-categories';
import { DataSyncButton } from '../components/DataSyncButton';
import { getMutableProtocolConfigs } from '../lib/protocol-config';
import { ThemeSwitcher } from '../components/ThemeSwitcher';

// Generate protocols array from centralized config
const protocols = [
  ...getMutableProtocolConfigs(),
  { id: 'all', name: 'All Protocols', icon: LayoutGrid, category: 'Overview' as const }
];

const overviewPages = [
  { id: 'comparison', name: 'Protocol Comparison', icon: GitCompare, path: '/overview/comparison' },
  // { id: 'weekly-insights', name: 'Weekly Insights', icon: Brain, path: '/overview/weekly-insights', beta: true }
];

const reports = [
  { id: 'daily', name: 'Daily Report', icon: CalendarDays, path: '/reports/daily' },
  { id: 'weekly', name: 'Weekly Report', icon: CalendarDays, path: '/reports/weekly' },
  { id: 'monthly', name: 'Monthly Report', icon: CalendarDays, path: '/reports/monthly' }
];

const adminPages = [
  { id: 'protocols', name: 'Protocol Management', icon: Settings, path: '/admin/protocols' }
];

export function Layout() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Initialize all categories as expanded for better navigation
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    protocolCategories.reduce((acc, category) => ({ ...acc, [category.name]: true }), {})
  );
  
  // Check if we're on a protocol page (root)
  const isProtocolPage = location.pathname === '/';
  const searchParams = new URLSearchParams(location.search);
  const currentProtocol = isProtocolPage ? (searchParams.get('protocol')?.toLowerCase() || 'all') : '';

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleProtocolChange = (protocolId: string) => {
    // Navigate using query parameters to match the router structure
    if (protocolId === 'all') {
      navigate('/');
    } else {
      navigate(`/?protocol=${protocolId}`);
    }
  };

  const handleReportChange = (path: string) => {
    navigate(path);
  };

  return (
    <div className="h-screen bg-background flex">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border h-16 flex items-center justify-between px-4">
        <span className="font-bold text-xl text-foreground">Trading Apps</span>
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="p-2"
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "w-64 border-r flex flex-col transition-transform duration-300 ease-in-out",
        "lg:bg-muted/10 lg:translate-x-0 lg:static lg:z-auto",
        "fixed inset-y-0 left-0 z-50 bg-background shadow-lg",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Logo - Hidden on mobile since it's in the mobile header */}
        <div className="p-4 flex items-center justify-between lg:flex hidden">
          <span className="font-bold text-xl text-foreground">Trading Apps</span>
          <ThemeSwitcher />
        </div>

        <Separator className="bg-border lg:block hidden" />

        {/* Protocol Selection */}
        <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto lg:pt-4 pt-2">
          {/* Overview Section */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Overview</h3>
            <Button
              key="all"
              variant="ghost"
              className={cn(
                "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-start px-2 gap-3",
                currentProtocol === 'all' && isProtocolPage && "bg-muted text-foreground font-medium"
              )}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleProtocolChange('all');
              }}
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
                  <span className="flex items-center gap-2">
                    {page.name}
                    {page.beta && (
                      <span className="px-1.5 py-0 text-[8px] font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                        BETA
                      </span>
                    )}
                  </span>
                </Button>
              );
            })}
          </div>

          {/* Protocol Categories */}
          <div className="space-y-2">
            <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Categories</h3>
            {protocolCategories.map((category) => {
              const isExpanded = expandedCategories[category.name] || false;
              return (
                <div key={category.name} className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-between px-2"
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category.name]: !isExpanded }))}
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
                              currentProtocol === protocol.id && isProtocolPage && "bg-muted text-foreground font-medium"
                            )}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleProtocolChange(protocol.id);
                            }}
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
      <main className="flex-1 bg-muted/20 overflow-y-auto lg:ml-0 ml-0">
        <div className="lg:p-8 p-4 lg:pt-8 pt-20">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
