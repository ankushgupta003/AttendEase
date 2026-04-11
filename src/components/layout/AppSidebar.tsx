import { useLocation, Link } from 'react-router-dom';
import {
  HouseSimple,
  Clock,
  Upload,
  Users,
  Gear,
  FileText,
  CaretLeft,
} from '@phosphor-icons/react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import AttendEaseLogo from '@/components/branding/AttendEaseLogo';

const navItems = [
  { title: 'Dashboard', url: '/', icon: HouseSimple },
  { title: 'Attendance', url: '/attendance', icon: Clock },
  { title: 'Upload', url: '/upload', icon: Upload },
  { title: 'Employees', url: '/employees', icon: Users },
  { title: 'Masters', url: '/masters', icon: Gear },
  { title: 'Reports', url: '/reports', icon: FileText },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" variant="floating" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border/60 px-4 py-3">
        <div className={cn('flex items-center justify-center', !collapsed && 'justify-start')}>
          {collapsed ? (
            <AttendEaseLogo compact className="scale-[0.45] -my-6" />
          ) : (
            <AttendEaseLogo className="scale-[0.6] -my-4 origin-left" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1.5">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all',
                          isActive
                            ? 'bg-primary text-primary-foreground shadow-[0_12px_24px_-18px_rgba(37,99,235,0.9)]'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon
                          className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary-foreground' : '')}
                          weight={isActive ? 'fill' : 'regular'}
                        />
                        {!collapsed && <span>{item.title}</span>}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/60 p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground transition-colors text-xs"
        >
          <CaretLeft className={cn('h-3.5 w-3.5 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
