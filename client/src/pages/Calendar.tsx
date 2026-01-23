/**
 * Calendar Page
 * ==============
 * Displays upcoming appointments and allows adding from email
 */

import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import AppointmentExtractor from "@/components/calendar/AppointmentExtractor";
import {
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Mail,
  Plus,
  ChevronRight,
  Loader2,
} from "lucide-react";

interface Appointment {
  id: number;
  title: string;
  description?: string;
  location?: string;
  appointmentDate: string;
  endDate?: string;
  status?: string;
  childId?: number;
}

export default function CalendarPage() {
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("ka-GE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("ka-GE", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group appointments by date
  const groupedAppointments = appointments.reduce(
    (groups, apt) => {
      const date = new Date(apt.appointmentDate).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(apt);
      return groups;
    },
    {} as Record<string, Appointment[]>
  );

  // Sort dates
  const sortedDates = Object.keys(groupedAppointments).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  // Split into upcoming and past
  const now = new Date();
  const upcomingDates = sortedDates.filter((d) => new Date(d) >= now);
  const pastDates = sortedDates.filter((d) => new Date(d) < now).reverse();

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "confirmed":
        return <Badge className="bg-green-500">დადასტურებული</Badge>;
      case "pending":
        return <Badge className="bg-yellow-500">მოლოდინში</Badge>;
      case "cancelled":
        return <Badge className="bg-red-500">გაუქმებული</Badge>;
      default:
        return null;
    }
  };

  const AppointmentList = ({
    dates,
    emptyMessage,
  }: {
    dates: string[];
    emptyMessage: string;
  }) => (
    <ScrollArea className="h-[500px]">
      {dates.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <CalendarIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dates.map((date) => (
            <div key={date}>
              <h3 className="font-semibold text-lg mb-3 sticky top-0 bg-background py-2">
                {formatDate(date)}
              </h3>
              <div className="space-y-3">
                {groupedAppointments[date].map((apt) => (
                  <Card key={apt.id}>
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{apt.title}</h4>
                            {getStatusBadge(apt.status)}
                          </div>

                          {apt.description && (
                            <p className="text-sm text-muted-foreground">
                              {apt.description}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4" />
                              {formatTime(apt.appointmentDate)}
                              {apt.endDate && ` - ${formatTime(apt.endDate)}`}
                            </span>
                            {apt.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {apt.location}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button variant="ghost" size="sm">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </ScrollArea>
  );

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-8 w-8" />
            კალენდარი
          </h1>
          <p className="text-muted-foreground mt-1">
            თქვენი ვიზიტები და შეხსენებები
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm">
            {appointments.length} ვიზიტი
          </Badge>
        </div>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="upcoming" className="space-y-4">
        <TabsList>
          <TabsTrigger value="upcoming">
            მომავალი
            {upcomingDates.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {upcomingDates.reduce(
                  (count, d) => count + groupedAppointments[d].length,
                  0
                )}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="past">წარსული</TabsTrigger>
          <TabsTrigger value="extract">
            <Mail className="mr-2 h-4 w-4" />
            ელ-ფოსტიდან ამოღება
          </TabsTrigger>
        </TabsList>

        {/* Upcoming Appointments */}
        <TabsContent value="upcoming">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <AppointmentList
              dates={upcomingDates}
              emptyMessage="მომავალი ვიზიტები არ არის დაგეგმილი"
            />
          )}
        </TabsContent>

        {/* Past Appointments */}
        <TabsContent value="past">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <AppointmentList
              dates={pastDates}
              emptyMessage="წარსული ვიზიტები არ მოიძებნა"
            />
          )}
        </TabsContent>

        {/* Extract from Email */}
        <TabsContent value="extract">
          <AppointmentExtractor />
        </TabsContent>
      </Tabs>
    </div>
  );
}
