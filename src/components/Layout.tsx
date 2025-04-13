import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { Separator } from './ui/separator';

const protocols = [
  { id: 'bullx', name: 'Bull X' },
  { id: 'photon', name: 'Photon' },
  { id: 'trojan', name: 'Trojan' },
  { id: 'all', name: 'All Protocols' }
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
        <div className="p-4 flex items-center justify-between">
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
        <nav className="flex-1 p-4 space-y-8">
          <div className="space-y-2">
            <h3 className="text-xs uppercase text-white/50 font-medium mb-2">Protocols</h3>
            {protocols.map((protocol) => (
              <Button
                key={protocol.id}
                variant="ghost"
                className={cn(
                  "w-full justify-start text-white hover:bg-white/10 rounded-xl",
                  currentProtocol === protocol.id && "bg-white/10"
                )}
                onClick={() => handleProtocolChange(protocol.id)}
              >
                {protocol.name}
              </Button>
            ))}
          </div>

          <div className="space-y-2">
            <h3 className="text-xs uppercase text-white/50 font-medium mb-2">Reports</h3>
            <Link to="/reports/daily">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10 rounded-xl"
              >
                Daily Report
              </Button>
            </Link>
            <Link to="/reports/monthly">
              <Button
                variant="ghost"
                className="w-full justify-start text-white hover:bg-white/10 rounded-xl"
              >
                Monthly Report
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
