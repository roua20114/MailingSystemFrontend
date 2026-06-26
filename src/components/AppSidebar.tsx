import { LayoutDashboard, Inbox, Send, ArrowLeftRight, BarChart3, Settings, FileSearch, Sparkles, Mail, ClipboardCheck, Archive, FilePlus } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import {ClipboardList } from 'lucide-react';

const professorNav = [
  { title: 'Mes Demandes',    url: '/',         icon: FilePlus },
  { title: 'Mon Suivi',       url: '/tracking', icon: FileSearch },
];

const mainNav: Array<{ title: string; url: string; icon: React.ElementType; badge?: number }> = [
  { title: 'Tableau de bord', url: '/',         icon: LayoutDashboard },
  { title: 'Dispatcher',      url: '/dispatch', icon: ClipboardCheck },
  { title: 'Courrier Entrant',url: '/incoming', icon: Inbox },
  { title: 'Courrier Sortant',url: '/outgoing', icon: Send },
  { title: 'Courrier Interne',url: '/internal', icon: ArrowLeftRight },
  { title: 'Mon Suivi',       url: '/tracking', icon: FileSearch },
  { title: 'Archives',        url: '/archives', icon: Archive },
];

const secondaryNav = [
  { title: 'Statistiques', url: '/statistics', icon: BarChart3 },
  { title: 'Paramètres',   url: '/settings',   icon: Settings },
  { title: 'Demandes Profs', url: '/demands', icon: ClipboardList },
];

export function AppSidebar() {
  const { state }  = useSidebar();
  const { user }   = useAuth();
  const collapsed  = state === 'collapsed';
  const isProfessor = user?.role === 'professor';
  const navItems   = isProfessor ? professorNav : mainNav;

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-sm">
            <Mail className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-base font-bold text-sidebar-foreground tracking-tight">NexusMail</h1>
              <p className="text-[10px] text-sidebar-foreground/50">Gestion des Courriers</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">
            {isProfessor ? 'Espace Professeur' : 'Principal'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url + item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === '/'} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && (
                        <span className="flex-1 flex items-center justify-between">
                          <span>{item.title}</span>
                          {'badge' in item && item.badge && (
                            <Badge variant="destructive" className="h-5 px-1.5 text-[10px] font-bold ml-2">
                              {item.badge}
                            </Badge>
                          )}
                        </span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {!isProfessor && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-sidebar-foreground/40 text-[10px] uppercase tracking-widest">Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {secondaryNav.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} className="hover:bg-sidebar-accent" activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-2 rounded-xl bg-sidebar-accent/50 p-3">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-xs text-sidebar-foreground/80">IA Assistant actif</span>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}