import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { DebatePanel, HypothesisTracker } from "@/components/nexus";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Brain,
  Search,
  Sparkles,
  MessageSquare,
  Lightbulb,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
  Bot,
  Users
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface AIStatus {
  name: string;
  available: boolean;
  role: string;
}

interface NexusFinding {
  id: number;
  title: string;
  titleKa?: string;
  summary: string;
  summaryKa?: string;
  consensusLevel: "low" | "moderate" | "high" | "unanimous";
  confidence: number;
  createdAt: string;
}

export default function Nexus() {
  const { language, t } = useLanguage();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch AI status
  const { data: aiStatus, isLoading: aiLoading } = useQuery<AIStatus[]>({
    queryKey: ["/api/nexus/ai-status"],
    queryFn: async () => {
      const res = await fetch("/api/nexus/ai-status", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Fetch recent findings
  const { data: findings, isLoading: findingsLoading } = useQuery<NexusFinding[]>({
    queryKey: ["/api/nexus/findings"],
    queryFn: async () => {
      const res = await fetch("/api/nexus/findings?limit=10", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Research mutation
  const researchMutation = useMutation({
    mutationFn: async (query: string) => {
      return apiRequest("POST", "/api/nexus/query", { query });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nexus/findings"] });
      setSearchQuery("");
    },
  });

  const handleResearch = () => {
    if (searchQuery.trim()) {
      researchMutation.mutate(searchQuery);
    }
  };

  const getConsensusColor = (level: string) => {
    switch (level) {
      case "unanimous": return "bg-green-500";
      case "high": return "bg-blue-500";
      case "moderate": return "bg-yellow-500";
      case "low": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  const getConsensusLabel = (level: string) => {
    const labels: Record<string, { en: string; ka: string }> = {
      unanimous: { en: "Unanimous", ka: "ერთხმად" },
      high: { en: "High", ka: "მაღალი" },
      moderate: { en: "Moderate", ka: "საშუალო" },
      low: { en: "Low", ka: "დაბალი" },
    };
    return labels[level]?.[language] || level;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Brain className="h-8 w-8 text-purple-500" />
        <div>
          <h1 className="text-2xl font-bold">
            {language === "ka" ? "NEXUS OMEGA" : "NEXUS OMEGA"}
          </h1>
          <p className="text-muted-foreground">
            {language === "ka"
              ? "მრავალ-AI კვლევის ორქესტრატორი"
              : "Multi-AI Research Orchestrator"}
          </p>
        </div>
      </div>

      {/* AI Agents Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            {language === "ka" ? "AI აგენტები" : "AI Agents"}
          </CardTitle>
          <CardDescription>
            {language === "ka"
              ? "5 სპეციალიზებული AI აგენტი პარალელური კვლევისთვის"
              : "5 specialized AI agents for parallel research"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {aiLoading ? (
            <div className="flex gap-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-24" />
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(aiStatus || [
                { name: "Claude", available: true, role: "Chief Analyst" },
                { name: "GPT-4", available: true, role: "Creative Solver" },
                { name: "Grok", available: true, role: "Contrarian" },
                { name: "Gemini", available: true, role: "Researcher" },
                { name: "Perplexity", available: true, role: "Fact Checker" },
              ]).map((agent) => (
                <Badge
                  key={agent.name}
                  variant={agent.available ? "default" : "secondary"}
                  className="flex items-center gap-1 px-3 py-1"
                >
                  <Bot className="h-3 w-3" />
                  <span className="font-medium">{agent.name}</span>
                  {agent.available ? (
                    <CheckCircle className="h-3 w-3 text-green-400" />
                  ) : (
                    <AlertCircle className="h-3 w-3 text-red-400" />
                  )}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Research Input */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="h-5 w-5" />
            {language === "ka" ? "კვლევის დაწყება" : "Start Research"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Textarea
              placeholder={language === "ka"
                ? "შეიყვანეთ კვლევის საკითხი..."
                : "Enter your research query..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="min-h-[80px]"
            />
          </div>
          <Button
            onClick={handleResearch}
            disabled={researchMutation.isPending || !searchQuery.trim()}
            className="mt-3"
          >
            {researchMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "ka" ? "მიმდინარეობს..." : "Processing..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {language === "ka" ? "კვლევის დაწყება" : "Start Research"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {language === "ka" ? "მიმოხილვა" : "Overview"}
          </TabsTrigger>
          <TabsTrigger value="debates" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {language === "ka" ? "დებატები" : "Debates"}
          </TabsTrigger>
          <TabsTrigger value="hypotheses" className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4" />
            {language === "ka" ? "ჰიპოთეზები" : "Hypotheses"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {language === "ka" ? "ბოლო აღმოჩენები" : "Recent Findings"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {findingsLoading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-24 w-full" />
                  ))}
                </div>
              ) : findings && findings.length > 0 ? (
                <div className="space-y-4">
                  {findings.map((finding) => (
                    <div
                      key={finding.id}
                      className="p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium">
                          {language === "ka" && finding.titleKa
                            ? finding.titleKa
                            : finding.title}
                        </h3>
                        <Badge className={getConsensusColor(finding.consensusLevel)}>
                          {getConsensusLabel(finding.consensusLevel)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {language === "ka" && finding.summaryKa
                          ? finding.summaryKa
                          : finding.summary}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          {finding.confidence}% {language === "ka" ? "სანდოობა" : "confidence"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(finding.createdAt).toLocaleDateString(
                            language === "ka" ? "ka-GE" : "en-US"
                          )}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>
                    {language === "ka"
                      ? "აღმოჩენები არ არის. დაიწყეთ კვლევა ზემოთ."
                      : "No findings yet. Start a research query above."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debates" className="mt-4">
          <DebatePanel variant="full" />
        </TabsContent>

        <TabsContent value="hypotheses" className="mt-4">
          <HypothesisTracker variant="full" originFilter="nexus" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
