import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap,
  Calendar,
  Clock,
  FileText,
  MessageSquare,
  Search,
  BookOpen,
  Lightbulb,
  GitBranch,
  CheckCircle2,
  CircleDot,
  Circle,
  Send,
  Loader2,
  AlertCircle,
  Brain,
  Target,
  RefreshCw,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, parseISO, differenceInDays } from "date-fns";
import type { EvolutionCycle, EvolutionDailyRun, EvolutionReport, EvolutionReportMessage } from "@shared/schema";

const phases = [
  { id: "observe", icon: Search, duration: "8h", labelKey: "phaseObserve" },
  { id: "learn", icon: BookOpen, duration: "4h", labelKey: "phaseLearn" },
  { id: "connect", icon: GitBranch, duration: "4h", labelKey: "phaseConnect" },
  { id: "theorize", icon: Lightbulb, duration: "4h", labelKey: "phaseTheorize" },
  { id: "validate", icon: CheckCircle2, duration: "2h", labelKey: "phaseValidate" },
  { id: "adapt", icon: RefreshCw, duration: "2h", labelKey: "phaseAdapt" },
];

function PhaseTimeline({ currentPhase, phasesCompleted }: { currentPhase: string | null; phasesCompleted: string[] | null }) {
  const { t } = useLanguage();
  const completedSet = new Set(phasesCompleted || []);

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {phases.map((phase, index) => {
        const isCompleted = completedSet.has(phase.id);
        const isCurrent = currentPhase === phase.id;
        const Icon = phase.icon;

        return (
          <div key={phase.id} className="flex items-center">
            <div
              className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${
                isCompleted
                  ? "bg-primary/10 text-primary"
                  : isCurrent
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted/50 text-muted-foreground"
              }`}
            >
              <div className="relative">
                <Icon className="h-4 w-4" />
                {isCompleted && (
                  <CheckCircle2 className="h-3 w-3 absolute -bottom-1 -right-1 text-primary" />
                )}
                {isCurrent && (
                  <CircleDot className="h-3 w-3 absolute -bottom-1 -right-1 text-accent-foreground animate-pulse" />
                )}
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium">{t(phase.labelKey)}</p>
                <p className="text-xs opacity-70">{phase.duration}</p>
              </div>
            </div>
            {index < phases.length - 1 && (
              <div
                className={`h-0.5 w-4 ${
                  isCompleted ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CycleStatusCard({ cycle, currentRun }: { cycle: EvolutionCycle; currentRun?: EvolutionDailyRun }) {
  const { t } = useLanguage();
  const startDate = new Date(cycle.startDate);
  const endDate = new Date(cycle.endDate);
  const today = new Date();
  const daysTotal = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(today, startDate);
  const progress = Math.min(100, Math.max(0, (daysElapsed / daysTotal) * 100));

  return (
    <Card data-testid="card-cycle-status">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            {t("evolutionCycle")}
          </CardTitle>
          <CardDescription>
            {cycle.diagnosisContext ? cycle.diagnosisContext.substring(0, 150) + "..." : t("noDiagnosisContext")}
          </CardDescription>
        </div>
        <Badge
          variant={cycle.status === "active" ? "default" : cycle.status === "completed" ? "secondary" : "outline"}
          data-testid="badge-cycle-status"
        >
          {t(`cycleStatus_${cycle.status}`)}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{format(startDate, "MMM d, yyyy")}</span>
          </div>
          <div className="text-muted-foreground">-</div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            <span>{format(endDate, "MMM d, yyyy")}</span>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{daysTotal - daysElapsed} {t("daysRemaining")}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">{t("cycleProgress")}</span>
            <span className="font-medium">{Math.round(progress)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {currentRun && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium mb-3">{t("currentDayPhase")}</h4>
            <PhaseTimeline
              currentPhase={currentRun.currentPhase}
              phasesCompleted={currentRun.phasesCompleted}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportChatDialog({
  report,
  isOpen,
  onClose,
}: {
  report: EvolutionReport;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const [message, setMessage] = useState("");

  const { data: messages, isLoading: messagesLoading } = useQuery<EvolutionReportMessage[]>({
    queryKey: ["/api/evolution/reports", report.id, "messages"],
    enabled: isOpen,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/evolution/reports/${report.id}/messages`, { content });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: ["/api/evolution/reports", report.id, "messages"] });
    },
  });

  const handleSend = () => {
    if (message.trim()) {
      sendMessageMutation.mutate(message);
    }
  };

  const title = language === "ka" ? report.titleKa : report.titleEn;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col" data-testid="dialog-report-chat">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            {t("chatAboutReport")}
          </DialogTitle>
          <DialogDescription>{title || t("dailyReport")}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <div className="space-y-4">
            {messagesLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-3/4 ml-auto" />
              </div>
            ) : messages && messages.length > 0 ? (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">
                      {language === "ka" && msg.contentKa ? msg.contentKa : msg.content}
                    </p>
                    <p className="text-xs opacity-70 mt-1">
                      {format(new Date(msg.createdAt!), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t("noMessagesYet")}</p>
                <p className="text-sm">{t("askAboutReport")}</p>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex items-center gap-2 pt-4 border-t">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t("typeYourQuestion")}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            disabled={sendMessageMutation.isPending}
            data-testid="input-chat-message"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!message.trim() || sendMessageMutation.isPending}
            data-testid="button-send-message"
          >
            {sendMessageMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReportCard({ report, onChatOpen }: { report: EvolutionReport; onChatOpen: () => void }) {
  const { t, language } = useLanguage();
  const title = language === "ka" ? report.titleKa : report.titleEn;
  const summary = language === "ka" ? report.summaryKa : report.summaryEn;
  const keyFindings = language === "ka" ? report.keyFindingsKa : report.keyFindingsEn;

  return (
    <Card className="hover-elevate" data-testid={`card-report-${report.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              {title || t("dailyReport")}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Calendar className="h-3 w-3" />
              {format(parseISO(report.reportDate), "MMMM d, yyyy")}
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onChatOpen}
            className="shrink-0"
            data-testid={`button-chat-report-${report.id}`}
          >
            <MessageSquare className="h-4 w-4 mr-1" />
            {t("chat")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {summary && (
          <p className="text-sm text-muted-foreground line-clamp-3">{summary}</p>
        )}
        {keyFindings && keyFindings.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-muted-foreground mb-2">{t("keyFindings")}</h4>
            <ul className="space-y-1">
              {keyFindings.slice(0, 3).map((finding, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <Lightbulb className="h-3 w-3 mt-1 shrink-0 text-primary" />
                  <span className="line-clamp-1">{finding}</span>
                </li>
              ))}
              {keyFindings.length > 3 && (
                <li className="text-xs text-muted-foreground ml-5">
                  +{keyFindings.length - 3} {t("moreFindings")}
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>
      {report.filePath && (
        <CardFooter className="pt-0">
          <Button variant="ghost" size="sm" className="text-xs" data-testid={`button-download-report-${report.id}`}>
            <FileText className="h-3 w-3 mr-1" />
            {t("downloadPdf")}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

function ReportsList({ cycleId }: { cycleId: number }) {
  const { t } = useLanguage();
  const [selectedReport, setSelectedReport] = useState<EvolutionReport | null>(null);

  const { data: reports, isLoading } = useQuery<EvolutionReport[]>({
    queryKey: ["/api/evolution/reports"],
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48" />
        ))}
      </div>
    );
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">{t("noReportsYet")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t("reportsWillAppear")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {reports.map((report) => (
          <ReportCard
            key={report.id}
            report={report}
            onChatOpen={() => setSelectedReport(report)}
          />
        ))}
      </div>

      {selectedReport && (
        <ReportChatDialog
          report={selectedReport}
          isOpen={!!selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </>
  );
}

export default function Evolution() {
  const { t } = useLanguage();

  const { data: cycles, isLoading: cyclesLoading } = useQuery<EvolutionCycle[]>({
    queryKey: ["/api/evolution/cycles"],
  });

  const activeCycle = cycles?.find((c) => c.status === "active");

  const { data: dailyRuns } = useQuery<EvolutionDailyRun[]>({
    queryKey: ["/api/evolution/cycles", activeCycle?.id, "runs"],
    enabled: !!activeCycle,
  });

  const currentRun = dailyRuns?.find((r) => r.status === "running");

  if (cyclesLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
          <Zap className="h-8 w-8 text-primary" />
          {t("evolutionDashboard")}
        </h1>
        <p className="text-muted-foreground mt-1">{t("evolutionSubtitle")}</p>
      </div>

      {!activeCycle ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t("noActiveCycle")}</h2>
            <p className="text-muted-foreground max-w-md mb-6">
              {t("noActiveCycleDescription")}
            </p>
            <Button data-testid="button-start-cycle">
              {t("uploadDocumentToStart")}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <CycleStatusCard cycle={activeCycle} currentRun={currentRun} />

          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {t("dailyReports")}
            </h2>
            <ReportsList cycleId={activeCycle.id} />
          </div>
        </>
      )}
    </div>
  );
}
