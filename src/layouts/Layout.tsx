import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { LayoutGrid, CalendarDays, Calendar, CalendarRange, ChevronDown, ChevronRight, Brain, Settings, Menu, X, GitCompare, Database, Globe, Rocket } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';
import { Separator } from '../components/ui/separator';
import { protocolCategories } from '../lib/protocol-categories';
import { DataSyncButton } from '../components/DataSyncButton';
import { getMutableProtocolConfigs, getProtocolLogoFilename } from '../lib/protocol-config';
import { getAllLaunchpads, getLaunchpadLogoFilename } from '../lib/launchpad-config';
import { ThemeSwitcher } from '../components/ThemeSwitcher';
import { Toaster } from '../components/ui/toaster';
import { Settings as AppSettings } from '../lib/settings';
// import { SettingsManager } from '../components/SettingsManager';

// Generate protocols array from centralized config
const protocols = [
  ...getMutableProtocolConfigs(),
  { id: 'all', name: 'All Trading Apps', icon: LayoutGrid, category: 'Overview' as const }
];

const overviewPages = [
  { id: 'comparison', name: 'Trading Apps Comparison', icon: GitCompare, path: '/overview/comparison' },
  { id: 'all-launchpads', name: 'All Launchpads', icon: Rocket, path: '/overview/all-launchpads', new: true },
  // { id: 'weekly-insights', name: 'Weekly Insights', icon: Brain, path: '/overview/weekly-insights', beta: true }
];

const reports = [
  { id: 'daily', name: 'Daily Report', icon: CalendarDays, path: '/reports/daily' },
  { id: 'weekly', name: 'Weekly Report', icon: Calendar, path: '/reports/weekly' },
  { id: 'monthly', name: 'Monthly Report', icon: CalendarRange, path: '/reports/monthly', chain: 'solana' }
];

const adminPages = [
  { id: 'protocols', name: 'Trading App Management', icon: Settings, path: '/admin/protocols' }
];

