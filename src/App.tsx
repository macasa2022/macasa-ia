import { lazy, Suspense, Component, type ErrorInfo, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("ErrorBoundary:", error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-8">
          <h2 className="text-lg font-semibold">Ocorreu um erro inesperado</h2>
          <p className="text-sm text-muted-foreground text-center">Pedimos desculpa. Tenta recarregar a página.</p>
          <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Eagerly load landing page (critical path)
import LandingPage from "./pages/LandingPage";

// Lazy load all other pages
const LoginPage = lazy(() => import("./pages/LoginPage"));
const SignupPage = lazy(() => import("./pages/SignupPage"));
const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const SolvePage = lazy(() => import("./pages/SolvePage"));
const ChatPage = lazy(() => import("./pages/ChatPage"));
const SubjectsPage = lazy(() => import("./pages/SubjectsPage"));
const StudyPlanPage = lazy(() => import("./pages/StudyPlanPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <ErrorBoundary>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                <Route path="/solve" element={<ProtectedRoute><SolvePage /></ProtectedRoute>} />
                <Route path="/chat" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
                <Route path="/subjects" element={<ProtectedRoute><SubjectsPage /></ProtectedRoute>} />
                <Route path="/study-plan" element={<ProtectedRoute><StudyPlanPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute adminOnly><AdminPage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </ErrorBoundary>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
