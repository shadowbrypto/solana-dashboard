import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../utils/utils';
import { Menu, BarChart2, Zap, Sword, LayoutGrid, CalendarDays, CalendarClock, Aperture } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';
import { Separator } from '../components/ui/separator';

const protocols = [
  { id: 'bullx', name: 'Bull X', icon: BarChart2 },
  { id: 'photon', name: 'Photon', icon: Zap },
  { id: 'trojan', name: 'Trojan', icon: Sword },
  { id: 'axiom', name: 'Axiom', icon: Aperture },
  { id: 'gmgnai', name: 'GmGnAi', icon: CalendarClock },
  { id: 'bloom', name: 'Bloom', icon: Aperture },
  { id: 'bonkbot', name: 'BonkBot', icon: Aperture },
  { id: 'nova', name: 'Nova', icon: Aperture },
  { id: 'soltradingbot', name: 'SolTradingBot', icon: Aperture },
  { id: 'maestro', name: 'Maestro', icon: Aperture },
  { id: 'banana', name: 'Banana', icon: Aperture },
  { id: 'padre', name: 'Padre', icon: Aperture },
  { id: 'moonshot', name: 'Moonshot', icon: Aperture },
  { id: 'vector', name: 'Vector', icon: Aperture },
  { id: 'all', name: 'All Protocols', icon: LayoutGrid }
];

const reports = [
  { id: 'daily', name: 'Daily Report', icon: CalendarDays, path: '/reports/daily' },
  { id: 'monthly', name: 'Monthly Report', icon: CalendarClock, path: '/reports/monthly' }
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
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className={cn(
        "bg-[#111111] text-white transition-all duration-300 flex flex-col",
        sidebarOpen ? "w-64" : "w-16"
      )}>
        {/* Logo and toggle */}
        <div className={cn(
          "p-4 flex items-center",
          sidebarOpen ? "justify-between" : "justify-center"
        )}>
          {sidebarOpen && <span className="font-bold text-xl">Sol Charts</span>}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="text-white hover:bg-white/10"
          >
            <Menu className="h-4 w-4" />
          </Button>
        </div>

        <Separator className="bg-white/10" />

        {/* Protocol Selection */}
        <nav className="flex-1 px-2 py-4 space-y-8">
          <div className="space-y-2">
            {sidebarOpen && <h3 className="text-xs uppercase text-white/50 font-medium mb-2 px-2">Protocols</h3>}
            {protocols.map((protocol) => {
              const Icon = protocol.icon;
              return (
                <Button
                  key={protocol.id}
                  variant="ghost"
                  className={cn(
                    "w-full text-white hover:bg-white/10 rounded-xl flex items-center h-10",
                    sidebarOpen ? "justify-start px-2 gap-3" : "justify-center",
                    currentProtocol === protocol.id && "bg-white/10 font-medium"
                  )}
                  onClick={() => handleProtocolChange(protocol.id)}
                >
                  <Icon className="h-4 w-4" />
                  {sidebarOpen && protocol.name}
                </Button>
              );
            })}
          </div>

          <div className="space-y-2">
            {sidebarOpen && <h3 className="text-xs uppercase text-white/50 font-medium mb-2 px-2">Reports</h3>}
            {reports.map((report) => {
              const Icon = report.icon;
              return (
                <Button
                  key={report.id}
                  variant="ghost"
                  className={cn(
                    "w-full text-white hover:bg-white/10 rounded-xl flex items-center h-10",
                    sidebarOpen ? "justify-start px-2 gap-3" : "justify-center",
                    location.pathname === report.path && "bg-white/10 font-medium"
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
      <main className="flex-1 p-8">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
