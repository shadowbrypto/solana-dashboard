import { Link, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Home,
  Info,
  Menu,
} from 'lucide-react';
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
    setSearchParams({ protocol: protocolId });
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

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            <Link to="/">
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start text-white hover:bg-white/10 rounded-xl",
                  location.pathname === '/' && "bg-white/10"
                )}
              >
                <Home className="mr-2 h-4 w-4" />
                {sidebarOpen && "Dashboard"}
              </Button>
            </Link>
            <Link to="/analytics">
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start text-white hover:bg-white/10 rounded-xl",
                  location.pathname === '/analytics' && "bg-white/10"
                )}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                {sidebarOpen && "Analytics"}
              </Button>
            </Link>
            <Link to="/about">
              <Button 
                variant="ghost" 
                className={cn(
                  "w-full justify-start text-white hover:bg-white/10 rounded-xl",
                  location.pathname === '/about' && "bg-white/10"
                )}
              >
                <Info className="mr-2 h-4 w-4" />
                {sidebarOpen && "About"}
              </Button>
            </Link>
          </div>

          {sidebarOpen && (
            <>
              <Separator className="my-4 bg-white/10" />
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
            </>
          )}
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
