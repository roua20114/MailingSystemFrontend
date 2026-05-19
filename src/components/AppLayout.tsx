import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { TopNavbar } from '@/components/TopNavbar';
import { useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isFullWidth = location.pathname === '/dispatch';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <TopNavbar />
          <main className={cn('flex-1 overflow-auto', !isFullWidth && 'p-4 lg:p-6')}>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
