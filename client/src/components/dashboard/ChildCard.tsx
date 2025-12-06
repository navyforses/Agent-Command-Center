import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar, FileText, Activity } from "lucide-react";

interface ChildCardProps {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  diagnosis: string;
  severity: "mild" | "moderate" | "severe";
  gmfcsLevel?: number;
  nextAppointment?: string;
  documentsCount: number;
  therapiesCount: number;
  onClick?: () => void;
}

export function ChildCard({
  firstName,
  lastName,
  dateOfBirth,
  diagnosis,
  severity,
  gmfcsLevel,
  nextAppointment,
  documentsCount,
  therapiesCount,
  onClick,
}: ChildCardProps) {
  const initials = `${firstName[0]}${lastName[0]}`.toUpperCase();
  
  const getSeverityVariant = (sev: string) => {
    switch (sev) {
      case "mild": return "secondary";
      case "moderate": return "default";
      case "severe": return "destructive";
      default: return "secondary";
    }
  };

  const calculateAge = (dob: string) => {
    const birthDate = new Date(dob);
    const today = new Date();
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    if (years === 0) {
      return `${months} months`;
    }
    return `${years} years`;
  };

  return (
    <Card className="hover-elevate cursor-pointer" onClick={onClick} data-testid={`card-child-${firstName}`}>
      <CardHeader className="flex flex-row items-start justify-between gap-4 pb-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-lg">{firstName} {lastName}</CardTitle>
            <p className="text-sm text-muted-foreground">{calculateAge(dateOfBirth)}</p>
          </div>
        </div>
        <Badge variant={getSeverityVariant(severity)} className="text-xs">
          {severity.charAt(0).toUpperCase() + severity.slice(1)} {diagnosis}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {gmfcsLevel && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">GMFCS Level:</span>
            <span className="font-medium">{gmfcsLevel}</span>
          </div>
        )}
        
        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{documentsCount} documents</span>
          </div>
          <div className="flex items-center gap-1">
            <Activity className="h-4 w-4" />
            <span>{therapiesCount} therapies</span>
          </div>
        </div>

        {nextAppointment && (
          <div className="flex items-center gap-2 text-sm bg-accent/50 rounded-md p-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span>Next: {nextAppointment}</span>
          </div>
        )}

        <Button variant="outline" className="w-full" data-testid={`button-view-profile-${firstName}`}>
          View Profile
        </Button>
      </CardContent>
    </Card>
  );
}
