import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

// Public pages (eagerly loaded)
import Landing from "@/pages/Landing";
import Pricing from "@/pages/Pricing";
import Services from "@/pages/Services";
import About from "@/pages/About";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

// Protected pages (lazy loaded)
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const PatientFeed = lazy(() => import("@/pages/PatientFeed"));
const TrialSearch = lazy(() => import("@/pages/TrialSearch"));
const TrialDetail = lazy(() => import("@/pages/TrialDetail"));
const CreateProfile = lazy(() => import("@/pages/CreateProfile"));
const Settings = lazy(() => import("@/pages/Settings"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

// Public routes (accessible without login)
function PublicRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/services" component={Services} />
      <Route path="/about" component={About} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      {/* Fallback to landing */}
      <Route component={Landing} />
    </Switch>
  );
}

// Protected routes (require login)
function ProtectedRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        {/* Onboarding - first page after login */}
        <Route path="/onboarding" component={Onboarding} />

        {/* Main app pages */}
        <Route path="/" component={Dashboard} />
        <Route path="/dashboard" component={Dashboard} />
        <Route path="/feed" component={PatientFeed} />
        <Route path="/search" component={TrialSearch} />
        <Route path="/trial/:id" component={TrialDetail} />
        <Route path="/profile" component={CreateProfile} />
        <Route path="/settings" component={Settings} />

        {/* Public pages accessible when logged in */}
        <Route path="/pricing" component={Pricing} />
        <Route path="/services" component={Services} />
        <Route path="/about" component={About} />

        {/* Fallback to dashboard */}
        <Route component={Dashboard} />
      </Switch>
    </Suspense>
  );
}

// Main app with auth check
function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <PageLoader />;
  }

  // If authenticated, show protected routes
  if (isAuthenticated) {
    return <ProtectedRouter />;
  }

  // Otherwise show public routes
  return <PublicRouter />;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LanguageProvider>
          <ErrorBoundary>
            <TooltipProvider>
              <AppContent />
              <Toaster />
            </TooltipProvider>
          </ErrorBoundary>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
