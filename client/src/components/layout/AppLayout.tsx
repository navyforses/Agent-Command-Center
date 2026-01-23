/**
 * AppLayout Component
 * ====================
 * Main application layout with responsive navigation
 * - Desktop: Header + Sidebar (optional)
 * - Mobile: Header + Bottom Navigation
 */

import { ReactNode, useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Home,
  Baby,
  FileText,
  Activity,
  Calendar,
  Bot,
  Bell,
  Search,
  Settings,
  Menu,
  X,
  User,
  LogOut,
  ChevronDown,
  Pill,
  FlaskConical,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MobileBottomNav } from "@/components/navigation/MobileBottomNav";
import { SmartSearch, useSmartSearch } from "@/components/search/SmartSearch";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

interface NavSection {
  titleKa: string;
  titleEn: string;
  items: NavItem[];
}

interface NavItem {
  icon: React.ElementType;
  labelKa: string;
  labelEn: string;
  path: string;
  badge?: number;
}

const NAV_SECTIONS: NavSection[] = [
  {
    titleKa: "მთავარი",
    titleEn: "Main",
    items: [
      { icon: Home, labelKa: "დეშბორდი", labelEn: "Dashboard", path: "/" },
      { icon: Baby, labelKa: "შვილები", labelEn: "Children", path: "/children" },
      { icon: Calendar, labelKa: "კალენდარი", labelEn: "Calendar", path: "/calendar" },
    ],
  },
  {
    titleKa: "მკურნალობა",
    titleEn: "Care",
    items: [
      { icon: Activity, labelKa: "თერაპიები", labelEn: "Therapies", path: "/therapies" },
      { icon: Pill, labelKa: "წამლები", labelEn: "Medications", path: "/medications" },
      { icon: FileText, labelKa: "დოკუმენტები", labelEn: "Documents", path: "/documents" },
    ],
  },
  {
    titleKa: "კვლევა",
    titleEn: "Research",
    items: [
      { icon: FlaskConical, labelKa: "კლინიკური ცდები", labelEn: "Clinical Trials", path: "/trials" },
      { icon: BookOpen, labelKa: "კვლევები", labelEn: "Research", path: "/research" },
      { icon: Bell, labelKa: "შეტყობინებები", labelEn: "Alerts", path: "/research-alerts" },
    ],
  },
  {
    titleKa: "AI",
    titleEn: "AI",
    items: [
      { icon: Bot, labelKa: "ასისტენტი", labelEn: "Assistant", path: "/assistant" },
    ],
  },
];

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const { unreadCount } = useNotificationContext();
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };
  const smartSearch = useSmartSearch();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location === "/" || location === "/dashboard";
    return location.startsWith(path);
  };

  const handleNavigation = (path: string) => {
    setLocation(path);
    setIsMobileMenuOpen(false);
  };

  const userInitials = user?.firstName
    ? `${user.firstName[0]}${user.lastName?.[0] || ""}`
    : "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Header */}
      <header className="sticky top-0 z-40 hidden md:flex items-center justify-between h-16 px-6 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">HC</span>
          </div>
          <span className="font-semibold text-lg">
            {language === "ka" ? "HIE Command Center" : "HIE Command Center"}
          </span>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            className="w-64 justify-start text-muted-foreground"
            onClick={smartSearch.open}
          >
            <Search className="h-4 w-4 mr-2" />
            <span className="flex-1 text-left">
              {language === "ka" ? "ძიება..." : "Search..."}
            </span>
            <kbd className="hidden lg:inline-flex h-5 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ⌘K
            </kbd>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative" onClick={() => setLocation("/research-alerts")}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>
                <span className="hidden lg:inline">{user?.firstName || "User"}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {user?.firstName} {user?.lastName}
                <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setLocation("/profile")}>
                <User className="h-4 w-4 mr-2" />
                {language === "ka" ? "პროფილი" : "Profile"}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/settings")}>
                <Settings className="h-4 w-4 mr-2" />
                {language === "ka" ? "პარამეტრები" : "Settings"}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                <LogOut className="h-4 w-4 mr-2" />
                {language === "ka" ? "გამოსვლა" : "Logout"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="sticky top-0 z-40 flex md:hidden items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur">
        {/* Menu Button */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <SheetHeader className="p-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">HC</span>
                </div>
                HIE Command Center
              </SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              <div className="p-4 space-y-6">
                {NAV_SECTIONS.map((section, idx) => (
                  <div key={idx}>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      {language === "ka" ? section.titleKa : section.titleEn}
                    </p>
                    <div className="space-y-1">
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavigation(item.path)}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                              active
                                ? "bg-primary/10 text-primary font-medium"
                                : "hover:bg-muted text-muted-foreground"
                            )}
                          >
                            <Icon className="h-5 w-5" />
                            {language === "ka" ? item.labelKa : item.labelEn}
                            {item.badge && item.badge > 0 && (
                              <Badge variant="secondary" className="ml-auto">
                                {item.badge}
                              </Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {language === "ka" ? "გამოსვლა" : "Logout"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-xs">HC</span>
          </div>
          <span className="font-semibold">HIE</span>
        </div>

        {/* Search */}
        <Button variant="ghost" size="icon" onClick={smartSearch.open}>
          <Search className="h-5 w-5" />
        </Button>
      </header>

      {/* Desktop Sidebar + Content */}
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 h-[calc(100vh-4rem)] sticky top-16 border-r bg-muted/30">
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-6">
              {NAV_SECTIONS.map((section, idx) => (
                <div key={idx}>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-3">
                    {language === "ka" ? section.titleKa : section.titleEn}
                  </p>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const active = isActive(item.path);
                      const showBadge = item.path === "/research-alerts" && unreadCount > 0;
                      return (
                        <button
                          key={item.path}
                          onClick={() => setLocation(item.path)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            active
                              ? "bg-primary/10 text-primary font-medium"
                              : "hover:bg-muted text-muted-foreground hover:text-foreground"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          {language === "ka" ? item.labelKa : item.labelEn}
                          {showBadge && (
                            <Badge variant="destructive" className="ml-auto h-5 px-1.5">
                              {unreadCount}
                            </Badge>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Sidebar Footer */}
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setLocation("/settings")}
            >
              <Settings className="h-4 w-4 mr-2" />
              {language === "ka" ? "პარამეტრები" : "Settings"}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-4rem)] pb-20 md:pb-0">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav />

      {/* Smart Search Modal */}
      <SmartSearch
        isOpen={smartSearch.isOpen}
        onClose={smartSearch.close}
        onNavigate={setLocation}
      />
    </div>
  );
}

export default AppLayout;
