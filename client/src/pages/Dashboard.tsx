import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  FileText,
  Calendar,
  Activity,
  Pill,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  Sparkles,
  Sun,
  Moon,
  Sunrise,
  TrendingUp,
  AlertCircle,
  MessageSquare,
  Upload,
  Baby,
  BookOpen,
} from "lucide-react";
import { DocumentUploadZone } from "@/components/dashboard/DocumentUploadZone";
import { SmartOnboarding } from "@/components/onboarding/SmartOnboarding";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import type { Child, Appointment, Therapy } from "@shared/schema";
import { format, isToday, isTomorrow, differenceInHours } from "date-fns";

// Get greeting based on time of day
function getGreeting(language: string): { text: string; icon: React.ElementType } {
  const hour = new Date().getHours();
  if (hour < 12) {
    return {
      text: language === "ka" ? "დილა მშვიდობისა" : "Good morning",
      icon: Sunrise,
    };
  } else if (hour < 18) {
    return {
      text: language === "ka" ? "შუადღე მშვიდობისა" : "Good afternoon",
      icon: Sun,
    };
  } else {
    return {
      text: language === "ka" ? "საღამო მშვიდობისა" : "Good evening",
      icon: Moon,
    };
  }
}

// Task item component
function TaskItem({
  title,
  time,
  completed,
  type,
  onToggle,
}: {
  title: string;
  time?: string;
  completed: boolean;
  type: "medication" | "therapy" | "appointment";
  onToggle?: () => void;
}) {
  const typeConfig = {
    medication: { color: "text-blue-500", bg: "bg-blue-500/10" },
    therapy: { color: "text-green-500", bg: "bg-green-500/10" },
    appointment: { color: "text-purple-500", bg: "bg-purple-500/10" },
  };

  const config = typeConfig[type];

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        completed ? "opacity-60" : "hover:bg-muted/50"
      }`}
    >
      <button
        onClick={onToggle}
        className={`flex-shrink-0 ${config.color}`}
        aria-label={completed ? "Mark as incomplete" : "Mark as complete"}
      >
        {completed ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`font-medium ${completed ? "line-through" : ""}`}>{title}</p>
        {time && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {time}
          </p>
        )}
      </div>
      <Badge variant="outline" className={`${config.bg} ${config.color} border-0`}>
        {type === "medication" ? <Pill className="h-3 w-3" /> :
         type === "therapy" ? <Activity className="h-3 w-3" /> :
         <Calendar className="h-3 w-3" />}
      </Badge>
    </div>
  );
}

// Quick action button component
function QuickActionButton({
  icon: Icon,
  label,
  onClick,
  color = "default",
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: "default" | "primary" | "success" | "warning";
}) {
  const colorClasses = {
    default: "hover:bg-muted",
    primary: "hover:bg-primary/10 text-primary",
    success: "hover:bg-green-500/10 text-green-600",
    warning: "hover:bg-orange-500/10 text-orange-600",
  };

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-colors ${colorClasses[color]}`}
    >
      <div className={`p-3 rounded-full bg-muted`}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium text-center">{label}</span>
    </button>
  );
}

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showSmartOnboarding, setShowSmartOnboarding] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(new Set());

  const greeting = getGreeting(language);
  const GreetingIcon = greeting.icon;

  // Data fetching
  const { data: children, isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const { data: therapies, isLoading: therapiesLoading } = useQuery<Therapy[]>({
    queryKey: ["/api/therapies"],
  });

  const isLoading = childrenLoading || appointmentsLoading || therapiesLoading;

  const userName = user?.firstName || (language === "ka" ? "მშობელი" : "Parent");
  const childrenList = children || [];
  const hasChildren = childrenList.length > 0;
  const primaryChild = childrenList[0];

  // Generate today's tasks
  const todaysTasks = () => {
    const tasks: Array<{
      id: string;
      title: string;
      time?: string;
      type: "medication" | "therapy" | "appointment";
    }> = [];

    // Add appointments for today
    appointments?.forEach((apt) => {
      const aptDate = new Date(apt.appointmentDate);
      if (isToday(aptDate)) {
        tasks.push({
          id: `apt-${apt.id}`,
          title: apt.title,
          time: format(aptDate, "HH:mm"),
          type: "appointment",
        });
      }
    });

    // Add active therapies as daily tasks
    therapies?.filter(t => t.isActive).slice(0, 2).forEach((therapy) => {
      tasks.push({
        id: `therapy-${therapy.id}`,
        title: therapy.name,
        type: "therapy",
      });
    });

    // Add sample medication tasks if we have children
    if (hasChildren) {
      tasks.push(
        { id: "med-1", title: language === "ka" ? "დილის წამალი" : "Morning medication", time: "09:00", type: "medication" },
        { id: "med-2", title: language === "ka" ? "საღამოს წამალი" : "Evening medication", time: "21:00", type: "medication" }
      );
    }

    return tasks.sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return a.time.localeCompare(b.time);
    });
  };

  // Calculate task completion percentage
  const tasks = todaysTasks();
  const completedCount = tasks.filter((t) => completedTasks.has(t.id)).length;
  const completionPercentage = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  // Get upcoming appointments
  const upcomingAppointments = appointments
    ?.filter((apt) => new Date(apt.appointmentDate) > new Date())
    .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
    .slice(0, 3);

  // Navigation handlers
  const navigateTo = (path: string) => setLocation(path);

  const toggleTask = (taskId: string) => {
    setCompletedTasks((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-32 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6" data-testid="text-page-title">
      {/* Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <GreetingIcon className="h-6 w-6 text-primary" />
            <h1 className="text-2xl md:text-3xl font-bold">
              {greeting.text}, {userName}
            </h1>
          </div>
          {hasChildren && primaryChild && (
            <p className="text-muted-foreground">
              {language === "ka"
                ? `${primaryChild.firstName}-ს დღეს აქვს ${tasks.length} დავალება`
                : `${primaryChild.firstName} has ${tasks.length} tasks today`}
            </p>
          )}
        </div>

        {/* Progress indicator */}
        {tasks.length > 0 && (
          <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-full">
            <div className="text-sm font-medium">
              {completedCount}/{tasks.length}
            </div>
            <Progress value={completionPercentage} className="w-24 h-2" />
            <span className="text-sm text-muted-foreground">
              {language === "ka" ? "შესრულებული" : "completed"}
            </span>
          </div>
        )}
      </div>

      {/* AI Daily Brief */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="p-4 md:p-6">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="font-semibold flex items-center gap-2">
                {language === "ka" ? "AI დღის მიმოხილვა" : "AI Daily Brief"}
                <Badge variant="secondary" className="text-xs">
                  {language === "ka" ? "ახალი" : "New"}
                </Badge>
              </h3>
              <p className="text-sm text-muted-foreground">
                {hasChildren && primaryChild
                  ? language === "ka"
                    ? `${primaryChild.firstName}-ს დღეს აქვს ${
                        upcomingAppointments?.filter((a) => isToday(new Date(a.appointmentDate))).length || 0
                      } ვიზიტი დაგეგმილი. ${
                        therapies?.filter((t) => t.isActive).length || 0
                      } აქტიური თერაპია მიმდინარეობს.`
                    : `${primaryChild.firstName} has ${
                        upcomingAppointments?.filter((a) => isToday(new Date(a.appointmentDate))).length || 0
                      } appointments scheduled today. ${
                        therapies?.filter((t) => t.isActive).length || 0
                      } active therapies in progress.`
                  : language === "ka"
                  ? "დაამატეთ თქვენი შვილის პროფილი პერსონალიზებული რეკომენდაციებისთვის."
                  : "Add your child's profile to get personalized recommendations."}
              </p>
              <Button variant="link" className="p-0 h-auto" onClick={() => navigateTo("/assistant")}>
                {language === "ka" ? "სრული ანალიზის ნახვა" : "View full analysis"}
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Tasks & Actions */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {language === "ka" ? "დღის დავალებები" : "Today's Tasks"}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigateTo("/therapy")}>
                  {language === "ka" ? "ყველას ნახვა" : "View all"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <TaskItem
                    key={task.id}
                    title={task.title}
                    time={task.time}
                    completed={completedTasks.has(task.id)}
                    type={task.type}
                    onToggle={() => toggleTask(task.id)}
                  />
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{language === "ka" ? "დღეს დავალებები არ არის" : "No tasks for today"}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions Grid */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {language === "ka" ? "სწრაფი მოქმედებები" : "Quick Actions"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                  <DialogTrigger asChild>
                    <button className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border transition-colors hover:bg-purple-500/10 text-purple-600">
                      <div className="p-3 rounded-full bg-purple-500/10">
                        <Upload className="h-5 w-5" />
                      </div>
                      <span className="text-sm font-medium text-center">
                        {language === "ka" ? "დოკუმენტი" : "Upload"}
                      </span>
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>
                        {language === "ka" ? "დოკუმენტის ატვირთვა" : "Upload Document"}
                      </DialogTitle>
                    </DialogHeader>
                    <DocumentUploadZone onUploadComplete={() => setShowUploadDialog(false)} />
                  </DialogContent>
                </Dialog>

                <QuickActionButton
                  icon={Calendar}
                  label={language === "ka" ? "ახალი ვიზიტი" : "New Appointment"}
                  onClick={() => navigateTo("/calendar")}
                  color="primary"
                />
                <QuickActionButton
                  icon={MessageSquare}
                  label={language === "ka" ? "AI ჩატი" : "AI Chat"}
                  onClick={() => navigateTo("/assistant")}
                  color="success"
                />
                <QuickActionButton
                  icon={BookOpen}
                  label={language === "ka" ? "კვლევები" : "Research"}
                  onClick={() => navigateTo("/research")}
                  color="warning"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Appointments & Insights */}
        <div className="space-y-6">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  {language === "ka" ? "მომავალი ვიზიტები" : "Upcoming"}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigateTo("/calendar")}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingAppointments && upcomingAppointments.length > 0 ? (
                upcomingAppointments.map((apt) => {
                  const aptDate = new Date(apt.appointmentDate);
                  const isAptToday = isToday(aptDate);
                  const isAptTomorrow = isTomorrow(aptDate);

                  return (
                    <div
                      key={apt.id}
                      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                      onClick={() => navigateTo("/calendar")}
                    >
                      <div className={`p-2 rounded-lg ${isAptToday ? "bg-red-500/10" : "bg-muted"}`}>
                        <Calendar className={`h-4 w-4 ${isAptToday ? "text-red-500" : ""}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{apt.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {isAptToday
                            ? language === "ka"
                              ? "დღეს"
                              : "Today"
                            : isAptTomorrow
                            ? language === "ka"
                              ? "ხვალ"
                              : "Tomorrow"
                            : format(aptDate, "MMM d")}
                          {" • "}
                          {format(aptDate, "HH:mm")}
                        </p>
                      </div>
                      {isAptToday && (
                        <Badge variant="destructive" className="text-xs">
                          {language === "ka" ? "დღეს" : "Today"}
                        </Badge>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">
                    {language === "ka" ? "ვიზიტები არ არის" : "No upcoming appointments"}
                  </p>
                  <Button variant="link" size="sm" onClick={() => navigateTo("/calendar")}>
                    {language === "ka" ? "დაამატე" : "Add one"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Child Quick View */}
          {hasChildren && primaryChild ? (
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => navigateTo(`/child/${primaryChild.id}`)}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Baby className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">
                      {primaryChild.firstName} {primaryChild.lastName}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {primaryChild.diagnosis || (language === "ka" ? "პროფილის ნახვა" : "View profile")}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <CardContent className="p-6 text-center">
                <div className="inline-flex p-3 bg-primary/10 rounded-full mb-3">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h3 className="font-medium mb-1">
                  {language === "ka" ? "სმარტ პროფილის შექმნა" : "Smart Profile Setup"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {language === "ka"
                    ? "ატვირთეთ დოკუმენტი და AI ავტომატურად შეავსებს პროფილს"
                    : "Upload a document and AI will auto-fill the profile"}
                </p>
                <Dialog open={showSmartOnboarding} onOpenChange={setShowSmartOnboarding}>
                  <DialogTrigger asChild>
                    <Button className="w-full gap-2" data-testid="button-smart-onboarding">
                      <Upload className="h-4 w-4" />
                      {language === "ka" ? "დაწყება" : "Get Started"}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <SmartOnboarding
                      onComplete={() => {
                        setShowSmartOnboarding(false);
                        // Refresh children data
                        window.location.reload();
                      }}
                      onCancel={() => {
                        setShowSmartOnboarding(false);
                        navigateTo("/child-profile");
                      }}
                    />
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 w-full text-muted-foreground"
                  onClick={() => navigateTo("/child-profile")}
                >
                  {language === "ka" ? "ხელით შევსება" : "Fill Manually"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* AI Tip */}
          <Card className="border-dashed">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">
                    {language === "ka" ? "AI რჩევა" : "AI Tip"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {language === "ka"
                      ? "ატვირთეთ სამედიცინო დოკუმენტები AI ანალიზისთვის და მიიღეთ პერსონალიზებული რეკომენდაციები."
                      : "Upload medical documents for AI analysis and get personalized recommendations."}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
