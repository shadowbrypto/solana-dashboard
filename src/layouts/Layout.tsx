import { Outlet } from 'react-router-dom';
import { TopNavigation } from '../components/TopNavigation';
import { Toaster } from '../components/ui/toaster';
import { TooltipProvider } from '../components/ui/tooltip';

export function Layout() {
  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background">
        {/* Top Navigation */}
        <TopNavigation />

        {/* Main content */}
        <main className="pt-[var(--nav-height)]">
          <div className="px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 overflow-x-hidden">
            <Outlet />
          </div>
        </main>

        {/* Toast notifications */}
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
