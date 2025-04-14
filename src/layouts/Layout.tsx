import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '../utils/utils';
import { Menu, BarChart2, Zap, Sword, LayoutGrid, CalendarDays, CalendarClock } from 'lucide-react';
import { Button } from '../components/ui/button';
import { useState, useEffect } from 'react';
import { Separator } from '../components/ui/separator';

const protocols = [
  { id: 'bullx', name: 'Bull X', icon: BarChart2 },
  { id: 'photon', name: 'Photon', icon: Zap },
  { id: 'trojan', name: 'Trojan', icon: Sword },
  { id: 'all', name: 'All Protocols', icon: LayoutGrid }
];

export function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Get protocol from URL params or default to 'all'
  const currentProtocol = searchParams.get('protocol')?.toLowerCase() || 'all';

  const handleProtocolChange = (protocolId: string) => {
    navigate('/?protocol=' + protocolId);
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
                    "w-full text-white hover:bg-white/10 rounded-xl flex items-center",
                    sidebarOpen ? "justify-start px-2 gap-3" : "justify-center",
                    currentProtocol === protocol.id && "bg-white/10"
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
            <Link to="/reports/daily">
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-white hover:bg-white/10 rounded-xl flex items-center",
                  sidebarOpen ? "justify-start px-2 gap-3" : "justify-center"
                )}
              >
                <CalendarDays className="h-4 w-4" />
                {sidebarOpen && 'Daily Report'}
              </Button>
            </Link>
            <Link to="/reports/monthly">
              <Button
                variant="ghost"
                className={cn(
                  "w-full text-white hover:bg-white/10 rounded-xl flex items-center",
                  sidebarOpen ? "justify-start px-2 gap-3" : "justify-center"
                )}
              >
                <CalendarClock className="h-4 w-4" />
                {sidebarOpen && 'Monthly Report'}
              </Button>
            </Link>
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
