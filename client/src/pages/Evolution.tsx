import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  MessagesSquare,
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
  Sparkles,
  TrendingUp,
  Layers,
  Link2,
  FlaskConical,
  Activity,
  Telescope,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { format, parseISO, differenceInDays } from "date-fns";
import type { EvolutionCycle, EvolutionDailyRun, EvolutionReport, EvolutionReportMessage, AccumulatedKnowledge } from "@shared/schema";

const phases = [
  { id: "observe", icon: Search, duration: "8h", labelKey: "phaseObserve" },
  { id: "learn", icon: BookOpen, duration: "4h", labelKey: "phaseLearn" },
  { id: "connect", icon: GitBranch, duration: "4h", labelKey: "phaseConnect" },
  { id: "theorize", icon: Lightbulb, duration: "4h", labelKey: "phaseTheorize" },
  { id: "synthesize", icon: MessagesSquare, duration: "3h", labelKey: "phaseSynthesize" },
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

const knowledgeTypeIcons: Record<string, typeof Lightbulb> = {
  hypothesis: Lightbulb,
  discovery: Sparkles,
  treatment_insight: FlaskConical,
  mechanism: Activity,
  pattern: Layers,
  connection: Link2,
  prediction: Telescope,
};

const knowledgeStatusColors: Record<string, string> = {
  emerging: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  active: "bg-green-500/10 text-green-600 dark:text-green-400",
  validated: "bg-primary/10 text-primary",
  superseded: "bg-muted text-muted-foreground",
  refuted: "bg-destructive/10 text-destructive",
};

function KnowledgeCard({ knowledge }: { knowledge: AccumulatedKnowledge }) {
  const { t, language } = useLanguage();
  const title = language === "ka" && knowledge.titleKa ? knowledge.titleKa : knowledge.titleEn;
  const content = language === "ka" && knowledge.contentKa ? knowledge.contentKa : knowledge.contentEn;
  const knowledgeType = knowledge.knowledgeType || "hypothesis";
  const knowledgeStatus = knowledge.status || "active";
  const TypeIcon = knowledgeTypeIcons[knowledgeType] || Lightbulb;
  const statusColorClass = knowledgeStatusColors[knowledgeStatus] || knowledgeStatusColors.active;
  const cycleCount = knowledge.contributingCycleIds?.length ?? 0;
  const confidence = typeof knowledge.confidence === "number" ? knowledge.confidence : 50;
  const validations = typeof knowledge.validationCount === "number" ? knowledge.validationCount : 0;

  const typeLabel = t(`knowledgeType_${knowledgeType}`);
  const statusLabel = t(`knowledgeStatus_${knowledgeStatus}`);

  return (
    <Card className="hover-elevate" data-testid={`card-knowledge-${knowledge.id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-muted">
              <TypeIcon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {typeLabel !== `knowledgeType_${knowledgeType}` ? typeLabel : knowledgeType}
              </CardDescription>
            </div>
          </div>
          <Badge className={`${statusColorClass} text-xs`} data-testid={`badge-knowledge-status-${knowledge.id}`}>
            {statusLabel !== `knowledgeStatus_${knowledgeStatus}` ? statusLabel : knowledgeStatus}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{content}</p>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{t("knowledgeConfidence")}</span>
            <span className="font-medium">{confidence}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5" data-testid={`text-knowledge-validations-${knowledge.id}`}>
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>{validations} {t("knowledgeValidations")}</span>
          </div>
          <div className="flex items-center gap-1.5" data-testid={`text-knowledge-cycles-${knowledge.id}`}>
            <RefreshCw className="h-3.5 w-3.5" />
            <span>{cycleCount} {t("knowledgeCycles")}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KnowledgeGrowthCard({ knowledge }: { knowledge: AccumulatedKnowledge[] }) {
  const { t } = useLanguage();

  const statusCounts = {
    validated: knowledge.filter(k => k.status === "validated").length,
    active: knowledge.filter(k => k.status === "active").length,
    emerging: knowledge.filter(k => k.status === "emerging").length,
  };

  const typeCounts: Record<string, number> = {};
  knowledge.forEach(k => {
    const type = k.knowledgeType || "hypothesis";
    typeCounts[type] = (typeCounts[type] || 0) + 1;
  });

  const sortedTypes = Object.entries(typeCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
  const maxTypeCount = Math.max(...Object.values(typeCounts), 1);

  const avgConfidence = knowledge.length > 0
    ? Math.round(knowledge.reduce((sum, k) => sum + (k.confidence ?? 50), 0) / knowledge.length)
    : 0;

  return (
    <Card data-testid="card-knowledge-growth">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          {t("knowledgeGrowth")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="space-y-1">
            <p className="text-2xl font-bold text-primary">{statusCounts.validated}</p>
            <p className="text-xs text-muted-foreground">{t("validated")}</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{statusCounts.active}</p>
            <p className="text-xs text-muted-foreground">{t("knowledgeStatus_active")}</p>
          </div>
          <div className="space-y-1">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{statusCounts.emerging}</p>
            <p className="text-xs text-muted-foreground">{t("knowledgeStatus_emerging")}</p>
          </div>
        </div>
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span>{t("knowledgeConfidence")}</span>
            <span className="font-medium">{avgConfidence}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${avgConfidence}%` }} />
          </div>
        </div>
        {sortedTypes.length > 0 && (
          <div className="pt-2 border-t space-y-2">
            <p className="text-xs text-muted-foreground font-medium mb-1">{t("knowledgeGrowth")}</p>
            {sortedTypes.map(([type, count]) => {
              const TypeIcon = knowledgeTypeIcons[type] || Lightbulb;
              const typeLabel = t(`knowledgeType_${type}`);
              return (
                <div key={type} className="flex items-center gap-2">
                  <TypeIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground w-20 truncate">
                    {typeLabel !== `knowledgeType_${type}` ? typeLabel : type}
                  </span>
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/70 transition-all" 
                      style={{ width: `${(count / maxTypeCount) * 100}%` }} 
                    />
                  </div>
                  <span className="text-xs font-medium w-4 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AccumulatedKnowledgeSection() {
  const { t } = useLanguage();

  const { data: knowledge, isLoading, isError } = useQuery<AccumulatedKnowledge[]>({
    queryKey: ["/api/evolution/accumulated-knowledge"],
  });

  const activeKnowledge = knowledge?.filter(k => k.status === "active" || k.status === "validated" || k.status === "emerging") || [];
  const validatedCount = knowledge?.filter(k => k.status === "validated").length || 0;
  const totalCount = knowledge?.length || 0;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="section-accumulated-knowledge">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5" />
            {t("accumulatedKnowledge")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("accumulatedKnowledgeSubtitle")}</p>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center gap-3 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Layers className="h-4 w-4" />
              <span>{totalCount} {t("totalKnowledge")}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {validatedCount} {t("validated")}
            </Badge>
          </div>
        )}
      </div>

      {!knowledge || knowledge.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Brain className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">{t("noAccumulatedKnowledge")}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("noAccumulatedKnowledgeDesc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <KnowledgeGrowthCard knowledge={knowledge} />
          <div className="grid gap-4 md:grid-cols-2">
            {activeKnowledge.slice(0, 6).map((item) => (
              <KnowledgeCard key={item.id} knowledge={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const knowledgeTypeColors: Record<string, { fill: string; stroke: string }> = {
  hypothesis: { fill: "#fbbf24", stroke: "#f59e0b" },
  discovery: { fill: "#a855f7", stroke: "#9333ea" },
  treatment_insight: { fill: "#22c55e", stroke: "#16a34a" },
  mechanism: { fill: "#3b82f6", stroke: "#2563eb" },
  pattern: { fill: "#6366f1", stroke: "#4f46e5" },
  connection: { fill: "#06b6d4", stroke: "#0891b2" },
  prediction: { fill: "#f97316", stroke: "#ea580c" },
};

interface GraphNode {
  id: number;
  x: number;
  y: number;
  label: string;
  fullTitle: string;
  type: string;
  confidence: number;
}

interface GraphEdge {
  source: number;
  target: number;
}

function KnowledgeGraphSection() {
  const { t, language } = useLanguage();
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const { data: knowledge, isLoading, isError } = useQuery<AccumulatedKnowledge[]>({
    queryKey: ["/api/evolution/accumulated-knowledge"],
  });

  const { nodes, edges } = useMemo(() => {
    if (!knowledge || knowledge.length === 0) {
      return { nodes: [], edges: [] };
    }

    const centerX = 50;
    const centerY = 50;
    const radius = 40;
    const angleStep = (2 * Math.PI) / knowledge.length;

    const graphNodes: GraphNode[] = knowledge.map((item, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const title = language === "ka" && item.titleKa ? item.titleKa : item.titleEn;
      const maxChars = language === "ka" ? 10 : 12;
      return {
        id: item.id,
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        label: title.length > maxChars ? title.substring(0, maxChars) + "..." : title,
        fullTitle: title,
        type: item.knowledgeType || "hypothesis",
        confidence: item.confidence ?? 50,
      };
    });

    const knowledgeIdSet = new Set(knowledge.map(k => k.id));
    const edgeSet = new Set<string>();
    const graphEdges: GraphEdge[] = [];

    knowledge.forEach((item) => {
      if (item.relatedKnowledgeIds && Array.isArray(item.relatedKnowledgeIds)) {
        item.relatedKnowledgeIds.forEach((relatedId) => {
          if (knowledgeIdSet.has(relatedId)) {
            const edgeKey = [Math.min(item.id, relatedId), Math.max(item.id, relatedId)].join("-");
            if (!edgeSet.has(edgeKey)) {
              edgeSet.add(edgeKey);
              graphEdges.push({ source: Math.min(item.id, relatedId), target: Math.max(item.id, relatedId) });
            }
          }
        });
      }
    });

    return { nodes: graphNodes, edges: graphEdges };
  }, [knowledge, language]);

  const nodeMap = useMemo(() => {
    const map = new Map<number, GraphNode>();
    nodes.forEach((node) => map.set(node.id, node));
    return map;
  }, [nodes]);

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="section-knowledge-graph">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  if (isError) {
    return null;
  }

  return (
    <div className="space-y-4" data-testid="section-knowledge-graph">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <GitBranch className="h-5 w-5" />
          {t("knowledgeGraph")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("knowledgeGraphVisualization")}</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="h-4 w-4" />
            {t("knowledgeGraph")}
          </CardTitle>
          <CardDescription>{t("interactiveConceptMapping")}</CardDescription>
        </CardHeader>
        <CardContent>
          {!knowledge || knowledge.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <GitBranch className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">{t("noAccumulatedKnowledge")}</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {t("noAccumulatedKnowledgeDesc")}
              </p>
            </div>
          ) : (
            <div className="relative" data-testid="graph-container">
              <svg
                viewBox="0 0 100 100"
                preserveAspectRatio="xMidYMid meet"
                className="w-full aspect-square max-w-md mx-auto"
                role="img"
                aria-label={t("knowledgeGraphVisualization")}
              >
                {edges.map((edge, index) => {
                  const sourceNode = nodeMap.get(edge.source);
                  const targetNode = nodeMap.get(edge.target);
                  if (!sourceNode || !targetNode) return null;
                  return (
                    <motion.line
                      key={`edge-${index}`}
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke="currentColor"
                      strokeOpacity={0.2}
                      strokeWidth={0.4}
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: index * 0.05 }}
                    />
                  );
                })}

                {nodes.map((node, index) => {
                  const colors = knowledgeTypeColors[node.type] || knowledgeTypeColors.hypothesis;
                  const nodeRadius = 2 + (node.confidence / 100) * 1;
                  const isSelected = selectedNode?.id === node.id;

                  return (
                    <Tooltip key={node.id}>
                      <TooltipTrigger asChild>
                        <motion.g
                          className="cursor-pointer focus:outline-none"
                          tabIndex={0}
                          role="button"
                          aria-label={node.fullTitle}
                          onClick={() => setSelectedNode(isSelected ? null : node)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSelectedNode(isSelected ? null : node);
                            }
                          }}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ duration: 0.3, delay: index * 0.05 }}
                          whileHover={{ scale: 1.15 }}
                          whileFocus={{ scale: 1.15 }}
                          data-testid={`graph-node-${node.id}`}
                        >
                          <circle
                            cx={node.x}
                            cy={node.y}
                            r={nodeRadius}
                            fill={colors.fill}
                            stroke={isSelected ? "hsl(var(--primary))" : colors.stroke}
                            strokeWidth={isSelected ? 0.6 : 0.4}
                          />
                          <text
                            x={node.x}
                            y={node.y + nodeRadius + 3}
                            textAnchor="middle"
                            className="text-[2.5px] fill-muted-foreground pointer-events-none"
                          >
                            {node.label}
                          </text>
                        </motion.g>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[200px]">
                        <p className="font-medium">{node.fullTitle}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t(`knowledgeType_${node.type}`) !== `knowledgeType_${node.type}` 
                            ? t(`knowledgeType_${node.type}`) 
                            : node.type}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t("knowledgeConfidence")}: {node.confidence}%
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </svg>

              {nodes.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-xs">
                  {Object.entries(knowledgeTypeColors).map(([type, colors]) => {
                    const count = nodes.filter((n) => n.type === type).length;
                    if (count === 0) return null;
                    const typeLabel = t(`knowledgeType_${type}`);
                    return (
                      <div key={type} className="flex items-center gap-1.5">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: colors.fill }}
                        />
                        <span className="text-muted-foreground">
                          {typeLabel !== `knowledgeType_${type}` ? typeLabel : type} ({count})
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
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

          <AccumulatedKnowledgeSection />

          <KnowledgeGraphSection />
        </>
      )}
    </div>
  );
}
