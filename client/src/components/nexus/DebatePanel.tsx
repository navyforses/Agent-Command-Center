import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Scale,
  AlertTriangle,
  HelpCircle,
  Flag,
} from "lucide-react";
import { useState } from "react";
import type { NexusDebate } from "@shared/schema";

interface DebatePanelProps {
  variant?: "full" | "compact";
}

interface DebatePosition {
  statement: string;
  supportingAIs: string[];
  evidence: string[];
}

const priorityConfig = {
  high: { label: "High Priority", colorClass: "text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30" },
  medium: { label: "Medium Priority", colorClass: "text-amber-600 bg-amber-100 dark:text-amber-400 dark:bg-amber-900/30" },
  low: { label: "Low Priority", colorClass: "text-muted-foreground bg-muted" },
};

const aiAgentColors: Record<string, string> = {
  claude: "bg-[hsl(var(--ai-claude))]",
  chatgpt: "bg-[hsl(var(--ai-chatgpt))]",
  grok: "bg-[hsl(var(--ai-grok))]",
  gemini: "bg-[hsl(var(--ai-gemini))]",
  perplexity: "bg-[hsl(var(--ai-perplexity))]",
};

const aiAgentNames: Record<string, string> = {
  claude: "Claude",
  chatgpt: "ChatGPT",
  grok: "Grok",
  gemini: "Gemini",
  perplexity: "Perplexity",
};

