import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import PublicLayout from "@/layouts/PublicLayout";
import DashboardLayout from "@/layouts/DashboardLayout";
import HomePage from "@/pages/public/HomePage";
import MeetsPage from "@/pages/public/MeetsPage";
import MeetDetailPage from "@/pages/public/MeetDetailPage";
import WorksPage from "@/pages/public/WorksPage";
import WorkDetailPage from "@/pages/public/WorkDetailPage";
import LoginPage from "@/pages/public/LoginPage";
import SignupPage from "@/pages/public/SignupPage";
import AccountPage from "@/pages/public/AccountPage";
import OverviewPage from "@/pages/dashboard/OverviewPage";
import MeetsTab from "@/pages/dashboard/MeetsTab";
import ContentTab from "@/pages/dashboard/ContentTab";
import UsersTab from "@/pages/dashboard/UsersTab";
import BannersTab from "@/pages/dashboard/BannersTab";
import AthletesTab from "@/pages/dashboard/AthletesTab";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route element={<PublicLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/meets" element={<MeetsPage />} />
              <Route path="/meets/:slug" element={<MeetDetailPage />} />
              <Route path="/works" element={<WorksPage />} />
              <Route path="/works/:slug" element={<WorkDetailPage />} />
              <Route path="/account" element={<ProtectedRoute><AccountPage /></ProtectedRoute>} />
            </Route>

            {/* Auth pages (no layout wrapper) */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Dashboard routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
              <Route index element={<Navigate to="/dashboard/overview" replace />} />
              <Route path="overview" element={<OverviewPage />} />
              <Route path="meets" element={<MeetsTab />} />
              <Route path="content" element={<ContentTab />} />
              <Route path="athletes" element={<AthletesTab />} />
              <Route path="users" element={<AdminRoute><UsersTab /></AdminRoute>} />
              <Route path="banners" element={<AdminRoute><BannersTab /></AdminRoute>} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
