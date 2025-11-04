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
  FileText,
  BookOpen, // Ícone para Conteúdo
  UserSquare, // Ícone para Membros
  Palette, // Ícone para Design
  BarChart2, // Ícone para Analytics
  MessageSquare, // Ícone para Comunidade
  MonitorDot // Novo ícone para Área de Membros
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
    href: '/payments',
    label: 'Pagamentos',
    icon: Receipt
  },
  {
    href: '/admin/integrations',
    label: 'Integrações',
    icon: Settings
  }
];

// Novos itens de navegação para a Área de Membros
const memberAreaNavItems = [
  {
    href: '/admin/content',
    label: 'Conteúdo',
    icon: BookOpen
  },
  {
    href: '/admin/members',
    label: 'Membros',
    icon: UserSquare
  },
  {
    href: '/admin/design',
    label: 'Design',
    icon: Palette
  },
  {
    href: '/admin/analytics',
    label: 'Analytics',
    icon: BarChart2
  },
  {
    href: '/admin/community',
    label: 'Comunidade',
    icon: MessageSquare
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
      className={isCollapsed ? "w-20" : "w-64"}
      collapsible="icon"
    >
      <SidebarContent className="overflow-hidden">
        {/* Grupo do Menu Principal */}
        <SidebarGroup>
          <SidebarGroupLabel className={isCollapsed ? "sr-only" : "text-sm px-4 py-2"}>
            Menu Principal
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {adminNavItems.map((item) => {
                if (!isAdmin && item.href !== '/payments') {
                  return null;
                }
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

        {/* Novo Grupo para Área de Membros - agora no mesmo nível do Menu Principal */}
        {isAdmin && (
          <SidebarGroup collapsible>
            <SidebarGroupLabel 
              className={`flex items-center rounded-md py-2 cursor-pointer ${
                isCollapsed ? 'justify-center px-0' : 'gap-3 pl-4 pr-3'
              } hover:bg-accent`}
              title={isCollapsed ? "Área de Membros" : undefined}
            >
              <MonitorDot className="h-4 w-4 flex-shrink-0" />
              {!isCollapsed && (
                <span className="truncate text-base">Área de Membros</span>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent className="pl-4"> {/* Indentação para sub-itens */}
              <SidebarMenu className="space-y-1">
                {memberAreaNavItems.map((item) => {
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
        )}
      </SidebarContent>
    </Sidebar>
  );
}