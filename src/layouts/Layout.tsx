import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Menu, BarChart2, Zap, Sword, LayoutGrid, CalendarDays, CalendarClock, Aperture, Bot, Star, Rocket, Wand2, Banana, Cross, Moon, ArrowUpRight, ChevronDown, ChevronRight, Brain } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';
import { Separator } from '../components/ui/separator';
import { protocolCategories } from '../lib/protocol-categories';

const protocols = [
  { id: 'bullx', name: 'Bull X', icon: BarChart2 },
  { id: 'photon', name: 'Photon', icon: Zap },
  { id: 'trojan', name: 'Trojan', icon: Sword },
  { id: 'axiom', name: 'Axiom', icon: Aperture },
  { id: 'gmgnai', name: 'GmGnAi', icon: CalendarClock },
  { id: 'bloom', name: 'Bloom', icon: Wand2 },
  { id: 'bonkbot', name: 'BonkBot', icon: Bot },
  { id: 'nova', name: 'Nova', icon: Star },
  { id: 'soltradingbot', name: 'SolTradingBot', icon: Rocket },
  { id: 'maestro', name: 'Maestro', icon: Zap },
  { id: 'banana', name: 'Banana', icon: Banana },
  { id: 'padre', name: 'Padre', icon: Cross },
  { id: 'moonshot', name: 'Moonshot', icon: Moon },
  { id: 'vector', name: 'Vector', icon: ArrowUpRight },
  { id: 'all', name: 'All Protocols', icon: LayoutGrid }
];

const overviewPages = [
  { id: 'weekly-insights', name: 'Weekly Insights', icon: Brain, path: '/overview/weekly-insights' }
];

const reports = [
  { id: 'daily', name: 'Daily Report', icon: CalendarDays, path: '/reports/daily' }
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Only highlight protocol if we're on the main page
  const isMainPage = location.pathname === '/';
  const currentProtocol = isMainPage ? (searchParams.get('protocol')?.toLowerCase() || 'all') : '';

  const handleProtocolChange = (protocolId: string) => {
    navigate('/?protocol=' + protocolId);
  };

  const handleReportChange = (path: string) => {
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className={cn(
        "border-r bg-muted/10 transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Logo and toggle */}
        <div className={cn(
          "p-4 flex items-center",
          sidebarOpen ? "justify-between" : "justify-center"
        )}>
          {sidebarOpen && <span className="font-bold text-xl text-foreground">Trading Apps</span>}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="bg-border" />

        {/* Protocol Selection */}
        <nav className="flex-1 px-2 py-4 space-y-8">
          {/* Overview Section */}
          <div className="space-y-2">
            {sidebarOpen && <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Overview</h3>}
            <Button
              key="all"
              variant="ghost"
              className={cn(
                "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                sidebarOpen ? "justify-start px-2 gap-3" : "justify-center",
                currentProtocol === 'all' && "bg-muted text-foreground font-medium"
              )}
              onClick={() => handleProtocolChange('all')}
            >
              <LayoutGrid className="h-4 w-4" />
              {sidebarOpen && 'All Protocols'}
            </Button>
            
            {overviewPages.map((page) => {
              const Icon = page.icon;
              return (
                <Button
                  key={page.id}
                  variant="ghost"
                  className={cn(
                    "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                    sidebarOpen ? "justify-start px-2 gap-3" : "justify-center",
                    location.pathname === page.path && "bg-muted text-foreground font-medium"
                  )}
                  onClick={() => handleReportChange(page.path)}
                >
                  <Icon className="h-4 w-4" />
                  {sidebarOpen && page.name}
                </Button>
              );
            })}
          </div>

          {/* Protocol Categories */}
          <div className="space-y-2">
            {sidebarOpen && <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Categories</h3>}
            {protocolCategories.map((category) => {
              const [isExpanded, setIsExpanded] = useState(false);
              return (
                <div key={category.name} className="space-y-1">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                      sidebarOpen ? "justify-between px-2" : "justify-center"
                    )}
                    onClick={() => sidebarOpen && setIsExpanded(!isExpanded)}
                  >
                    <div className="flex items-center gap-3">
                      {category.name}
                    </div>
                    {sidebarOpen && (
                      isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                  {sidebarOpen && isExpanded && (
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
                              "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                              "justify-start px-2 gap-3",
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

          <div className="space-y-2">
            {sidebarOpen && <h3 className="text-xs uppercase text-muted-foreground font-medium mb-2 px-2">Reports</h3>}
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <Button
                  key={report.id}
                  variant="ghost"
                  className={cn(
                    "w-full text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl flex items-center h-10",
                    sidebarOpen ? "justify-start px-2 gap-3" : "justify-center",
                    location.pathname === report.path && "bg-muted text-foreground font-medium"
                  )}
                  onClick={() => handleReportChange(report.path)}
                >
                  <Icon className="h-4 w-4" />
                  {sidebarOpen && report.name}
                </Button>
              );
            })}
          </div>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 bg-muted/20">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
