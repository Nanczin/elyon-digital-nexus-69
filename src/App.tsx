import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MemberAreaAuthProvider } from "@/hooks/useMemberAreaAuth"; // Importar o novo provedor
import { ThemeProvider } from "@/components/ThemeProvider";
import Layout from "@/components/Layout";
import Index from "./pages/Index";
import AuthLogin from "./pages/AuthLogin";
import AuthRegister from "./pages/AuthRegister";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminCheckouts from "./pages/AdminCheckouts";
import AdminIntegrations from "./pages/AdminIntegrations";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import Payments from "./pages/Payments";
import Settings from "./pages/Settings";
import Checkout from "./pages/Checkout";

import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";

// Novas páginas da área de membros
import AdminContent from "./pages/AdminContent";
import AdminMembers from "./pages/AdminMembers";
import AdminDesign from "./pages/AdminDesign";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminCommunity from "./pages/AdminCommunity";
import AdminMemberAreas from "./pages/AdminMemberAreas";
import AdminMemberAreaDetails from "./pages/AdminMemberAreaDetails"; // Importar a nova página de detalhes
import MemberAreaLogin from "./pages/MemberAreaLogin"; // Importar a nova página de login da área de membros
import MemberAreaDashboard from "./pages/MemberAreaDashboard"; // Importar a nova página de dashboard da área de membros
// import { useGlobalPlatformSettings } from "./hooks/useGlobalPlatformSettings"; // Importar o novo hook
// import { useEffect } from "react";


const queryClient = new QueryClient();

const App = () => {
  // const { globalFontFamily } = useGlobalPlatformSettings(); // Removido daqui

  // useEffect(() => {
  //   if (globalFontFamily) {
  //     // Aplica a fonte ao elemento raiz (<html>) para que afete todo o documento
  //     document.documentElement.style.setProperty('--global-font-family', globalFontFamily);
  //   }
  // }, [globalFontFamily]);

  return (
    <AuthProvider> {/* AuthProvider agora envolve todos os outros provedores */}
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="elyon-ui-theme">
          <BrowserRouter>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              
                <Routes>
                  {/* Rotas de autenticação que NÃO usam o Layout principal */}
                  <Route path="/auth/login" element={<AuthLogin />} />
                  <Route path="/auth/register" element={<AuthRegister />} />

                  {/* Rotas que usam o Layout principal da Elyon */}
                  <Route element={<Layout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/admin/dashboard" element={<AdminDashboard />} />
                    <Route path="/admin/products" element={<AdminProducts />} />
                    <Route path="/admin/checkouts" element={<AdminCheckouts />} />
                    <Route path="/admin/integrations" element={<AdminIntegrations />} />
                    
                    {/* Rotas de administração da Área de Membros (ainda usam o Layout principal) */}
                    <Route path="/admin/member-areas" element={<AdminMemberAreas />} />
                    <Route path="/admin/member-areas/:memberAreaId" element={<AdminMemberAreaDetails />}>
                      <Route path="content" element={<AdminContent />} />
                      <Route path="members" element={<AdminMembers />} />
                      <Route path="design" element={<AdminDesign />} />
                      <Route path="analytics" element={<AdminAnalytics />} />
                      <Route path="community" element={<AdminCommunity />} />
                    </Route>

                    <Route path="/sales" element={<Sales />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/customers" element={<Customers />} />
                    <Route path="/payments" element={<Payments />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/checkout/:checkoutId" element={<Checkout />} />
                    
                    <Route path="/payment-success" element={<PaymentSuccess />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Route>

                  {/* Rotas públicas da Área de Membros (NÃO usam o Layout principal) */}
                  <Route element={<MemberAreaAuthProvider> <Outlet /> </MemberAreaAuthProvider>}> {/* Envolver com o novo provedor */}
                    <Route path="/membros/:memberAreaId/login" element={<MemberAreaLogin />} />
                    <Route path="/membros/:memberAreaId" element={<MemberAreaDashboard />} />
                  </Route>
                </Routes>
              
            </TooltipProvider>
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;