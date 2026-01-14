import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { LayoutGrid, CalendarDays, Calendar, CalendarRange, ChevronDown, ChevronRight, Brain, Settings, Menu, X, GitCompare, Database, Globe, Rocket, Shield, Home, Users, DollarSign, PanelLeftClose, PanelLeft, Trophy } from 'lucide-react';
import { LogoWithFallback, LaunchpadLogo, ProtocolLogo } from '../components/ui/logo-with-fallback';
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
// import { SettingsManager } from '../components/SettingsManager';

// Generate protocols array from centralized config
const protocols = [
  ...getMutableProtocolConfigs(),
  { id: 'all', name: 'All Trading Apps', icon: LayoutGrid, category: 'Overview' as const }
];

const overviewPages = [
  { id: 'home', name: 'Home', icon: Home, path: '/home' },
  { id: 'comparison', name: 'Trading Apps Comparison', icon: GitCompare, path: '/overview/comparison' },
  { id: 'all-launchpads', name: 'All Launchpads', icon: Rocket, path: '/overview/all-launchpads', new: true },
  // { id: 'weekly-insights', name: 'Weekly Insights', icon: Brain, path: '/overview/weekly-insights', beta: true }
];

const reports = [
  { id: 'daily', name: 'Daily Report', icon: CalendarDays, path: '/reports/daily' },
  { id: 'weekly', name: 'Weekly Report', icon: Calendar, path: '/reports/weekly' },
  { id: 'monthly', name: 'Monthly Report', icon: CalendarRange, path: '/reports/monthly' },
  { id: 'custom', name: 'Custom Reports', icon: Brain, path: '/reports/custom' },
  { id: 'user-milestones', name: 'User Milestones', icon: Trophy, path: '/reports/user-milestones' },
  { id: 'trader-stats', name: 'Trader Stats', icon: Users, path: '/reports/trader-stats' },
  { id: 'fee-comparison', name: 'Fee Comparison', icon: DollarSign, path: '/reports/fee-comparison' }
];

const adminPages = [
  { id: 'protocols', name: 'Settings', icon: Settings, path: '/admin/protocols' }
];

