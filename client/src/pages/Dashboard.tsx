import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Plus, FileText, Users, Calendar, Activity } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { ChildCard } from "@/components/dashboard/ChildCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { UpcomingAppointments } from "@/components/dashboard/UpcomingAppointments";
import { AIInsightsCard } from "@/components/dashboard/AIInsightsCard";
import { DocumentUploadZone } from "@/components/dashboard/DocumentUploadZone";
import { AIChatPanel } from "@/components/dashboard/AIChatPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Child, Appointment, Document, Therapy } from "@shared/schema";
import { format } from "date-fns";

export default function Dashboard() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  // Navigation handlers
  const navigateToChildren = () => setLocation("/children");
  const navigateToChild = (childId: number) => setLocation(`/child/${childId}`);
  const navigateToCalendar = () => setLocation("/calendar");
  const navigateToDocuments = () => setLocation("/documents");
  const navigateToTherapy = () => setLocation("/therapy");

  const { data: children, isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ['/api/children']
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments']
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents']
  });

  const { data: therapies, isLoading: therapiesLoading } = useQuery<Therapy[]>({
    queryKey: ['/api/therapies']
  });

  const isLoading = childrenLoading || appointmentsLoading || documentsLoading || therapiesLoading;

  const userName = user?.firstName || "Parent";

  const getNextAppointmentForChild = (childId: number): string | undefined => {
    if (!appointments) return undefined;
    const childAppointments = appointments
      .filter(apt => apt.childId === childId && new Date(apt.appointmentDate) > new Date())
      .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime());
    
    if (childAppointments.length === 0) return undefined;
    const nextApt = childAppointments[0];
    return format(new Date(nextApt.appointmentDate), "MMM d, yyyy 'at' h:mm a");
  };

  const getDocumentsCountForChild = (childId: number): number => {
    if (!documents) return 0;
    return documents.filter(doc => doc.childId === childId).length;
  };

  const getTherapiesCountForChild = (childId: number): number => {
    if (!therapies) return 0;
    return therapies.filter(t => t.childId === childId && t.isActive).length;
  };

  const transformAppointments = () => {
    if (!appointments) return [];
    const now = new Date();
    return appointments
      .filter(apt => new Date(apt.appointmentDate) > now)
      .sort((a, b) => new Date(a.appointmentDate).getTime() - new Date(b.appointmentDate).getTime())
      .slice(0, 5)
      .map(apt => ({
        id: apt.id.toString(),
        title: apt.title,
        provider: apt.description || "",
        location: apt.location || "",
        date: format(new Date(apt.appointmentDate), "MMM d, yyyy"),
        time: format(new Date(apt.appointmentDate), "h:mm a"),
        type: (apt.status === "therapy" ? "therapy" : apt.status === "consultation" ? "consultation" : "medical") as "therapy" | "medical" | "consultation"
      }));
  };

  const generateRecentActivities = () => {
    const activities: Array<{
      id: string;
      type: "document" | "email" | "appointment" | "ai_analysis" | "therapy";
      title: string;
      description: string;
      timestamp: string;
      status: "success" | "pending" | "info";
    }> = [];

    if (documents && documents.length > 0) {
      const recentDocs = [...documents]
        .sort((a, b) => new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime())
        .slice(0, 2);
      
      recentDocs.forEach((doc, index) => {
        activities.push({
          id: `doc-${doc.id}`,
          type: "document",
          title: `${doc.title} Uploaded`,
          description: doc.category || "Medical document",
          timestamp: doc.uploadedAt ? format(new Date(doc.uploadedAt), "MMM d, yyyy") : "Recently",
          status: doc.aiSummary ? "success" : "pending"
        });
      });
    }

    if (appointments && appointments.length > 0) {
      const recentApts = [...appointments]
        .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
        .slice(0, 2);
      
      recentApts.forEach((apt) => {
        activities.push({
          id: `apt-${apt.id}`,
          type: "appointment",
          title: apt.title,
          description: apt.location || "Upcoming appointment",
          timestamp: format(new Date(apt.appointmentDate), "MMM d, yyyy"),
          status: "info"
        });
      });
    }

    return activities.slice(0, 4);
  };

  const staticInsights = [
    {
      id: "upload-docs",
      title: "Upload Documents for AI Analysis",
      description: "Upload medical records, therapy notes, or assessments to get AI-powered insights and summaries.",
      priority: "medium" as const,
      actionLabel: "Upload Documents",
    },
    {
      id: "track-therapy",
      title: "Track Therapy Progress",
      description: "Log therapy sessions regularly to monitor your child's developmental progress over time.",
      priority: "low" as const,
      actionLabel: "View Therapies",
    },
  ];

  // Handle insight action
  const handleInsightAction = (insightId: string) => {
    switch (insightId) {
      case "upload-docs":
        setShowUploadDialog(true);
        break;
      case "track-therapy":
        navigateToTherapy();
        break;
      default:
        break;
    }
  };

  const upcomingAppointmentsCount = appointments?.filter(
    apt => new Date(apt.appointmentDate) > new Date()
  ).length || 0;

  const activeTherapiesCount = therapies?.filter(t => t.isActive).length || 0;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-4" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="grid md:grid-cols-2 gap-4">
                {[...Array(2)].map((_, i) => (
                  <Card key={i}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-full" />
                        <div>
                          <Skeleton className="h-5 w-32 mb-1" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-9 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <Skeleton className="h-5 w-24" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const childrenList = children || [];
  const hasChildren = childrenList.length > 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("welcome")}, {userName}</h1>
          <p className="text-muted-foreground">{t("manageYourChild")}</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" data-testid="button-upload-document">
                <FileText className="h-4 w-4" />
                {t("uploadDocuments")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{t("uploadDocuments")}</DialogTitle>
              </DialogHeader>
              <DocumentUploadZone onUploadComplete={() => setShowUploadDialog(false)} />
            </DialogContent>
          </Dialog>
          <Button className="gap-2" onClick={navigateToChildren} data-testid="button-add-child">
            <Plus className="h-4 w-4" />
            {t("addChild")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={documents?.length || 0}
          description="Across all children"
          icon={FileText}
        />
        <StatCard
          title="Active Therapies"
          value={activeTherapiesCount}
          description="Currently active"
          icon={Activity}
        />
        <StatCard
          title="Appointments"
          value={upcomingAppointmentsCount}
          description="Upcoming"
          icon={Calendar}
        />
        <StatCard
          title="Children"
          value={childrenList.length}
          icon={Users}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">{t("childProfile")}s</h2>
            {hasChildren ? (
              <div className="grid md:grid-cols-2 gap-4">
                {childrenList.map((child) => (
                  <ChildCard
                    key={child.id}
                    firstName={child.firstName}
                    lastName={child.lastName}
                    dateOfBirth={child.dateOfBirth || ""}
                    diagnosis={child.diagnosis || "Not specified"}
                    severity="moderate"
                    nextAppointment={getNextAppointmentForChild(child.id)}
                    documentsCount={getDocumentsCountForChild(child.id)}
                    therapiesCount={getTherapiesCountForChild(child.id)}
                    onClick={() => navigateToChild(child.id)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                  <h3 className="text-lg font-medium mb-2">No children added yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Add your child's profile to start tracking their medical journey
                  </p>
                  <Button className="gap-2" onClick={navigateToChildren} data-testid="button-add-child-empty">
                    <Plus className="h-4 w-4" />
                    Add Child
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <RecentActivity activities={generateRecentActivities()} />
            <UpcomingAppointments
              appointments={transformAppointments()}
              onAddAppointment={navigateToCalendar}
            />
          </div>
        </div>

        <div className="space-y-6">
          <AIInsightsCard
            insights={staticInsights}
            onViewInsight={handleInsightAction}
          />
          {hasChildren && (
            <AIChatPanel childName={childrenList[0]?.firstName} />
          )}
        </div>
      </div>
    </div>
  );
}
