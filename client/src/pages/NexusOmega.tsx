import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Search,
  Brain,
  Beaker,
  Zap,
  Network,
  Lightbulb,
  MessageSquare,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Activity,
  Atom,
  Dna,
  Calculator,
  Cpu,
  GitBranch,
  AlertCircle,
  Loader2,
  Upload,
  FileText,
  X,
  Stethoscope,
  Users,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { FindingCard, Finding } from "@/components/dashboard/FindingCard";
import { HypothesisTracker } from "@/components/nexus/HypothesisTracker";
import { DebatePanel } from "@/components/nexus/DebatePanel";
import { useToast } from "@/hooks/use-toast";

interface AIResearchResponse {
  provider: string;
  agentId: string;
  content: string;
  keyPoints: string[];
  concerns: string[];
  uniqueInsights: string[];
  confidence: number;
  success: boolean;
  error?: string;
}

interface DisciplinaryPerspective {
  discipline: string;
  analysis: string;
  crossConnections: { toDiscipline: string; connection: string; strength?: number }[];
}

interface TreatmentPlan {
  phase: string;
  duration: string;
  interventions: string[];
  goals: string[];
}

interface SpecialistRecommendation {
  specialty: string;
  role: string;
  priority: "critical" | "important" | "supportive";
}

interface ResearchOrchestrationResult {
  query: {
    id: number;
    queryText: string;
    status: string;
  };
  finding: {
    id: number;
    title: string;
    summary: string;
    consensusLevel: "low" | "moderate" | "high" | "unanimous";
    confidenceScore: number;
    relevanceScore: number;
    sources: Array<{ title: string; url?: string; doi?: string }> | null;
    treatmentPlan?: TreatmentPlan[];
    specialists?: SpecialistRecommendation[];
    criticalRisks?: string[];
    followUpInvestigations?: string[];
  };
  aiAnalyses: AIResearchResponse[];
  disciplinaryPerspectives: DisciplinaryPerspective[];
  consensusLevel: "low" | "moderate" | "high" | "unanimous";
  processingTimeMs: number;
  diagnosisAnalyzed?: boolean;
}

interface AIAgent {
  id: string;
  name: string;
  colorClass: string;
  status: "ready" | "searching" | "analyzing" | "idle";
}

const aiAgents: AIAgent[] = [
  { id: "claude", name: "Claude", colorClass: "bg-[hsl(var(--ai-claude))]", status: "ready" },
  { id: "chatgpt", name: "ChatGPT", colorClass: "bg-[hsl(var(--ai-chatgpt))]", status: "ready" },
  { id: "grok", name: "Grok", colorClass: "bg-[hsl(var(--ai-grok))]", status: "ready" },
  { id: "gemini", name: "Gemini", colorClass: "bg-[hsl(var(--ai-gemini))]", status: "ready" },
  { id: "perplexity", name: "Perplexity", colorClass: "bg-[hsl(var(--ai-perplexity))]", status: "ready" },
];

const disciplineCategories = [
  {
    nameKey: "lifeSciences",
    icon: Dna,
    disciplines: [
      { id: "Neuroscience", translationKey: "neuroscience" },
      { id: "Cell Biology", translationKey: "cellBiology" },
      { id: "Molecular Biology", translationKey: "molecularBiology" },
      { id: "Biochemistry", translationKey: "biochemistry" },
      { id: "Pharmacology", translationKey: "pharmacology" },
      { id: "Medicine", translationKey: "medicine" },
    ],
  },
  {
    nameKey: "physicalSciences",
    icon: Atom,
    disciplines: [
      { id: "Physics", translationKey: "physics" },
      { id: "Chemistry", translationKey: "chemistry" },
      { id: "Quantum Biology", translationKey: "quantumBiology" },
    ],
  },
  {
    nameKey: "mathematicalSciences",
    icon: Calculator,
    disciplines: [
      { id: "Mathematics", translationKey: "mathematics" },
      { id: "Statistics", translationKey: "statistics" },
      { id: "Network Theory", translationKey: "networkTheory" },
    ],
  },
  {
    nameKey: "engineering",
    icon: Cpu,
    disciplines: [
      { id: "Biomedical Eng", translationKey: "biomedicalEng" },
      { id: "Materials Science", translationKey: "materialsScience" },
      { id: "Nanotechnology", translationKey: "nanotechnology" },
      { id: "Computer Science", translationKey: "computerScience" },
    ],
  },
  {
    nameKey: "crossDisciplinaryCategory",
    icon: GitBranch,
    disciplines: [
      { id: "Systems Biology", translationKey: "systemsBiology" },
      { id: "Cybernetics", translationKey: "cybernetics" },
    ],
  },
];

