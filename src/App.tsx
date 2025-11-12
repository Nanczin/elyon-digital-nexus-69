import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createBrowserRouter, RouterProvider, Outlet } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { MemberAreaAuthProvider } from "@/hooks/useMemberAreaAuth";
import { ThemeProvider } from "@/components/ThemeProvider";
import Layout from "@/layout/Layout"; // Importa o novo Layout
import Home from "./pages/Home"; // Importa a Home renomeada
import AuthLogin from "./pages/AuthLogin";
import AuthRegister from "./pages/AuthRegister";
import AdminDashboard from "./pages/AdminDashboard";
import AdminProducts from "./pages/AdminProducts";
import AdminCheckouts from "./pages/AdminCheckouts";
import AdminIntegrations from "./pages/AdminIntegrations";
import Sales from "./pages/Sales";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import Pagamentos from "./pages/Pagamentos"; // Importa Pagamentos renomeada
import Settings from "./pages/Settings";
import Checkout from "./pages/Checkout";

import PaymentSuccess from "./pages/PaymentSuccess";
import NotFound from "./pages/NotFound";

import AdminContent from "./pages/AdminContent";
import AdminMembers from "./pages/AdminMembers";
import AdminDesign from "./pages/AdminDesign";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminCommunity from "./pages/AdminCommunity";
import AdminMemberAreas from "./pages/AdminMemberAreas";
import AdminMemberAreaDetails from "./pages/AdminMemberAreaDetails";
import MemberAreaLogin from "./pages/MemberAreaLogin";
import MemberAreaDashboard from "./pages/MemberAreaDashboard";
import MemberAreaModuleDetails from "./pages/MemberAreaModuleDetails";
import MemberAreaLesson from "./pages/MemberAreaLesson";
import AuthForgotPassword from "./pages/AuthForgotPassword";
import AuthUpdatePassword from "./pages/AuthUpdatePassword";

const queryClient = new QueryClient();

// Definição das rotas
const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />, // O Layout principal que contém a Sidebar e Navbar
    children: [
      {
        index: true, // Rota padrão para "/"
        element: <Home />,
      },
      {
        path: "admin/dashboard",
        element: <AdminDashboard />,
      },
      {
        path: "admin/products",
        element: <AdminProducts />,
      },
      {
        path: "admin/checkouts",
        element: <AdminCheckouts />,
      },
      {
        path: "admin/integrations",
        element: <AdminIntegrations />,
      },
      {
        path: "admin/member-areas",
        children: [
          {
            index: true,
            element: <AdminMemberAreas />,
          },
          {
            path: ":memberAreaId",
            element: <AdminMemberAreaDetails />, // AdminMemberAreaDetails agora usa Outlet para suas sub-rotas
            children: [
              {
                path: "content",
                element: <AdminContent />,
              },
              {
                path: "products",
                element: <div>Products Association Content</div>, // Placeholder, pois ProductsAssociation é um componente, não uma página completa
              },
              {
                path: "members",
                element: <AdminMembers />,
              },
              {
                path: "design",
                element: <AdminDesign />,
              },
              {
                path: "analytics",
                element: <AdminAnalytics />,
              },
              {
                path: "community",
                element: <AdminCommunity />,
              },
            ],
          },
        ],
      },
      {
        path: "sales",
        element: <Sales />,
      },
      {
        path: "reports",
        element: <Reports />,
      },
      {
        path: "customers",
        element: <Customers />,
      },
      {
        path: "pagamentos", // Rota renomeada
        element: <Pagamentos />,
      },
      {
        path: "settings",
        element: <Settings />,
      },
      // Rotas de autenticação que NÃO usam o Layout principal (sem sidebar/navbar)
      {
        path: "auth/login",
        element: <AuthLogin />,
      },
      {
        path: "auth/register",
        element: <AuthRegister />,
      },
      // Rotas de Checkout e Sucesso de Pagamento que NÃO usam o Layout principal
      {
        path: "checkout/:checkoutId",
        element: <Checkout />,
      },
      {
        path: "payment-success",
        element: <PaymentSuccess />,
      },
      // Rotas da Área de Membros (com MemberAreaAuthProvider)
      {
        path: "membros/:memberAreaId",
        element: <MemberAreaAuthProvider><Outlet /></MemberAreaAuthProvider>, // Usa Outlet para as rotas aninhadas da área de membros
        children: [
          {
            path: "login",
            element: <MemberAreaLogin />,
          },
          {
            path: "forgot-password",
            element: <AuthForgotPassword />,
          },
          {
            path: "update-password",
            element: <AuthUpdatePassword />,
          },
          {
            index: true, // Rota padrão para /membros/:memberAreaId
            element: <MemberAreaDashboard />,
          },
          {
            path: "modules/:moduleId",
            element: <MemberAreaModuleDetails />,
          },
          {
            path: "modules/:moduleId/lessons/:lessonId",
            element: <MemberAreaLesson />,
          },
        ],
      },
      {
        path: "reset-password", // Rota global para redefinição de senha
        element: <AuthUpdatePassword />,
      },
      // Rota catch-all para 404
      {
        path: "*",
        element: <NotFound />,
      },
    ],
  },
]);

const App = () => {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="system" storageKey="elyon-ui-theme">
          <RouterProvider router={router} />
        </ThemeProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

export default App;