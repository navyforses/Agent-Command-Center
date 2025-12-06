import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Clock, MapPin, User, CalendarIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Appointment, Child } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

interface TransformedAppointment {
  id: string;
  title: string;
  provider: string;
  location: string;
  date: Date;
  type: string;
  childName: string;
  childId: number | null;
}

const VALID_APPOINTMENT_TYPES = ["therapy", "medical", "consultation"] as const;

function getAppointmentType(status: string | null | undefined): string {
  if (status && VALID_APPOINTMENT_TYPES.includes(status as typeof VALID_APPOINTMENT_TYPES[number])) {
    return status;
  }
  return "medical";
}

function transformAppointment(apt: Appointment, children: Child[]): TransformedAppointment {
  const child = children.find(c => c.id === apt.childId);
  const childName = child ? `${child.firstName}` : "Unassigned";
  
  return {
    id: String(apt.id),
    title: apt.title,
    provider: apt.description || "",
    location: apt.location || "",
    date: new Date(apt.appointmentDate),
    type: getAppointmentType(apt.status),
    childName,
    childId: apt.childId,
  };
}

function CalendarSkeleton() {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2">
        <CardContent className="p-4">
          <Skeleton className="h-[350px] w-full" />
        </CardContent>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-[200px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="p-3 rounded-md border">
                  <Skeleton className="h-4 w-[150px] mb-2" />
                  <Skeleton className="h-3 w-[100px] mb-1" />
                  <Skeleton className="h-3 w-[120px]" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <Skeleton className="h-6 w-[180px]" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between gap-4 p-2">
                  <div>
                    <Skeleton className="h-4 w-[130px] mb-1" />
                    <Skeleton className="h-3 w-[80px]" />
                  </div>
                  <div className="text-right">
                    <Skeleton className="h-3 w-[60px] mb-1" />
                    <Skeleton className="h-3 w-[50px]" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    provider: "",
    location: "",
    date: "",
    time: "",
    type: "",
    childId: "",
  });

  const { data: appointments, isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments']
  });

  const { data: children, isLoading: childrenLoading } = useQuery<Child[]>({
    queryKey: ['/api/children']
  });

  const isLoading = appointmentsLoading || childrenLoading;

  const createAppointmentMutation = useMutation({
    mutationFn: async (data: {
      title: string;
      description: string;
      location: string;
      appointmentDate: string;
      status: string;
      childId: number | null;
    }) => {
      const response = await apiRequest('POST', '/api/appointments', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowAddDialog(false);
      setFormData({
        title: "",
        provider: "",
        location: "",
        date: "",
        time: "",
        type: "",
        childId: "",
      });
      toast({
        title: "Appointment Created",
        description: "Your appointment has been successfully scheduled.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to Create Appointment",
        description: error.message || "An error occurred while creating the appointment.",
        variant: "destructive",
      });
    },
  });

  const handleSaveAppointment = () => {
    if (!formData.title || !formData.date || !formData.time) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in the title, date, and time.",
        variant: "destructive",
      });
      return;
    }

    const appointmentDate = new Date(`${formData.date}T${formData.time}`);
    
    createAppointmentMutation.mutate({
      title: formData.title,
      description: formData.provider,
      location: formData.location,
      appointmentDate: appointmentDate.toISOString(),
      status: formData.type || "medical",
      childId: formData.childId ? parseInt(formData.childId, 10) : null,
    });
  };

  const childrenList = children || [];
  const transformedAppointments = (appointments || []).map(apt => 
    transformAppointment(apt, childrenList)
  );

  const getTypeColor = (type: string) => {
    switch (type) {
      case "therapy": return "bg-chart-2/10 text-chart-2 border-chart-2/20";
      case "medical": return "bg-chart-1/10 text-chart-1 border-chart-1/20";
      case "consultation": return "bg-chart-3/10 text-chart-3 border-chart-3/20";
      default: return "";
    }
  };

  const getAppointmentsForDate = (date: Date) => {
    return transformedAppointments.filter(
      (apt) =>
        apt.date.getDate() === date.getDate() &&
        apt.date.getMonth() === date.getMonth() &&
        apt.date.getFullYear() === date.getFullYear()
    );
  };

  const selectedDateAppointments = selectedDate ? getAppointmentsForDate(selectedDate) : [];

  const appointmentDates = transformedAppointments.map((apt) => apt.date);

  const upcomingAppointments = transformedAppointments
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
                <Input 
                  placeholder="Appointment title..." 
                  data-testid="input-apt-title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Provider</label>
                <Input 
                  placeholder="Doctor/Therapist name..." 
                  data-testid="input-apt-provider"
                  value={formData.provider}
                  onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Location</label>
                <Input 
                  placeholder="Location..." 
                  data-testid="input-apt-location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Date</label>
                  <Input 
                    type="date" 
                    data-testid="input-apt-date"
                    value={formData.date}
                    onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Time</label>
                  <Input 
                    type="time" 
                    data-testid="input-apt-time"
                    value={formData.time}
                    onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Type</label>
                <Select 
                  value={formData.type} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}
                >
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
                <Select 
                  value={formData.childId} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, childId: value }))}
                >
                  <SelectTrigger data-testid="select-apt-child">
                    <SelectValue placeholder="Select child..." />
                  </SelectTrigger>
                  <SelectContent>
                    {childrenList.length === 0 ? (
                      <SelectItem value="none" disabled>No children added yet</SelectItem>
                    ) : (
                      childrenList.map((child) => (
                        <SelectItem key={child.id} value={String(child.id)}>
                          {child.firstName} {child.lastName}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                className="w-full" 
                data-testid="button-save-appointment"
                onClick={handleSaveAppointment}
                disabled={createAppointmentMutation.isPending}
              >
                {createAppointmentMutation.isPending ? "Saving..." : "Save Appointment"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <CalendarSkeleton />
      ) : (
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
                          {apt.provider && (
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {apt.provider}
                            </div>
                          )}
                          {apt.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {apt.location}
                            </div>
                          )}
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
                {upcomingAppointments.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No upcoming appointments
                  </p>
                ) : (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
