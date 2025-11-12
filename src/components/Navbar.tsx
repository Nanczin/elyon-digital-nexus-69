import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { User, Settings, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const Navbar: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header 
      className="h-12 sm:h-14 lg:h-16 border-b bg-card flex items-center px-2 sm:px-4 lg:px-6 shrink-0 gap-2 sm:gap-4"
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger className="flex-shrink-0" />
        <Link to="/" className="flex items-center space-x-2">
          <img 
            src="/lovable-uploads/1eaaf35d-a413-41fd-9e08-b1335d8fe50f.png" 
            alt="Elyon Logo" 
            className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 hover-scale animate-fade-in flex-shrink-0" 
          />
        </Link>
      </div>
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
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default Navbar;