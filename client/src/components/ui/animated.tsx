import { memo, forwardRef, ReactNode, HTMLAttributes } from "react";
import { motion, MotionProps, AnimatePresence } from "framer-motion";
import {
  fadeInUp,
  staggerContainer,
  staggerItem,
  cardHover,
  popIn,
  bounceIn,
  scaleVariants,
  springPresets,
} from "@/lib/animations";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, Loader2 } from "lucide-react";

// ============================================================================
// ANIMATED CONTAINERS
// ============================================================================

interface AnimatedPageProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const AnimatedPage = memo(forwardRef<HTMLDivElement, AnimatedPageProps>(
  function AnimatedPage({ children, className, ...props }, ref) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
));

interface AnimatedListProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  staggerDelay?: number;
}

export const AnimatedList = memo(forwardRef<HTMLDivElement, AnimatedListProps>(
  function AnimatedList({ children, className, staggerDelay = 0.05, ...props }, ref) {
    return (
      <motion.div
        ref={ref}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: staggerDelay },
          },
        }}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
));

interface AnimatedItemProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const AnimatedItem = memo(forwardRef<HTMLDivElement, AnimatedItemProps>(
  function AnimatedItem({ children, className, ...props }, ref) {
    return (
      <motion.div
        ref={ref}
        variants={staggerItem}
        className={className}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
));

// ============================================================================
// ANIMATED CARDS
// ============================================================================

interface AnimatedCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  hover?: boolean;
  float?: boolean;
}

export const AnimatedCard = memo(forwardRef<HTMLDivElement, AnimatedCardProps>(
  function AnimatedCard({ children, className, hover = true, float = false, ...props }, ref) {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={hover ? {
          y: float ? -4 : 0,
          scale: hover ? 1.01 : 1,
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)"
        } : undefined}
        whileTap={hover ? { scale: 0.99 } : undefined}
        transition={springPresets.snappy}
        className={cn(
          "rounded-xl border bg-card transition-shadow",
          className
        )}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
));

// ============================================================================
// ANIMATED BUTTONS
// ============================================================================

interface AnimatedButtonProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  disabled?: boolean;
  variant?: "scale" | "glow" | "bounce";
}

export const AnimatedButton = memo(forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  function AnimatedButton({ children, className, disabled, variant = "scale", ...props }, ref) {
    const variants = {
      scale: {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
      },
      glow: {
        whileHover: {
          scale: 1.02,
          boxShadow: "0 0 20px rgba(var(--primary), 0.3)"
        },
        whileTap: { scale: 0.98 },
      },
      bounce: {
        whileHover: { y: -2 },
        whileTap: { y: 0, scale: 0.98 },
      },
    };

    return (
      <motion.button
        ref={ref}
        {...variants[variant]}
        transition={springPresets.snappy}
        disabled={disabled}
        className={cn(
          "transition-colors",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
));

// ============================================================================
// ANIMATED ICONS
// ============================================================================

interface AnimatedIconProps {
  icon: React.ElementType;
  animation?: "spin" | "pulse" | "bounce" | "none";
  className?: string;
}

export const AnimatedIcon = memo(function AnimatedIcon({
  icon: Icon,
  animation = "none",
  className,
}: AnimatedIconProps) {
  const animations = {
    spin: {
      animate: { rotate: 360 },
      transition: { duration: 1, repeat: Infinity, ease: "linear" },
    },
    pulse: {
      animate: { scale: [1, 1.2, 1] },
      transition: { duration: 1, repeat: Infinity, ease: "easeInOut" },
    },
    bounce: {
      animate: { y: [0, -5, 0] },
      transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" },
    },
    none: {},
  };

  return (
    <motion.div {...animations[animation]} className={className}>
      <Icon className="h-full w-full" />
    </motion.div>
  );
});

// ============================================================================
// LOADING STATES
// ============================================================================

interface LoadingDotsProps {
  className?: string;
  dotClassName?: string;
}

export const LoadingDots = memo(function LoadingDots({ className, dotClassName }: LoadingDotsProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          animate={{ y: [0, -6, 0] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
          className={cn("w-2 h-2 rounded-full bg-current", dotClassName)}
        />
      ))}
    </div>
  );
});

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const LoadingSpinner = memo(function LoadingSpinner({ size = "md", className }: LoadingSpinnerProps) {
  const sizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      className={className}
    >
      <Loader2 className={sizes[size]} />
    </motion.div>
  );
});

interface SkeletonPulseProps {
  className?: string;
}

export const SkeletonPulse = memo(function SkeletonPulse({ className }: SkeletonPulseProps) {
  return (
    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      className={cn("bg-muted rounded", className)}
    />
  );
});

// ============================================================================
// SUCCESS/ERROR STATES
// ============================================================================

interface SuccessCheckmarkProps {
  size?: number;
  className?: string;
}

