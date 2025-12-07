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

interface AIAgent {
  id: string;
  name: string;
  color: string;
  status: "ready" | "searching" | "analyzing" | "idle";
}

const aiAgents: AIAgent[] = [
  { id: "claude", name: "Claude", color: "bg-violet-500", status: "ready" },
  { id: "chatgpt", name: "ChatGPT", color: "bg-emerald-500", status: "ready" },
  { id: "grok", name: "Grok", color: "bg-blue-500", status: "ready" },
  { id: "gemini", name: "Gemini", color: "bg-amber-500", status: "ready" },
  { id: "perplexity", name: "Perplexity", color: "bg-orange-500", status: "ready" },
];

const disciplineCategories = [
  {
    name: "Life Sciences",
    icon: Dna,
    disciplines: ["Neuroscience", "Cell Biology", "Molecular Biology", "Biochemistry", "Pharmacology", "Medicine"],
  },
  {
    name: "Physical Sciences",
    icon: Atom,
    disciplines: ["Physics", "Chemistry", "Quantum Biology"],
  },
  {
    name: "Mathematical Sciences",
    icon: Calculator,
    disciplines: ["Mathematics", "Statistics", "Network Theory"],
  },
  {
    name: "Engineering",
    icon: Cpu,
    disciplines: ["Biomedical Eng", "Materials Science", "Nanotechnology", "Computer Science"],
  },
  {
    name: "Cross-Disciplinary",
    icon: GitBranch,
    disciplines: ["Systems Biology", "Cybernetics"],
  },
];

const researchFocusOptions = ["Stem Cells", "Gene Therapy", "Exosomes", "Biomaterials", "All"];

