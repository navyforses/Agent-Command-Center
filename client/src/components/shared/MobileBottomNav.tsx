import { memo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Search,
  Bookmark,
  Brain,
  Plus,
  X,
  FlaskConical,
  Globe,
  Languages,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

interface QuickAction {
  icon: React.ElementType;
  label: string;
  href: string;
  color: string;
  bgColor: string;
}

export const MobileBottomNav = memo(function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: language === "ka" ? "მთავარი" : "Home",
      href: "/",
    },
    {
      icon: Search,
      label: language === "ka" ? "ძიება" : "Search",
      href: "/search",
    },
    {
      icon: Bookmark,
      label: language === "ka" ? "შენახული" : "Saved",
      href: "/saved",
    },
    {
      icon: Brain,
      label: "AI",
      href: "/evolution",
    },
  ];

  const quickActions: QuickAction[] = [
    {
      icon: FlaskConical,
      label: language === "ka" ? "ახალი ძიება" : "New Search",
      href: "/search",
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Globe,
      label: language === "ka" ? "რეესტრები" : "Registries",
      href: "/registry/ctgov",
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Languages,
      label: language === "ka" ? "თარგმანები" : "Translations",
      href: "/glossary",
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  const handleQuickAction = (href: string) => {
    setIsOpen(false);
    setLocation(href);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-background/95 backdrop-blur-lg border-t shadow-lg">
          <nav className="flex items-center justify-around h-16 px-2">
            {navItems.slice(0, 2).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-w-[60px]",
                  isActive(item.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`mobile-nav-${item.href.replace(/\//g, "-").slice(1) || "home"}`}
              >
                <item.icon className={cn("h-5 w-5", isActive(item.href) && "text-primary")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}

            <button
              onClick={() => setIsOpen(true)}
              className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg -mt-6"
              data-testid="mobile-nav-quick-actions"
            >
              <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg">
                <Plus className="h-6 w-6" />
              </div>
            </button>

            {navItems.slice(2).map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-2 rounded-lg transition-colors min-w-[60px]",
                  isActive(item.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                data-testid={`mobile-nav-${item.href.replace(/\//g, "-").slice(1) || "home"}`}
              >
                <item.icon className={cn("h-5 w-5", isActive(item.href) && "text-primary")} />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="bottom" className="h-auto rounded-t-3xl">
          <SheetHeader className="text-left pb-4">
            <SheetTitle>
              {language === "ka" ? "სწრაფი მოქმედებები" : "Quick Actions"}
            </SheetTitle>
          </SheetHeader>
          <div className="grid grid-cols-3 gap-4 pb-6">
            {quickActions.map((action) => (
              <SheetClose asChild key={action.href}>
                <button
                  onClick={() => handleQuickAction(action.href)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-muted transition-colors"
                  data-testid={`quick-action-${action.href.replace(/\//g, "-").slice(1)}`}
                >
                  <div className={cn("p-3 rounded-full", action.bgColor)}>
                    <action.icon className={cn("h-6 w-6", action.color)} />
                  </div>
                  <span className="text-xs font-medium text-center">{action.label}</span>
                </button>
              </SheetClose>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
});
