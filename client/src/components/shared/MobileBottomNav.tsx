import { memo } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Baby,
  Stethoscope,
  Calendar,
  Bot,
  Plus,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface NavItem {
  icon: React.ElementType;
  label: string;
  href: string;
}

export const MobileBottomNav = memo(function MobileBottomNav() {
  const [location] = useLocation();
  const { language } = useLanguage();

  const navItems: NavItem[] = [
    {
      icon: LayoutDashboard,
      label: language === "ka" ? "მთავარი" : "Home",
      href: "/",
    },
    {
      icon: Baby,
      label: language === "ka" ? "შვილი" : "Child",
      href: "/child-profile",
    },
    {
      icon: Stethoscope,
      label: language === "ka" ? "თერაპია" : "Therapy",
      href: "/therapy",
    },
    {
      icon: Calendar,
      label: language === "ka" ? "განრიგი" : "Schedule",
      href: "/calendar",
    },
    {
      icon: Bot,
      label: "AI",
      href: "/assistant",
    },
  ];

  const quickActions = [
    {
      label: language === "ka" ? "სწრაფი ჩანაწერი" : "Quick Log",
      href: "/therapy",
      color: "bg-green-500",
    },
    {
      label: language === "ka" ? "ახალი ვიზიტი" : "New Appointment",
      href: "/calendar",
      color: "bg-blue-500",
    },
    {
      label: language === "ka" ? "დოკუმენტის ატვირთვა" : "Upload Document",
      href: "/documents",
      color: "bg-purple-500",
    },
    {
      label: language === "ka" ? "AI-სთან საუბარი" : "Chat with AI",
      href: "/assistant",
      color: "bg-orange-500",
    },
  ];

  const isActive = (href: string) => {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t md:hidden"
      role="navigation"
      aria-label="Mobile navigation"
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.slice(0, 2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid={`mobile-nav-${item.href.replace("/", "") || "home"}`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}

        {/* Center Quick Action Button */}
        <Sheet>
          <SheetTrigger asChild>
            <button
              className="flex items-center justify-center w-14 h-14 -mt-6 rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-colors"
              aria-label={language === "ka" ? "სწრაფი მოქმედება" : "Quick action"}
              data-testid="mobile-nav-quick-action"
            >
              <Plus className="h-6 w-6" />
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto rounded-t-xl">
            <SheetHeader>
              <SheetTitle className="text-center">
                {language === "ka" ? "სწრაფი მოქმედებები" : "Quick Actions"}
              </SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-2 gap-3 py-4">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <Button
                    variant="outline"
                    className="w-full h-16 flex flex-col gap-1"
                  >
                    <div className={cn("w-3 h-3 rounded-full", action.color)} />
                    <span className="text-xs">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {navItems.slice(2).map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center flex-1 h-full gap-1 transition-colors",
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
            data-testid={`mobile-nav-${item.href.replace("/", "")}`}
          >
            <item.icon className="h-5 w-5" />
            <span className="text-xs font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      {/* Safe area padding for devices with home indicator */}
      <div className="h-safe-area-inset-bottom bg-background" />
    </nav>
  );
});
