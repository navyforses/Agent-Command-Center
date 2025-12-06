import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, MessageSquare, Calendar, Brain, Activity } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ActivityItem {
  id: string;
  type: "document" | "email" | "appointment" | "ai_analysis" | "therapy";
  title: string;
  description: string;
  timestamp: string;
  status?: "success" | "pending" | "info";
}

interface RecentActivityProps {
  activities: ActivityItem[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getIcon = (type: ActivityItem["type"]) => {
    switch (type) {
      case "document": return FileText;
      case "email": return MessageSquare;
      case "appointment": return Calendar;
      case "ai_analysis": return Brain;
      case "therapy": return Activity;
    }
  };

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case "success": return "default";
      case "pending": return "secondary";
      default: return "outline";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
        <Badge variant="secondary" className="text-xs">{activities.length} items</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-1 p-4 pt-0">
            {activities.map((activity) => {
              const Icon = getIcon(activity.type);
              return (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 p-3 rounded-md hover-elevate cursor-pointer"
                  data-testid={`activity-item-${activity.id}`}
                >
                  <div className="flex-shrink-0 p-2 bg-accent rounded-md">
                    <Icon className="h-4 w-4 text-accent-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      {activity.status && (
                        <Badge variant={getStatusVariant(activity.status)} className="text-xs flex-shrink-0">
                          {activity.status}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
