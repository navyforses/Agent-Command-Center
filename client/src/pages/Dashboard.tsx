import { useState } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// todo: remove mock functionality
const mockChildren = [
  {
    firstName: "Luka",
    lastName: "Beridze",
    dateOfBirth: "2022-03-15",
    diagnosis: "HIE",
    severity: "moderate" as const,
    gmfcsLevel: 2,
    nextAppointment: "Dec 10, 2025 at 10:00 AM",
    documentsCount: 12,
    therapiesCount: 3,
  },
  {
    firstName: "Mariam",
    lastName: "Beridze",
    dateOfBirth: "2022-03-15",
    diagnosis: "HIE",
    severity: "mild" as const,
    gmfcsLevel: 1,
    nextAppointment: "Dec 12, 2025 at 2:00 PM",
    documentsCount: 8,
    therapiesCount: 2,
  },
];

const mockActivities = [
  {
    id: "1",
    type: "document" as const,
    title: "MRI Report Uploaded",
    description: "Brain MRI scan from Tbilisi Medical Center",
    timestamp: "2 hours ago",
    status: "success" as const,
  },
  {
    id: "2",
    type: "ai_analysis" as const,
    title: "AI Analysis Complete",
    description: "Document analysis for EEG report finished",
    timestamp: "5 hours ago",
    status: "success" as const,
  },
  {
    id: "3",
    type: "therapy" as const,
    title: "Therapy Session Logged",
    description: "Physiotherapy session with Dr. Natia",
    timestamp: "Yesterday",
    status: "info" as const,
  },
  {
    id: "4",
    type: "email" as const,
    title: "Email Sent",
    description: "Inquiry to Boston Children's Hospital",
    timestamp: "2 days ago",
    status: "pending" as const,
  },
];

const mockAppointments = [
  {
    id: "1",
    title: "Physiotherapy Session",
    provider: "Dr. Natia Gabisonia",
    location: "Tbilisi Rehabilitation Center",
    date: "Dec 10, 2025",
    time: "10:00 AM",
    type: "therapy" as const,
  },
  {
    id: "2",
    title: "Neurology Follow-up",
    provider: "Dr. Giorgi Khabeishvili",
    location: "Iashvili Children's Hospital",
    date: "Dec 15, 2025",
    time: "2:30 PM",
    type: "medical" as const,
  },
];

const mockInsights = [
  {
    id: "1",
    title: "New Clinical Trial Available",
    description: "A phase 2 trial for erythropoietin therapy matches your child's profile with 85% eligibility.",
    priority: "high" as const,
    actionLabel: "View Trial Details",
  },
  {
    id: "2",
    title: "Therapy Frequency Recommendation",
    description: "Based on recent progress notes, increasing physiotherapy to 3x/week may accelerate motor development.",
    priority: "medium" as const,
    actionLabel: "Learn More",
  },
];

interface DashboardProps {
  user?: {
    firstName?: string;
    lastName?: string;
  };
}

export default function Dashboard({ user }: DashboardProps) {
  const { t } = useLanguage();
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const userName = user?.firstName || "Parent";

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
              <DocumentUploadZone onFilesSelected={() => setShowUploadDialog(false)} />
            </DialogContent>
          </Dialog>
          <Button className="gap-2" data-testid="button-add-child">
            <Plus className="h-4 w-4" />
            {t("addChild")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Documents"
          value={20}
          description="Across all children"
          icon={FileText}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title="Active Therapies"
          value={5}
          description="This month"
          icon={Activity}
        />
        <StatCard
          title="Appointments"
          value={mockAppointments.length}
          description="Upcoming this week"
          icon={Calendar}
        />
        <StatCard
          title="Children"
          value={mockChildren.length}
          icon={Users}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-4">{t("childProfile")}s</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {mockChildren.map((child, i) => (
                <ChildCard
                  key={i}
                  {...child}
                  onClick={() => console.log("View child:", child.firstName)}
                />
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <RecentActivity activities={mockActivities} />
            <UpcomingAppointments
              appointments={mockAppointments}
              onAddAppointment={() => console.log("Add appointment")}
            />
          </div>
        </div>

        <div className="space-y-6">
          <AIInsightsCard
            insights={mockInsights}
            onViewInsight={(id) => console.log("View insight:", id)}
          />
          <AIChatPanel childName={mockChildren[0]?.firstName} />
        </div>
      </div>
    </div>
  );
}
