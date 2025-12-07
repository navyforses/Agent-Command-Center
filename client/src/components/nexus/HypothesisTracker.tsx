import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Lightbulb,
  ChevronDown,
  ChevronRight,
  ThumbsUp,
  ThumbsDown,
  Beaker,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";
import type { NexusHypothesis } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface HypothesisTrackerProps {
  variant?: "full" | "compact";
}

const statusConfig = {
  nascent: { label: "Nascent", icon: Clock, colorClass: "text-muted-foreground bg-muted" },
  developing: { label: "Developing", icon: TrendingUp, colorClass: "text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30" },
  strong: { label: "Strong", icon: ThumbsUp, colorClass: "text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30" },
  validated: { label: "Validated", icon: CheckCircle, colorClass: "text-emerald-600 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-900/30" },
  refuted: { label: "Refuted", icon: XCircle, colorClass: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30" },
  superseded: { label: "Superseded", icon: AlertTriangle, colorClass: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30" },
};

const aiAgentColors: Record<string, string> = {
  claude: "bg-[hsl(var(--ai-claude))]",
  chatgpt: "bg-[hsl(var(--ai-chatgpt))]",
  grok: "bg-[hsl(var(--ai-grok))]",
  gemini: "bg-[hsl(var(--ai-gemini))]",
  perplexity: "bg-[hsl(var(--ai-perplexity))]",
};

function HypothesisCard({ hypothesis }: { hypothesis: NexusHypothesis }) {
  const [expanded, setExpanded] = useState(false);
  
  const status = hypothesis.status as keyof typeof statusConfig || "nascent";
  const config = statusConfig[status] || statusConfig.nascent;
  const StatusIcon = config.icon;
  
  const supportingEvidence = hypothesis.supportingEvidence as Array<{ source: string; description: string; strength?: number }> | null;
  const contradictingEvidence = hypothesis.contradictingEvidence as Array<{ source: string; description: string; strength?: number }> | null;
  const crossDisciplinaryBasis = hypothesis.crossDisciplinaryBasis as Array<{ fromDiscipline: string; toDiscipline: string; analogy: string }> | null;
  const actionItems = hypothesis.actionItems as Array<{ title: string; description?: string; priority?: string }> | null;
  
  const updateMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      return apiRequest("PATCH", `/api/nexus/hypotheses/${hypothesis.id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/nexus/hypotheses"] });
    },
  });

  return (
    <Card className="overflow-visible" data-testid={`hypothesis-card-${hypothesis.id}`}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {hypothesis.hypothesisCode && (
                  <Badge variant="outline" className="text-xs font-mono" data-testid={`badge-code-${hypothesis.id}`}>
                    {hypothesis.hypothesisCode}
                  </Badge>
                )}
                <Badge className={`text-xs ${config.colorClass}`} data-testid={`badge-status-${hypothesis.id}`}>
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              <CollapsibleTrigger asChild>
                <button className="text-left w-full">
                  <h4 className="font-medium text-sm leading-snug" data-testid={`hypothesis-statement-${hypothesis.id}`}>
                    {hypothesis.statement}
                  </h4>
                </button>
              </CollapsibleTrigger>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {hypothesis.confidenceScore != null && (
                <Badge variant="outline" data-testid={`badge-confidence-${hypothesis.id}`}>
                  {hypothesis.confidenceScore}%
                </Badge>
              )}
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon" data-testid={`button-expand-${hypothesis.id}`}>
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {hypothesis.proposedBy && (
              <div className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${aiAgentColors[hypothesis.proposedBy.toLowerCase()] || "bg-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">Proposed by {hypothesis.proposedBy}</span>
              </div>
            )}
            {hypothesis.supportedBy && hypothesis.supportedBy.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Supported by:</span>
                {hypothesis.supportedBy.map((ai) => (
                  <div
                    key={ai}
                    className={`w-2 h-2 rounded-full ${aiAgentColors[ai.toLowerCase()] || "bg-muted-foreground"}`}
                    title={ai}
                  />
                ))}
              </div>
            )}
          </div>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {supportingEvidence && supportingEvidence.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                  <ThumbsUp className="h-4 w-4" />
                  Supporting Evidence
                </div>
                <div className="space-y-1.5 pl-6">
                  {supportingEvidence.map((evidence, i) => (
                    <div key={i} className="text-sm" data-testid={`evidence-supporting-${i}-${hypothesis.id}`}>
                      <span className="text-muted-foreground">{evidence.description}</span>
                      <span className="text-xs text-muted-foreground ml-2">({evidence.source})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {contradictingEvidence && contradictingEvidence.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400">
                  <ThumbsDown className="h-4 w-4" />
                  Contradicting Evidence
                </div>
                <div className="space-y-1.5 pl-6">
                  {contradictingEvidence.map((evidence, i) => (
                    <div key={i} className="text-sm" data-testid={`evidence-contradicting-${i}-${hypothesis.id}`}>
                      <span className="text-muted-foreground">{evidence.description}</span>
                      <span className="text-xs text-muted-foreground ml-2">({evidence.source})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {crossDisciplinaryBasis && crossDisciplinaryBasis.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Beaker className="h-4 w-4 text-primary" />
                  Cross-Disciplinary Basis
                </div>
                <div className="space-y-1.5 pl-6">
                  {crossDisciplinaryBasis.map((basis, i) => (
                    <div key={i} className="text-sm" data-testid={`cross-disciplinary-${i}-${hypothesis.id}`}>
                      <Badge variant="outline" className="text-xs mr-1">{basis.fromDiscipline}</Badge>
                      <span className="text-muted-foreground mx-1">to</span>
                      <Badge variant="outline" className="text-xs mr-2">{basis.toDiscipline}</Badge>
                      <span className="text-muted-foreground">{basis.analogy}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {hypothesis.testability && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Beaker className="h-4 w-4 text-primary" />
                  Testability
                </div>
                <p className="text-sm text-muted-foreground pl-6" data-testid={`testability-${hypothesis.id}`}>
                  {hypothesis.testability}
                </p>
              </div>
            )}
            
            {actionItems && actionItems.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Action Items
                </div>
                <div className="space-y-1 pl-6">
                  {actionItems.map((action, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm" data-testid={`action-item-${i}-${hypothesis.id}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                      <span className="text-muted-foreground">{action.title}</span>
                      {action.priority && (
                        <Badge variant="outline" className="text-xs">{action.priority}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-2 pt-2 border-t border-muted flex-wrap">
              <span className="text-xs text-muted-foreground">Update status:</span>
              {Object.entries(statusConfig).map(([key, cfg]) => (
                <Button
                  key={key}
                  variant={status === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateMutation.mutate(key)}
                  disabled={updateMutation.isPending || status === key}
                  data-testid={`button-status-${key}-${hypothesis.id}`}
                >
                  <cfg.icon className="h-3 w-3 mr-1" />
                  {cfg.label}
                </Button>
              ))}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function HypothesisTrackerSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function HypothesisTracker({ variant = "full" }: HypothesisTrackerProps) {
  const { data: hypotheses, isLoading, error } = useQuery<NexusHypothesis[]>({
    queryKey: ["/api/nexus/hypotheses"],
  });

  if (isLoading) {
    return <HypothesisTrackerSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-md p-4 text-center">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">Failed to load hypotheses</p>
      </div>
    );
  }

  if (!hypotheses || hypotheses.length === 0) {
    return (
      <div className="bg-muted/50 rounded-md p-6 text-center border">
        <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium mb-2">No Hypotheses Yet</h3>
        <p className="text-sm text-muted-foreground">
          Run an OMEGA research query to generate hypotheses from cross-disciplinary analysis.
        </p>
      </div>
    );
  }

  const groupedByStatus = hypotheses.reduce((acc, h) => {
    const status = h.status || "nascent";
    if (!acc[status]) acc[status] = [];
    acc[status].push(h);
    return acc;
  }, {} as Record<string, NexusHypothesis[]>);

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {hypotheses.slice(0, 5).map((hypothesis) => (
          <div
            key={hypothesis.id}
            className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
            data-testid={`hypothesis-compact-${hypothesis.id}`}
          >
            <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm truncate flex-1">{hypothesis.statement}</span>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {hypothesis.status || "nascent"}
            </Badge>
          </div>
        ))}
        {hypotheses.length > 5 && (
          <p className="text-xs text-muted-foreground text-center">
            +{hypotheses.length - 5} more hypotheses
          </p>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-2">
      <div className="space-y-4">
        {Object.entries(statusConfig).map(([status, config]) => {
          const items = groupedByStatus[status];
          if (!items || items.length === 0) return null;
          
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2 sticky top-0 bg-background py-1 z-10">
                <config.icon className={`h-4 w-4 ${config.colorClass.split(" ")[0]}`} />
                <h3 className="text-sm font-medium">{config.label}</h3>
                <Badge variant="outline" className="text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-muted ml-2">
                {items.map((hypothesis) => (
                  <HypothesisCard key={hypothesis.id} hypothesis={hypothesis} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default HypothesisTracker;
