import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'react-router-dom';
import { NavLink } from 'react-router-dom';
import {
  Sidebar as UISidebar, // Renomeado para evitar conflito com o componente Sidebar do layout
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
  FileText,
  MonitorDot, 
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
    href: '/pagamentos', // Rota renomeada para Pagamentos.tsx
    label: 'Pagamentos',
    icon: Receipt
  },
  {
    href: '/admin/integrations',
    label: 'Integrações',
    icon: Settings
  }
];

export function Sidebar() {
  const { user, loading: authLoading } = useAuth(); // Removido isAdmin
  const { state } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;

  console.log('SIDEBAR_DEBUG: Rendering Sidebar.');
  console.log('SIDEBAR_DEBUG: User ID:', user?.id);
  console.log('SIDEBAR_DEBUG: authLoading:', authLoading);
  console.log('SIDEBAR_DEBUG: User Role from metadata:', user?.user_metadata?.role);

  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground" : "hover:bg-accent";

  if (!user) {
    console.log('SIDEBAR_DEBUG: No user, returning null.');
    return null;
  }

  const isCollapsed = state === 'collapsed';

  return (
    <UISidebar // Usando UISidebar para o componente shadcn/ui
      className={isCollapsed ? "w-20" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="overflow-hidden space-y-1">
        {/* Grupo do Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : "text-sm px-4 py-2"}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {adminNavItems.map((item) => {
                // Todos os itens são exibidos para qualquer usuário logado
                const IconComponent = item.icon;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild className="w-full">
                      <NavLink 
                        to={item.href} 
                        className={({ isActive }) => 
                          `${getNavCls({ isActive })} flex items-center rounded-md py-2 ${
                            isCollapsed ? 'justify-center px-0' : 'gap-3 pl-4 pr-3'
                          }`
                        }
                        title={isCollapsed ? item.label : undefined}
                      >
                        <IconComponent className="h-4 w-4 flex-shrink-0" />
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

        {/* Item de menu principal para "Minhas Áreas de Membros" */}
        {/* Agora visível para qualquer usuário logado */}
          <SidebarGroup>
            <SidebarGroupLabel className={isCollapsed ? "sr-only" : "text-sm px-4 py-2"}>
              Áreas de Membros
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                <SidebarMenuItem>
                  <SidebarMenuButton asChild className="w-full">
                    <NavLink 
                      to="/admin/member-areas" 
                      className={({ isActive }) => 
                        `${getNavCls({ isActive })} flex items-center rounded-md py-2 ${
                          isCollapsed ? 'justify-center px-0' : 'gap-3 pl-4 pr-3'
                        }`
                      }
                      title={isCollapsed ? "Minhas Áreas de Membros" : undefined}
                    >
                      <MonitorDot className="h-4 w-4 flex-shrink-0" />
                      {!isCollapsed && (
                        <span className="truncate text-base">Minhas Áreas de Membros</span>
                      )}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
      </SidebarContent>
    </UISidebar>
  );
}