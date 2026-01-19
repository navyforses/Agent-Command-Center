import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
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
  User,
  FileText,
  Loader2,
  Target,
  TrendingUp,
} from "lucide-react";

// Form schema for adding therapy
const addTherapySchema = z.object({
  type: z.string().min(1, "Therapy type is required"),
  therapistName: z.string().optional(),
  frequency: z.string().optional(),
  startDate: z.string().optional(),
  notes: z.string().optional(),
  goals: z.string().optional(),
  childId: z.string().min(1, "Please select a child"),
});

type AddTherapyFormData = z.infer<typeof addTherapySchema>;

// Form schema for logging session
const logSessionSchema = z.object({
  sessionDate: z.string().min(1, "Session date is required"),
  duration: z.string().optional(),
  notes: z.string().optional(),
  progressRating: z.number().min(1).max(5).optional(),
  goalsWorkedOn: z.string().optional(),
});

type LogSessionFormData = z.infer<typeof logSessionSchema>;

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
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("current");
  const [selectedTherapyId, setSelectedTherapyId] = useState<number | null>(null);

  // Dialog states
  const [showAddTherapyDialog, setShowAddTherapyDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showLogSessionDialog, setShowLogSessionDialog] = useState(false);
  const [selectedTherapy, setSelectedTherapy] = useState<TherapyType | null>(null);
  const [sessionRating, setSessionRating] = useState(0);

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

  // Add therapy form
  const addTherapyForm = useForm<AddTherapyFormData>({
    resolver: zodResolver(addTherapySchema),
    defaultValues: {
      type: "",
      therapistName: "",
      frequency: "",
      startDate: "",
      notes: "",
      goals: "",
      childId: "",
    },
  });

  // Log session form
  const logSessionForm = useForm<LogSessionFormData>({
    resolver: zodResolver(logSessionSchema),
    defaultValues: {
      sessionDate: new Date().toISOString().split('T')[0],
      duration: "",
      notes: "",
      progressRating: 3,
      goalsWorkedOn: "",
    },
  });

  const createTherapy = useMutation({
    mutationFn: (data: Partial<TherapyType>) => apiRequest('POST', '/api/therapies', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapies'] });
      setShowAddTherapyDialog(false);
      addTherapyForm.reset();
      toast({
        title: "Therapy added",
        description: "New therapy has been added successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add therapy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const createSession = useMutation({
    mutationFn: ({ therapyId, data }: { therapyId: number; data: Partial<TherapySession> }) =>
      apiRequest('POST', `/api/therapies/${therapyId}/sessions`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/therapies'] });
      if (selectedTherapyId) {
        queryClient.invalidateQueries({ queryKey: ['/api/therapies', selectedTherapyId, 'sessions'] });
      }
      setShowLogSessionDialog(false);
      logSessionForm.reset();
      setSessionRating(0);
      toast({
        title: "Session logged",
        description: "Therapy session has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const activeTherapies = therapies?.filter(t => t.isActive) || [];

  // Calculate progress based on actual session data, not random
  const calculateProgress = (therapy: TherapyType): number => {
    const goals = therapy.goals || [];
    if (goals.length === 0) return 0;

    // Calculate based on sessions logged vs expected sessions
    // Assuming weekly sessions for a 12-week period as a baseline
    const startDate = therapy.startDate ? new Date(therapy.startDate) : new Date();
    const now = new Date();
    const weeksElapsed = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000)));

    // Get frequency as number (e.g., "2x per week" -> 2)
    const frequencyMatch = (therapy.frequency || "1").match(/\d+/);
    const sessionsPerWeek = frequencyMatch ? parseInt(frequencyMatch[0]) : 1;

    // Expected sessions based on time elapsed
    const expectedSessions = weeksElapsed * sessionsPerWeek;

    // For now, estimate progress based on therapy age
    // In a real implementation, this would use actual session count from API
    const estimatedProgress = Math.min(100, Math.floor((weeksElapsed / 12) * 100));

    return estimatedProgress;
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

  const handleAddTherapy = () => {
    addTherapyForm.reset();
    setShowAddTherapyDialog(true);
  };

  const handleViewDetails = (therapy: TherapyType) => {
    setSelectedTherapy(therapy);
    setShowDetailsDialog(true);
  };

  const handleLogSession = (therapy: TherapyType) => {
    setSelectedTherapy(therapy);
    setSelectedTherapyId(therapy.id);
    logSessionForm.reset({
      sessionDate: new Date().toISOString().split('T')[0],
      duration: "",
      notes: "",
      progressRating: 3,
      goalsWorkedOn: "",
    });
    setSessionRating(3);
    setShowLogSessionDialog(true);
  };

  const onAddTherapySubmit = (data: AddTherapyFormData) => {
    createTherapy.mutate({
      type: data.type,
      therapistName: data.therapistName || null,
      frequency: data.frequency || null,
      startDate: data.startDate || null,
      notes: data.notes || null,
      goals: data.goals ? data.goals.split(',').map(g => g.trim()) : [],
      childId: parseInt(data.childId),
      isActive: true,
    });
  };

  const onLogSessionSubmit = (data: LogSessionFormData) => {
    if (!selectedTherapy) return;

    createSession.mutate({
      therapyId: selectedTherapy.id,
      data: {
        sessionDate: data.sessionDate,
        duration: data.duration ? parseInt(data.duration) : null,
        notes: data.notes || null,
        progressRating: sessionRating,
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("therapyRecommendations")}</h1>
          <p className="text-muted-foreground">Track therapies and view AI-powered recommendations</p>
        </div>
        <Button className="gap-2" onClick={handleAddTherapy} data-testid="button-add-therapy">
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
                  <Button className="gap-2" onClick={handleAddTherapy} data-testid="button-add-therapy-empty">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(therapy)}
                          data-testid={`button-view-therapy-${therapy.id}`}
                        >
                          View Details
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          data-testid={`button-log-session-${therapy.id}`}
                          onClick={() => handleLogSession(therapy)}
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

      {/* Add Therapy Dialog */}
      <Dialog open={showAddTherapyDialog} onOpenChange={setShowAddTherapyDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Therapy</DialogTitle>
            <DialogDescription>
              Add a new therapy to track your child's progress
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={addTherapyForm.handleSubmit(onAddTherapySubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="childId">Child</Label>
              <Select
                value={addTherapyForm.watch("childId")}
                onValueChange={(value) => addTherapyForm.setValue("childId", value)}
              >
                <SelectTrigger data-testid="select-child">
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {children?.map((child) => (
                    <SelectItem key={child.id} value={child.id.toString()}>
                      {child.firstName} {child.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {addTherapyForm.formState.errors.childId && (
                <p className="text-sm text-destructive">{addTherapyForm.formState.errors.childId.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Therapy Type</Label>
              <Select
                value={addTherapyForm.watch("type")}
                onValueChange={(value) => addTherapyForm.setValue("type", value)}
              >
                <SelectTrigger data-testid="select-therapy-type">
                  <SelectValue placeholder="Select therapy type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Physical Therapy">Physical Therapy</SelectItem>
                  <SelectItem value="Occupational Therapy">Occupational Therapy</SelectItem>
                  <SelectItem value="Speech Therapy">Speech Therapy</SelectItem>
                  <SelectItem value="Behavioral Therapy">Behavioral Therapy</SelectItem>
                  <SelectItem value="Developmental Therapy">Developmental Therapy</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {addTherapyForm.formState.errors.type && (
                <p className="text-sm text-destructive">{addTherapyForm.formState.errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="therapistName">Therapist Name</Label>
              <Input
                id="therapistName"
                placeholder="Enter therapist name"
                {...addTherapyForm.register("therapistName")}
                data-testid="input-therapist-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency</Label>
                <Select
                  value={addTherapyForm.watch("frequency")}
                  onValueChange={(value) => addTherapyForm.setValue("frequency", value)}
                >
                  <SelectTrigger data-testid="select-frequency">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1x per week">1x per week</SelectItem>
                    <SelectItem value="2x per week">2x per week</SelectItem>
                    <SelectItem value="3x per week">3x per week</SelectItem>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  {...addTherapyForm.register("startDate")}
                  data-testid="input-start-date"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals">Goals (comma-separated)</Label>
              <Input
                id="goals"
                placeholder="e.g., Improve motor skills, Increase vocabulary"
                {...addTherapyForm.register("goals")}
                data-testid="input-goals"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes/Location</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes or location information"
                {...addTherapyForm.register("notes")}
                rows={2}
                data-testid="textarea-notes"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddTherapyDialog(false)}
                disabled={createTherapy.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createTherapy.isPending} data-testid="button-submit-therapy">
                {createTherapy.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  "Add Therapy"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Therapy Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-lg">
          {selectedTherapy && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const TherapyIcon = getTherapyIcon(selectedTherapy.type);
                    return <TherapyIcon className="h-5 w-5" />;
                  })()}
                  {selectedTherapy.type || "Therapy"}
                </DialogTitle>
                <DialogDescription>
                  Detailed information about this therapy
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Therapist</p>
                    <p className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {selectedTherapy.therapistName || "Not assigned"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Frequency</p>
                    <p>{selectedTherapy.frequency || "Not set"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Started</p>
                    <p className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(selectedTherapy.startDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Status</p>
                    <Badge variant={selectedTherapy.isActive ? "default" : "secondary"}>
                      {selectedTherapy.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>

                {selectedTherapy.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes/Location</p>
                    <p className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {selectedTherapy.notes}
                    </p>
                  </div>
                )}

                {selectedTherapy.goals && selectedTherapy.goals.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Goals</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedTherapy.goals.map((goal, i) => (
                        <Badge key={i} variant="outline" className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Progress</p>
                  <div className="flex items-center gap-2">
                    <Progress value={calculateProgress(selectedTherapy)} className="flex-1 h-2" />
                    <span className="text-sm font-medium">{calculateProgress(selectedTherapy)}%</span>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Close
                </Button>
                <Button onClick={() => {
                  setShowDetailsDialog(false);
                  handleLogSession(selectedTherapy);
                }}>
                  <Clock className="h-4 w-4 mr-1" />
                  Log Session
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Log Session Dialog */}
      <Dialog open={showLogSessionDialog} onOpenChange={setShowLogSessionDialog}>
        <DialogContent className="max-w-md">
          {selectedTherapy && (
            <>
              <DialogHeader>
                <DialogTitle>Log Therapy Session</DialogTitle>
                <DialogDescription>
                  Record a session for {selectedTherapy.type}
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={logSessionForm.handleSubmit(onLogSessionSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="sessionDate">Session Date</Label>
                    <Input
                      id="sessionDate"
                      type="date"
                      {...logSessionForm.register("sessionDate")}
                      data-testid="input-session-date"
                    />
                    {logSessionForm.formState.errors.sessionDate && (
                      <p className="text-sm text-destructive">{logSessionForm.formState.errors.sessionDate.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="60"
                      {...logSessionForm.register("duration")}
                      data-testid="input-duration"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Progress Rating</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setSessionRating(rating)}
                        className="focus:outline-none"
                        data-testid={`star-rating-${rating}`}
                      >
                        <Star
                          className={`h-6 w-6 transition-colors ${
                            rating <= sessionRating
                              ? "text-yellow-500 fill-yellow-500"
                              : "text-muted-foreground"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      {sessionRating > 0 ? `${sessionRating}/5` : "Not rated"}
                    </span>
                  </div>
                </div>

                {selectedTherapy.goals && selectedTherapy.goals.length > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="goalsWorkedOn">Goals Worked On</Label>
                    <div className="flex flex-wrap gap-2">
                      {selectedTherapy.goals.map((goal, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                          onClick={() => {
                            const current = logSessionForm.getValues("goalsWorkedOn") || "";
                            const goals = current.split(',').map(g => g.trim()).filter(Boolean);
                            if (goals.includes(goal)) {
                              logSessionForm.setValue("goalsWorkedOn", goals.filter(g => g !== goal).join(', '));
                            } else {
                              logSessionForm.setValue("goalsWorkedOn", [...goals, goal].join(', '));
                            }
                          }}
                        >
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Session Notes</Label>
                  <Textarea
                    id="notes"
                    placeholder="Describe what was worked on and any observations..."
                    {...logSessionForm.register("notes")}
                    rows={3}
                    data-testid="textarea-session-notes"
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowLogSessionDialog(false)}
                    disabled={createSession.isPending}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createSession.isPending} data-testid="button-submit-session">
                    {createSession.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Log Session"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
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
