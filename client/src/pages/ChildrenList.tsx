import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertChildSchema, type Child } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, User, Calendar, FileText, ChevronRight, Loader2, Trash2 } from "lucide-react";
import { z } from "zod";

const formSchema = insertChildSchema.extend({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
});

type FormData = z.infer<typeof formSchema>;

export default function ChildrenList() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteChildId, setDeleteChildId] = useState<number | null>(null);
  const [deleteChildName, setDeleteChildName] = useState<string>("");
  const { toast } = useToast();
  const { t, language } = useLanguage();

  const { data: children = [], isLoading } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      dateOfBirth: null,
      diagnosis: "",
      diagnosisDate: null,
      notes: "",
    },
  });

  const createChildMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const response = await apiRequest("POST", "/api/children", data);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create child profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: t("success") || "Success",
        description: "Child profile created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: t("error") || "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteChildMutation = useMutation({
    mutationFn: async (childId: number) => {
      const response = await apiRequest("DELETE", `/api/children/${childId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete child profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      setShowDeleteDialog(false);
      setDeleteChildId(null);
      setDeleteChildName("");
      toast({
        title: language === "ka" ? "წარმატება" : "Success",
        description: language === "ka" ? "ბავშვის პროფილი წაიშალა" : "Child profile deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === "ka" ? "შეცდომა" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: FormData) => {
    const normalizedData = {
      ...data,
      dateOfBirth: data.dateOfBirth || null,
      diagnosisDate: data.diagnosisDate || null,
      diagnosis: data.diagnosis || null,
      notes: data.notes || null,
    };
    createChildMutation.mutate(normalizedData);
  };

  const handleDeleteClick = (e: React.MouseEvent, childId: number, childName: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDeleteChildId(childId);
    setDeleteChildName(childName);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deleteChildId) {
      deleteChildMutation.mutate(deleteChildId);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    return new Date(dateStr).toLocaleDateString();
  };

  const calculateAge = (dateOfBirth: string | null) => {
    if (!dateOfBirth) return null;
    const today = new Date();
    const birth = new Date(dateOfBirth);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{t("childProfile")}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage your children's profiles and medical information
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-child">
              <Plus className="h-4 w-4 mr-2" />
              Add Child
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Child Profile</DialogTitle>
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
                          <Input
                            {...field}
                            placeholder="Enter first name"
                            data-testid="input-child-first-name"
                          />
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
                          <Input
                            {...field}
                            placeholder="Enter last name"
                            data-testid="input-child-last-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dateOfBirth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          data-testid="input-child-dob"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="diagnosis"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Diagnosis</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="e.g., Hypoxic-Ischemic Encephalopathy (HIE)"
                          className="resize-none"
                          rows={2}
                          data-testid="input-child-diagnosis"
                        />
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
                        <Input
                          type="date"
                          value={field.value || ""}
                          onChange={(e) => field.onChange(e.target.value || null)}
                          data-testid="input-child-diagnosis-date"
                        />
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
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ""}
                          placeholder="Any additional information..."
                          className="resize-none"
                          rows={3}
                          data-testid="input-child-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    data-testid="button-cancel-add-child"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createChildMutation.isPending}
                    data-testid="button-submit-add-child"
                  >
                    {createChildMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Add Child
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {children.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <div className="p-4 bg-muted rounded-full mb-4">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-lg mb-2">No Children Added Yet</h3>
            <p className="text-muted-foreground text-sm max-w-md mb-4">
              Add your child's profile to start managing their medical records, therapies, and appointments.
            </p>
            <Button onClick={() => setIsDialogOpen(true)} data-testid="button-add-first-child">
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Child
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {children.map((child) => {
            const age = calculateAge(child.dateOfBirth);
            return (
              <Link key={child.id} href={`/child/${child.id}`}>
                <Card className="hover-elevate cursor-pointer" data-testid={`card-child-${child.id}`}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <User className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg">
                        {child.firstName} {child.lastName}
                      </CardTitle>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                        {age !== null && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {age} years old
                          </span>
                        )}
                        {child.diagnosis && (
                          <span className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            {child.diagnosis.length > 40 
                              ? child.diagnosis.substring(0, 40) + "..." 
                              : child.diagnosis}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive flex-shrink-0"
                      onClick={(e) => handleDeleteClick(e, child.id, `${child.firstName} ${child.lastName}`)}
                      data-testid={`button-delete-child-${child.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ka" ? "ბავშვის პროფილის წაშლა" : "Delete Child Profile"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ka" 
                ? `დარწმუნებული ხართ, რომ გსურთ "${deleteChildName}"-ის პროფილის წაშლა? ეს მოქმედება შეუქცევადია და წაშლის ყველა დაკავშირებულ მონაცემს.`
                : `Are you sure you want to delete "${deleteChildName}"'s profile? This action cannot be undone and will delete all associated data.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete-child">
              {language === "ka" ? "გაუქმება" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteChildMutation.isPending}
              data-testid="button-confirm-delete-child"
            >
              {deleteChildMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              {language === "ka" ? "წაშლა" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
