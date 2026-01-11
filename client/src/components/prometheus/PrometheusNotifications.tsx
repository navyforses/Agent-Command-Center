/**
 * PROMETHEUS-MIND: Notification Center
 * =====================================
 * Real-time notifications for important discoveries and insights
 *
 * Council of Minds (2125):
 * "მნიშვნელოვანი აღმოჩენა, რომელიც დროულად არ მოდის, დაკარგული შესაძლებლობაა."
 * "An important discovery that doesn't come in time is a lost opportunity."
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Lightbulb,
  Beaker,
  FlaskConical,
  Target,
  AlertTriangle,
  Calendar,
  MoreVertical,
  RefreshCw,
  Loader2,
  Clock,
  Brain,
  Sparkles,
  TrendingUp,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { format, formatDistanceToNow } from "date-fns";

// Notification category icons and colors
const categoryConfig: Record<
  string,
  { icon: typeof Bell; color: string; bgColor: string; label: string }
> = {
  breakthrough_discovery: {
    icon: Sparkles,
    color: "#f59e0b",
    bgColor: "bg-amber-100 dark:bg-amber-900/30",
    label: "Breakthrough Discovery",
  },
  new_treatment_option: {
    icon: Beaker,
    color: "#22c55e",
    bgColor: "bg-green-100 dark:bg-green-900/30",
    label: "Treatment Option",
  },
  clinical_trial_match: {
    icon: FlaskConical,
    color: "#3b82f6",
    bgColor: "bg-blue-100 dark:bg-blue-900/30",
    label: "Clinical Trial",
  },
  prediction_validation: {
    icon: Target,
    color: "#8b5cf6",
    bgColor: "bg-purple-100 dark:bg-purple-900/30",
    label: "Prediction",
  },
  knowledge_milestone: {
    icon: TrendingUp,
    color: "#06b6d4",
    bgColor: "bg-cyan-100 dark:bg-cyan-900/30",
    label: "Milestone",
  },
  verification_complete: {
    icon: Shield,
    color: "#10b981",
    bgColor: "bg-emerald-100 dark:bg-emerald-900/30",
    label: "Verification",
  },
  system_alert: {
    icon: AlertTriangle,
    color: "#ef4444",
    bgColor: "bg-red-100 dark:bg-red-900/30",
    label: "System Alert",
  },
  weekly_digest: {
    icon: Calendar,
    color: "#6366f1",
    bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
    label: "Weekly Digest",
  },
};

// Priority configurations
const priorityConfig: Record<string, { label: string; className: string }> = {
  critical: { label: "Critical", className: "bg-red-500 text-white" },
  high: { label: "High", className: "bg-orange-500 text-white" },
  medium: { label: "Medium", className: "bg-yellow-500 text-black" },
  low: { label: "Low", className: "bg-gray-500 text-white" },
};

interface Notification {
  id: number;
  prometheusId: number;
  userId: string;
  category: string;
  priority: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  actionUrl?: string;
  isRead: boolean;
  readAt?: string;
  expiresAt?: string;
  createdAt: string;
}

interface NotificationDigest {
  userId: string;
  period: string;
  startDate: string;
  endDate: string;
  totalNotifications: number;
  unreadCount: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  highlights: Notification[];
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: number) => void;
  onDelete: (id: number) => void;
}

function NotificationItem({ notification, onMarkRead, onDelete }: NotificationItemProps) {
  const config = categoryConfig[notification.category] || categoryConfig.system_alert;
  const priority = priorityConfig[notification.priority] || priorityConfig.medium;
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className={`p-4 rounded-lg border transition-colors ${
        notification.isRead
          ? "bg-background border-border"
          : "bg-primary/5 border-primary/20"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg shrink-0 ${config.bgColor}`}
          style={{ color: config.color }}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <h4 className={`font-medium ${notification.isRead ? "" : "text-primary"}`}>
                {notification.title}
              </h4>
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                {notification.message}
              </p>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {!notification.isRead && (
                  <DropdownMenuItem onClick={() => onMarkRead(notification.id)}>
                    <Check className="h-4 w-4 mr-2" />
                    Mark as read
                  </DropdownMenuItem>
                )}
                {notification.actionUrl && (
                  <DropdownMenuItem asChild>
                    <a href={notification.actionUrl}>
                      <Lightbulb className="h-4 w-4 mr-2" />
                      View details
                    </a>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => onDelete(notification.id)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Badge variant="outline" className="text-xs">
              {config.label}
            </Badge>
            <Badge className={`text-xs ${priority.className}`}>{priority.label}</Badge>
            <span className="text-xs text-muted-foreground ml-auto flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface PrometheusNotificationsProps {
  childId?: number;
  compact?: boolean;
}

export function PrometheusNotifications({
  childId,
  compact = false,
}: PrometheusNotificationsProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [filter, setFilter] = useState<"all" | "unread">("all");

  // Fetch notifications
  const { data: notifications, isLoading, refetch } = useQuery<Notification[]>({
    queryKey: childId
      ? ["/api/prometheus/notifications", childId, filter]
      : ["/api/prometheus/notifications", filter],
    queryFn: async () => {
      const url = childId
        ? `/api/prometheus/notifications/${childId}?unreadOnly=${filter === "unread"}`
        : `/api/prometheus/notifications?unreadOnly=${filter === "unread"}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to fetch notifications");
      return response.json();
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(
        `/api/prometheus/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prometheus/notifications"] });
    },
  });

  // Mark all as read mutation
  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/prometheus/notifications/mark-all-read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Failed to mark all as read");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/prometheus/notifications"] });
      toast({ title: `Marked ${data.marked} notifications as read` });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await fetch(
        `/api/prometheus/notifications/${notificationId}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );
      if (!response.ok) throw new Error("Failed to delete notification");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/prometheus/notifications"] });
      toast({ title: "Notification deleted" });
    },
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length || 0;

  if (compact) {
    // Compact view for sidebar/header
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center bg-primary text-primary-foreground text-xs rounded-full">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between p-2 border-b">
            <h4 className="font-medium">Notifications</h4>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => markAllReadMutation.mutate()}
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
          <ScrollArea className="h-72">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : notifications && notifications.length > 0 ? (
              <div className="p-2 space-y-2">
                {notifications.slice(0, 5).map((notification) => {
                  const config = categoryConfig[notification.category] || categoryConfig.system_alert;
                  const Icon = config.icon;
                  return (
                    <div
                      key={notification.id}
                      className={`p-2 rounded-md cursor-pointer transition-colors ${
                        notification.isRead
                          ? "hover:bg-muted"
                          : "bg-primary/5 hover:bg-primary/10"
                      }`}
                      onClick={() => !notification.isRead && markReadMutation.mutate(notification.id)}
                    >
                      <div className="flex items-start gap-2">
                        <Icon
                          className="h-4 w-4 mt-0.5 shrink-0"
                          style={{ color: config.color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {notification.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                <BellOff className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No notifications</p>
              </div>
            )}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Full notifications panel
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              PROMETHEUS Notifications
              {unreadCount > 0 && (
                <Badge variant="default" className="ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Important discoveries and insights from your research
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "unread" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("unread")}
            >
              Unread
            </Button>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="w-fit mt-2"
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
          >
            {markAllReadMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCheck className="h-4 w-4 mr-2" />
            )}
            Mark all as read
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        ) : notifications && notifications.length > 0 ? (
          <ScrollArea className="h-[500px] pr-4">
            <AnimatePresence mode="popLayout">
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={(id) => markReadMutation.mutate(id)}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))}
              </div>
            </AnimatePresence>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <BellOff className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Notifications</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              {filter === "unread"
                ? "You're all caught up! No unread notifications."
                : "PROMETHEUS will notify you when it discovers important insights."}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Digest component for weekly/daily summaries
export function PrometheusDigest({ period = "daily" }: { period?: "daily" | "weekly" }) {
  const { toast } = useToast();

  const { data: digest, isLoading } = useQuery<NotificationDigest>({
    queryKey: ["/api/prometheus/notifications/digest", period],
    queryFn: async () => {
      const response = await fetch(`/api/prometheus/notifications/digest/${period}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch digest");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!digest) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          {period === "weekly" ? "Weekly" : "Daily"} PROMETHEUS Digest
        </CardTitle>
        <CardDescription>
          {format(new Date(digest.startDate), "MMM d")} -{" "}
          {format(new Date(digest.endDate), "MMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-primary">
              {digest.totalNotifications}
            </p>
            <p className="text-sm text-muted-foreground">Total Notifications</p>
          </div>
          <div className="text-center p-4 bg-muted/50 rounded-lg">
            <p className="text-3xl font-bold text-orange-500">{digest.unreadCount}</p>
            <p className="text-sm text-muted-foreground">Unread</p>
          </div>
        </div>

        {/* By category */}
        <div>
          <h4 className="font-medium mb-3">By Category</h4>
          <div className="space-y-2">
            {Object.entries(digest.byCategory).map(([category, count]) => {
              const config = categoryConfig[category] || categoryConfig.system_alert;
              const Icon = config.icon;
              const percentage = (count / digest.totalNotifications) * 100;

              return (
                <div key={category} className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded ${config.bgColor}`}
                    style={{ color: config.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span>{config.label}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Highlights */}
        {digest.highlights.length > 0 && (
          <div>
            <h4 className="font-medium mb-3">Highlights</h4>
            <div className="space-y-2">
              {digest.highlights.map((notification) => {
                const config =
                  categoryConfig[notification.category] || categoryConfig.system_alert;
                const Icon = config.icon;

                return (
                  <div
                    key={notification.id}
                    className="p-3 bg-muted/50 rounded-lg flex items-start gap-3"
                  >
                    <Icon className="h-5 w-5 shrink-0" style={{ color: config.color }} />
                    <div>
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {notification.message}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PrometheusNotifications;
