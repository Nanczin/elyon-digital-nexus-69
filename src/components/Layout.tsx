import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { User, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({
  children
}) => {
  const {
    user,
    signOut,
    loading // Obter o estado de carregamento do useAuth
  } = useAuth();
  const location = useLocation();
  const isAuthPage = location.pathname.startsWith('/auth');
  const isCheckoutPage = location.pathname.startsWith('/checkout') || location.pathname === '/payment-success';
  
  if (isAuthPage || isCheckoutPage) {
    return <>{children}</>;
  }

  // Se ainda estiver carregando o estado de autenticação, mostre um spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <div className="min-h-screen bg-background">
        <nav className="border-b bg-card">
          <div className="mobile-container">
            <div className="flex items-center justify-between h-12 sm:h-14 lg:h-16">
              <Link to="/" className="flex items-center space-x-2">
                <img 
                  src="/lovable-uploads/1eaaf35d-a413-41fd-9e08-b1335d8fe50f.png" 
                  alt="Elyon Logo" 
                  className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12" 
                />
                <span className="text-lg font-bold text-foreground hidden sm:inline">ELYON</span>
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
        {/* Conditional padding for main based on path */}
        <main className={location.pathname === '/' ? "flex-1 overflow-auto" : "mobile-container py-4 sm:py-6 lg:py-8"}>
          {children}
        </main>
      </div>;
  }

  return <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <header className="h-12 sm:h-14 lg:h-16 border-b bg-card flex items-center px-2 sm:px-4 lg:px-6 shrink-0 gap-2 sm:gap-4">
          <SidebarTrigger className="flex-shrink-0" />
          <Link to="/" className="flex items-center space-x-2 min-w-0">
            <img 
              src="/lovable-uploads/1eaaf35d-a413-41fd-9e08-b1335d8fe50f.png" 
              alt="Elyon Logo" 
              className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 hover-scale animate-fade-in flex-shrink-0" 
            />
            <span className="text-lg font-bold text-foreground hidden sm:inline">ELYON</span>
          </Link>
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-4 ml-auto">
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center p-1.5 sm:p-2">
                  <User className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44 sm:w-48 lg:w-56 z-50 bg-background border shadow-lg">
                <DropdownMenuItem asChild>
                  <Link to="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sair</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        {/* Conditional padding for main based on path */}
        <main className={location.pathname === '/' ? "flex-1 overflow-auto" : "flex-1 overflow-auto mobile-container py-4 sm:py-6 lg:py-8"}>
          {children}
        </main>
      </div>
    </SidebarProvider>;
};

export default Layout;