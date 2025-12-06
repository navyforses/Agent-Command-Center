import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock, MapPin, User, CalendarIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

// todo: remove mock functionality
const mockAppointments = [
  {
    id: "1",
    title: "Physiotherapy Session",
    provider: "Dr. Natia Gabisonia",
    location: "Tbilisi Rehabilitation Center",
    date: new Date(2025, 11, 10, 10, 0),
    type: "therapy",
    childName: "Luka",
  },
  {
    id: "2",
    title: "Neurology Follow-up",
    provider: "Dr. Giorgi Khabeishvili",
    location: "Iashvili Children's Hospital",
    date: new Date(2025, 11, 15, 14, 30),
    type: "medical",
    childName: "Luka",
  },
  {
    id: "3",
    title: "Speech Therapy Evaluation",
    provider: "Maia Lomidze",
    location: "Center for Child Development",
    date: new Date(2025, 11, 18, 11, 0),
    type: "consultation",
    childName: "Luka",
  },
  {
    id: "4",
    title: "Occupational Therapy",
    provider: "Nino Kvirikashvili",
    location: "Home Visit",
    date: new Date(2025, 11, 12, 15, 0),
    type: "therapy",
    childName: "Mariam",
  },
];

export default function CalendarPage() {
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);

  const getTypeColor = (type: string) => {
    switch (type) {
      case "therapy": return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "medical": return "bg-chart-1/10 text-chart-1 border-chart-1/20";
      case "consultation": return "bg-chart-3/10 text-chart-3 border-chart-3/20";
      default: return "";
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return mockAppointments.filter(
      (apt) =>
        apt.date.getDate() === date.getDate() &&
        apt.date.getMonth() === date.getMonth() &&
        apt.date.getFullYear() === date.getFullYear()
    );
  };

  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  const appointmentDates = mockAppointments.map((apt) => apt.date);

  const upcomingAppointments = mockAppointments
    .filter((apt) => apt.date >= new Date())
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("calendar")}</h1>
          <p className="text-muted-foreground">Manage appointments and therapy sessions</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-add-appointment">
              <Plus className="h-4 w-4" />
              Add Appointment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Appointment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Title</label>
                <Input placeholder="Appointment title..." data-testid="input-apt-title" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Provider</label>
                <Input placeholder="Doctor/Therapist name..." data-testid="input-apt-provider" />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input placeholder="Location..." data-testid="input-apt-location" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Date</label>
                  <Input type="date" data-testid="input-apt-date" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Time</label>
                  <Input type="time" data-testid="input-apt-time" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select>
                  <SelectTrigger data-testid="select-apt-type">
                    <SelectValue placeholder="Select type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="therapy">Therapy</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="consultation">Consultation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Child</label>
                <Select>
                  <SelectTrigger data-testid="select-apt-child">
                    <SelectValue placeholder="Select child..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="luka">Luka</SelectItem>
                    <SelectItem value="mariam">Mariam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button className="w-full" data-testid="button-save-appointment">
                Save Appointment
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="w-full"
              modifiers={{
                hasAppointment: appointmentDates,
              }}
              modifiersStyles={{
                hasAppointment: {
                  fontWeight: "bold",
                  textDecoration: "underline",
                  textDecorationColor: "hsl(var(--primary))",
                },
              }}
            />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                {selectedDate?.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateAppointments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No appointments scheduled
                </p>
              ) : (
                <div className="space-y-3">
                  {selectedDateAppointments.map((apt) => (
                    <div
                      key={apt.id}
                      className="p-3 rounded-md border hover-elevate cursor-pointer"
                      data-testid={`calendar-apt-${apt.id}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium text-sm">{apt.title}</h4>
                        <Badge variant="outline" className={`text-xs ${getTypeColor(apt.type)}`}>
                          {apt.type}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {apt.date.toLocaleTimeString("en-US", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {apt.provider}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {apt.location}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t("upcomingAppointments")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center justify-between gap-4 p-2 rounded-md hover-elevate cursor-pointer"
                    onClick={() => setSelectedDate(apt.date)}
                    data-testid={`upcoming-apt-${apt.id}`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{apt.title}</p>
                      <p className="text-xs text-muted-foreground">{apt.childName}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                      <p>{apt.date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      <p>{apt.date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
