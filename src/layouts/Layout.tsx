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
        <main className="pt-[var(--nav-height)] overflow-x-auto">
          <div className="min-w-fit px-4 md:px-6 lg:px-8 py-6">
            <Outlet />
          </div>
        </main>

        {/* Toast notifications */}
        <Toaster />
      </div>
    </TooltipProvider>
  );
}
