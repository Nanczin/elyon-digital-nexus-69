import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarTrigger, // Import SidebarTrigger
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Package, 
  CreditCard, 
  Settings, 
  ShoppingCart, 
  Users, 
  Receipt,
  FileText
} from 'lucide-react';

const adminNavItems = [
  {
    href: '/admin/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    href: '/admin/products',
    label: 'Produtos',
    icon: Package
  },
  {
    href: '/admin/checkouts',
    label: 'Checkouts',
    icon: CreditCard
  },
  {
    href: '/admin/integrations',
    label: 'Integrações',
    icon: Settings
  },
  {
    href: '/sales',
    label: 'Vendas',
    icon: ShoppingCart
  },
  {
    href: '/customers',
    label: 'Clientes',
    icon: Users
  },
  {
    href: '/reports',
    label: 'Relatórios',
    icon: FileText
  },
  {
    href: '/payments',
    label: 'Pagamentos',
    icon: Receipt
  }
];

export function AppSidebar() {
  const { user, isAdmin } = useAuth();
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent";

  if (!user) {
    return null;
  }

  const isCollapsed = state === 'collapsed';

  return (
    <Sidebar
      className={isCollapsed ? "w-10 sm:w-12 lg:w-14" : "w-44 sm:w-48 lg:w-60"}
      collapsible="icon"
    >
      <SidebarContent className="overflow-hidden">
        {/* Sidebar Trigger no topo da sidebar */}
        <div className={`flex items-center h-12 sm:h-14 lg:h-16 px-2 sm:px-4 lg:px-6 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          <SidebarTrigger className="flex-shrink-0" />
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : "text-sm px-2 py-2"}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {adminNavItems.map((item) => {
                // Show all items to admin, only payments to regular users
                if (!isAdmin && item.href !== '/payments') {
                  return null;
                }

                const IconComponent = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild className="w-full min-h-12">
                      <NavLink 
                        to={item.href} 
                        className={getNavCls}
                        title={isCollapsed ? item.label : undefined}
                      >
                        <IconComponent className="h-5 w-5 flex-shrink-0" />
                        {!isCollapsed && (
                          <span className="truncate text-base">{item.label}</span>
                        )}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}