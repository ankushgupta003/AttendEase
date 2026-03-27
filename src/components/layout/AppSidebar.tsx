import { useLocation, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Upload,
  Users,
  Settings,
  FileText,
  ChevronLeft,
} from 'lucide-react';
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
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Attendance', url: '/attendance', icon: Clock },
  { title: 'Upload', url: '/upload', icon: Upload },
  { title: 'Employees', url: '/employees', icon: Users },
  { title: 'Masters', url: '/masters', icon: Settings },
  { title: 'Reports', url: '/reports', icon: FileText },
];

export function AppSidebar() {
  const { state, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className={cn('flex items-center justify-center', !collapsed && 'justify-start')}>
          {collapsed ? (
            <AttendEaseLogo compact className="scale-[0.45] -my-6" />
          ) : (
            <AttendEaseLogo className="scale-[0.6] -my-4 origin-left" />
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <Link
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                          isActive
                            ? 'bg-primary text-primary-foreground font-medium'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon className={cn('h-4 w-4 flex-shrink-0', isActive ? 'text-primary-foreground' : '')} />
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

      <SidebarFooter className="border-t border-sidebar-border p-2">
        <button
          onClick={toggleSidebar}
          className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors text-xs"
        >
          <ChevronLeft className={cn('h-3.5 w-3.5 transition-transform', collapsed && 'rotate-180')} />
          {!collapsed && <span>Collapse</span>}
        </button>
      </SidebarFooter>
    </Sidebar>
  );
}
