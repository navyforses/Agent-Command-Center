import { useState } from "react";
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
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { FindingCard, Finding } from "@/components/dashboard/FindingCard";
import { HypothesisTracker } from "@/components/nexus/HypothesisTracker";
import { DebatePanel } from "@/components/nexus/DebatePanel";

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

const mockFindings: Finding[] = [
  {
    id: "finding-1",
    title: "Neural Stem Cell Exosome Therapy Shows Promise for Spinal Cord Regeneration",
    summary: "Recent studies demonstrate that exosomes derived from neural stem cells can promote axonal regrowth and functional recovery in spinal cord injury models. The mechanism involves miRNA transfer that modulates local inflammation and activates endogenous repair pathways.",
    consensusLevel: "4/5",
    confidenceScore: 87,
    relevanceScore: 94,
    aiAnalyses: {
      claude: {
        perspective: "The exosome-based approach offers significant advantages over direct stem cell transplantation, including reduced immunogenicity and easier storage/delivery protocols.",
        confidence: 89,
        keyPoints: [
          "Exosomes bypass blood-brain barrier limitations",
          "MicroRNA cargo can be engineered for specific outcomes",
          "Phase I clinical trials show favorable safety profile"
        ],
        concerns: [
          "Standardization of exosome production remains challenging",
          "Long-term effects require further study"
        ],
        uniqueInsights: [
          "Combination with electrical stimulation may enhance efficacy"
        ]
      },
      chatgpt: {
        perspective: "The research represents a paradigm shift from cell replacement to paracrine signaling-based regeneration strategies.",
        confidence: 85,
        keyPoints: [
          "Multiple preclinical models show consistent results",
          "Dosing protocols are becoming standardized"
        ],
        concerns: [
          "Batch-to-batch variability in exosome preparations"
        ],
        uniqueInsights: [
          "Integration with biomaterial scaffolds could improve localization"
        ]
      },
      grok: {
        perspective: "Provocatively, this may obsolete traditional stem cell therapies within a decade. The simplicity of exosome delivery is game-changing.",
        confidence: 82,
        keyPoints: [
          "Manufacturing scalability is more feasible than cell therapy",
          "Off-the-shelf product potential"
        ],
        concerns: [
          "Regulatory pathway still undefined"
        ],
        uniqueInsights: [
          "Consider AI-driven optimization of exosome cargo selection"
        ]
      },
      gemini: {
        perspective: "Multi-omic analysis reveals complex signaling networks activated by exosome therapy, suggesting multiple regenerative mechanisms work in concert.",
        confidence: 88,
        keyPoints: [
          "Proteomics identifies novel biomarkers for response prediction",
          "Single-cell analysis shows heterogeneous cell responses"
        ],
        concerns: [
          "Computational models need validation in larger cohorts"
        ],
        uniqueInsights: [
          "Network analysis suggests unexpected role for astrocyte signaling"
        ]
      },
      perplexity: {
        perspective: "Based on 47 recent publications, exosome therapy for spinal cord injury has shown 68% functional improvement rate in animal models with minimal adverse events.",
        confidence: 91,
        keyPoints: [
          "Meta-analysis supports efficacy across multiple species",
          "2024 publications show accelerating research interest"
        ],
        concerns: [
          "Publication bias toward positive results likely present"
        ],
        uniqueInsights: [
          "Emerging research from Asian institutions leading innovation"
        ]
      }
    },
    disciplinaryAnalyses: {
      "Neuroscience": "Synaptic plasticity mechanisms are enhanced through BDNF upregulation mediated by exosomal miR-124.",
      "Cell Biology": "Exosome uptake by microglia shifts their phenotype from M1 to M2, reducing neuroinflammation.",
      "Pharmacology": "Optimal dosing appears to be 100-200 micrograms per injection site, administered weekly."
    },
    sources: [
      { title: "Exosome-mediated repair in spinal cord injury", url: "https://example.com/study1", doi: "10.1038/s41593-024-01234" },
      { title: "Neural stem cell exosomes: mechanisms and applications", url: "https://example.com/study2", doi: "10.1016/j.stemcr.2024.02.001" },
      { title: "Clinical translation of exosome therapies", url: "https://example.com/study3" }
    ],
    createdAt: new Date("2024-12-06T14:30:00")
  },
  {
    id: "finding-2",
    title: "CRISPR-Based Gene Therapy Restores Dopaminergic Function in Parkinson's Disease Models",
    summary: "Novel CRISPR-Cas9 delivery systems using AAV vectors successfully edited SNCA gene mutations in dopaminergic neurons, resulting in restored dopamine production and improved motor function in primate models.",
    consensusLevel: "5/5",
    confidenceScore: 92,
    relevanceScore: 89,
    aiAnalyses: {
      claude: {
        perspective: "This represents the most promising genetic intervention for Parkinson's disease to date, with direct correction of causative mutations rather than symptomatic treatment.",
        confidence: 94,
        keyPoints: [
          "AAV9 vector shows excellent neurotropism",
          "Off-target editing rates below 0.1%",
          "Sustained correction observed at 18-month follow-up"
        ],
        concerns: [
          "Pre-existing AAV immunity may limit patient eligibility",
          "Cost of individualized therapy remains prohibitive"
        ],
        uniqueInsights: [
          "Base editing may further improve safety profile"
        ]
      },
      chatgpt: {
        perspective: "The convergence of improved CRISPR specificity and optimized viral delivery marks a breakthrough moment for neurodegenerative disease treatment.",
        confidence: 90,
        keyPoints: [
          "Primate studies bridge critical gap to human translation",
          "Biomarker normalization precedes clinical improvement"
        ],
        concerns: [
          "Long-term genomic stability needs monitoring"
        ],
        uniqueInsights: [
          "Combinatorial approaches targeting multiple genes may be next frontier"
        ]
      },
      grok: {
        perspective: "The real question is when, not if, this becomes standard of care. Regulatory bodies need to accelerate approval pathways for these transformative therapies.",
        confidence: 88,
        keyPoints: [
          "Technology is ready; infrastructure is not",
          "Gene therapy manufacturing needs 10x scale-up"
        ],
        concerns: [
          "Equity of access will be major societal challenge"
        ],
        uniqueInsights: [
          "Decentralized manufacturing could democratize access"
        ]
      },
      gemini: {
        perspective: "Integrated analysis of transcriptomic, proteomic, and metabolomic data confirms restoration of dopaminergic pathway integrity following gene correction.",
        confidence: 93,
        keyPoints: [
          "Systems biology approach validates mechanism",
          "Predictive models identify optimal treatment timing"
        ],
        concerns: [
          "Inter-individual variability in response observed"
        ],
        uniqueInsights: [
          "Machine learning can predict responders vs non-responders"
        ]
      },
      perplexity: {
        perspective: "Current literature shows 89% success rate in restoring dopamine levels to near-normal ranges in treated animal models across 23 independent studies.",
        confidence: 95,
        keyPoints: [
          "Highly reproducible results across research groups",
          "Multiple delivery routes showing efficacy"
        ],
        concerns: [
          "Human trial data still limited to Phase I"
        ],
        uniqueInsights: [
          "China and US leading clinical trial recruitment"
        ]
      }
    },
    disciplinaryAnalyses: {
      "Molecular Biology": "Guide RNA optimization achieved 99.7% on-target editing efficiency with Cas9-HF variant.",
      "Medicine": "Early-stage patients show more robust response, suggesting neuroprotective window is critical.",
      "Biomedical Eng": "Novel lipid nanoparticle formulations may offer non-viral alternative delivery."
    },
    sources: [
      { title: "CRISPR correction of SNCA mutations in primate PD models", url: "https://example.com/pd-study1", doi: "10.1126/science.2024.abc1234" },
      { title: "AAV-mediated gene therapy for Parkinson's disease", url: "https://example.com/pd-study2", doi: "10.1056/NEJMoa2024567" }
    ],
    createdAt: new Date("2024-12-05T09:15:00")
  },
  {
    id: "finding-3",
    title: "Bioelectric Signaling Patterns Direct Neural Tissue Regeneration",
    summary: "Mapping of endogenous bioelectric gradients in regenerating neural tissue reveals conserved voltage patterns that can be artificially induced to promote regeneration in normally non-regenerative species, including mammals.",
    consensusLevel: "3/5",
    confidenceScore: 74,
    relevanceScore: 82,
    aiAnalyses: {
      claude: {
        perspective: "Bioelectricity represents an underexplored control layer in regeneration. The ability to reprogram tissue fate through electrical signals offers entirely new therapeutic modalities.",
        confidence: 78,
        keyPoints: [
          "Ion channel drugs can modulate regenerative capacity",
          "Non-invasive stimulation protocols show promise"
        ],
        concerns: [
          "Mechanistic understanding remains incomplete",
          "Reproducibility across labs is inconsistent"
        ],
        uniqueInsights: [
          "Connection to developmental biology principles is key"
        ]
      },
      chatgpt: {
        perspective: "This emerging field bridges electrophysiology and regenerative medicine in exciting ways, though significant validation work remains.",
        confidence: 72,
        keyPoints: [
          "Conceptual framework is compelling",
          "Early results warrant further investigation"
        ],
        concerns: [
          "Technical challenges in measuring bioelectric states",
          "Limited clinical translation pathway"
        ],
        uniqueInsights: [
          "Wearable bioelectric devices could enable continuous therapy"
        ]
      },
      grok: {
        perspective: "Bold claims require bold evidence. While intriguing, the field needs more rigorous controlled studies before mainstream acceptance.",
        confidence: 65,
        keyPoints: [
          "Paradigm-shifting if validated",
          "Low-risk intervention profile is attractive"
        ],
        concerns: [
          "Skepticism from traditional research community",
          "Funding challenges for unconventional approaches"
        ],
        uniqueInsights: [
          "Citizen science initiatives could accelerate data collection"
        ]
      },
      gemini: {
        perspective: "Computational modeling of bioelectric networks reveals emergent properties that could explain pattern formation in regeneration.",
        confidence: 76,
        keyPoints: [
          "Network topology predicts regenerative outcomes",
          "Agent-based models match experimental observations"
        ],
        concerns: [
          "Model parameters require extensive calibration"
        ],
        uniqueInsights: [
          "Integration with optogenetics enables precise control"
        ]
      },
      perplexity: {
        perspective: "Analysis of 34 publications shows growing interest but mixed results. Approximately 60% of studies report positive regenerative effects from bioelectric manipulation.",
        confidence: 70,
        keyPoints: [
          "Field is in early growth phase",
          "Standardization of protocols needed"
        ],
        concerns: [
          "Small sample sizes in most studies",
          "Heterogeneous methodology complicates meta-analysis"
        ],
        uniqueInsights: [
          "Tufts University group leading fundamental research"
        ]
      }
    },
    disciplinaryAnalyses: {
      "Physics": "Transmembrane voltage gradients of -40 to -60mV correlate with regenerative competence in neural progenitors.",
      "Neuroscience": "Gap junction communication propagates bioelectric signals across neural populations.",
      "Systems Biology": "Bioelectric signaling integrates with known biochemical pathways including Wnt and Notch."
    },
    sources: [
      { title: "Bioelectric control of neural regeneration", url: "https://example.com/bioelectric1", doi: "10.1016/j.cub.2024.03.010" },
      { title: "Voltage patterns in regenerative biology", url: "https://example.com/bioelectric2" }
    ],
    createdAt: new Date("2024-12-04T16:45:00")
  }
];

