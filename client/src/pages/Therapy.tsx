import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Activity,
  Brain,
  Calendar,
  Clock,
  Heart,
  MapPin,
  Plus,
  Sparkles,
  Star,
  TrendingUp,
  User,
} from "lucide-react";

// todo: remove mock functionality
const mockTherapies = [
  {
    id: "1",
    name: "Physical Therapy",
    provider: "Dr. Natia Gabisonia",
    location: "Tbilisi Rehabilitation Center",
    frequency: "3x per week",
    nextSession: "Dec 10, 2025 at 10:00 AM",
    progress: 65,
    goals: ["Improve gross motor skills", "Increase muscle strength", "Enhance balance"],
    icon: Activity,
  },
  {
    id: "2",
    name: "Occupational Therapy",
    provider: "Dr. Mariam Kvaratskhelia",
    location: "Child Development Center",
    frequency: "2x per week",
    nextSession: "Dec 11, 2025 at 2:00 PM",
    progress: 45,
    goals: ["Fine motor development", "Daily living skills", "Sensory integration"],
    icon: Heart,
  },
  {
    id: "3",
    name: "Speech Therapy",
    provider: "Dr. Nino Berishvili",
    location: "Speech & Language Clinic",
    frequency: "2x per week",
    nextSession: "Dec 12, 2025 at 11:00 AM",
    progress: 55,
    goals: ["Improve communication", "Swallowing exercises", "Language development"],
    icon: Brain,
  },
];

const mockRecommendations = [
  {
    id: "1",
    title: "Increase Physical Therapy Frequency",
    description: "Based on recent progress notes, increasing PT to 4x/week may accelerate gross motor development.",
    priority: "high",
    source: "AI Analysis",
  },
  {
    id: "2",
    title: "Consider Aquatic Therapy",
    description: "Water-based exercises can complement current PT and reduce stress on joints while building strength.",
    priority: "medium",
    source: "Research Database",
  },
  {
    id: "3",
    title: "Add Constraint-Induced Movement Therapy",
    description: "CIMT has shown promising results for children with HIE to improve affected limb function.",
    priority: "medium",
    source: "Clinical Guidelines",
  },
];

const mockSessions = [
  { id: "1", date: "Dec 5, 2025", type: "Physical Therapy", notes: "Good progress on balance exercises", rating: 4 },
  { id: "2", date: "Dec 4, 2025", type: "Speech Therapy", notes: "New vocabulary words introduced", rating: 5 },
  { id: "3", date: "Dec 3, 2025", type: "Occupational Therapy", notes: "Worked on fine motor skills", rating: 4 },
];

export default function Therapy() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("current");

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("therapyRecommendations")}</h1>
          <p className="text-muted-foreground">Track therapies and view AI-powered recommendations</p>
        </div>
        <Button className="gap-2" data-testid="button-add-therapy">
          <Plus className="h-4 w-4" />
          Add Therapy
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="current" data-testid="tab-current">Current Therapies</TabsTrigger>
          <TabsTrigger value="recommendations" data-testid="tab-recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="history" data-testid="tab-history">Session History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4 mt-4">
          <div className="grid gap-4">
            {mockTherapies.map((therapy) => (
              <Card key={therapy.id} data-testid={`card-therapy-${therapy.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-md">
                        <therapy.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{therapy.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {therapy.provider}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant="secondary">{therapy.frequency}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      {therapy.location}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Next: {therapy.nextSession}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress toward goals</span>
                      <span className="font-medium">{therapy.progress}%</span>
                    </div>
                    <Progress value={therapy.progress} className="h-2" />
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">Goals:</p>
                    <div className="flex flex-wrap gap-2">
                      {therapy.goals.map((goal, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" data-testid={`button-view-therapy-${therapy.id}`}>
                      View Details
                    </Button>
                    <Button variant="outline" size="sm" data-testid={`button-log-session-${therapy.id}`}>
                      <Clock className="h-4 w-4 mr-1" />
                      Log Session
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI-Powered Recommendations
              </CardTitle>
              <CardDescription>
                Personalized therapy suggestions based on your child's progress and latest research
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {mockRecommendations.map((rec) => (
                <div
                  key={rec.id}
                  className="p-4 rounded-md border space-y-2"
                  data-testid={`rec-${rec.id}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      <h3 className="font-medium">{rec.title}</h3>
                    </div>
                    <Badge
                      variant={rec.priority === "high" ? "destructive" : "secondary"}
                    >
                      {rec.priority} priority
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">Source: {rec.source}</span>
                    <Button size="sm" variant="outline" data-testid={`button-learn-more-${rec.id}`}>
                      Learn More
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sessions</CardTitle>
              <CardDescription>Log of past therapy sessions and notes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between p-3 rounded-md border"
                    data-testid={`session-${session.id}`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{session.type}</Badge>
                        <span className="text-sm text-muted-foreground">{session.date}</span>
                      </div>
                      <p className="text-sm">{session.notes}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < session.rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
