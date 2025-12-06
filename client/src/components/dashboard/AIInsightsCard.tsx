import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, Lightbulb, ArrowRight, Sparkles } from "lucide-react";

interface Insight {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionLabel?: string;
}

interface AIInsightsCardProps {
  insights: Insight[];
  onViewInsight?: (id: string) => void;
}

export function AIInsightsCard({ insights, onViewInsight }: AIInsightsCardProps) {
  const getPriorityVariant = (priority: Insight["priority"]) => {
    switch (priority) {
      case "high": return "destructive";
      case "medium": return "default";
      case "low": return "secondary";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg font-semibold">AI Insights</CardTitle>
        </div>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" />
          {insights.length} new
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No new insights available</p>
            <p className="text-xs mt-1">Upload documents to get AI analysis</p>
          </div>
        ) : (
          insights.map((insight) => (
            <div
              key={insight.id}
              className="p-3 rounded-md bg-accent/30 border border-accent"
              data-testid={`insight-${insight.id}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary flex-shrink-0" />
                  <h4 className="font-medium text-sm">{insight.title}</h4>
                </div>
                <Badge variant={getPriorityVariant(insight.priority)} className="text-xs">
                  {insight.priority}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-3 pl-6">
                {insight.description}
              </p>
              {insight.actionLabel && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-6 gap-1"
                  onClick={() => onViewInsight?.(insight.id)}
                  data-testid={`button-insight-action-${insight.id}`}
                >
                  {insight.actionLabel}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
