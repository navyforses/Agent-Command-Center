import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Calendar,
  Activity,
  Pill,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Star,
  Brain,
  Heart,
  Lightbulb,
  ArrowRight,
  Bell,
  Target,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import type { Child, Appointment, Therapy, TherapySession } from "@shared/schema";
import { format, isToday, isTomorrow, differenceInDays, startOfWeek, endOfWeek, isWithinInterval } from "date-fns";

interface AIDailyBriefProps {
  children?: Child[];
  appointments?: Appointment[];
  therapies?: Therapy[];
  onNavigate?: (path: string) => void;
}

interface Insight {
  id: string;
  type: "success" | "reminder" | "tip" | "alert";
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; path: string };
}

export function AIDailyBrief({ children, appointments, therapies, onNavigate }: AIDailyBriefProps) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  const primaryChild = children?.[0];
  const hasChildren = children && children.length > 0;

  // Calculate today's stats
  const todayStats = useMemo(() => {
    const now = new Date();
    const todayAppointments = appointments?.filter((apt) => isToday(new Date(apt.appointmentDate))) || [];
    const tomorrowAppointments = appointments?.filter((apt) => isTomorrow(new Date(apt.appointmentDate))) || [];
    const activeTherapies = therapies?.filter((t) => t.isActive) || [];

    // Calculate weekly progress (simulated based on active therapies)
    const weekProgress = activeTherapies.length > 0 ? Math.min(100, activeTherapies.length * 25) : 0;

    return {
      todayAppointments,
      tomorrowAppointments,
      activeTherapies,
      weekProgress,
      upcomingCount: todayAppointments.length + tomorrowAppointments.length,
    };
  }, [appointments, therapies]);

  // Generate personalized insights
  const insights = useMemo((): Insight[] => {
    const result: Insight[] = [];

    // No child profile reminder
    if (!hasChildren) {
      result.push({
        id: "no-child",
        type: "reminder",
        icon: AlertCircle,
        title: language === "ka" ? "პროფილის შექმნა" : "Create Profile",
        description: language === "ka"
          ? "დაამატეთ თქვენი შვილის პროფილი პერსონალიზებული რეკომენდაციებისთვის"
          : "Add your child's profile to get personalized recommendations",
        action: { label: language === "ka" ? "დამატება" : "Add", path: "/" },
      });
      return result;
    }

    // Today's appointments
    if (todayStats.todayAppointments.length > 0) {
      result.push({
        id: "today-appointments",
        type: "alert",
        icon: Calendar,
        title: language === "ka"
          ? `დღეს ${todayStats.todayAppointments.length} ვიზიტი`
          : `${todayStats.todayAppointments.length} appointment${todayStats.todayAppointments.length > 1 ? "s" : ""} today`,
        description: todayStats.todayAppointments.map((a) => a.title).join(", "),
        action: { label: language === "ka" ? "ნახვა" : "View", path: "/calendar" },
      });
    }

    // Active therapies progress
    if (todayStats.activeTherapies.length > 0) {
      result.push({
        id: "therapy-progress",
        type: "success",
        icon: TrendingUp,
        title: language === "ka"
          ? `${todayStats.activeTherapies.length} აქტიური თერაპია`
          : `${todayStats.activeTherapies.length} active ${todayStats.activeTherapies.length > 1 ? "therapies" : "therapy"}`,
        description: language === "ka"
          ? "თერაპიული გეგმა მიმდინარეობს"
          : "Therapy plan is in progress",
        action: { label: language === "ka" ? "დეტალები" : "Details", path: "/therapy" },
      });
    }

    // AI tip based on context
    const tips = language === "ka"
      ? [
          "რეგულარული თერაპიის ჩანაწერები ეხმარება პროგრესის თვალყურის დევნებას",
          "დოკუმენტების ატვირთვა AI ანალიზს უფრო ზუსტს ხდის",
          "კალენდარში ვიზიტების დამატება გეხმარებათ ორგანიზებაში",
        ]
      : [
          "Regular therapy logs help track progress over time",
          "Uploading documents makes AI analysis more accurate",
          "Adding appointments to calendar helps you stay organized",
        ];

    result.push({
      id: "ai-tip",
      type: "tip",
      icon: Lightbulb,
      title: language === "ka" ? "AI რჩევა" : "AI Tip",
      description: tips[Math.floor(Math.random() * tips.length)],
    });

    // Tomorrow reminder if appointments
    if (todayStats.tomorrowAppointments.length > 0) {
      result.push({
        id: "tomorrow",
        type: "reminder",
        icon: Bell,
        title: language === "ka" ? "ხვალინდელი გეგმა" : "Tomorrow's Plan",
        description: language === "ka"
          ? `ხვალ გაქვთ ${todayStats.tomorrowAppointments.length} ვიზიტი დაგეგმილი`
          : `You have ${todayStats.tomorrowAppointments.length} appointment${todayStats.tomorrowAppointments.length > 1 ? "s" : ""} scheduled`,
      });
    }

    return result;
  }, [hasChildren, todayStats, language]);

  // Get greeting message
  const getGreetingMessage = () => {
    const hour = new Date().getHours();
    if (!hasChildren) {
      return language === "ka"
        ? "მოგესალმებით! დაიწყეთ თქვენი შვილის პროფილის შექმნით."
        : "Welcome! Start by creating your child's profile.";
    }

    const childName = primaryChild?.firstName || "";

    if (hour < 12) {
      return language === "ka"
        ? `${childName}-ს დღევანდელი გეგმა მზადაა.`
        : `${childName}'s daily plan is ready.`;
    } else if (hour < 18) {
      return language === "ka"
        ? `${childName}-ს დღეს ${todayStats.upcomingCount} აქტივობა აქვს.`
        : `${childName} has ${todayStats.upcomingCount} activities today.`;
    } else {
      return language === "ka"
        ? `${childName}-ს დღევანდელი დღე კარგად წავიდა.`
        : `${childName} had a good day today.`;
    }
  };

  const getInsightColor = (type: Insight["type"]) => {
    switch (type) {
      case "success":
        return "text-green-600 bg-green-500/10";
      case "reminder":
        return "text-blue-600 bg-blue-500/10";
      case "tip":
        return "text-amber-600 bg-amber-500/10";
      case "alert":
        return "text-red-600 bg-red-500/10";
      default:
        return "text-primary bg-primary/10";
    }
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 via-primary/3 to-transparent overflow-hidden">
      <CardContent className="p-0">
        {/* Main Brief Header */}
        <div className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            <div className="p-2.5 rounded-full bg-primary/10 ring-2 ring-primary/20">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold">
                  {language === "ka" ? "AI დღის მიმოხილვა" : "AI Daily Brief"}
                </h3>
                <Badge variant="secondary" className="text-xs gap-1">
                  <Zap className="h-3 w-3" />
                  {language === "ka" ? "პერსონალიზებული" : "Personalized"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {getGreetingMessage()}
              </p>

              {/* Quick Stats */}
              {hasChildren && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <div className="flex items-center gap-1.5 text-sm">
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">{todayStats.todayAppointments.length}</span>
                    <span className="text-muted-foreground">
                      {language === "ka" ? "ვიზიტი" : "appt"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Activity className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{todayStats.activeTherapies.length}</span>
                    <span className="text-muted-foreground">
                      {language === "ka" ? "თერაპია" : "therapy"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm">
                    <Target className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">{todayStats.weekProgress}%</span>
                    <span className="text-muted-foreground">
                      {language === "ka" ? "კვირის პროგრესი" : "week"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Expand/Collapse Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="shrink-0"
              data-testid="daily-brief-expand"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  {language === "ka" ? "დახურვა" : "Less"}
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  {language === "ka" ? "მეტი" : "More"}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <Separator />
              <div className="p-4 md:p-6 space-y-4">
                {/* Insights Grid */}
                <div className="grid gap-3 sm:grid-cols-2">
                  {insights.map((insight) => (
                    <motion.div
                      key={insight.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                    >
                      <div className={cn("p-2 rounded-lg", getInsightColor(insight.type))}>
                        <insight.icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {insight.description}
                        </p>
                        {insight.action && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 mt-1 text-xs"
                            onClick={() => onNavigate?.(insight.action!.path)}
                          >
                            {insight.action.label}
                            <ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Weekly Progress Bar */}
                {hasChildren && (
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">
                        {language === "ka" ? "კვირის პროგრესი" : "Weekly Progress"}
                      </span>
                      <span className="font-medium">{todayStats.weekProgress}%</span>
                    </div>
                    <Progress value={todayStats.weekProgress} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {language === "ka"
                        ? "თერაპიული გეგმის შესრულება ამ კვირაში"
                        : "Therapy plan completion this week"}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.("/assistant")}
                    className="gap-2"
                  >
                    <Brain className="h-4 w-4" />
                    {language === "ka" ? "AI-სთან საუბარი" : "Chat with AI"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.("/therapy")}
                    className="gap-2"
                  >
                    <Activity className="h-4 w-4" />
                    {language === "ka" ? "თერაპიები" : "Therapies"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigate?.("/calendar")}
                    className="gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    {language === "ka" ? "კალენდარი" : "Calendar"}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
