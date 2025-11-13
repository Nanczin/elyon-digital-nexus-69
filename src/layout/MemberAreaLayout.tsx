import React from 'react';
import { Outlet } from 'react-router-dom';
import { MemberAreaAuthProvider } from '@/hooks/useMemberAreaAuth';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const MemberAreaLayout: React.FC = () => {
  return (
    <MemberAreaAuthProvider>
      <div className="w-full min-h-screen bg-background">
        <main className="w-full overflow-auto p-0">
          <Outlet />
        </main>
        <Toaster />
        <Sonner />
      </div>
    </MemberAreaAuthProvider>
  );
};

export default MemberAreaLayout;
