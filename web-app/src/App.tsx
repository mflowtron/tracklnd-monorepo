import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminRoute from "@/components/AdminRoute";
import PublicLayout from "@/layouts/PublicLayout";
import { Loader2 } from "lucide-react";

// Eagerly load HomePage — it's the landing page and must render fast
import HomePage from "@/pages/public/HomePage";

// Lazy-load everything else
const DashboardLayout = lazy(() => import("@/layouts/DashboardLayout"));
const MeetsPage = lazy(() => import("@/pages/public/MeetsPage"));
const MeetDetailPage = lazy(() => import("@/pages/public/MeetDetailPage"));
const BroadcastPage = lazy(() => import("@/pages/public/BroadcastPage"));
const WorksPage = lazy(() => import("@/pages/public/WorksPage"));
const WorkDetailPage = lazy(() => import("@/pages/public/WorkDetailPage"));
const LoginPage = lazy(() => import("@/pages/public/LoginPage"));
const SignupPage = lazy(() => import("@/pages/public/SignupPage"));
const AccountPage = lazy(() => import("@/pages/public/AccountPage"));
const OverviewPage = lazy(() => import("@/pages/dashboard/OverviewPage"));
const MeetsTab = lazy(() => import("@/pages/dashboard/MeetsTab"));
const MeetDetailDashboard = lazy(() => import("@/pages/dashboard/MeetDetailDashboard"));
const ContentTab = lazy(() => import("@/pages/dashboard/ContentTab"));
const UsersTab = lazy(() => import("@/pages/dashboard/UsersTab"));
const BannersTab = lazy(() => import("@/pages/dashboard/BannersTab"));
const AthletesTab = lazy(() => import("@/pages/dashboard/AthletesTab"));
const PrizePursePage = lazy(() => import("@/pages/PrizePursePage"));
const NotFound = lazy(() => import("./pages/NotFound"));

function PageFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageFallback />}>
            <Routes>
              {/* Standalone routes (no layout wrapper) */}
              <Route path="/meets/:slug/watch" element={<BroadcastPage />} />
              <Route path="/meet/:meetId/prize-purse" element={<PrizePursePage />} />

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
                <Route path="meets/:id" element={<MeetDetailDashboard />} />
                <Route path="content" element={<ContentTab />} />
                <Route path="athletes" element={<AthletesTab />} />
                <Route path="users" element={<AdminRoute><UsersTab /></AdminRoute>} />
                <Route path="banners" element={<AdminRoute><BannersTab /></AdminRoute>} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