const researchFocusOptions = [
  { id: "Stem Cells", translationKey: "stemCells" },
  { id: "Gene Therapy", translationKey: "geneTherapy" },
  { id: "Exosomes", translationKey: "exosomes" },
  { id: "Biomaterials", translationKey: "biomaterials" },
  { id: "All", translationKey: "all" },
];

const quickCommands = [
  { label: "/omega", descriptionKey: "fullSynthesis" },
  { label: "/scan", descriptionKey: "quickScan" },
  { label: "/consensus", descriptionKey: "aiConsensus" },
  { label: "/debate", descriptionKey: "aiDebate" },
  { label: "/discipline", descriptionKey: "byField" },
];


export default function NexusOmega() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [selectedDisciplines, setSelectedDisciplines] = useState<string[]>([
    "Neuroscience",
    "Cell Biology",
    "Medicine",
  ]);
  const [researchFocus, setResearchFocus] = useState("All");
  const [activeTab, setActiveTab] = useState("consensus");
  const [aiStatuses, setAiStatuses] = useState<Record<string, AIAgent["status"]>>(
    Object.fromEntries(aiAgents.map((a) => [a.id, a.status]))
  );
  const [knowledgeGraphOpen, setKnowledgeGraphOpen] = useState(false);
  const [bottomPanelOpen, setBottomPanelOpen] = useState(false);
  const [bottomActiveTab, setBottomActiveTab] = useState("hypotheses");
  const [findings, setFindings] = useState<Finding[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [diagnosisFile, setDiagnosisFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const statusTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
      }
    };
  }, []);

  const resetAiStatuses = () => {
    if (statusTimeoutRef.current) {
      clearTimeout(statusTimeoutRef.current);
      statusTimeoutRef.current = null;
    }
    setAiStatuses(Object.fromEntries(aiAgents.map((a) => [a.id, "ready"])));
  };

  const mapAgentId = (agentId: string): string => {
    const mapping: Record<string, string> = {
      "gpt4": "chatgpt",
      "claude": "claude",
      "grok": "grok",
      "gemini": "gemini",
      "perplexity": "perplexity",
    };
    return mapping[agentId] || agentId;
  };

  const mapConsensusLevel = (level: "low" | "moderate" | "high" | "unanimous"): string => {
    const mapping: Record<string, string> = {
      "low": "2/5",
      "moderate": "3/5",
      "high": "4/5",
      "unanimous": "5/5",
    };
    return mapping[level] || "3/5";
  };

  const transformApiResponse = (result: ResearchOrchestrationResult): Finding => {
    const aiAnalyses: Finding["aiAnalyses"] = {};
    
    for (const analysis of result.aiAnalyses) {
      if (analysis.success) {
        const frontendId = mapAgentId(analysis.agentId);
        const hasContent = analysis.content && analysis.content.trim().length > 0;
        const hasKeyPoints = analysis.keyPoints && analysis.keyPoints.length > 0;
        const hasConcerns = analysis.concerns && analysis.concerns.length > 0;
        const hasInsights = analysis.uniqueInsights && analysis.uniqueInsights.length > 0;
        
        let perspective = analysis.content || "";
        if (!hasContent && (hasKeyPoints || hasConcerns || hasInsights)) {
          const parts: string[] = [];
          if (hasKeyPoints) parts.push(`Key points: ${analysis.keyPoints!.join("; ")}`);
          if (hasConcerns) parts.push(`Concerns: ${analysis.concerns!.join("; ")}`);
          if (hasInsights) parts.push(`Insights: ${analysis.uniqueInsights!.join("; ")}`);
          perspective = parts.join(". ");
        }
        
        if (hasContent || hasKeyPoints || hasConcerns || hasInsights) {
          (aiAnalyses as Record<string, typeof aiAnalyses[keyof typeof aiAnalyses]>)[frontendId] = {
            perspective,
            confidence: analysis.confidence,
            keyPoints: analysis.keyPoints || [],
            concerns: analysis.concerns || [],
            uniqueInsights: analysis.uniqueInsights || [],
          };
        }
      }
    }

    const disciplinaryAnalyses: Record<string, string> = {};
    for (const perspective of result.disciplinaryPerspectives) {
      disciplinaryAnalyses[perspective.discipline] = perspective.analysis;
    }

    return {
      id: `finding-${result.finding.id}`,
      title: result.finding.title,
      summary: result.finding.summary,
      consensusLevel: mapConsensusLevel(result.consensusLevel) as Finding["consensusLevel"],
      confidenceScore: result.finding.confidenceScore,
      relevanceScore: result.finding.relevanceScore,
      aiAnalyses,
      disciplinaryAnalyses,
      sources: result.finding.sources || [],
      createdAt: new Date(),
    };
  };

  const researchMutation = useMutation({
    mutationFn: async (params: { queryText: string; disciplines: string[]; diagnosisFile?: File }) => {
      const formData = new FormData();
      formData.append("queryText", params.queryText);
      formData.append("disciplines", JSON.stringify(params.disciplines));
      if (params.diagnosisFile) {
        formData.append("diagnosis", params.diagnosisFile);
      }
      
      const response = await fetch("/api/nexus/research", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        let errorMessage = `Request failed with status ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch {
        }
        throw new Error(errorMessage);
      }
      return response.json() as Promise<ResearchOrchestrationResult>;
    },
    onMutate: () => {
      if (statusTimeoutRef.current) {
        clearTimeout(statusTimeoutRef.current);
        statusTimeoutRef.current = null;
      }
      setError(null);
      setAiStatuses(Object.fromEntries(aiAgents.map((a) => [a.id, "searching"])));
    },
    onSuccess: (data) => {
      setAiStatuses(Object.fromEntries(aiAgents.map((a) => [a.id, "analyzing"])));
      
      statusTimeoutRef.current = setTimeout(() => {
        const newFinding = transformApiResponse(data);
        setFindings((prev) => [newFinding, ...prev]);
        resetAiStatuses();
        
        toast({
          title: t("researchComplete") || "Research Complete",
          description: `${data.aiAnalyses.filter(a => a.success).length}/5 AI agents responded in ${(data.processingTimeMs / 1000).toFixed(1)}s`,
        });
      }, 500);
    },
    onError: (err: Error) => {
      const errorMessage = err.message || "An unexpected error occurred";
      setError(errorMessage);
      resetAiStatuses();
      toast({
        title: t("researchError") || "Research Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleDisciplineToggle = (discipline: string) => {
    setSelectedDisciplines((prev) =>
      prev.includes(discipline)
        ? prev.filter((d) => d !== discipline)
        : [...prev, discipline]
    );
  };

  const handleSearch = () => {
    if (!query.trim() && !diagnosisFile) return;
    researchMutation.mutate({
      queryText: query || (diagnosisFile ? t("analyzeDiagnosis") || "Analyze this diagnosis and recommend treatment" : ""),
      disciplines: selectedDisciplines,
      diagnosisFile: diagnosisFile || undefined,
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: t("fileTooLarge") || "File too large",
          description: t("maxFileSize") || "Maximum file size is 10MB",
          variant: "destructive",
        });
        return;
      }
      const allowedTypes = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: t("invalidFileType") || "Invalid file type",
          description: t("allowedFileTypes") || "Please upload PDF or image files (JPEG, PNG, WebP)",
          variant: "destructive",
        });
        return;
      }
      setDiagnosisFile(file);
    }
  };

  const removeDiagnosisFile = () => {
    setDiagnosisFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleQuickCommand = (command: string) => {
    setQuery((prev) => `${command} ${prev}`.trim());
  };

  const getStatusColor = (status: AIAgent["status"]) => {
    switch (status) {
      case "ready":
        return "text-green-600 dark:text-green-400";
      case "searching":
        return "text-amber-600 dark:text-amber-400";
      case "analyzing":
        return "text-primary";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-primary rounded-md">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold" data-testid="text-page-title">
              {t("nexusOmega")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("nexusOmegaSubtitle")}</p>
          </div>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-4">
              {aiAgents.map((agent) => {
                const status = aiStatuses[agent.id];
                const isActive = status === "searching" || status === "analyzing";
                return (
                  <div
                    key={agent.id}
                    className="flex items-center gap-2"
                    data-testid={`ai-agent-${agent.id}`}
                  >
                    <div
                      className={`w-3 h-3 rounded-full ${agent.colorClass} ${
                        isActive ? "animate-pulse" : ""
                      }`}
                    />
                    <span className="text-sm font-medium">{agent.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getStatusColor(status)}`}
                      data-testid={`badge-status-${agent.id}`}
                    >
                      {t(status)}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("enterResearchTopic")}
                  className="pl-10"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  data-testid="input-search-query"
                />
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                data-testid="input-diagnosis-file"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                title={t("uploadDiagnosis") || "Upload Diagnosis"}
                data-testid="button-upload-diagnosis"
              >
                <Upload className="h-4 w-4" />
              </Button>
              <Button
                onClick={handleSearch}
                disabled={researchMutation.isPending}
                data-testid="button-omega-search"
              >
                {researchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="h-4 w-4 mr-2" />
                )}
                OMEGA
              </Button>
            </div>

            {diagnosisFile && (
              <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                <FileText className="h-4 w-4 text-primary" />
                <span className="text-sm flex-1 truncate">{diagnosisFile.name}</span>
                <Badge variant="secondary" className="text-xs">
                  {(diagnosisFile.size / 1024).toFixed(0)} KB
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={removeDiagnosisFile}
                  data-testid="button-remove-diagnosis"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {quickCommands.map((cmd) => (
                <Button
                  key={cmd.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickCommand(cmd.label)}
                  title={t(cmd.descriptionKey)}
                  data-testid={`button-command-${cmd.label.replace("/", "")}`}
                >
                  {cmd.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <div className="w-64 flex-shrink-0 space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Beaker className="h-4 w-4 text-primary" />
                  {t("disciplines")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-4">
                    {disciplineCategories.map((category) => (
                      <div key={category.nameKey} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          <category.icon className="h-3 w-3" />
                          {t(category.nameKey)}
                        </div>
                        <div className="space-y-1 pl-1">
                          {category.disciplines.map((discipline) => (
                            <div key={discipline.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`discipline-${discipline.id}`}
                                checked={selectedDisciplines.includes(discipline.id)}
                                onCheckedChange={() => handleDisciplineToggle(discipline.id)}
                                data-testid={`checkbox-discipline-${discipline.id.toLowerCase().replace(/\s+/g, "-")}`}
                              />
                              <Label
                                htmlFor={`discipline-${discipline.id}`}
                                className="text-sm cursor-pointer"
                              >
                                {t(discipline.translationKey)}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Brain className="h-4 w-4 text-primary" />
                  {t("researchFocus")}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <RadioGroup
                  value={researchFocus}
                  onValueChange={setResearchFocus}
                  className="space-y-2"
                >
                  {researchFocusOptions.map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={option.id}
                        id={`focus-${option.id}`}
                        data-testid={`radio-focus-${option.id.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                      <Label
                        htmlFor={`focus-${option.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {t(option.translationKey)}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 min-w-0">
            <Card>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-0">
                  <TabsList>
                    <TabsTrigger
                      value="consensus"
                      data-testid="tab-consensus"
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      {t("consensus")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="individual"
                      data-testid="tab-individual"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {t("individualAI")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="cross"
                      data-testid="tab-cross-disciplinary"
                    >
                      <Network className="h-4 w-4 mr-1" />
                      {t("crossDisciplinary")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="hypotheses"
                      data-testid="tab-hypotheses"
                    >
                      <Lightbulb className="h-4 w-4 mr-1" />
                      {t("hypotheses")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="debates"
                      data-testid="tab-debates"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      {t("debates")}
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[400px]">
                    <TabsContent value="consensus" className="m-0">
                      <div className="space-y-4 pr-2">
                        {researchMutation.isPending && (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">
                              {t("researchingWithAI") || "Researching with 5 AI agents..."}
                            </p>
                          </div>
                        )}
                        {error && !researchMutation.isPending && (
                          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-md border border-destructive/20">
                            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                            <p className="text-sm text-destructive">{error}</p>
                          </div>
                        )}
                        {!researchMutation.isPending && findings.length === 0 && !error && (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <Search className="h-12 w-12 text-muted-foreground" />
                            <div className="text-center">
                              <h3 className="font-medium text-foreground mb-1">
                                {t("noResearchYet") || "No Research Yet"}
                              </h3>
                              <p className="text-sm text-muted-foreground max-w-sm">
                                {t("enterQueryToBegin") || "Enter a research query above and click OMEGA to begin multi-AI research synthesis."}
                              </p>
                            </div>
                          </div>
                        )}
                        {!researchMutation.isPending && findings.map((finding) => (
                          <FindingCard
                            key={finding.id}
                            finding={finding}
                          />
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="individual" className="m-0">
                      <div className="space-y-6 pr-2">
                        {findings.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <MessageSquare className="h-12 w-12 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground text-center">
                              {t("noIndividualPerspectives") || "Run a research query to see individual AI perspectives."}
                            </p>
                          </div>
                        ) : (
                          aiAgents.map((agent) => (
                            <div key={agent.id} className="space-y-3">
                              <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                                <div className={`w-3 h-3 rounded-full ${agent.colorClass}`} />
                                <h3 className="font-semibold text-base" data-testid={`heading-ai-${agent.id}`}>
                                  {agent.name} {t("perspectives")}
                                </h3>
                              </div>
                              <div className="space-y-3 pl-2 border-l-2 border-muted ml-1.5">
                                {findings.map((finding) => {
                                  const analysis = finding.aiAnalyses[agent.id as keyof typeof finding.aiAnalyses];
                                  if (!analysis) return null;
                                  return (
                                    <Card
                                      key={`${agent.id}-${finding.id}`}
                                      className="overflow-visible"
                                      data-testid={`individual-finding-${agent.id}-${finding.id}`}
                                    >
                                      <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-3 flex-wrap">
                                          <h4 className="font-medium text-sm">{finding.title}</h4>
                                          <Badge variant="outline" className="text-xs flex-shrink-0">
                                            {analysis.confidence}% {t("confidence")}
                                          </Badge>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {analysis.perspective}
                                        </p>
                                        {analysis.keyPoints.length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium text-foreground flex items-center gap-1 mb-1">
                                              <Lightbulb className="h-3 w-3" />
                                              {t("keyPoints")}
                                            </p>
                                            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                              {analysis.keyPoints.map((point, i) => (
                                                <li key={i}>{point}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                        {analysis.uniqueInsights.length > 0 && (
                                          <div>
                                            <p className="text-xs font-medium text-foreground flex items-center gap-1 mb-1">
                                              <Brain className="h-3 w-3" />
                                              {t("uniqueInsights")}
                                            </p>
                                            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                                              {analysis.uniqueInsights.map((insight, i) => (
                                                <li key={i}>{insight}</li>
                                              ))}
                                            </ul>
                                          </div>
                                        )}
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </TabsContent>
                    <TabsContent value="cross" className="m-0">
                      <div className="bg-muted/50 rounded-md p-6 text-center">
                        <Network className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <h3 className="text-lg font-medium mb-2">{t("crossDisciplinaryInsights")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("discoverConnections")}
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="hypotheses" className="m-0">
                      <HypothesisTracker />
                    </TabsContent>
                    <TabsContent value="debates" className="m-0">
                      <DebatePanel />
                    </TabsContent>
                  </ScrollArea>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>

        <Collapsible open={knowledgeGraphOpen} onOpenChange={setKnowledgeGraphOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover-elevate">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {knowledgeGraphOpen ? (
                    <ChevronDown className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-primary" />
                  )}
                  <Network className="h-4 w-4 text-primary" />
                  {t("knowledgeGraph")}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div
                  className="bg-muted/50 rounded-md h-48 flex items-center justify-center border"
                  data-testid="knowledge-graph-placeholder"
                >
                  <div className="text-center">
                    <Network className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">{t("knowledgeGraphVisualization")}</p>
                    <p className="text-xs text-muted-foreground">{t("interactiveConceptMapping")}</p>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={bottomPanelOpen} onOpenChange={setBottomPanelOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover-elevate">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  {bottomPanelOpen ? (
                    <ChevronDown className="h-4 w-4 text-primary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-primary" />
                  )}
                  <BookOpen className="h-4 w-4 text-primary" />
                  {t("researchTools")}
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Tabs value={bottomActiveTab} onValueChange={setBottomActiveTab}>
                  <TabsList className="mb-3">
                    <TabsTrigger
                      value="hypotheses"
                      data-testid="tab-bottom-hypotheses"
                    >
                      {t("hypothesisTracker")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="actions"
                      data-testid="tab-bottom-actions"
                    >
                      {t("actionsQueue")}
                    </TabsTrigger>
                    <TabsTrigger
                      value="bibliography"
                      data-testid="tab-bottom-bibliography"
                    >
                      {t("bibliography")}
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="hypotheses" className="m-0">
                    <HypothesisTracker variant="compact" />
                  </TabsContent>
                  <TabsContent value="actions" className="m-0">
                    <div className="bg-muted/50 rounded-md p-4 border">
                      <p className="text-sm text-muted-foreground text-center">
                        {t("actionsQueueDesc")}
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="bibliography" className="m-0">
                    <div className="bg-muted/50 rounded-md p-4 border">
                      <p className="text-sm text-muted-foreground text-center">
                        {t("bibliographyDesc")}
                      </p>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </div>
  );
}
