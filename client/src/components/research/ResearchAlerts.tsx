/**
 * ResearchAlerts Component
 * =========================
 * P2 Feature: Research monitoring and alert notifications
 * Allows users to set up and manage research alerts
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Bell,
  Plus,
  Search,
  Trash2,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  X,
  Check,
  Loader2,
  Settings,
  Eye,
  EyeOff,
  RefreshCw,
  FlaskConical,
  Newspaper,
  Pill,
  FileText,
} from "lucide-react";

interface ResearchMonitor {
  id: number;
  userId: string;
  patientProfileId?: number;
  isActive: boolean;
  searchKeywords: string[];
  conditions: string[];
  monitorClinicalTrials: boolean;
  monitorPubmed: boolean;
  monitorDrugs: boolean;
  monitorNews: boolean;
  emailNotifications: boolean;
  notificationFrequency: string;
  lastScanAt?: string;
  createdAt: string;
}

interface ResearchFinding {
  id: number;
  monitorId: number;
  findingType: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  relevanceScore: number;
  isRead: boolean;
  isSaved: boolean;
  isDismissed: boolean;
  publishedAt?: string;
  foundAt: string;
}

export default function ResearchAlerts() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newMonitor, setNewMonitor] = useState({
    searchKeywords: "",
    conditions: "",
    monitorClinicalTrials: true,
    monitorPubmed: true,
    monitorDrugs: true,
    monitorNews: true,
    emailNotifications: true,
    notificationFrequency: "daily",
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch monitors
  const { data: monitors = [], isLoading: monitorsLoading } = useQuery<ResearchMonitor[]>({
    queryKey: ["/api/research-alerts/monitors"],
  });

  // Fetch findings
  const { data: findings = [], isLoading: findingsLoading } = useQuery<ResearchFinding[]>({
    queryKey: ["/api/research-alerts/findings"],
  });

  // Fetch unread count
  const { data: unreadData } = useQuery<{ count: number; findings: ResearchFinding[] }>({
    queryKey: ["/api/research-alerts/findings/unread"],
  });

  // Create monitor mutation
  const createMonitorMutation = useMutation({
    mutationFn: async (data: typeof newMonitor) => {
      const response = await fetch("/api/research-alerts/monitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          searchKeywords: data.searchKeywords.split(",").map((k) => k.trim()).filter(Boolean),
          conditions: data.conditions.split(",").map((c) => c.trim()).filter(Boolean),
          monitorClinicalTrials: data.monitorClinicalTrials,
          monitorPubmed: data.monitorPubmed,
          monitorDrugs: data.monitorDrugs,
          monitorNews: data.monitorNews,
          emailNotifications: data.emailNotifications,
          notificationFrequency: data.notificationFrequency,
          isActive: true,
        }),
      });

      if (!response.ok) throw new Error("Failed to create monitor");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "მონიტორი შეიქმნა", description: "კვლევის მონიტორი წარმატებით დაემატა" });
      setIsCreateDialogOpen(false);
      setNewMonitor({
        searchKeywords: "",
        conditions: "",
        monitorClinicalTrials: true,
        monitorPubmed: true,
        monitorDrugs: true,
        monitorNews: true,
        emailNotifications: true,
        notificationFrequency: "daily",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/monitors"] });
    },
    onError: (error: Error) => {
      toast({ title: "შეცდომა", description: error.message, variant: "destructive" });
    },
  });

  // Delete monitor mutation
  const deleteMonitorMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/research-alerts/monitors/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to delete monitor");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "მონიტორი წაიშალა" });
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/monitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
    },
    onError: (error: Error) => {
      toast({ title: "შეცდომა", description: error.message, variant: "destructive" });
    },
  });

  // Toggle monitor active mutation
  const toggleMonitorMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      const response = await fetch(`/api/research-alerts/monitors/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ isActive }),
      });
      if (!response.ok) throw new Error("Failed to update monitor");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/monitors"] });
    },
  });

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/research-alerts/monitors/${id}/scan`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to scan");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "სკანირება დასრულდა",
        description: `ნაპოვნია ${data.findingsCount} ახალი კვლევა`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
    },
    onError: (error: Error) => {
      toast({ title: "შეცდომა", description: error.message, variant: "destructive" });
    },
  });

  // Mark as read mutation
  const markReadMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/research-alerts/findings/${id}/read`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings/unread"] });
    },
  });

  // Save/unsave mutation
  const saveMutation = useMutation({
    mutationFn: async ({ id, saved }: { id: number; saved: boolean }) => {
      const response = await fetch(`/api/research-alerts/findings/${id}/save`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ saved }),
      });
      if (!response.ok) throw new Error("Failed to save");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
    },
  });

  // Dismiss mutation
  const dismissMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/research-alerts/findings/${id}/dismiss`, {
        method: "PATCH",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to dismiss");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/research-alerts/findings/unread"] });
    },
  });

  const getFindingTypeIcon = (type: string) => {
    switch (type) {
      case "clinical_trial":
        return <FlaskConical className="h-4 w-4" />;
      case "article":
        return <FileText className="h-4 w-4" />;
      case "drug":
        return <Pill className="h-4 w-4" />;
      case "news":
        return <Newspaper className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getFindingTypeName = (type: string) => {
    switch (type) {
      case "clinical_trial":
        return "კლინიკური ცდა";
      case "article":
        return "სტატია";
      case "drug":
        return "წამალი";
      case "news":
        return "სიახლე";
      default:
        return type;
    }
  };

  const unreadFindings = findings.filter((f) => !f.isRead && !f.isDismissed);
  const savedFindings = findings.filter((f) => f.isSaved);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            კვლევის შეტყობინებები
          </h2>
          <p className="text-muted-foreground">
            მონიტორინგი ახალი კვლევების და სიახლეების შესახებ
          </p>
        </div>

        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              ახალი მონიტორი
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>ახალი კვლევის მონიტორი</DialogTitle>
              <DialogDescription>
                დააყენეთ საკვანძო სიტყვები და წყაროები მონიტორინგისთვის
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>საკვანძო სიტყვები (მძიმით გამოყოფილი)</Label>
                <Input
                  placeholder="HIE, hypoxia, neonatal, თერაპია"
                  value={newMonitor.searchKeywords}
                  onChange={(e) =>
                    setNewMonitor((prev) => ({
                      ...prev,
                      searchKeywords: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>მდგომარეობები/დიაგნოზები (მძიმით გამოყოფილი)</Label>
                <Input
                  placeholder="HIE, cerebral palsy, ეპილეფსია"
                  value={newMonitor.conditions}
                  onChange={(e) =>
                    setNewMonitor((prev) => ({
                      ...prev,
                      conditions: e.target.value,
                    }))
                  }
                />
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>წყაროები მონიტორინგისთვის</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">კლინიკური ცდები</span>
                    <Switch
                      checked={newMonitor.monitorClinicalTrials}
                      onCheckedChange={(v) =>
                        setNewMonitor((prev) => ({
                          ...prev,
                          monitorClinicalTrials: v,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">PubMed სტატიები</span>
                    <Switch
                      checked={newMonitor.monitorPubmed}
                      onCheckedChange={(v) =>
                        setNewMonitor((prev) => ({
                          ...prev,
                          monitorPubmed: v,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">წამლები (FDA)</span>
                    <Switch
                      checked={newMonitor.monitorDrugs}
                      onCheckedChange={(v) =>
                        setNewMonitor((prev) => ({
                          ...prev,
                          monitorDrugs: v,
                        }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">სიახლეები</span>
                    <Switch
                      checked={newMonitor.monitorNews}
                      onCheckedChange={(v) =>
                        setNewMonitor((prev) => ({
                          ...prev,
                          monitorNews: v,
                        }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>ელ-ფოსტის შეტყობინებები</Label>
                  <Switch
                    checked={newMonitor.emailNotifications}
                    onCheckedChange={(v) =>
                      setNewMonitor((prev) => ({
                        ...prev,
                        emailNotifications: v,
                      }))
                    }
                  />
                </div>

                {newMonitor.emailNotifications && (
                  <div className="space-y-2">
                    <Label>სიხშირე</Label>
                    <Select
                      value={newMonitor.notificationFrequency}
                      onValueChange={(v) =>
                        setNewMonitor((prev) => ({
                          ...prev,
                          notificationFrequency: v,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="realtime">რეალურ დროში</SelectItem>
                        <SelectItem value="daily">ყოველდღიურად</SelectItem>
                        <SelectItem value="weekly">ყოველკვირეულად</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateDialogOpen(false)}
              >
                გაუქმება
              </Button>
              <Button
                onClick={() => createMonitorMutation.mutate(newMonitor)}
                disabled={
                  createMonitorMutation.isPending ||
                  (!newMonitor.searchKeywords && !newMonitor.conditions)
                }
              >
                {createMonitorMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                შექმნა
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unread Count Badge */}
      {unreadData && unreadData.count > 0 && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <span className="font-medium">
                  {unreadData.count} წაუკითხავი შეტყობინება
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  const response = await fetch(
                    "/api/research-alerts/findings/mark-all-read",
                    { method: "POST", credentials: "include" }
                  );
                  if (response.ok) {
                    queryClient.invalidateQueries({
                      queryKey: ["/api/research-alerts/findings"],
                    });
                    queryClient.invalidateQueries({
                      queryKey: ["/api/research-alerts/findings/unread"],
                    });
                    toast({ title: "ყველა წაკითხულად მონიშნულია" });
                  }
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                ყველას წაკითხვა
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="findings">
        <TabsList>
          <TabsTrigger value="findings">
            კვლევები
            {unreadFindings.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {unreadFindings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="saved">
            შენახული
            {savedFindings.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {savedFindings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="monitors">
            <Settings className="mr-2 h-4 w-4" />
            მონიტორები ({monitors.length})
          </TabsTrigger>
        </TabsList>

        {/* Findings Tab */}
        <TabsContent value="findings" className="space-y-4">
          {findingsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : findings.filter((f) => !f.isDismissed).length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Search className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>კვლევები ჯერ არ მოიძებნა</p>
                <p className="text-sm">შექმენით მონიტორი კვლევების თვალყურის დევნისთვის</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {findings
                  .filter((f) => !f.isDismissed)
                  .map((finding) => (
                    <Card
                      key={finding.id}
                      className={
                        finding.isRead ? "opacity-60" : "border-primary/30"
                      }
                    >
                      <CardContent className="py-4">
                        <div className="flex items-start gap-4">
                          <div className="p-2 rounded-lg bg-muted">
                            {getFindingTypeIcon(finding.findingType)}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">
                                {getFindingTypeName(finding.findingType)}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {finding.sourceName}
                              </span>
                              {!finding.isRead && (
                                <Badge className="bg-primary">ახალი</Badge>
                              )}
                            </div>

                            <h4 className="font-semibold line-clamp-2">
                              {finding.title}
                            </h4>

                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {finding.summary}
                            </p>

                            <div className="flex items-center gap-2 mt-3">
                              {finding.sourceUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    window.open(finding.sourceUrl, "_blank");
                                    if (!finding.isRead) {
                                      markReadMutation.mutate(finding.id);
                                    }
                                  }}
                                >
                                  <ExternalLink className="mr-2 h-4 w-4" />
                                  გახსნა
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  saveMutation.mutate({
                                    id: finding.id,
                                    saved: !finding.isSaved,
                                  })
                                }
                              >
                                {finding.isSaved ? (
                                  <BookmarkCheck className="h-4 w-4 text-primary" />
                                ) : (
                                  <Bookmark className="h-4 w-4" />
                                )}
                              </Button>

                              {!finding.isRead && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    markReadMutation.mutate(finding.id)
                                  }
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}

                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  dismissMutation.mutate(finding.id)
                                }
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Saved Tab */}
        <TabsContent value="saved" className="space-y-4">
          {savedFindings.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Bookmark className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>შენახული კვლევები არ არის</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {savedFindings.map((finding) => (
                  <Card key={finding.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-muted">
                          {getFindingTypeIcon(finding.findingType)}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold line-clamp-2">
                            {finding.title}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {finding.summary}
                          </p>

                          <div className="flex items-center gap-2 mt-3">
                            {finding.sourceUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(finding.sourceUrl, "_blank")
                                }
                              >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                გახსნა
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                saveMutation.mutate({
                                  id: finding.id,
                                  saved: false,
                                })
                              }
                            >
                              <BookmarkCheck className="h-4 w-4 text-primary" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Monitors Tab */}
        <TabsContent value="monitors" className="space-y-4">
          {monitorsLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : monitors.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <Settings className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>მონიტორები არ არის შექმნილი</p>
                <Button
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  პირველი მონიტორის შექმნა
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {monitors.map((monitor) => (
                <Card key={monitor.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={monitor.isActive}
                          onCheckedChange={(v) =>
                            toggleMonitorMutation.mutate({
                              id: monitor.id,
                              isActive: v,
                            })
                          }
                        />
                        <CardTitle className="text-lg">
                          {monitor.isActive ? "აქტიური" : "გამორთული"}
                        </CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => scanMutation.mutate(monitor.id)}
                          disabled={scanMutation.isPending}
                        >
                          {scanMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteMonitorMutation.mutate(monitor.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        საკვანძო სიტყვები
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {monitor.searchKeywords?.map((kw, i) => (
                          <Badge key={i} variant="secondary">
                            {kw}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs text-muted-foreground">
                        მდგომარეობები
                      </Label>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {monitor.conditions?.map((c, i) => (
                          <Badge key={i} variant="outline">
                            {c}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm">
                      {monitor.monitorClinicalTrials && (
                        <Badge variant="secondary">
                          <FlaskConical className="mr-1 h-3 w-3" />
                          ცდები
                        </Badge>
                      )}
                      {monitor.monitorPubmed && (
                        <Badge variant="secondary">
                          <FileText className="mr-1 h-3 w-3" />
                          PubMed
                        </Badge>
                      )}
                      {monitor.monitorDrugs && (
                        <Badge variant="secondary">
                          <Pill className="mr-1 h-3 w-3" />
                          წამლები
                        </Badge>
                      )}
                      {monitor.monitorNews && (
                        <Badge variant="secondary">
                          <Newspaper className="mr-1 h-3 w-3" />
                          სიახლეები
                        </Badge>
                      )}
                    </div>

                    {monitor.lastScanAt && (
                      <p className="text-xs text-muted-foreground">
                        ბოლო სკანირება:{" "}
                        {new Date(monitor.lastScanAt).toLocaleString("ka-GE")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
