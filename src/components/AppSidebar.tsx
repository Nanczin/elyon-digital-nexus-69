import React, { useState } from 'react';
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
  MonitorDot, // Novo ícone para Área de Membros
  ChevronDown // Importar ChevronDown
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
      <SidebarContent className="overflow-hidden space-y-1">
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

        {/* Novo item de menu principal para "Minhas Áreas de Membros" */}
        {isAdmin && (
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
        )}
      </SidebarContent>
    </Sidebar>
  );
}