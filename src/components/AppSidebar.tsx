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
      className={isCollapsed ? "w-20" : "w-64"} // Largura ajustada para os estados recolhido e expandido
      collapsible="icon"
    >
      <SidebarContent className="overflow-hidden">
        {/* Sidebar Trigger no topo da sidebar */}
        <div className={`flex items-center h-12 sm:h-14 lg:h-16 px-4 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
          {/* O SidebarTrigger agora está no componente Layout */}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : "text-sm px-4 py-2"}>
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
                    <SidebarMenuButton asChild className="w-full h-8">
                      <NavLink 
                        to={item.href} 
                        className={({ isActive }) => 
                          `${getNavCls({ isActive })} flex items-center rounded-md ${
                            isCollapsed ? 'justify-center px-0' : 'gap-3 pl-0 pr-4' // Alterado de 'gap-3 px-4' para 'gap-3 pl-0 pr-4'
                          }`
                        }
                        title={isCollapsed ? item.label : undefined}
                      >
                        {/* Envolvendo os filhos do NavLink em um único span */}
                        <span className="flex items-center gap-3">
                          <IconComponent className="h-4 w-4 flex-shrink-0" />
                          {!isCollapsed && (
                            <span className="truncate text-base">{item.label}</span>
                          )}
                        </span>
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