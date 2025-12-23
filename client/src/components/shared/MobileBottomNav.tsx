import { memo, useState } from "react";
import { Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Baby,
  Stethoscope,
  Calendar,
  Bot,
  Plus,
  X,
  Zap,
  Upload,
  MessageSquare,
  FileText,
  Bell,
  Search,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
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

  const quickActions: QuickAction[] = [
    {
      icon: Zap,
      label: language === "ka" ? "სწრაფი ჩანაწერი" : "Quick Log",
      href: "/therapy",
      color: "text-green-600",
      bgColor: "bg-green-500/10",
    },
    {
      icon: Calendar,
      label: language === "ka" ? "ახალი ვიზიტი" : "New Appointment",
      href: "/calendar",
      color: "text-blue-600",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Upload,
      label: language === "ka" ? "დოკუმენტი" : "Upload Doc",
      href: "/documents",
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: MessageSquare,
      label: language === "ka" ? "AI ჩატი" : "AI Chat",
      href: "/assistant",
      color: "text-orange-600",
      bgColor: "bg-orange-500/10",
    },
    {
      icon: Search,
      label: language === "ka" ? "კვლევა" : "Research",
      href: "/research",
      color: "text-cyan-600",
      bgColor: "bg-cyan-500/10",
    },
    {
      icon: FileText,
      label: language === "ka" ? "დოკუმენტები" : "Documents",
      href: "/documents",
      color: "text-amber-600",
      bgColor: "bg-amber-500/10",
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
      {/* Backdrop overlay when sheet is open */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
        )}
      </AnimatePresence>

      <nav
        className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t md:hidden"
        role="navigation"
        aria-label="Mobile navigation"
      >
        <div className="flex items-center justify-around h-16 px-1">
          {/* Left nav items */}
          {navItems.slice(0, 2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all active:scale-95",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              data-testid={`mobile-nav-${item.href.replace("/", "") || "home"}`}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-all",
                  isActive(item.href) && "h-6 w-6"
                )} />
                {/* Active indicator dot */}
                {isActive(item.href) && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
              <span className={cn(
                "text-[10px] font-medium transition-all",
                isActive(item.href) && "text-xs font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          ))}

          {/* Center Quick Action Button */}
          <div className="flex items-center justify-center flex-1">
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  className={cn(
                    "flex items-center justify-center w-14 h-14 -mt-5 rounded-full shadow-lg transition-all duration-200",
                    isOpen
                      ? "bg-muted text-muted-foreground rotate-45"
                      : "bg-primary text-primary-foreground"
                  )}
                  aria-label={language === "ka" ? "სწრაფი მოქმედება" : "Quick action"}
                  data-testid="mobile-nav-quick-action"
                >
                  <Plus className="h-7 w-7 transition-transform duration-200" />
                </motion.button>
              </SheetTrigger>
              <SheetContent
                side="bottom"
                className="rounded-t-3xl px-4 pb-8"
              >
                <div className="w-12 h-1.5 bg-muted rounded-full mx-auto mb-4" />
                <SheetHeader className="mb-4">
                  <SheetTitle className="text-center text-lg">
                    {language === "ka" ? "სწრაფი მოქმედებები" : "Quick Actions"}
                  </SheetTitle>
                </SheetHeader>

                <div className="grid grid-cols-3 gap-3">
                  {quickActions.map((action, index) => (
                    <motion.button
                      key={action.href + action.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      onClick={() => handleQuickAction(action.href)}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all active:scale-95",
                        "hover:border-primary/30",
                        action.bgColor
                      )}
                    >
                      <div className={cn(
                        "p-3 rounded-xl",
                        action.bgColor,
                        action.color
                      )}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <span className="text-xs font-medium text-center leading-tight">
                        {action.label}
                      </span>
                    </motion.button>
                  ))}
                </div>

                {/* Cancel button */}
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => setIsOpen(false)}
                  className="w-full mt-4 py-3 text-muted-foreground text-sm font-medium hover:text-foreground transition-colors"
                >
                  {language === "ka" ? "გაუქმება" : "Cancel"}
                </motion.button>
              </SheetContent>
            </Sheet>
          </div>

          {/* Right nav items */}
          {navItems.slice(2).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all active:scale-95",
                isActive(item.href)
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
              data-testid={`mobile-nav-${item.href.replace("/", "")}`}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                className="relative"
              >
                <item.icon className={cn(
                  "h-5 w-5 transition-all",
                  isActive(item.href) && "h-6 w-6"
                )} />
                {/* Active indicator dot */}
                {isActive(item.href) && (
                  <motion.div
                    layoutId="activeIndicator"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                )}
              </motion.div>
              <span className={cn(
                "text-[10px] font-medium transition-all",
                isActive(item.href) && "text-xs font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>

        {/* Safe area padding for devices with home indicator */}
        <div className="h-safe-area-inset-bottom bg-background" />
      </nav>

      {/* Bottom padding spacer to prevent content from being hidden */}
      <div className="h-20 md:hidden" />
    </>
  );
});
