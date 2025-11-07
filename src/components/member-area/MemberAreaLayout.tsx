import React from 'react';
import { Outlet } from 'react-router-dom';
import { MemberAreaAuthProvider } from '@/hooks/useMemberAreaAuth';

const MemberAreaLayout = () => {
  return (
    <MemberAreaAuthProvider>
      <Outlet />
    </MemberAreaAuthProvider>
  );
};

export default MemberAreaLayout;