export default function NexusOmega() {
  const { t } = useLanguage();
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

  const handleDisciplineToggle = (discipline: string) => {
    setSelectedDisciplines((prev) =>
      prev.includes(discipline)
        ? prev.filter((d) => d !== discipline)
        : [...prev, discipline]
    );
  };

  const handleSearch = () => {
    if (!query.trim()) return;
    setAiStatuses(Object.fromEntries(aiAgents.map((a) => [a.id, "searching"])));
    setTimeout(() => {
      setAiStatuses(Object.fromEntries(aiAgents.map((a) => [a.id, "analyzing"])));
      setTimeout(() => {
        setAiStatuses(Object.fromEntries(aiAgents.map((a) => [a.id, "ready"])));
      }, 2000);
    }, 1500);
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
              <Button
                onClick={handleSearch}
                data-testid="button-omega-search"
              >
                <Zap className="h-4 w-4 mr-2" />
                OMEGA
              </Button>
            </div>

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
                        {mockFindings.map((finding) => (
                          <FindingCard
                            key={finding.id}
                            finding={finding}
                          />
                        ))}
                      </div>
                    </TabsContent>
                    <TabsContent value="individual" className="m-0">
                      <div className="space-y-6 pr-2">
                        {aiAgents.map((agent) => (
                          <div key={agent.id} className="space-y-3">
                            <div className="flex items-center gap-2 sticky top-0 bg-background py-2 z-10">
                              <div className={`w-3 h-3 rounded-full ${agent.colorClass}`} />
                              <h3 className="font-semibold text-base" data-testid={`heading-ai-${agent.id}`}>
                                {agent.name} {t("perspectives")}
                              </h3>
                            </div>
                            <div className="space-y-3 pl-2 border-l-2 border-muted ml-1.5">
                              {mockFindings.map((finding) => {
                                const analysis = finding.aiAnalyses[agent.id as keyof typeof finding.aiAnalyses];
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
                        ))}
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
