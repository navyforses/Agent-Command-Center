import { Switch, Route } from "wouter";
import { Suspense, lazy } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { MobileBottomNav } from "@/components/shared/MobileBottomNav";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut, Loader2 } from "lucide-react";

// Eagerly loaded pages (small, frequently used)
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import NotFound from "@/pages/not-found";

// Lazy loaded pages (larger, less frequently accessed)
const ChildProfile = lazy(() => import("@/pages/ChildProfile"));
const ChildrenList = lazy(() => import("@/pages/ChildrenList"));
const Documents = lazy(() => import("@/pages/Documents"));
const Therapy = lazy(() => import("@/pages/Therapy"));
const ClinicalTrials = lazy(() => import("@/pages/ClinicalTrials"));
const Research = lazy(() => import("@/pages/Research"));
const Medications = lazy(() => import("@/pages/Medications"));
const EmailHub = lazy(() => import("@/pages/EmailHub"));
const CalendarPage = lazy(() => import("@/pages/CalendarPage"));
const AIAssistant = lazy(() => import("@/pages/AIAssistant"));
const Evolution = lazy(() => import("@/pages/Evolution"));
const Settings = lazy(() => import("@/pages/Settings"));

// Trial Navigator pages
const TrialSearch = lazy(() => import("@/pages/TrialSearch"));
const TrialDetail = lazy(() => import("@/pages/TrialDetail"));

// Loading fallback component
function PageLoader() {
  return (
    <div className="flex h-full w-full items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/search" component={TrialSearch} />
        <Route path="/trial/:id" component={TrialDetail} />
        <Route path="/child-profile" component={ChildrenList} />
        <Route path="/child/:id" component={ChildProfile} />
        <Route path="/documents" component={Documents} />
        <Route path="/therapy" component={Therapy} />
        <Route path="/trials" component={ClinicalTrials} />
        <Route path="/research" component={Research} />
        <Route path="/medications" component={Medications} />
        <Route path="/email" component={EmailHub} />
        <Route path="/calendar" component={CalendarPage} />
        <Route path="/assistant" component={AIAssistant} />
        <Route path="/evolution" component={Evolution} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function AuthButton() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return null;
  }

  if (isAuthenticated && user) {
    return (
      <a href="/api/logout">
        <Button variant="ghost" size="sm" className="gap-2" data-testid="button-logout">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">{user.firstName || user.email}</span>
        </Button>
      </a>
    );
  }

  return (
    <a href="/api/login">
      <Button variant="default" size="sm" className="gap-2" data-testid="button-login">
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign In</span>
      </Button>
    </a>
  );
}

function AppContent() {
  const sidebarStyle = {
    "--sidebar-width": "20rem",
    "--sidebar-width-icon": "4rem",
  };

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      {/* Skip to main content link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        Skip to main content
      </a>
      <div className="flex h-screen w-full">
        <nav aria-label="Main navigation">
          <AppSidebar />
        </nav>
        <div className="flex flex-col flex-1 min-w-0">
          <header
            className="flex items-center justify-between gap-2 p-2 border-b bg-background sticky top-0 z-50"
            role="banner"
          >
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              aria-label="Toggle sidebar navigation"
            />
            <div className="flex items-center gap-1" role="group" aria-label="User actions">
              <AuthButton />
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto pb-20 md:pb-0" role="main" id="main-content">
            <ErrorBoundary>
              <Router />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      {/* Mobile Bottom Navigation - visible only on mobile */}
      <MobileBottomNav />
    </SidebarProvider>
  );
}

function PublicRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Landing} />
        <Route path="/search" component={TrialSearch} />
        <Route path="/trial/:id" component={TrialDetail} />
        <Route component={Landing} />
      </Switch>
    </Suspense>
  );
}

function AuthenticatedApp() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <PublicRouter />;
  }

  return <AppContent />;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <LanguageProvider>
            <TooltipProvider>
              <AuthenticatedApp />
              <Toaster />
            </TooltipProvider>
          </LanguageProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
