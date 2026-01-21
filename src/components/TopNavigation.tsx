import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { NavDropdown } from './NavDropdown';
import { MobileNav } from './MobileNav';
import { ThemeSwitcher } from './ThemeSwitcher';
import { Settings, Menu, LayoutGrid, GitCompare, Rocket, CalendarDays, Calendar, CalendarRange, Brain, Users, DollarSign, Trophy } from 'lucide-react';
import { getMutableProtocolConfigs, getProtocolLogoFilename } from '@/lib/protocol-config';
import { getAllLaunchpads, getLaunchpadLogoFilename } from '@/lib/launchpad-config';
import { protocolCategories } from '@/lib/protocol-categories';
import { ProtocolLogo, LaunchpadLogo } from './ui/logo-with-fallback';
import { Button } from './ui/button';

export function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  // Close mobile menu when route changes
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const protocols = getMutableProtocolConfigs();
  const launchpads = getAllLaunchpads();

  // Check if current path matches
  const isActivePath = (path: string) => location.pathname === path;
  const isProtocolPage = location.pathname === '/';
  const searchParams = new URLSearchParams(location.search);
  const currentProtocol = isProtocolPage ? (searchParams.get('protocol')?.toLowerCase() || 'all') : '';

  // Build protocol dropdown sections
  const protocolSections = [
    {
      items: [
        {
          id: 'all',
          label: 'All Trading Apps',
          icon: <LayoutGrid className="h-4 w-4 text-primary" />,
          onClick: () => navigate('/'),
        },
        {
          id: 'comparison',
          label: 'Compare Protocols',
          icon: <GitCompare className="h-4 w-4 text-muted-foreground" />,
          onClick: () => navigate('/overview/comparison'),
        },
      ],
    },
    ...protocolCategories.map((category) => ({
      title: category.name,
      items: category.protocols.map((protocolId) => {
        const protocol = protocols.find((p) => p.id === protocolId);
        if (!protocol) return null;
        return {
          id: protocol.id,
          label: protocol.name,
          icon: (
            <ProtocolLogo
              src={`/assets/logos/${getProtocolLogoFilename(protocol.id)}`}
              alt={protocol.name}
              size="sm"
            />
          ),
          onClick: () => navigate(`/?protocol=${protocol.id}`),
        };
      }).filter(Boolean) as Array<{ id: string; label: string; icon: React.ReactNode; onClick: () => void }>,
    })),
  ];

  // Build launchpad dropdown sections
  const launchpadSections = [
    {
      items: [
        {
          id: 'all-launchpads',
          label: 'All Launchpads',
          icon: <Rocket className="h-4 w-4 text-primary" />,
          badge: 'NEW',
          badgeVariant: 'new' as const,
          onClick: () => navigate('/overview/all-launchpads'),
        },
      ],
    },
    {
      title: 'Launchpads',
      items: launchpads.map((launchpad) => ({
        id: launchpad.id,
        label: launchpad.name,
        icon: (
          <LaunchpadLogo
            src={`/assets/logos/${getLaunchpadLogoFilename(launchpad.id)}`}
            alt={launchpad.name}
            size="sm"
          />
        ),
        onClick: () => navigate(`/launchpad?launchpad=${launchpad.id}`),
      })),
    },
  ];

  // Build reports dropdown sections
  const reportSections = [
    {
      title: 'Regular Reports',
      items: [
        {
          id: 'daily',
          label: 'Daily Report',
          icon: <CalendarDays className="h-4 w-4 text-muted-foreground" />,
          description: 'Single day metrics breakdown',
          onClick: () => navigate('/reports/daily'),
        },
        {
          id: 'weekly',
          label: 'Weekly Report',
          icon: <Calendar className="h-4 w-4 text-muted-foreground" />,
          description: '7-day trending analysis',
          onClick: () => navigate('/reports/weekly'),
        },
        {
          id: 'monthly',
          label: 'Monthly Report',
          icon: <CalendarRange className="h-4 w-4 text-muted-foreground" />,
          description: 'Month-over-month comparison',
          onClick: () => navigate('/reports/monthly'),
        },
      ],
    },
    {
      title: 'Analysis',
      items: [
        {
          id: 'custom',
          label: 'Custom Reports',
          icon: <Brain className="h-4 w-4 text-muted-foreground" />,
          onClick: () => navigate('/reports/custom'),
        },
        {
          id: 'user-milestones',
          label: 'User Milestones',
          icon: <Trophy className="h-4 w-4 text-muted-foreground" />,
          onClick: () => navigate('/reports/user-milestones'),
        },
        {
          id: 'trader-stats',
          label: 'Trader Stats',
          icon: <Users className="h-4 w-4 text-muted-foreground" />,
          onClick: () => navigate('/reports/trader-stats'),
        },
        {
          id: 'fee-comparison',
          label: 'Fee Comparison',
          icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
          onClick: () => navigate('/reports/fee-comparison'),
        },
      ],
    },
  ];

  return (
    <>
      {/* Top Navigation Bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border h-[var(--nav-height)]">
        <div className="max-w-content mx-auto h-full px-6 flex items-center justify-between">
          {/* Left: Logo */}
          <div className="flex items-center gap-8">
            <button
              onClick={() => navigate('/home')}
              className="font-semibold text-lg text-foreground hover:text-primary transition-colors"
            >
              Trading Apps
            </button>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              <NavDropdown
                trigger="Protocols"
                sections={protocolSections}
                isActive={isProtocolPage || isActivePath('/overview/comparison')}
              />

              <NavDropdown
                trigger="Launchpads"
                sections={launchpadSections}
                isActive={location.pathname.includes('launchpad')}
              />

              <NavDropdown
                trigger="Reports"
                sections={reportSections}
                isActive={location.pathname.startsWith('/reports')}
              />
            </nav>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {/* Settings */}
            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0 rounded-lg hover:bg-secondary"
              onClick={() => navigate('/admin/protocols')}
            >
              <Settings className="h-4 w-4" />
            </Button>

            {/* Theme Switcher */}
            <ThemeSwitcher />

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden h-9 w-9 p-0 rounded-lg hover:bg-secondary"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation */}
      <MobileNav
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        protocolSections={protocolSections}
        launchpadSections={launchpadSections}
        reportSections={reportSections}
      />
    </>
  );
}