export function Layout() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => AppSettings.getSidebarCollapsed());
  const [dataType, setDataType] = useState<'public' | 'private'>(AppSettings.getDataTypePreference());
  // Initialize all categories as expanded for better navigation
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(
    protocolCategories.reduce((acc, category) => ({ ...acc, [category.name]: true }), {})
  );

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    AppSettings.setSidebarCollapsed(newState);
  };
  
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
    <TooltipProvider delayDuration={0}>
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
        "border-r flex flex-col transition-all duration-300 ease-in-out",
        "lg:bg-muted/10 lg:translate-x-0 lg:static lg:z-auto",
        "fixed inset-y-0 left-0 z-50 bg-background shadow-lg",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        isCollapsed ? "lg:w-[68px]" : "w-64"
      )}>
        {/* Logo - Hidden on mobile since it's in the mobile header */}
        <div className={cn(
          "p-4 flex items-center lg:flex hidden",
          isCollapsed ? "justify-center" : "justify-between"
        )}>
          {!isCollapsed && <span className="font-bold text-xl text-foreground">Trading Apps</span>}
          <div className="flex items-center gap-1">
            {!isCollapsed && <ThemeSwitcher />}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="h-8 w-8 p-0 hover:bg-muted"
            >
              {isCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <Separator className="bg-border lg:block hidden" />

        {/* Protocol Selection */}
        <nav className="flex-1 px-2 py-4 space-y-6 overflow-y-auto lg:pt-4 pt-2">

          {/* Home Section - Above Overview */}
          <div className="space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  key="home"
                  variant="ghost"
                  className={cn(
                    "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                    isCollapsed ? "justify-center px-0" : "justify-start px-2 gap-3",
                    location.pathname === '/home' && "bg-muted text-foreground font-medium"
                  )}
                  onClick={() => handleReportChange('/home')}
                >
                  <div className={cn("w-6 h-6 bg-muted/20 rounded-md flex items-center justify-center", isCollapsed && "w-8 h-8")}>
                    <Home className="h-4 w-4" />
                  </div>
                  {!isCollapsed && "Home"}
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right" className="z-[100]">Home</TooltipContent>}
            </Tooltip>
          </div>

          {/* Overview Section */}
          <div className="space-y-2">
            {!isCollapsed && <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Overview</h3>}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  key="all"
                  variant="ghost"
                  className={cn(
                    "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                    isCollapsed ? "justify-center px-0" : "justify-start px-2 gap-3",
                    currentProtocol === 'all' && isProtocolPage && "bg-muted text-foreground font-medium"
                  )}
                  onClick={() => handleProtocolChange('all')}
                >
                  <div className={cn("w-6 h-6 bg-primary/10 rounded-md flex items-center justify-center", isCollapsed && "w-8 h-8")}>
                    <LayoutGrid className="h-4 w-4 text-primary" />
                  </div>
                  {!isCollapsed && "All Trading Apps"}
                </Button>
              </TooltipTrigger>
              {isCollapsed && <TooltipContent side="right" className="z-[100]">All Trading Apps</TooltipContent>}
            </Tooltip>

            {overviewPages.filter(page => page.id !== 'home').map((page) => {
              const Icon = page.icon;
              return (
                <Tooltip key={page.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                        isCollapsed ? "justify-center px-0" : "justify-start px-2 gap-3",
                        location.pathname === page.path && "bg-muted text-foreground font-medium"
                      )}
                      onClick={() => handleReportChange(page.path)}
                    >
                      <div className={cn("w-6 h-6 bg-muted/20 rounded-md flex items-center justify-center", isCollapsed && "w-8 h-8")}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {!isCollapsed && (
                        <span className="flex items-center gap-2">
                          {page.name}
                          {page.beta && (
                            <span className="px-1.5 py-0 text-[8px] font-medium bg-blue-500/20 text-blue-400 rounded border border-blue-500/30">
                              BETA
                            </span>
                          )}
                          {page.new && (
                            <span className="text-[8px] px-1 py-0 rounded font-medium bg-emerald-500 text-white shadow-sm border border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500">
                              NEW
                            </span>
                          )}
                        </span>
                      )}
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right" className="z-[100]">{page.name}</TooltipContent>}
                </Tooltip>
              );
            })}
          </div>

          {/* Protocol Categories - Hidden when collapsed */}
          {!isCollapsed && (
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
                  <span className="text-[8px] px-1 py-0 rounded font-medium bg-emerald-500 text-white shadow-sm border border-emerald-600 dark:bg-emerald-600 dark:border-emerald-500">
                    NEW
                  </span>
                  {/* Stacked Icons Preview - Only show when category is collapsed */}
                  {!expandedCategories['Launchpads'] && (
                    <div className="flex -space-x-1">
                      {getAllLaunchpads().slice(0, 3).map((launchpad, index) => (
                        <div key={launchpad.id} style={{ zIndex: getAllLaunchpads().length - index }}>
                          <LaunchpadLogo
                            src={`/assets/logos/${getLaunchpadLogoFilename(launchpad.id)}`}
                            alt={launchpad.name}
                            size="xs"
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
                      <LaunchpadLogo
                        src={`/assets/logos/${getLaunchpadLogoFilename(launchpad.id)}`}
                        alt={launchpad.name}
                        size="md"
                      />
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
                                style={{ zIndex: category.protocols.length - avatarIndex }}
                              >
                                <ProtocolLogo
                                  src={`/assets/logos/${getProtocolLogoFilename(protocolId)}`}
                                  alt={protocol.name}
                                  size="xs"
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
                        const isMonad = protocol.id.endsWith('_monad');
                        const chainBadge = isEVM ? "EVM" : isMonad ? "MON" : "SOL";
                        const chainBadgeClass = isEVM
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          : isMonad
                            ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                            : "bg-purple-500/10 text-purple-600 dark:text-purple-400";
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
                            <ProtocolLogo
                              src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
                              alt={protocol.name}
                              size="md"
                            />
                            <span className="flex-1 text-left">{protocol.name}</span>
                            <span className={cn(
                              "text-xs px-1.5 py-0.5 rounded-md font-medium",
                              chainBadgeClass
                            )}>
                              {chainBadge}
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
          )}

          {/* Reports Section */}
          <div className="space-y-2">
            {!isCollapsed && <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Reports</h3>}
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <Tooltip key={report.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                        isCollapsed ? "justify-center px-0" : "justify-start px-2 gap-3",
                        location.pathname === report.path && "bg-muted text-foreground font-medium"
                      )}
                      onClick={() => handleReportChange(report.path)}
                    >
                      <div className={cn("w-6 h-6 bg-muted/20 rounded-md flex items-center justify-center", isCollapsed && "w-8 h-8")}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {!isCollapsed && <span className="flex-1 text-left">{report.name}</span>}
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right" className="z-[100]">{report.name}</TooltipContent>}
                </Tooltip>
              );
            })}
          </div>

          {/* Admin Section */}
          <div className="space-y-2">
            {!isCollapsed && <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Admin</h3>}
            {adminPages.map((page) => {
              const Icon = page.icon;
              return (
                <Tooltip key={page.id}>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                        isCollapsed ? "justify-center px-0" : "justify-start px-2 gap-3",
                        location.pathname === page.path && "bg-muted text-foreground font-medium"
                      )}
                      onClick={() => handleReportChange(page.path)}
                    >
                      <div className={cn("w-6 h-6 bg-muted/20 rounded-md flex items-center justify-center", isCollapsed && "w-8 h-8")}>
                        <Icon className="h-4 w-4" />
                      </div>
                      {!isCollapsed && page.name}
                    </Button>
                  </TooltipTrigger>
                  {isCollapsed && <TooltipContent side="right" className="z-[100]">{page.name}</TooltipContent>}
                </Tooltip>
              );
            })}
            
            {/* Data Type Indicator */}
            <div className={cn("pt-2", isCollapsed ? "px-0 flex justify-center" : "px-2")}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className={cn(
                    "flex items-center justify-center gap-1.5 rounded-md text-xs font-medium transition-colors cursor-default",
                    isCollapsed ? "w-10 h-10 p-0" : "px-2 py-1 w-full",
                    dataType === 'private'
                      ? "bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-800/50"
                      : "bg-green-50 text-green-700 border border-green-200 dark:bg-green-950/30 dark:text-green-300 dark:border-green-800/50"
                  )}>
                    {dataType === 'private' ? (
                      <>
                        <Shield className={cn("shrink-0", isCollapsed ? "w-4 h-4" : "w-3 h-3")} />
                        {!isCollapsed && <span>Private Data</span>}
                      </>
                    ) : (
                      <>
                        <Globe className={cn("shrink-0", isCollapsed ? "w-4 h-4" : "w-3 h-3")} />
                        {!isCollapsed && <span>Public Data</span>}
                      </>
                    )}
                  </div>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right" className="z-[100]">
                    {dataType === 'private' ? 'Private Data' : 'Public Data'}
                  </TooltipContent>
                )}
              </Tooltip>
            </div>
          </div>
        </nav>


        {/* Data Sync Button */}
        <div className={cn("border-t border-border", isCollapsed ? "p-2" : "p-4")}>
          <DataSyncButton isCollapsed={isCollapsed} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 bg-muted/20 overflow-y-auto lg:ml-0 ml-0">
        <div className="lg:p-8 p-4 lg:pt-8 pt-20">
          <Outlet />
        </div>
      </main>
      
      {/* Toast notifications */}
      <Toaster />
      
      {/* Settings Manager (Development) - disabled */}
      {/* <SettingsManager /> */}
    </div>
    </TooltipProvider>
  );
}
