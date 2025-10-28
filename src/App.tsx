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

import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="elyon-ui-theme">
      <BrowserRouter> {/* BrowserRouter agora envolve AuthProvider */}
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <Layout>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth/login" element={<AuthLogin />} />
                <Route path="/auth/register" element={<AuthRegister />} />
                <Route path="/admin/dashboard" element={<AdminDashboard />} />
                <Route path="/admin/products" element={<AdminProducts />} />
                <Route path="/admin/checkouts" element={<AdminCheckouts />} />
                <Route path="/admin/integrations" element={<AdminIntegrations />} />
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
          </TooltipProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;