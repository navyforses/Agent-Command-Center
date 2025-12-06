import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Calendar,
  Activity,
  FileText,
  Brain,
  Eye,
  Ear,
  Zap,
  Edit,
  Plus,
  CheckCircle,
  Circle,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// todo: remove mock functionality
const mockChild = {
  firstName: "Luka",
  lastName: "Beridze",
  dateOfBirth: "2022-03-15",
  gestationalAge: 38,
  birthWeight: 3200,
  apgarOneMin: 3,
  apgarFiveMin: 6,
  primaryDiagnosis: "HIE",
  severity: "moderate",
  sarnatStage: 2,
  additionalDx: ["Developmental Delay", "Hypotonia"],
  gmfcsLevel: 2,
  cfcsLevel: 2,
  edacsLevel: 2,
  visionStatus: "Cortical Visual Impairment - Mild",
  hearingStatus: "Normal",
  seizureStatus: "Controlled with medication",
};

const mockTherapies = [
  { type: "Physiotherapy", provider: "Dr. Natia Gabisonia", frequency: "3x/week", isActive: true },
  { type: "Occupational Therapy", provider: "Maia Lomidze", frequency: "2x/week", isActive: true },
  { type: "Speech Therapy", provider: "Nino Kvirikashvili", frequency: "2x/week", isActive: true },
  { type: "Hydrotherapy", provider: "Aqua Therapy Center", frequency: "1x/week", isActive: false },
];

const mockMilestones = [
  { category: "Motor", description: "Holds head steady", status: "achieved", achievedDate: "Sep 2022" },
  { category: "Motor", description: "Rolls over", status: "achieved", achievedDate: "Jan 2023" },
  { category: "Motor", description: "Sits with support", status: "achieved", achievedDate: "Jun 2023" },
  { category: "Motor", description: "Sits independently", status: "in_progress", expectedDate: "Dec 2025" },
  { category: "Motor", description: "Crawling", status: "not_started", expectedDate: "Mar 2026" },
  { category: "Cognitive", description: "Responds to name", status: "achieved", achievedDate: "Aug 2023" },
  { category: "Cognitive", description: "Object permanence", status: "in_progress", expectedDate: "Jan 2026" },
  { category: "Speech", description: "Babbling", status: "achieved", achievedDate: "Dec 2022" },
  { category: "Speech", description: "First words", status: "in_progress", expectedDate: "Feb 2026" },
];

export default function ChildProfile() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    const totalMonths = years * 12 + months;
    if (years === 0) {
      return `${months} months`;
    }
    return `${years} years, ${months >= 0 ? months : 12 + months} months (${totalMonths} months)`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "achieved": return <CheckCircle className="h-4 w-4 text-chart-2" />;
      case "in_progress": return <Clock className="h-4 w-4 text-chart-4" />;
      default: return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const achievedCount = mockMilestones.filter(m => m.status === "achieved").length;
  const progressPercent = (achievedCount / mockMilestones.length) * 100;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
              {mockChild.firstName[0]}{mockChild.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold">{mockChild.firstName} {mockChild.lastName}</h1>
            <p className="text-muted-foreground">{calculateAge(mockChild.dateOfBirth)}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="default">{mockChild.severity} {mockChild.primaryDiagnosis}</Badge>
              <Badge variant="outline">GMFCS Level {mockChild.gmfcsLevel}</Badge>
              <Badge variant="outline">Sarnat Stage {mockChild.sarnatStage}</Badge>
            </div>
          </div>
        </div>
        <Button variant="outline" className="gap-2" data-testid="button-edit-profile">
          <Edit className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="medical" data-testid="tab-medical">Medical Info</TabsTrigger>
          <TabsTrigger value="therapies" data-testid="tab-therapies">Therapies</TabsTrigger>
          <TabsTrigger value="milestones" data-testid="tab-milestones">{t("milestones")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-1/10 rounded-md">
                    <Calendar className="h-5 w-5 text-chart-1" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Birth Date</p>
                    <p className="font-medium">{new Date(mockChild.dateOfBirth).toLocaleDateString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-2/10 rounded-md">
                    <Activity className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Therapies</p>
                    <p className="font-medium">{mockTherapies.filter(t => t.isActive).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-3/10 rounded-md">
                    <FileText className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Documents</p>
                    <p className="font-medium">12</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-4/10 rounded-md">
                    <Brain className="h-5 w-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Milestones</p>
                    <p className="font-medium">{achievedCount}/{mockMilestones.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Developmental Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Milestones achieved</span>
                  <span className="font-medium">{Math.round(progressPercent)}%</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medical" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Birth Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gestational Age</span>
                  <span className="font-medium">{mockChild.gestationalAge} weeks</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Birth Weight</span>
                  <span className="font-medium">{mockChild.birthWeight}g</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">APGAR (1 min)</span>
                  <span className="font-medium">{mockChild.apgarOneMin}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">APGAR (5 min)</span>
                  <span className="font-medium">{mockChild.apgarFiveMin}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Functional Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GMFCS Level</span>
                  <Badge variant="outline">Level {mockChild.gmfcsLevel}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CFCS Level</span>
                  <Badge variant="outline">Level {mockChild.cfcsLevel}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">EDACS Level</span>
                  <Badge variant="outline">Level {mockChild.edacsLevel}</Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sensory & Neurological</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <Eye className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Vision</p>
                    <p className="text-sm text-muted-foreground">{mockChild.visionStatus}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Ear className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Hearing</p>
                    <p className="text-sm text-muted-foreground">{mockChild.hearingStatus}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Zap className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Seizures</p>
                    <p className="text-sm text-muted-foreground">{mockChild.seizureStatus}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Additional Diagnoses</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {mockChild.additionalDx.map((dx, i) => (
                    <Badge key={i} variant="secondary">{dx}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="therapies" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Current Therapies</h3>
            <Button className="gap-2" data-testid="button-add-therapy">
              <Plus className="h-4 w-4" />
              Add Therapy
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            {mockTherapies.map((therapy, i) => (
              <Card key={i} data-testid={`therapy-card-${i}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-accent rounded-md">
                        <Activity className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div>
                        <h4 className="font-medium">{therapy.type}</h4>
                        <p className="text-sm text-muted-foreground">{therapy.provider}</p>
                        <p className="text-sm text-muted-foreground">{therapy.frequency}</p>
                      </div>
                    </div>
                    <Badge variant={therapy.isActive ? "default" : "secondary"}>
                      {therapy.isActive ? "Active" : "Paused"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="milestones" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Developmental Milestones</h3>
            <Button className="gap-2" data-testid="button-add-milestone">
              <Plus className="h-4 w-4" />
              Add Milestone
            </Button>
          </div>
          <div className="space-y-4">
            {["Motor", "Cognitive", "Speech"].map((category) => (
              <Card key={category}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{category}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {mockMilestones
                      .filter((m) => m.category === category)
                      .map((milestone, i) => (
                        <div key={i} className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {getStatusIcon(milestone.status)}
                            <span className={milestone.status === "achieved" ? "" : "text-muted-foreground"}>
                              {milestone.description}
                            </span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {milestone.status === "achieved" ? milestone.achievedDate : `Expected: ${milestone.expectedDate}`}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
