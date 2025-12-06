import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, MapPin, Plus } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Appointment {
  id: string;
  title: string;
  provider: string;
  location: string;
  date: string;
  time: string;
  type: "therapy" | "medical" | "consultation";
}

interface UpcomingAppointmentsProps {
  appointments: Appointment[];
  onAddAppointment?: () => void;
}

export function UpcomingAppointments({ appointments, onAddAppointment }: UpcomingAppointmentsProps) {
  const getTypeColor = (type: Appointment["type"]) => {
    switch (type) {
      case "therapy": return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "medical": return "bg-chart-1/10 text-chart-1 border-chart-1/20";
      case "consultation": return "bg-chart-3/10 text-chart-3 border-chart-3/20";
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
        <CardTitle className="text-lg font-semibold">Upcoming Appointments</CardTitle>
        <Button variant="ghost" size="icon" onClick={onAddAppointment} data-testid="button-add-appointment">
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[300px]">
          <div className="space-y-3 p-4 pt-0">
            {appointments.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming appointments</p>
              </div>
            ) : (
              appointments.map((apt) => (
                <div
                  key={apt.id}
                  className="p-3 rounded-md border hover-elevate cursor-pointer"
                  data-testid={`appointment-${apt.id}`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-medium text-sm">{apt.title}</h4>
                    <Badge variant="outline" className={`text-xs ${getTypeColor(apt.type)}`}>
                      {apt.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{apt.provider}</p>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{apt.date}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{apt.time}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      <span>{apt.location}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
