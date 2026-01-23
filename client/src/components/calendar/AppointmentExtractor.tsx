/**
 * AppointmentExtractor Component
 * ===============================
 * P2 Feature: AI-powered appointment extraction from emails
 * Allows users to paste email text and extract appointments
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Calendar,
  Mail,
  Sparkles,
  Clock,
  MapPin,
  Check,
  X,
  Loader2,
  AlertCircle,
} from "lucide-react";

interface ExtractedAppointment {
  title: string;
  description?: string;
  location?: string;
  appointmentDate: string;
  endDate?: string;
  confidence: number;
  validation?: {
    valid: boolean;
    errors: string[];
  };
  selected?: boolean;
}

interface Child {
  id: number;
  firstName: string;
  lastName: string;
}

export default function AppointmentExtractor() {
  const [emailText, setEmailText] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [extractedAppointments, setExtractedAppointments] = useState<
    ExtractedAppointment[]
  >([]);
  const [selectedChildId, setSelectedChildId] = useState<number | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch children for child selection
  const { data: children = [] } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  // Extract appointments mutation
  const extractMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/appointments/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ emailText, emailSubject }),
      });

      if (!response.ok) {
        throw new Error("Failed to extract appointments");
      }

      return response.json();
    },
    onSuccess: (data) => {
      const appointments = data.appointments.map((apt: ExtractedAppointment) => ({
        ...apt,
        selected: apt.validation?.valid !== false,
      }));
      setExtractedAppointments(appointments);

      if (appointments.length === 0) {
        toast({
          title: "ივენთები ვერ მოიძებნა",
          description: "ელ-ფოსტის ტექსტში ივენთები ვერ აღმოჩნდა",
          variant: "default",
        });
      } else {
        toast({
          title: "ივენთები ამოღებულია",
          description: `ნაპოვნია ${appointments.length} ივენთი`,
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "შეცდომა",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Confirm appointments mutation
  const confirmMutation = useMutation({
    mutationFn: async (appointments: ExtractedAppointment[]) => {
      const response = await fetch("/api/appointments/extract/confirm-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          appointments: appointments.map((apt) => ({
            title: apt.title,
            description: apt.description,
            location: apt.location,
            appointmentDate: apt.appointmentDate,
            endDate: apt.endDate,
          })),
          childId: selectedChildId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save appointments");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "ივენთები შენახულია",
        description: `${data.savedCount} ივენთი დაემატა კალენდარში`,
      });
      // Clear form
      setEmailText("");
      setEmailSubject("");
      setExtractedAppointments([]);
      // Invalidate appointments cache
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
    },
    onError: (error: Error) => {
      toast({
        title: "შეცდომა",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleExtract = () => {
    if (!emailText.trim()) {
      toast({
        title: "შეცდომა",
        description: "გთხოვთ ჩასვათ ელ-ფოსტის ტექსტი",
        variant: "destructive",
      });
      return;
    }
    extractMutation.mutate();
  };

  const handleConfirm = () => {
    const selected = extractedAppointments.filter((apt) => apt.selected);
    if (selected.length === 0) {
      toast({
        title: "შეცდომა",
        description: "გთხოვთ აირჩიოთ მინიმუმ ერთი ივენთი",
        variant: "destructive",
      });
      return;
    }
    confirmMutation.mutate(selected);
  };

  const toggleAppointmentSelection = (index: number) => {
    setExtractedAppointments((prev) =>
      prev.map((apt, i) =>
        i === index ? { ...apt, selected: !apt.selected } : apt
      )
    );
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString("ka-GE", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.8) {
      return <Badge className="bg-green-500">მაღალი სიზუსტე</Badge>;
    } else if (confidence >= 0.5) {
      return <Badge className="bg-yellow-500">საშუალო სიზუსტე</Badge>;
    }
    return <Badge className="bg-red-500">დაბალი სიზუსტე</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            ივენთების ამოღება ელ-ფოსტიდან
          </CardTitle>
          <CardDescription>
            ჩასვით ელ-ფოსტის ტექსტი და AI ავტომატურად ამოიღებს ივენთებს
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-subject">ელ-ფოსტის სათაური (არასავალდებულო)</Label>
            <Input
              id="email-subject"
              placeholder="მაგ: შეხვედრა ექიმთან - 15 იანვარი"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email-text">ელ-ფოსტის ტექსტი</Label>
            <Textarea
              id="email-text"
              placeholder="ჩასვით ელ-ფოსტის ტექსტი აქ..."
              value={emailText}
              onChange={(e) => setEmailText(e.target.value)}
              className="min-h-[200px]"
            />
          </div>

          <div className="flex items-center gap-4">
            {children.length > 0 && (
              <div className="flex-1 max-w-xs">
                <Label>მიაბით შვილს (არასავალდებულო)</Label>
                <Select
                  value={selectedChildId?.toString() || ""}
                  onValueChange={(v) =>
                    setSelectedChildId(v ? parseInt(v) : null)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="აირჩიეთ შვილი" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id.toString()}>
                        {child.firstName} {child.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button
              onClick={handleExtract}
              disabled={extractMutation.isPending || !emailText.trim()}
              className="mt-6"
            >
              {extractMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  მიმდინარეობს...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  ივენთების ამოღება
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Extracted Appointments */}
      {extractedAppointments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              აღმოჩენილი ივენთები ({extractedAppointments.length})
            </CardTitle>
            <CardDescription>
              მონიშნეთ ის ივენთები, რომელთა დამატებაც გსურთ კალენდარში
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {extractedAppointments.map((apt, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 transition-colors ${
                  apt.selected
                    ? "border-primary bg-primary/5"
                    : "border-muted opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <Checkbox
                    checked={apt.selected}
                    onCheckedChange={() => toggleAppointmentSelection(index)}
                    disabled={apt.validation?.valid === false}
                  />

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold">{apt.title}</h4>
                      {getConfidenceBadge(apt.confidence)}
                    </div>

                    {apt.description && (
                      <p className="text-sm text-muted-foreground">
                        {apt.description}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatDate(apt.appointmentDate)}
                      </span>
                      {apt.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          {apt.location}
                        </span>
                      )}
                    </div>

                    {apt.validation && !apt.validation.valid && (
                      <div className="flex items-center gap-2 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {apt.validation.errors.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setExtractedAppointments([])}
              >
                <X className="mr-2 h-4 w-4" />
                გაუქმება
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={
                  confirmMutation.isPending ||
                  !extractedAppointments.some((apt) => apt.selected)
                }
              >
                {confirmMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ინახება...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    დამატება კალენდარში
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
