/**
 * MobileBottomNav Component
 * ==========================
 * Mobile-first bottom navigation bar
 * Shows on screens < 768px (md breakpoint)
 *
 * Layout: [🏠] [👶] [➕] [📅] [🤖]
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Baby,
  Plus,
  Calendar,
  Bot,
  X,
  FileText,
  Activity,
  Bell,
  Search,
  Settings,
  Pill,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNotificationContext } from "@/contexts/NotificationContext";
import { cn } from "@/lib/utils";

interface NavItem {
  id: string;
  icon: React.ElementType;
  labelKa: string;
  labelEn: string;
  path: string;
  badge?: number;
}

interface QuickAction {
  id: string;
  icon: React.ElementType;
  labelKa: string;
  labelEn: string;
  path: string;
  color: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", icon: Home, labelKa: "მთავარი", labelEn: "Home", path: "/" },
  { id: "child", icon: Baby, labelKa: "შვილი", labelEn: "Child", path: "/children" },
  { id: "add", icon: Plus, labelKa: "დამატება", labelEn: "Add", path: "#" }, // Special - opens menu
  { id: "calendar", icon: Calendar, labelKa: "კალენდარი", labelEn: "Calendar", path: "/calendar" },
  { id: "assistant", icon: Bot, labelKa: "AI", labelEn: "AI", path: "/assistant" },
];

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "document",
    icon: FileText,
    labelKa: "დოკუმენტი",
    labelEn: "Document",
    path: "/documents",
    color: "bg-blue-500",
  },
  {
    id: "therapy",
    icon: Activity,
    labelKa: "თერაპია",
    labelEn: "Therapy",
    path: "/therapies",
    color: "bg-green-500",
  },
  {
    id: "medication",
    icon: Pill,
    labelKa: "წამალი",
    labelEn: "Medication",
    path: "/medications",
    color: "bg-purple-500",
  },
  {
    id: "search",
    icon: Search,
    labelKa: "ძიება",
    labelEn: "Search",
    path: "/search",
    color: "bg-orange-500",
  },
  {
    id: "alerts",
    icon: Bell,
    labelKa: "შეტყობინებები",
    labelEn: "Alerts",
    path: "/research-alerts",
    color: "bg-red-500",
  },
  {
    id: "settings",
    icon: Settings,
    labelKa: "პარამეტრები",
    labelEn: "Settings",
    path: "/settings",
    color: "bg-gray-500",
  },
];

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const { language } = useLanguage();
  const { unreadCount } = useNotificationContext();
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === "/") return location === "/" || location === "/dashboard";
    return location.startsWith(path);
  };

  const handleNavClick = (item: NavItem) => {
    if (item.id === "add") {
      setIsQuickMenuOpen(!isQuickMenuOpen);
    } else {
      setIsQuickMenuOpen(false);
      setLocation(item.path);
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    setIsQuickMenuOpen(false);
    setLocation(action.path);
  };

  return (
    <>
      {/* Quick Action Menu Overlay */}
      <AnimatePresence>
        {isQuickMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 md:hidden"
              onClick={() => setIsQuickMenuOpen(false)}
            />

            {/* Quick Actions Grid */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-20 left-4 right-4 z-50 md:hidden"
            >
              <div className="bg-background rounded-2xl shadow-2xl border p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">
                    {language === "ka" ? "სწრაფი მოქმედება" : "Quick Action"}
                  </h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setIsQuickMenuOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleQuickAction(action)}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl hover:bg-muted transition-colors"
                      >
                        <div
                          className={cn(
                            "w-12 h-12 rounded-full flex items-center justify-center text-white",
                            action.color
                          )}
                        >
                          <Icon className="h-6 w-6" />
                        </div>
                        <span className="text-xs font-medium">
                          {language === "ka" ? action.labelKa : action.labelEn}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden">
        {/* Safe area padding for iOS */}
        <div className="bg-background border-t shadow-lg">
          <div className="flex items-center justify-around h-16 px-2 pb-safe">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.id !== "add" && isActive(item.path);
              const isAddButton = item.id === "add";
              const showBadge = item.id === "assistant" && unreadCount > 0;

              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 relative",
                    isAddButton ? "w-16" : "flex-1 py-2",
                    !isAddButton && "active:bg-muted/50 rounded-lg transition-colors"
                  )}
                >
                  {isAddButton ? (
                    <motion.div
                      animate={{ rotate: isQuickMenuOpen ? 45 : 0 }}
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center shadow-lg -mt-6",
                        isQuickMenuOpen
                          ? "bg-muted text-foreground"
                          : "bg-primary text-primary-foreground"
                      )}
                    >
                      <Icon className="h-7 w-7" />
                    </motion.div>
                  ) : (
                    <>
                      <div className="relative">
                        <Icon
                          className={cn(
                            "h-6 w-6 transition-colors",
                            active ? "text-primary" : "text-muted-foreground"
                          )}
                        />
                        {showBadge && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {unreadCount > 9 ? "9+" : unreadCount}
                          </span>
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-medium transition-colors",
                          active ? "text-primary" : "text-muted-foreground"
                        )}
                      >
                        {language === "ka" ? item.labelKa : item.labelEn}
                      </span>
                      {active && (
                        <motion.div
                          layoutId="activeIndicator"
                          className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                        />
                      )}
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* Spacer to prevent content from being hidden behind nav */}
      <div className="h-16 md:hidden" />
    </>
  );
}

export default MobileBottomNav;