export function Layout() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [dataType, setDataType] = useState<'public' | 'private'>(AppSettings.getDataTypePreference());
  // Initialize all categories as expanded for better navigation
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    protocolCategories.reduce((acc, category) => ({ ...acc, [category.name]: true }), {})
  );
  
  // Check if we're on a protocol page (root)
  const isProtocolPage = location.pathname === '/';
  const searchParams = new URLSearchParams(location.search);
  const currentProtocol = isProtocolPage ? (searchParams.get('protocol')?.toLowerCase() || 'all') : '';

  // Listen for data type changes
  useEffect(() => {
    const unsubscribe = AppSettings.addDataTypeChangeListener((newDataType) => {
      setDataType(newDataType);
    });
    return unsubscribe;
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Persist expanded categories changes - disabled for now
  // useEffect(() => {
  //   Settings.setSidebarExpandedCategories(expandedCategories);
  // }, [expandedCategories]);

  const handleProtocolChange = (protocolId: string) => {
    // Navigate using query parameters to match the router structure
    if (protocolId === 'all') {
      navigate('/');
    } else {
      navigate(`/?protocol=${protocolId}`);
    }
  };

  const handleReportChange = (path: string) => {
    console.log('Navigation attempt:', {
      from: location.pathname,
      to: path,
      timestamp: new Date().toISOString()
    });
    
    // Force navigation with replace to clear any state issues
    navigate(path, { replace: true });
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
          {/* Data Type Indicator */}
          <div className="px-2 mb-6">
            <div className={cn(
              "flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
              dataType === 'private' 
                ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50" 
                : "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800/50"
            )}>
              {dataType === 'private' ? (
                <>
                  <Database className="w-3.5 h-3.5 shrink-0" />
                  <span>Private Analytics</span>
                </>
              ) : (
                <>
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>Public Analytics</span>
                </>
              )}
            </div>
          </div>

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
              onClick={() => handleProtocolChange('all')}
            >
              <div className="w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center">
                <LayoutGrid className="h-4 w-4 text-primary" />
              </div>
              All Trading Apps
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
                  <div className="w-6 h-6 bg-muted/20 rounded-md flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex items-center gap-2">
                    {page.name}
                    {page.beta && (
                      <span className="px-1.5 py-0 text-[8px] font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                        BETA
                      </span>
                    )}
                    {page.new && (
                      <span className="text-[8px] px-1 py-px rounded font-medium bg-emerald-500 text-white shadow-sm border border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500">
                        NEW
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
            
            {/* Launchpads Category */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-12 justify-between px-2"
                onClick={() => setExpandedCategories(prev => ({ ...prev, ['Launchpads']: !expandedCategories['Launchpads'] }))}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="font-medium">Launchpads</span>
                  <span className="text-[8px] px-1 py-px rounded font-medium bg-emerald-500 text-white shadow-sm border border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500">
                    NEW
                  </span>
                  {/* Stacked Icons Preview - Only show when category is collapsed */}
                  {!expandedCategories['Launchpads'] && (
                    <div className="flex -space-x-1">
                      {getAllLaunchpads().slice(0, 3).map((launchpad, index) => (
                        <div key={launchpad.id} className="w-4 h-4 rounded-full border border-background bg-muted overflow-hidden" style={{ zIndex: getAllLaunchpads().length - index }}>
                          <img 
                            src={`/assets/logos/${getLaunchpadLogoFilename(launchpad.id)}`}
                            alt={launchpad.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              const container = target.parentElement;
                              if (container) {
                                container.innerHTML = '';
                                container.className = 'w-4 h-4 rounded-full border border-background bg-muted/50 flex items-center justify-center';
                                const iconEl = document.createElement('div');
                                iconEl.innerHTML = '<svg class="h-2 w-2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.25-2 5.2-2 5.2s4-0.5 5.2-2c1.6-2 2.8-7 2.8-7s-5 1.2-7 2.8Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>';
                                container.appendChild(iconEl);
                              }
                            }}
                          />
                        </div>
                      ))}
                      {getAllLaunchpads().length > 3 && (
                        <div className="w-4 h-4 rounded-full border border-background bg-muted/80 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                          +{getAllLaunchpads().length - 3}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {expandedCategories['Launchpads'] ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
              </Button>
              {expandedCategories['Launchpads'] && (
                <div className="ml-4 space-y-1">
                  {getAllLaunchpads().map((launchpad) => (
                    <Button
                      key={launchpad.id}
                      variant="ghost"
                      className={cn(
                        "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-start px-2 gap-3",
                        location.pathname === '/launchpad' && location.search.includes(`launchpad=${launchpad.id}`) && "bg-muted text-foreground font-medium"
                      )}
                      onClick={() => navigate(`/launchpad?launchpad=${launchpad.id}`)}
                    >
                      <div className="w-5 h-5 bg-muted/10 rounded-md overflow-hidden ring-1 ring-border/20">
                        <img 
                          src={`/assets/logos/${getLaunchpadLogoFilename(launchpad.id)}`}
                          alt={launchpad.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            const container = target.parentElement;
                            if (container) {
                              container.innerHTML = '';
                              container.className = 'w-5 h-5 bg-muted/20 rounded-md flex items-center justify-center';
                              const iconEl = document.createElement('div');
                              iconEl.innerHTML = '<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4.5 16.5c-1.5 1.25-2 5.2-2 5.2s4-0.5 5.2-2c1.6-2 2.8-7 2.8-7s-5 1.2-7 2.8Z"/><path d="m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2Z"/></svg>';
                              container.appendChild(iconEl);
                            }
                          }}
                        />
                      </div>
                      <span className="flex-1 text-left">{launchpad.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
            
            {protocolCategories.map((category) => {
              const isExpanded = expandedCategories[category.name] || false;
              return (
                <div key={category.name} className="space-y-1">
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-12 justify-between px-2"
                    onClick={() => setExpandedCategories(prev => ({ ...prev, [category.name]: !isExpanded }))}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="font-medium">{category.name}</span>
                      {/* Stacked Protocol Icons Preview - Only show when category is collapsed */}
                      {!isExpanded && (
                        <div className="flex -space-x-1">
                          {category.protocols.slice(0, 3).map((protocolId, avatarIndex) => {
                            const protocol = protocols.find(p => p.id === protocolId);
                            if (!protocol) return null;
                            return (
                              <div 
                                key={protocolId}
                                className="w-4 h-4 rounded-full border border-background bg-muted overflow-hidden"
                                style={{ zIndex: category.protocols.length - avatarIndex }}
                              >
                                <img 
                                  src={`/assets/logos/${getProtocolLogoFilename(protocolId)}`}
                                  alt={protocol.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    const container = target.parentElement;
                                    if (container) {
                                      container.innerHTML = '';
                                      container.className = 'w-4 h-4 rounded-full border border-background bg-muted/50 flex items-center justify-center';
                                      const iconEl = document.createElement('div');
                                      iconEl.innerHTML = '<svg class="h-2 w-2 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/></svg>';
                                      container.appendChild(iconEl);
                                    }
                                  }}
                                />
                              </div>
                            );
                          })}
                          {category.protocols.length > 3 && (
                            <div className="w-4 h-4 rounded-full border border-background bg-muted/80 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                              +{category.protocols.length - 3}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isExpanded ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                  </Button>
                  {isExpanded && (
                    <div className="ml-4 space-y-1">
                      {category.protocols.map(protocolId => {
                        const protocol = protocols.find(p => p.id === protocolId);
                        if (!protocol) return null;
                        const Icon = protocol.icon;
                        const isEVM = protocol.id.endsWith('_evm');
                        return (
                          <Button
                            key={protocol.id}
                            variant="ghost"
                            className={cn(
                              "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10 justify-start px-2 gap-3",
                              currentProtocol === protocol.id && isProtocolPage && "bg-muted text-foreground font-medium"
                            )}
                            onClick={() => handleProtocolChange(protocol.id)}
                          >
                            <div className="w-5 h-5 bg-muted/10 rounded-md overflow-hidden ring-1 ring-border/20">
                              <img 
                                src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                                alt={protocol.name} 
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  const target = e.target as HTMLImageElement;
                                  const container = target.parentElement;
                                  if (container) {
                                    container.innerHTML = '';
                                    container.className = 'w-5 h-5 bg-muted/20 rounded-md flex items-center justify-center';
                                    const iconEl = document.createElement('div');
                                    iconEl.innerHTML = '<svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M12 8V4H8"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>';
                                    container.appendChild(iconEl);
                                  }
                                }}
                              />
                            </div>
                            <span className="flex-1 text-left">{protocol.name}</span>
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded-md font-medium",
                              isEVM 
                                ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                                : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                            )}>
                              {isEVM ? "EVM" : "SOL"}
                            </span>
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
              const isEVM = report.chain === 'evm';
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
                  <div className="w-6 h-6 bg-muted/20 rounded-md flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
                  <span className="flex-1 text-left">{report.name}</span>
                  {report.chain && (
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded-md font-medium",
                      isEVM 
                        ? "bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                        : "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                    )}>
                      {isEVM ? "EVM" : "SOL"}
                    </span>
                  )}
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
                  <div className="w-6 h-6 bg-muted/20 rounded-md flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </div>
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
      
      {/* Toast notifications */}
      <Toaster />
      
      {/* Settings Manager (Development) - disabled */}
      {/* <SettingsManager /> */}
    </div>
  );
}
