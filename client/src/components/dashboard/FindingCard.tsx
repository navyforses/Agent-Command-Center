import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Star,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Lightbulb,
  FileText,
} from "lucide-react";

interface AIAnalysis {
  perspective: string;
  confidence: number;
  keyPoints: string[];
  concerns: string[];
  uniqueInsights: string[];
}

export interface Finding {
  id: string;
  title: string;
  titleKa?: string | null;
  summary: string;
  summaryKa?: string | null;
  consensusLevel: "5/5" | "4/5" | "3/5" | "2/5" | "1/5";
  confidenceScore: number;
  relevanceScore: number;
  aiAnalyses: Partial<{
    claude: AIAnalysis;
    chatgpt: AIAnalysis;
    grok: AIAnalysis;
    gemini: AIAnalysis;
    perplexity: AIAnalysis;
  }>;
  disciplinaryAnalyses: Record<string, string>;
  sources: Array<{ title: string; url?: string; doi?: string }>;
  createdAt: Date;
}

interface FindingCardProps {
  finding: Finding;
  variant?: "default" | "compact";
}

const aiAgentConfig = [
  { id: "claude", name: "Claude", colorClass: "bg-[hsl(var(--ai-claude))]" },
  { id: "chatgpt", name: "ChatGPT", colorClass: "bg-[hsl(var(--ai-chatgpt))]" },
  { id: "grok", name: "Grok", colorClass: "bg-[hsl(var(--ai-grok))]" },
  { id: "gemini", name: "Gemini", colorClass: "bg-[hsl(var(--ai-gemini))]" },
  { id: "perplexity", name: "Perplexity", colorClass: "bg-[hsl(var(--ai-perplexity))]" },
] as const;

function getStarCount(consensusLevel: Finding["consensusLevel"]): number {
  const match = consensusLevel.match(/^(\d)\/5$/);
  return match ? parseInt(match[1], 10) : 0;
}

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5" data-testid="star-rating">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < count
              ? "fill-amber-500 text-amber-500"
              : "fill-muted text-muted-foreground"
          }`}
        />
      ))}
    </div>
  );
}

export function FindingCard({ finding, variant = "default" }: FindingCardProps) {
  const { language } = useLanguage();
  const [aiPerspectivesOpen, setAiPerspectivesOpen] = useState(false);
  const [disciplinaryOpen, setDisciplinaryOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  const displayTitle = language === "ka" && finding.titleKa ? finding.titleKa : finding.title;
  const displaySummary = language === "ka" && finding.summaryKa ? finding.summaryKa : finding.summary;

  const starCount = getStarCount(finding.consensusLevel);
  const disciplines = Object.keys(finding.disciplinaryAnalyses);

  return (
    <Card
      className="overflow-visible"
      data-testid={`finding-card-${finding.id}`}
    >
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h3
              className="font-semibold text-base leading-snug"
              data-testid={`finding-title-${finding.id}`}
            >
              {finding.title}
            </h3>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
            <StarRating count={starCount} />
            <Badge variant="outline" data-testid={`badge-consensus-${finding.id}`}>
              {finding.consensusLevel} Consensus
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Badge data-testid={`badge-confidence-${finding.id}`}>
            {finding.confidenceScore}% Confidence
          </Badge>
          <Badge
            variant="secondary"
            data-testid={`badge-relevance-${finding.id}`}
          >
            Alexandra Relevance: {finding.relevanceScore}%
          </Badge>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {aiAgentConfig.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-1.5"
              data-testid={`ai-dot-${agent.id}-${finding.id}`}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${agent.colorClass}`} />
              <span className="text-xs text-muted-foreground">{agent.name}</span>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        <p
          className="text-sm text-muted-foreground"
          data-testid={`finding-summary-${finding.id}`}
        >
          {finding.summary}
        </p>

        <Collapsible open={aiPerspectivesOpen} onOpenChange={setAiPerspectivesOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2"
              data-testid={`button-toggle-ai-perspectives-${finding.id}`}
            >
              {aiPerspectivesOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
              AI Perspectives
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <div className="space-y-3 pl-2 border-l-2 border-muted ml-2">
              {aiAgentConfig.map((agent) => {
                const analysis =
                  finding.aiAnalyses[agent.id as keyof typeof finding.aiAnalyses];
                if (!analysis) return null;
                return (
                  <div
                    key={agent.id}
                    className="space-y-2"
                    data-testid={`ai-analysis-${agent.id}-${finding.id}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${agent.colorClass}`} />
                      <span className="text-sm font-medium">{agent.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {analysis.confidence}%
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground pl-4">
                      {analysis.perspective}
                    </p>
                    {analysis.keyPoints.length > 0 && (
                      <div className="pl-4">
                        <p className="text-xs font-medium text-foreground flex items-center gap-1 mb-1">
                          <Lightbulb className="h-3 w-3" />
                          Key Points
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                          {analysis.keyPoints.map((point, i) => (
                            <li key={i}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.concerns.length > 0 && (
                      <div className="pl-4">
                        <p className="text-xs font-medium text-foreground flex items-center gap-1 mb-1">
                          <AlertCircle className="h-3 w-3" />
                          Concerns
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                          {analysis.concerns.map((concern, i) => (
                            <li key={i}>{concern}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {analysis.uniqueInsights.length > 0 && (
                      <div className="pl-4">
                        <p className="text-xs font-medium text-foreground flex items-center gap-1 mb-1">
                          <Star className="h-3 w-3" />
                          Unique Insights
                        </p>
                        <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
                          {analysis.uniqueInsights.map((insight, i) => (
                            <li key={i}>{insight}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {disciplines.length > 0 && (
          <Collapsible open={disciplinaryOpen} onOpenChange={setDisciplinaryOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                data-testid={`button-toggle-disciplinary-${finding.id}`}
              >
                {disciplinaryOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Disciplinary Analyses ({disciplines.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 pl-2 border-l-2 border-muted ml-2">
                {disciplines.map((discipline) => (
                  <div
                    key={discipline}
                    className="space-y-1"
                    data-testid={`discipline-analysis-${discipline.toLowerCase().replace(/\s+/g, "-")}-${finding.id}`}
                  >
                    <p className="text-sm font-medium">{discipline}</p>
                    <p className="text-xs text-muted-foreground pl-2">
                      {finding.disciplinaryAnalyses[discipline]}
                    </p>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {finding.sources.length > 0 && (
          <Collapsible open={sourcesOpen} onOpenChange={setSourcesOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2"
                data-testid={`button-toggle-sources-${finding.id}`}
              >
                {sourcesOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                Sources ({finding.sources.length})
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pt-2">
              <div className="space-y-2 pl-2 border-l-2 border-muted ml-2">
                {finding.sources.map((source, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2"
                    data-testid={`source-${i}-${finding.id}`}
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      {source.url ? (
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm hover:underline flex items-center gap-1"
                          data-testid={`link-source-${i}-${finding.id}`}
                        >
                          {source.title}
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      ) : (
                        <span className="text-sm" data-testid={`text-source-${i}-${finding.id}`}>
                          {source.title}
                        </span>
                      )}
                      {source.doi && (
                        <p className="text-xs text-muted-foreground">
                          DOI: {source.doi}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="pt-2 border-t border-muted">
          <p className="text-xs text-muted-foreground">
            Generated:{" "}
            {finding.createdAt.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default FindingCard;
