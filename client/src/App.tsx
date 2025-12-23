import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { AppSidebar } from "@/components/shared/AppSidebar";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, LogOut } from "lucide-react";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import ChildProfile from "@/pages/ChildProfile";
import ChildrenList from "@/pages/ChildrenList";
import Documents from "@/pages/Documents";
import Therapy from "@/pages/Therapy";
import ClinicalTrials from "@/pages/ClinicalTrials";
import Research from "@/pages/Research";
import Medications from "@/pages/Medications";
import EmailHub from "@/pages/EmailHub";
import CalendarPage from "@/pages/CalendarPage";
import AIAssistant from "@/pages/AIAssistant";
import Evolution from "@/pages/Evolution";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
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
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b bg-background sticky top-0 z-50">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <div className="flex items-center gap-1">
              <AuthButton />
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </header>
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
      </div>
    </SidebarProvider>
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
    return <Landing />;
  }

  return <AppContent />;
}

function App() {
  return (
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
  );
}

export default App;
