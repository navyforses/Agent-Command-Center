import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Calendar, Building, CheckCircle, XCircle, Bookmark, ExternalLink } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface ClinicalTrialCardProps {
  id: string;
  title: string;
  sponsor: string;
  status: "recruiting" | "active" | "completed" | "not_yet_recruiting";
  phase: string;
  location: string;
  distance?: string;
  eligibilityScore: number;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  enrollmentDeadline?: string;
  isSaved?: boolean;
  onSave?: () => void;
  onContact?: () => void;
  onViewDetails?: () => void;
}

export function ClinicalTrialCard({
  id,
  title,
  sponsor,
  status,
  phase,
  location,
  distance,
  eligibilityScore,
  matchedCriteria,
  unmatchedCriteria,
  enrollmentDeadline,
  isSaved = false,
  onSave,
  onContact,
  onViewDetails,
}: ClinicalTrialCardProps) {
  const getStatusVariant = (s: string) => {
    switch (s) {
      case "recruiting": return "default";
      case "active": return "secondary";
      case "completed": return "outline";
      default: return "secondary";
    }
  };

  const getStatusLabel = (s: string) => {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <Card data-testid={`trial-card-${id}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="text-base font-semibold leading-tight">{title}</CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Building className="h-3 w-3" />
              <span>{sponsor}</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSave}
            className={isSaved ? "text-primary" : ""}
            data-testid={`button-save-trial-${id}`}
          >
            <Bookmark className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-2">
          <Badge variant={getStatusVariant(status)}>{getStatusLabel(status)}</Badge>
          <Badge variant="outline">{phase}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span>{location}</span>
            {distance && <span className="text-xs">({distance})</span>}
          </div>
          {enrollmentDeadline && (
            <div className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              <span>Deadline: {enrollmentDeadline}</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Eligibility Match</span>
            <span className="font-semibold">{eligibilityScore}%</span>
          </div>
          <Progress value={eligibilityScore} className="h-2" />
        </div>

        <div className="space-y-2">
          {matchedCriteria.length > 0 && (
            <div className="space-y-1">
              {matchedCriteria.slice(0, 2).map((criteria, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-chart-2">
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{criteria}</span>
                </div>
              ))}
            </div>
          )}
          {unmatchedCriteria.length > 0 && (
            <div className="space-y-1">
              {unmatchedCriteria.slice(0, 1).map((criteria, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <XCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{criteria}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1 gap-1" onClick={onViewDetails} data-testid={`button-view-trial-${id}`}>
            <ExternalLink className="h-3 w-3" />
            Details
          </Button>
          <Button className="flex-1" onClick={onContact} data-testid={`button-contact-trial-${id}`}>
            Contact
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
