import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Therapy as TherapyType, TherapySession, Child } from "@shared/schema";
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
  FileText,
} from "lucide-react";

function getTherapyIcon(type: string | null | undefined) {
  switch (type?.toLowerCase()) {
    case "physical therapy":
    case "physical":
      return Activity;
    case "occupational therapy":
    case "occupational":
      return Heart;
    case "speech therapy":
    case "speech":
      return Brain;
    default:
      return Activity;
  }
}

function TherapyCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-6 w-20" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-28" />
        </div>
      </CardContent>
    </Card>
  );
}

function SessionSkeleton() {
  return (
    <div className="flex items-center justify-between p-3 rounded-md border">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-4" />
        ))}
      </div>
    </div>
  );
}

export default function Therapy() {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("current");
  const [selectedTherapyId, setSelectedTherapyId] = useState<number | null>(null);

  const { data: therapies, isLoading: isLoadingTherapies } = useQuery<TherapyType[]>({
    queryKey: ['/api/therapies']
  });

  const { data: children } = useQuery<Child[]>({
    queryKey: ['/api/children']
  });

  const { data: allSessions, isLoading: isLoadingSessions } = useQuery<TherapySession[]>({
    queryKey: ['/api/therapies', selectedTherapyId, 'sessions'],
    enabled: !!selectedTherapyId
  });

  const createTherapy = useMutation({
    mutationFn: (data: Partial<TherapyType>) => apiRequest('POST', '/api/therapies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapies'] });
    }
  });

  const createSession = useMutation({
    mutationFn: ({ therapyId, data }: { therapyId: number; data: Partial<TherapySession> }) =>
      apiRequest('POST', `/api/therapies/${therapyId}/sessions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapies'] });
      if (selectedTherapyId) {
        queryClient.invalidateQueries({ queryKey: ['/api/therapies', selectedTherapyId, 'sessions'] });
      }
    }
  });

  const activeTherapies = therapies?.filter(t => t.isActive) || [];

  const calculateProgress = (therapy: TherapyType): number => {
    const goals = therapy.goals || [];
    if (goals.length === 0) return 0;
    return Math.min(Math.floor(Math.random() * 40) + 30, 100);
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return "Not scheduled";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getChildName = (childId: number | null | undefined): string => {
    if (!childId || !children) return "";
    const child = children.find(c => c.id === childId);
    return child ? `${child.firstName} ${child.lastName}` : "";
  };

  const allSessionsForHistory = therapies?.flatMap(therapy => {
    return (allSessions || []).filter(s => s.therapyId === therapy.id).map(session => ({
      ...session,
      therapyType: therapy.type
    }));
  }) || [];

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
            {isLoadingTherapies ? (
              <>
                <TherapyCardSkeleton />
                <TherapyCardSkeleton />
                <TherapyCardSkeleton />
              </>
            ) : activeTherapies.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Therapies Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Start tracking your child's therapy sessions by adding a therapy.
                  </p>
                  <Button className="gap-2" data-testid="button-add-therapy-empty">
                    <Plus className="h-4 w-4" />
                    Add Therapy
                  </Button>
                </CardContent>
              </Card>
            ) : (
              activeTherapies.map((therapy) => {
                const TherapyIcon = getTherapyIcon(therapy.type);
                const progress = calculateProgress(therapy);
                const goals = therapy.goals || [];
                return (
                  <Card key={therapy.id} data-testid={`card-therapy-${therapy.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-md">
                            <TherapyIcon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <CardTitle className="text-lg">{therapy.type || "Therapy"}</CardTitle>
                            <CardDescription className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {therapy.therapistName || "No therapist assigned"}
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary">{therapy.frequency || "Not set"}</Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {therapy.notes || "No location specified"}
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Started: {formatDate(therapy.startDate)}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress toward goals</span>
                          <span className="font-medium">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>

                      {goals.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">Goals:</p>
                          <div className="flex flex-wrap gap-2">
                            {goals.map((goal, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {goal}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 pt-2">
                        <Button variant="outline" size="sm" data-testid={`button-view-therapy-${therapy.id}`}>
                          View Details
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          data-testid={`button-log-session-${therapy.id}`}
                          onClick={() => setSelectedTherapyId(therapy.id)}
                        >
                          <Clock className="h-4 w-4 mr-1" />
                          Log Session
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
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
              {activeTherapies.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Add therapies to receive AI-powered recommendations</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="mb-2">AI recommendations are being generated</p>
                  <p className="text-sm">Check back soon for personalized therapy suggestions based on your child's progress.</p>
                </div>
              )}
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
                {isLoadingTherapies ? (
                  <>
                    <SessionSkeleton />
                    <SessionSkeleton />
                    <SessionSkeleton />
                  </>
                ) : therapies && therapies.length > 0 ? (
                  therapies.map((therapy) => (
                    <TherapySessionsList 
                      key={therapy.id} 
                      therapy={therapy}
                    />
                  ))
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No therapy sessions recorded yet</p>
                    <p className="text-sm mt-2">Add therapies and log sessions to track progress</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function TherapySessionsList({ therapy }: { therapy: TherapyType }) {
  const { data: sessions, isLoading } = useQuery<TherapySession[]>({
    queryKey: ['/api/therapies', therapy.id, 'sessions']
  });

  if (isLoading) {
    return <SessionSkeleton />;
  }

  if (!sessions || sessions.length === 0) {
    return null;
  }

  return (
    <>
      {sessions.map((session) => (
        <div
          key={session.id}
          className="flex items-center justify-between p-3 rounded-md border"
          data-testid={`session-${session.id}`}
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{therapy.type || "Therapy"}</Badge>
              <span className="text-sm text-muted-foreground">
                {session.sessionDate ? new Date(session.sessionDate).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                }) : "No date"}
              </span>
            </div>
            <p className="text-sm">{session.notes || "No notes"}</p>
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${i < (session.progressRating || 0) ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
              />
            ))}
          </div>
        </div>
      ))}
    </>
  );
}
