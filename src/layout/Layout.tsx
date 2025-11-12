import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { Sidebar } from '@/components/Sidebar'; // Importa o Sidebar renomeado
import Navbar from '@/components/Navbar'; // Importa o novo Navbar
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { User } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Layout: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Verifica se a rota atual é uma página de autenticação que não deve ter cabeçalho
  const isAuthPageWithoutHeader = location.pathname.startsWith('/auth/login') || location.pathname.startsWith('/auth/register');
  // Verifica se a rota atual é a página de preview do checkout
  const isCheckoutPreview = location.pathname === '/checkout/preview';

  // Se for a página de preview do checkout, renderiza apenas o Outlet
  if (isCheckoutPreview) {
    return (
      <div className="min-h-screen w-full bg-background">
        <main className="flex-1 overflow-auto p-0">
          <Outlet />
        </main>
        <Toaster />
        <Sonner />
      </div>
    );
  }

  // Layout para usuários não autenticados (apenas Navbar simples)
  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        {!isAuthPageWithoutHeader && ( // Renderiza o cabeçalho condicionalmente
          <nav className="border-b bg-card">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-12 sm:h-14 lg:h-16">
                <Link to="/" className="flex items-center space-x-2">
                  <img 
                    src="/lovable-uploads/1eaaf35d-a413-41fd-9e08-b1335d8fe50f.png" 
                    alt="Elyon Logo" 
                    className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" 
                  />
                </Link>
                <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4">
                  <ThemeToggle />
                  <div className="hidden sm:flex items-center space-x-2">
                    <Button variant="ghost" asChild>
                      <Link to="/auth/login">Entrar</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/auth/register">Criar conta</Link>
                    </Button>
                  </div>
                  <div className="sm:hidden">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <User className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="z-50 bg-background border shadow-lg">
                        <DropdownMenuItem asChild>
                          <Link to="/auth/login">Entrar</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to="/auth/register">Criar conta</Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </nav>
        )}
        <main className={location.pathname === '/' ? "flex-1 overflow-auto" : "container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8"}>
          <Outlet />
        </main>
        <Toaster />
        <Sonner />
      </div>
    );
  }

  // Layout para usuários autenticados (Sidebar + Navbar)
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className={location.pathname === '/' ? "flex-1 overflow-auto p-0" : "flex-1 overflow-auto container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8"}>
            <Outlet />
          </main>
        </div>
      </div>
      <Toaster />
      <Sonner />
    </SidebarProvider>
  );
};

export default Layout;