function PositionCard({
  position,
  side,
  debateId,
}: {
  position: DebatePosition | null;
  side: "A" | "B";
  debateId: number;
}) {
  if (!position) {
    return (
      <div className="flex-1 bg-muted/30 rounded-md p-4 text-center">
        <HelpCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Position {side} not defined</p>
      </div>
    );
  }

  return (
    <Card className={`flex-1 overflow-visible ${side === "A" ? "border-l-2 border-l-blue-500" : "border-l-2 border-l-orange-500"}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={side === "A" ? "default" : "secondary"} data-testid={`badge-position-${side}-${debateId}`}>
            Position {side}
          </Badge>
          <div className="flex items-center gap-1">
            {position.supportingAIs.map((ai) => {
              const aiLower = ai.toLowerCase();
              return (
                <div
                  key={ai}
                  className={`w-3 h-3 rounded-full ${aiAgentColors[aiLower] || "bg-muted-foreground"}`}
                  title={aiAgentNames[aiLower] || ai}
                  data-testid={`ai-supporter-${aiLower}-${side}-${debateId}`}
                />
              );
            })}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        <p className="text-sm font-medium" data-testid={`position-statement-${side}-${debateId}`}>
          {position.statement}
        </p>
        {position.evidence.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Evidence:</p>
            <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-0.5">
              {position.evidence.map((item, i) => (
                <li key={i} data-testid={`evidence-${side}-${i}-${debateId}`}>{item}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="flex items-center gap-1 pt-1">
          <span className="text-xs text-muted-foreground">Supported by:</span>
          {position.supportingAIs.map((ai) => {
            const aiLower = ai.toLowerCase();
            return (
              <Badge key={ai} variant="outline" className="text-xs" data-testid={`badge-supporter-${aiLower}-${side}-${debateId}`}>
                <div className={`w-2 h-2 rounded-full ${aiAgentColors[aiLower] || "bg-muted-foreground"} mr-1`} />
                {aiAgentNames[aiLower] || ai}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function DebateCard({ debate }: { debate: NexusDebate }) {
  const [expanded, setExpanded] = useState(false);
  
  const priority = (debate.priority as keyof typeof priorityConfig) || "medium";
  const config = priorityConfig[priority] || priorityConfig.medium;
  
  const positionA = debate.positionA as DebatePosition | null;
  const positionB = debate.positionB as DebatePosition | null;

  return (
    <Card className="overflow-visible" data-testid={`debate-card-${debate.id}`}>
      <Collapsible open={expanded} onOpenChange={setExpanded}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-4 w-4 text-primary" />
                <Badge className={`text-xs ${config.colorClass}`} data-testid={`badge-priority-${debate.id}`}>
                  <Flag className="h-3 w-3 mr-1" />
                  {config.label}
                </Badge>
                {debate.status && (
                  <Badge variant="outline" className="text-xs" data-testid={`badge-debate-status-${debate.id}`}>
                    {debate.status}
                  </Badge>
                )}
              </div>
              <CollapsibleTrigger asChild>
                <button className="text-left w-full">
                  <h4 className="font-medium text-sm leading-snug" data-testid={`debate-question-${debate.id}`}>
                    {debate.question}
                  </h4>
                </button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" data-testid={`button-expand-debate-${debate.id}`}>
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          </div>
          
          {!expanded && (
            <div className="flex items-center gap-4 mt-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-xs text-muted-foreground">
                  Position A: {positionA?.supportingAIs?.length || 0} AIs
                </span>
              </div>
              <span className="text-xs text-muted-foreground">vs</span>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-xs text-muted-foreground">
                  Position B: {positionB?.supportingAIs?.length || 0} AIs
                </span>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            <div className="flex gap-4 flex-col md:flex-row">
              <PositionCard position={positionA} side="A" debateId={debate.id} />
              <div className="flex items-center justify-center">
                <div className="bg-muted rounded-full p-2">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
              <PositionCard position={positionB} side="B" debateId={debate.id} />
            </div>
            
            {debate.resolutionNeeded && (
              <div className="bg-muted/50 rounded-md p-3 border">
                <div className="flex items-center gap-2 mb-1">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Resolution Needed</span>
                </div>
                <p className="text-sm text-muted-foreground" data-testid={`resolution-needed-${debate.id}`}>
                  {debate.resolutionNeeded}
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

function DebatePanelSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 mb-2">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}

export function DebatePanel({ variant = "full" }: DebatePanelProps) {
  const { data: debates, isLoading, error } = useQuery<NexusDebate[]>({
    queryKey: ["/api/nexus/debates"],
  });

  if (isLoading) {
    return <DebatePanelSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-destructive/10 text-destructive rounded-md p-4 text-center">
        <AlertTriangle className="h-6 w-6 mx-auto mb-2" />
        <p className="text-sm">Failed to load debates</p>
      </div>
    );
  }

  if (!debates || debates.length === 0) {
    return (
      <div className="bg-muted/50 rounded-md p-6 text-center border">
        <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
        <h3 className="text-lg font-medium mb-2">No Active Debates</h3>
        <p className="text-sm text-muted-foreground">
          When AI agents disagree on research findings, debates will appear here for resolution.
        </p>
      </div>
    );
  }

  const groupedByPriority = debates.reduce((acc, d) => {
    const priority = d.priority || "medium";
    if (!acc[priority]) acc[priority] = [];
    acc[priority].push(d);
    return acc;
  }, {} as Record<string, NexusDebate[]>);

  if (variant === "compact") {
    return (
      <div className="space-y-2">
        {debates.slice(0, 3).map((debate) => (
          <div
            key={debate.id}
            className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
            data-testid={`debate-compact-${debate.id}`}
          >
            <Scale className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="text-sm truncate flex-1">{debate.question}</span>
            <Badge variant="outline" className="text-xs flex-shrink-0">
              {debate.priority || "medium"}
            </Badge>
          </div>
        ))}
        {debates.length > 3 && (
          <p className="text-xs text-muted-foreground text-center">
            +{debates.length - 3} more debates
          </p>
        )}
      </div>
    );
  }

  return (
    <ScrollArea className="h-[400px] pr-2">
      <div className="space-y-4">
        {["high", "medium", "low"].map((priority) => {
          const items = groupedByPriority[priority];
          if (!items || items.length === 0) return null;
          
          const config = priorityConfig[priority as keyof typeof priorityConfig];
          
          return (
            <div key={priority} className="space-y-2">
              <div className="flex items-center gap-2 sticky top-0 bg-background py-1 z-10">
                <Flag className={`h-4 w-4 ${config.colorClass.split(" ")[0]}`} />
                <h3 className="text-sm font-medium">{config.label}</h3>
                <Badge variant="outline" className="text-xs">{items.length}</Badge>
              </div>
              <div className="space-y-2 pl-2 border-l-2 border-muted ml-2">
                {items.map((debate) => (
                  <DebateCard key={debate.id} debate={debate} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
}

export default DebatePanel;
