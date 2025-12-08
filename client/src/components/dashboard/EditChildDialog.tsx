import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Languages, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Child } from "@shared/schema";

const editChildSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  dateOfBirth: z.string().optional(),
  diagnosis: z.string().optional(),
  diagnosisKa: z.string().optional(),
  diagnosisDate: z.string().optional(),
  notes: z.string().optional(),
  notesKa: z.string().optional(),
});

type EditChildFormData = z.infer<typeof editChildSchema>;

interface EditChildDialogProps {
  child: Child;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditChildDialog({ child, open, onOpenChange }: EditChildDialogProps) {
  const { toast } = useToast();
  const [translatingDiagnosis, setTranslatingDiagnosis] = useState(false);
  const [translatingNotes, setTranslatingNotes] = useState(false);

  const form = useForm<EditChildFormData>({
    resolver: zodResolver(editChildSchema),
    defaultValues: {
      firstName: child.firstName ?? "",
      lastName: child.lastName ?? "",
      dateOfBirth: child.dateOfBirth ?? "",
      diagnosis: child.diagnosis ?? "",
      diagnosisKa: child.diagnosisKa ?? "",
      diagnosisDate: child.diagnosisDate ?? "",
      notes: child.notes ?? "",
      notesKa: child.notesKa ?? "",
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        firstName: child.firstName ?? "",
        lastName: child.lastName ?? "",
        dateOfBirth: child.dateOfBirth ?? "",
        diagnosis: child.diagnosis ?? "",
        diagnosisKa: child.diagnosisKa ?? "",
        diagnosisDate: child.diagnosisDate ?? "",
        notes: child.notes ?? "",
        notesKa: child.notesKa ?? "",
      });
    }
  }, [open, child, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, string | null>) => {
      const response = await apiRequest("PATCH", `/api/children/${child.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/children', String(child.id)] });
      queryClient.invalidateQueries({ queryKey: ['/api/children'] });
      toast({
        title: "Profile updated",
        description: "Child profile has been updated successfully.",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Failed to update child profile.",
        variant: "destructive",
      });
    },
  });

  const translateText = async (text: string, targetField: 'diagnosisKa' | 'notesKa') => {
    if (!text || text.trim().length === 0) {
      toast({
        title: "Nothing to translate",
        description: "Please enter text in the English field first.",
        variant: "destructive",
      });
      return;
    }

    const setLoading = targetField === 'diagnosisKa' ? setTranslatingDiagnosis : setTranslatingNotes;
    setLoading(true);

    try {
      const response = await apiRequest("POST", "/api/translate", {
        text,
        targetLanguage: "ka",
      });
      const data = await response.json();
      
      if (data.translatedText && data.translatedText.trim().length > 0) {
        form.setValue(targetField, data.translatedText);
        toast({
          title: "Translation complete",
          description: "Text has been translated to Georgian.",
        });
      } else {
        toast({
          title: "Translation failed",
          description: "Translation returned empty. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Translation failed",
        description: "Could not translate the text. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data: EditChildFormData) => {
    const normalizedData = {
      ...data,
      dateOfBirth: data.dateOfBirth || null,
      diagnosisDate: data.diagnosisDate || null,
      diagnosis: data.diagnosis || null,
      diagnosisKa: data.diagnosisKa || null,
      notes: data.notes || null,
      notesKa: data.notesKa || null,
    };
    updateMutation.mutate(normalizedData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Child Profile</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-date-of-birth" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="diagnosisDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnosis Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} data-testid="input-diagnosis-date" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnosis (English)</FormLabel>
                  <FormControl>
                    <Input {...field} data-testid="input-diagnosis" placeholder="e.g., HIE Grade II" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="diagnosisKa"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Diagnosis (Georgian / ქართულად)</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => translateText(form.getValues('diagnosis') || '', 'diagnosisKa')}
                      disabled={translatingDiagnosis}
                      data-testid="button-translate-diagnosis"
                    >
                      {translatingDiagnosis ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Languages className="h-3 w-3" />
                      )}
                      <span className="ml-1">Translate</span>
                    </Button>
                  </div>
                  <FormControl>
                    <Input {...field} data-testid="input-diagnosis-ka" placeholder="დიაგნოზი ქართულად" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (English)</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      data-testid="input-notes"
                      placeholder="Additional notes about the child..."
                      className="resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notesKa"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between gap-2">
                    <FormLabel>Notes (Georgian / ქართულად)</FormLabel>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => translateText(form.getValues('notes') || '', 'notesKa')}
                      disabled={translatingNotes}
                      data-testid="button-translate-notes"
                    >
                      {translatingNotes ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Languages className="h-3 w-3" />
                      )}
                      <span className="ml-1">Translate</span>
                    </Button>
                  </div>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      data-testid="input-notes-ka"
                      placeholder="დამატებითი შენიშვნები..."
                      className="resize-none"
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateMutation.isPending}
                data-testid="button-save-child"
              >
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
