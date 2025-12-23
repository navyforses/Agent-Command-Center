import { memo, ReactNode } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MobileHeaderAction {
  label: string;
  icon?: React.ElementType;
  onClick: () => void;
  variant?: "default" | "destructive";
}

interface MobilePageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backHref?: string;
  actions?: MobileHeaderAction[];
  rightElement?: ReactNode;
  className?: string;
}

export const MobilePageHeader = memo(function MobilePageHeader({
  title,
  subtitle,
  showBack = false,
  backHref,
  actions,
  rightElement,
  className,
}: MobilePageHeaderProps) {
  const [, setLocation] = useLocation();

  const handleBack = () => {
    if (backHref) {
      setLocation(backHref);
    } else {
      window.history.back();
    }
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-background/95 backdrop-blur-lg border-b md:hidden",
        className
      )}
    >
      <div className="flex items-center justify-between h-14 px-4">
        {/* Left side - Back button or spacer */}
        <div className="flex items-center gap-2 min-w-[44px]">
          {showBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleBack}
              className="p-2 -ml-2 rounded-full hover:bg-muted active:bg-muted transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="h-5 w-5" />
            </motion.button>
          )}
        </div>

        {/* Center - Title */}
        <div className="flex-1 text-center px-2">
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-semibold text-base truncate"
          >
            {title}
          </motion.h1>
          {subtitle && (
            <p className="text-xs text-muted-foreground truncate">{subtitle}</p>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-1 min-w-[44px] justify-end">
          {rightElement}

          {actions && actions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {actions.map((action, index) => (
                  <DropdownMenuItem
                    key={index}
                    onClick={action.onClick}
                    className={cn(
                      "gap-2",
                      action.variant === "destructive" && "text-destructive"
                    )}
                  >
                    {action.icon && <action.icon className="h-4 w-4" />}
                    {action.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
});

// Mobile-optimized touch card wrapper
interface TouchCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const TouchCard = memo(function TouchCard({
  children,
  onClick,
  className,
  disabled = false,
}: TouchCardProps) {
  if (!onClick) {
    return (
      <div className={cn("rounded-xl border bg-card p-4", className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "w-full text-left rounded-xl border bg-card p-4 transition-colors",
        "active:bg-muted/50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {children}
    </motion.button>
  );
});

// Pull to refresh indicator (visual only - actual implementation depends on scroll container)
interface PullRefreshIndicatorProps {
  isRefreshing: boolean;
  pullProgress: number; // 0 to 1
}

export const PullRefreshIndicator = memo(function PullRefreshIndicator({
  isRefreshing,
  pullProgress,
}: PullRefreshIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center h-12 md:hidden",
        pullProgress > 0 ? "opacity-100" : "opacity-0"
      )}
      style={{ transform: `translateY(${Math.min(pullProgress * 50, 50)}px)` }}
    >
      <motion.div
        animate={isRefreshing ? { rotate: 360 } : { rotate: pullProgress * 180 }}
        transition={isRefreshing ? { duration: 1, repeat: Infinity, ease: "linear" } : {}}
        className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full"
      />
    </div>
  );
});

// Swipeable list item
interface SwipeableItemProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: { icon: React.ElementType; color: string; label: string };
  rightAction?: { icon: React.ElementType; color: string; label: string };
}

export const SwipeableItem = memo(function SwipeableItem({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
}: SwipeableItemProps) {
  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left action background */}
      {leftAction && (
        <div className="absolute inset-y-0 left-0 w-20 flex items-center justify-center bg-green-500">
          <leftAction.icon className="h-5 w-5 text-white" />
        </div>
      )}

      {/* Right action background */}
      {rightAction && (
        <div className="absolute inset-y-0 right-0 w-20 flex items-center justify-center bg-red-500">
          <rightAction.icon className="h-5 w-5 text-white" />
        </div>
      )}

      {/* Main content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: rightAction ? -80 : 0, right: leftAction ? 80 : 0 }}
        dragElastic={0.1}
        onDragEnd={(_, info) => {
          if (info.offset.x > 60 && onSwipeRight) {
            onSwipeRight();
          } else if (info.offset.x < -60 && onSwipeLeft) {
            onSwipeLeft();
          }
        }}
        className="relative bg-background z-10"
      >
        {children}
      </motion.div>
    </div>
  );
});

// Floating action button for mobile
interface FloatingActionButtonProps {
  icon: React.ElementType;
  onClick: () => void;
  label: string;
  position?: "bottom-right" | "bottom-center";
}

export const FloatingActionButton = memo(function FloatingActionButton({
  icon: Icon,
  onClick,
  label,
  position = "bottom-right",
}: FloatingActionButtonProps) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={cn(
        "fixed z-40 flex items-center justify-center w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg md:hidden",
        position === "bottom-right" && "bottom-24 right-4",
        position === "bottom-center" && "bottom-24 left-1/2 -translate-x-1/2"
      )}
      aria-label={label}
    >
      <Icon className="h-6 w-6" />
    </motion.button>
  );
});