export const SuccessCheckmark = memo(function SuccessCheckmark({
  size = 48,
  className
}: SuccessCheckmarkProps) {
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={springPresets.bouncy}
      className={cn("flex items-center justify-center", className)}
    >
      <div
        className="rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, ...springPresets.snappy }}
        >
          <Check
            className="text-green-600 dark:text-green-400"
            style={{ width: size * 0.5, height: size * 0.5 }}
          />
        </motion.div>
      </div>
    </motion.div>
  );
});

interface ErrorShakeProps {
  children: ReactNode;
  trigger?: boolean;
}

export const ErrorShake = memo(function ErrorShake({ children, trigger }: ErrorShakeProps) {
  return (
    <motion.div
      animate={trigger ? { x: [-10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
});

// ============================================================================
// PROGRESS ANIMATIONS
// ============================================================================

interface AnimatedProgressProps {
  value: number;
  className?: string;
  barClassName?: string;
}

export const AnimatedProgress = memo(function AnimatedProgress({
  value,
  className,
  barClassName
}: AnimatedProgressProps) {
  return (
    <div className={cn("h-2 bg-muted rounded-full overflow-hidden", className)}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value}%` }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className={cn("h-full bg-primary rounded-full", barClassName)}
      />
    </div>
  );
});

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  className?: string;
}

export const AnimatedCounter = memo(function AnimatedCounter({
  value,
  duration = 1,
  className
}: AnimatedCounterProps) {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={className}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        key={value}
      >
        {value}
      </motion.span>
    </motion.span>
  );
});

// ============================================================================
// PRESENCE ANIMATIONS
// ============================================================================

interface FadePresenceProps {
  children: ReactNode;
  show: boolean;
  className?: string;
}

export const FadePresence = memo(function FadePresence({ children, show, className }: FadePresenceProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

interface SlidePresenceProps {
  children: ReactNode;
  show: boolean;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}

export const SlidePresence = memo(function SlidePresence({
  children,
  show,
  direction = "up",
  className
}: SlidePresenceProps) {
  const offsets = {
    up: { y: 20 },
    down: { y: -20 },
    left: { x: 20 },
    right: { x: -20 },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, ...offsets[direction] }}
          animate={{ opacity: 1, x: 0, y: 0 }}
          exit={{ opacity: 0, ...offsets[direction] }}
          transition={springPresets.snappy}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

interface PopPresenceProps {
  children: ReactNode;
  show: boolean;
  className?: string;
}

export const PopPresence = memo(function PopPresence({ children, show, className }: PopPresenceProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={springPresets.snappy}
          className={className}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// HOVER EFFECTS
// ============================================================================

interface HoverGlowProps {
  children: ReactNode;
  color?: string;
  className?: string;
}

export const HoverGlow = memo(function HoverGlow({
  children,
  color = "rgba(var(--primary), 0.15)",
  className
}: HoverGlowProps) {
  return (
    <motion.div
      whileHover={{
        boxShadow: `0 0 30px ${color}`,
      }}
      transition={{ duration: 0.3 }}
      className={className}
    >
      {children}
    </motion.div>
  );
});

interface HoverLiftProps {
  children: ReactNode;
  y?: number;
  className?: string;
}

export const HoverLift = memo(function HoverLift({
  children,
  y = -4,
  className
}: HoverLiftProps) {
  return (
    <motion.div
      whileHover={{ y }}
      whileTap={{ y: 0, scale: 0.98 }}
      transition={springPresets.snappy}
      className={className}
    >
      {children}
    </motion.div>
  );
});

// ============================================================================
// NOTIFICATION ANIMATIONS
// ============================================================================

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

export const NotificationBadge = memo(function NotificationBadge({
  count,
  className
}: NotificationBadgeProps) {
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={springPresets.bouncy}
          className={cn(
            "absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-destructive-foreground text-xs font-medium flex items-center justify-center",
            className
          )}
        >
          {count > 99 ? "99+" : count}
        </motion.div>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// RIPPLE EFFECT
// ============================================================================

interface RippleButtonProps extends HTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  disabled?: boolean;
}

export const RippleButton = memo(forwardRef<HTMLButtonElement, RippleButtonProps>(
  function RippleButton({ children, className, disabled, onClick, ...props }, ref) {
    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const button = e.currentTarget;
      const rect = button.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const ripple = document.createElement("span");
      ripple.style.cssText = `
        position: absolute;
        background: currentColor;
        opacity: 0.3;
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
        left: ${x}px;
        top: ${y}px;
        width: 100px;
        height: 100px;
        margin-left: -50px;
        margin-top: -50px;
      `;

      button.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);

      onClick?.(e);
    };

    return (
      <button
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        className={cn("relative overflow-hidden", className)}
        {...props}
      >
        {children}
      </button>
    );
  }
));
