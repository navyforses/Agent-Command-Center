import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { NotificationProvider } from "@/contexts/NotificationContext";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";
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
import ResetPassword from "@/pages/ResetPassword";

// Protected pages (lazy loaded)
const Onboarding = lazy(() => import("@/pages/Onboarding"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const PatientFeed = lazy(() => import("@/pages/PatientFeed"));
const TrialSearch = lazy(() => import("@/pages/TrialSearch"));
const TrialDetail = lazy(() => import("@/pages/TrialDetail"));
const ProfilePage = lazy(() => import("@/pages/ProfilePage"));
const ResearchFeed = lazy(() => import("@/pages/ResearchFeed"));
const Settings = lazy(() => import("@/pages/Settings"));
const Questions = lazy(() => import("@/pages/Questions"));
const SavedItems = lazy(() => import("@/pages/SavedItems"));

// Feature pages (lazy loaded)
const Therapy = lazy(() => import("@/pages/Therapy"));
const Documents = lazy(() => import("@/pages/Documents"));
const ChildrenList = lazy(() => import("@/pages/ChildrenList"));
const ChildProfile = lazy(() => import("@/pages/ChildProfile"));
const Medications = lazy(() => import("@/pages/Medications"));
const Evolution = lazy(() => import("@/pages/Evolution"));
const AIAssistant = lazy(() => import("@/pages/AIAssistant"));
const EmailHub = lazy(() => import("@/pages/EmailHub"));

// Research & Trial pages (distinct functionality)
const PubMedSearch = lazy(() => import("@/pages/Research")); // Manual PubMed article search
const TrialDashboard = lazy(() => import("@/pages/ClinicalTrials")); // Eligibility-matched trials
const Nexus = lazy(() => import("@/pages/Nexus")); // Multi-AI research orchestrator

// P2 Feature pages
const Calendar = lazy(() => import("@/pages/Calendar")); // Calendar with email extraction
const ResearchAlertsPage = lazy(() => import("@/pages/ResearchAlertsPage")); // Research alerts

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
      <Route path="/reset-password" component={ResetPassword} />
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
        <Route path="/questions" component={Questions} />
        <Route path="/saved" component={SavedItems} />
        <Route path="/search" component={TrialSearch} />
        <Route path="/trial/:id" component={TrialDetail} />
        <Route path="/profile" component={ProfilePage} />
        <Route path="/research" component={ResearchFeed} />
        <Route path="/settings" component={Settings} />

        {/* Feature pages */}
        <Route path="/therapies" component={Therapy} />
        <Route path="/documents" component={Documents} />
        <Route path="/children" component={ChildrenList} />
        <Route path="/children/:id" component={ChildProfile} />
        <Route path="/medications" component={Medications} />
        <Route path="/evolution" component={Evolution} />
        <Route path="/assistant" component={AIAssistant} />
        <Route path="/emails" component={EmailHub} />

        {/* Research & Trial pages */}
        <Route path="/pubmed" component={PubMedSearch} />
        <Route path="/trials" component={TrialDashboard} />
        <Route path="/nexus" component={Nexus} />

        {/* P2 Feature pages */}
        <Route path="/calendar" component={Calendar} />
        <Route path="/research-alerts" component={ResearchAlertsPage} />

        {/* Public pages accessible when logged in */}
        <Route path="/pricing" component={Pricing} />
        <Route path="/services" component={Services} />
        <Route path="/about" component={About} />
        <Route path="/reset-password" component={ResetPassword} />

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

  // If authenticated, show protected routes with additional providers
  if (isAuthenticated) {
    return (
      <NotificationProvider>
        <UserPreferencesProvider>
          <ProtectedRouter />
        </UserPreferencesProvider>
      </NotificationProvider>
    );
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
