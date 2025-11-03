import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
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
import ElyonBuilder from "./pages/ElyonBuilder"; // Importando o novo componente

import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";

// Importando os novos componentes de página de gerenciamento de projetos
import ProjectMembersPage from "./pages/project-management/ProjectMembersPage";
import ProjectContentPage from "./pages/project-management/ProjectContentPage";
import ProjectDesignPage from "./pages/project-management/ProjectDesignPage";
import ProjectAnalyticsPage from "./pages/project-management/ProjectAnalyticsPage";
import ProjectCommunityPage from "./pages/project-management/ProjectCommunityPage";
import ProjectSettingsPage from "./pages/project-management/ProjectSettingsPage";


const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="elyon-ui-theme">
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <Layout>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth/login" element={<AuthLogin />} />
              <Route path="/auth/register" element={<AuthRegister />} />
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
              <Route path="/admin/products" element={<AdminProducts />} />
              <Route path="/admin/checkouts" element={<AdminCheckouts />} />
              <Route path="/admin/integrations" element={<AdminIntegrations />} />
              <Route path="/admin/elyon-builder" element={<ElyonBuilder />} /> {/* Nova rota */}
              
              {/* Novas rotas para gerenciamento de projetos */}
              <Route path="/admin/projects/:projectId/members" element={<ProjectMembersPage />} />
              <Route path="/admin/projects/:projectId/content" element={<ProjectContentPage />} />
              <Route path="/admin/projects/:projectId/design" element={<ProjectDesignPage />} />
              <Route path="/admin/projects/:projectId/analytics" element={<ProjectAnalyticsPage />} />
              <Route path="/admin/projects/:projectId/community" element={<ProjectCommunityPage />} />
              <Route path="/admin/projects/:projectId/settings" element={<ProjectSettingsPage />} />

              <Route path="/sales" element={<Sales />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/payments" element={<Payments />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/checkout/:checkoutId" element={<Checkout />} />
              
              <Route path="/payment-success" element={<PaymentSuccess />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;