const quickCommands = [
  { label: "/omega", description: "Full synthesis" },
  { label: "/scan", description: "Quick scan" },
  { label: "/consensus", description: "AI consensus" },
  { label: "/debate", description: "AI debate" },
  { label: "/discipline", description: "By field" },
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-violet-600 rounded-md">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white" data-testid="text-page-title">
              {t("nexusOmega")}
            </h1>
            <p className="text-sm text-slate-400">Multi-AI Neuroregeneration Research Platform</p>
          </div>
        </div>

        <Card className="bg-slate-900 border-slate-700">
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
                      className={`w-3 h-3 rounded-full ${agent.color} ${
                        isActive ? "animate-pulse" : ""
                      }`}
                    />
                    <span className="text-sm font-medium text-slate-200">{agent.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs border-slate-600 ${
                        status === "ready"
                          ? "text-emerald-400"
                          : status === "searching"
                          ? "text-amber-400"
                          : status === "analyzing"
                          ? "text-violet-400"
                          : "text-slate-500"
                      }`}
                      data-testid={`badge-status-${agent.id}`}
                    >
                      {status}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="p-4 space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter research topic or question..."
                  className="pl-10 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 focus-visible:ring-violet-500"
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  data-testid="input-search-query"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-violet-600 hover:bg-violet-700 text-white font-bold px-6"
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
                  className="bg-slate-800/50 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
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
            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Beaker className="h-4 w-4 text-violet-400" />
                  Disciplines
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <ScrollArea className="h-[300px] pr-3">
                  <div className="space-y-4">
                    {disciplineCategories.map((category) => (
                      <div key={category.name} className="space-y-2">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-wide">
                          <category.icon className="h-3 w-3" />
                          {category.name}
                        </div>
                        <div className="space-y-1 pl-1">
                          {category.disciplines.map((discipline) => (
                            <div key={discipline} className="flex items-center gap-2">
                              <Checkbox
                                id={`discipline-${discipline}`}
                                checked={selectedDisciplines.includes(discipline)}
                                onCheckedChange={() => handleDisciplineToggle(discipline)}
                                className="border-slate-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
                                data-testid={`checkbox-discipline-${discipline.toLowerCase().replace(/\s+/g, "-")}`}
                              />
                              <Label
                                htmlFor={`discipline-${discipline}`}
                                className="text-sm text-slate-300 cursor-pointer"
                              >
                                {discipline}
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

            <Card className="bg-slate-900 border-slate-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Brain className="h-4 w-4 text-violet-400" />
                  Research Focus
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                <RadioGroup
                  value={researchFocus}
                  onValueChange={setResearchFocus}
                  className="space-y-2"
                >
                  {researchFocusOptions.map((option) => (
                    <div key={option} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={option}
                        id={`focus-${option}`}
                        className="border-slate-600 text-violet-600"
                        data-testid={`radio-focus-${option.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                      <Label
                        htmlFor={`focus-${option}`}
                        className="text-sm text-slate-300 cursor-pointer"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>
          </div>

          <div className="flex-1 min-w-0">
            <Card className="bg-slate-900 border-slate-700">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <CardHeader className="pb-0">
                  <TabsList className="bg-slate-800 border border-slate-700">
                    <TabsTrigger
                      value="consensus"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                      data-testid="tab-consensus"
                    >
                      <Activity className="h-4 w-4 mr-1" />
                      Consensus
                    </TabsTrigger>
                    <TabsTrigger
                      value="individual"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                      data-testid="tab-individual"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Individual AI
                    </TabsTrigger>
                    <TabsTrigger
                      value="cross"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                      data-testid="tab-cross-disciplinary"
                    >
                      <Network className="h-4 w-4 mr-1" />
                      Cross-Disciplinary
                    </TabsTrigger>
                    <TabsTrigger
                      value="hypotheses"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                      data-testid="tab-hypotheses"
                    >
                      <Lightbulb className="h-4 w-4 mr-1" />
                      Hypotheses
                    </TabsTrigger>
                    <TabsTrigger
                      value="debates"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                      data-testid="tab-debates"
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      Debates
                    </TabsTrigger>
                  </TabsList>
                </CardHeader>
                <CardContent className="p-4">
                  <ScrollArea className="h-[400px]">
                    <TabsContent value="consensus" className="m-0">
                      <div className="bg-slate-800/50 rounded-md p-6 text-center">
                        <Activity className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-300 mb-2">AI Consensus View</h3>
                        <p className="text-sm text-slate-500">
                          Enter a research query to see synthesized consensus from all AI agents across
                          selected disciplines.
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="individual" className="m-0">
                      <div className="bg-slate-800/50 rounded-md p-6 text-center">
                        <MessageSquare className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-300 mb-2">Individual AI Responses</h3>
                        <p className="text-sm text-slate-500">
                          View separate responses from each AI agent for detailed comparison.
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="cross" className="m-0">
                      <div className="bg-slate-800/50 rounded-md p-6 text-center">
                        <Network className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-300 mb-2">Cross-Disciplinary Insights</h3>
                        <p className="text-sm text-slate-500">
                          Discover connections between different fields of research.
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="hypotheses" className="m-0">
                      <div className="bg-slate-800/50 rounded-md p-6 text-center">
                        <Lightbulb className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-300 mb-2">Generated Hypotheses</h3>
                        <p className="text-sm text-slate-500">
                          AI-generated research hypotheses based on cross-disciplinary analysis.
                        </p>
                      </div>
                    </TabsContent>
                    <TabsContent value="debates" className="m-0">
                      <div className="bg-slate-800/50 rounded-md p-6 text-center">
                        <MessageSquare className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-300 mb-2">AI Debates</h3>
                        <p className="text-sm text-slate-500">
                          Watch AI agents debate different perspectives on research topics.
                        </p>
                      </div>
                    </TabsContent>
                  </ScrollArea>
                </CardContent>
              </Tabs>
            </Card>
          </div>
        </div>

        <Collapsible open={knowledgeGraphOpen} onOpenChange={setKnowledgeGraphOpen}>
          <Card className="bg-slate-900 border-slate-700">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-slate-800/50 transition-colors">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  {knowledgeGraphOpen ? (
                    <ChevronDown className="h-4 w-4 text-violet-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-violet-400" />
                  )}
                  <Network className="h-4 w-4 text-violet-400" />
                  Knowledge Graph
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <div
                  className="bg-slate-800/50 rounded-md h-48 flex items-center justify-center border border-slate-700"
                  data-testid="knowledge-graph-placeholder"
                >
                  <div className="text-center">
                    <Network className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">Knowledge Graph Visualization</p>
                    <p className="text-xs text-slate-600">Interactive concept mapping will appear here</p>
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Collapsible open={bottomPanelOpen} onOpenChange={setBottomPanelOpen}>
          <Card className="bg-slate-900 border-slate-700">
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-slate-800/50 transition-colors">
                <CardTitle className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  {bottomPanelOpen ? (
                    <ChevronDown className="h-4 w-4 text-violet-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-violet-400" />
                  )}
                  <BookOpen className="h-4 w-4 text-violet-400" />
                  Research Tools
                </CardTitle>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <Tabs value={bottomActiveTab} onValueChange={setBottomActiveTab}>
                  <TabsList className="bg-slate-800 border border-slate-700 mb-3">
                    <TabsTrigger
                      value="hypotheses"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                      data-testid="tab-bottom-hypotheses"
                    >
                      Hypothesis Tracker
                    </TabsTrigger>
                    <TabsTrigger
                      value="actions"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                      data-testid="tab-bottom-actions"
                    >
                      Actions Queue
                    </TabsTrigger>
                    <TabsTrigger
                      value="bibliography"
                      className="data-[state=active]:bg-violet-600 data-[state=active]:text-white"
                      data-testid="tab-bottom-bibliography"
                    >
                      Bibliography
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="hypotheses" className="m-0">
                    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700">
                      <p className="text-sm text-slate-500 text-center">
                        Track and manage research hypotheses generated during your sessions.
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="actions" className="m-0">
                    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700">
                      <p className="text-sm text-slate-500 text-center">
                        Queue of research actions and follow-up tasks.
                      </p>
                    </div>
                  </TabsContent>
                  <TabsContent value="bibliography" className="m-0">
                    <div className="bg-slate-800/50 rounded-md p-4 border border-slate-700">
                      <p className="text-sm text-slate-500 text-center">
                        Auto-generated bibliography from research sources.
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
