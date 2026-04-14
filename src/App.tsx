import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, HashRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import DashboardPage from "./pages/Dashboard";
import AttendancePage from "./pages/Attendance";
import UploadPage from "./pages/Upload";
import EmployeesPage from "./pages/Employees";
import MastersPage from "./pages/Masters";
import ReportsPage from "./pages/Reports";
import CompanyInfoPage from "./pages/CompanyInfo";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login";
import { getAuthUser, isLoggedIn } from "@/lib/auth";

const queryClient = new QueryClient();

const RequireAuth = ({ children }: { children: JSX.Element }) => {
  if (!isLoggedIn()) return <Navigate to="/login" replace />;
  return children;
};

const RequireAdmin = ({ children }: { children: JSX.Element }) => {
  const user = getAuthUser();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role?.toUpperCase() !== "ADMIN") return <Navigate to="/" replace />;
  return children;
};

const Router = (typeof window !== "undefined" && window.location.protocol === "file:")
  ? HashRouter
  : BrowserRouter;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          <Route path="/attendance" element={<RequireAuth><AttendancePage /></RequireAuth>} />
          <Route path="/upload" element={<RequireAuth><UploadPage /></RequireAuth>} />
          <Route path="/employees" element={<RequireAuth><EmployeesPage /></RequireAuth>} />
          <Route path="/masters" element={<RequireAuth><MastersPage /></RequireAuth>} />
          <Route path="/reports" element={<RequireAuth><ReportsPage /></RequireAuth>} />
          <Route path="/company-info" element={<RequireAuth><RequireAdmin><CompanyInfoPage /></RequireAdmin></RequireAuth>} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
