
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";
import Index from "./pages/Index";
import AuthPage from "./pages/AuthPage";
import AdminDashboard from "./pages/AdminDashboard";
import MentorDashboard from "./pages/MentorDashboard";
import InternDashboard from "./pages/InternDashboard";
import ProjectsPage from "./pages/ProjectsPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import MilestoneProgressPage from "./pages/MilestoneProgressPage";
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
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/" element={
              <AuthGuard>
                <Header />
                <Index />
              </AuthGuard>
            } />
            <Route path="/admin" element={
              <AuthGuard requiredRole="admin">
                <Header />
                <AdminDashboard />
              </AuthGuard>
            } />
            <Route path="/mentor" element={
              <AuthGuard requiredRole="mentor">
                <Header />
                <MentorDashboard />
              </AuthGuard>
            } />
            <Route path="/intern" element={
              <AuthGuard requiredRole="intern">
                <Header />
                <InternDashboard />
              </AuthGuard>
            } />
            <Route path="/projects" element={
              <AuthGuard>
                <Header />
                <ProjectsPage />
              </AuthGuard>
            } />
            <Route path="/projects/:id" element={
              <AuthGuard>
                <Header />
                <ProjectDetailPage />
              </AuthGuard>
            } />
            <Route path="/milestones/:id" element={
              <AuthGuard>
                <Header />
                <MilestoneProgressPage />
              </AuthGuard>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
