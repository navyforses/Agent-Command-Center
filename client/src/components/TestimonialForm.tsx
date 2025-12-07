import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Star, Pencil, Trash2, MessageSquarePlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import type { Testimonial } from "@shared/schema";

const testimonialFormSchema = z.object({
  authorName: z.string().min(2, "Name must be at least 2 characters"),
  authorRole: z.string().optional(),
  authorRoleKa: z.string().optional(),
  content: z.string().min(10, "Review must be at least 10 characters"),
  contentKa: z.string().optional(),
  rating: z.number().min(1).max(5),
});

type TestimonialFormData = z.infer<typeof testimonialFormSchema>;

function StarRatingPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (rating: number) => void;
}) {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="flex gap-1" data-testid="star-rating-picker">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="p-1 focus:outline-none"
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          data-testid={`star-${star}`}
        >
          <Star
            className={`h-6 w-6 transition-colors ${
              star <= (hovered || value)
                ? "fill-yellow-400 text-yellow-400"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export function TestimonialForm() {
  const { language, t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const { data: existingTestimonial, isLoading } = useQuery<Testimonial | null>({
    queryKey: ['/api/testimonials/me'],
  });

  const form = useForm<TestimonialFormData>({
    resolver: zodResolver(testimonialFormSchema),
    defaultValues: {
      authorName: "",
      authorRole: "",
      authorRoleKa: "",
      content: "",
      contentKa: "",
      rating: 5,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TestimonialFormData) => {
      const res = await apiRequest("POST", "/api/testimonials", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials'] });
      toast({
        title: language === "en" ? "Review submitted" : "მიმოხილვა გაგზავნილია",
        description: language === "en" 
          ? "Your review will be visible after approval" 
          : "თქვენი მიმოხილვა გამოჩნდება დამტკიცების შემდეგ",
      });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: TestimonialFormData) => {
      const res = await apiRequest("PATCH", `/api/testimonials/${existingTestimonial?.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials'] });
      toast({
        title: language === "en" ? "Review updated" : "მიმოხილვა განახლდა",
        description: language === "en" 
          ? "Your review has been updated" 
          : "თქვენი მიმოხილვა განახლდა",
      });
      setDialogOpen(false);
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/testimonials/${existingTestimonial?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/testimonials'] });
      toast({
        title: language === "en" ? "Review deleted" : "მიმოხილვა წაიშალა",
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: TestimonialFormData) => {
    if (isEditing && existingTestimonial) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditDialog = () => {
    if (existingTestimonial) {
      form.reset({
        authorName: existingTestimonial.authorName,
        authorRole: existingTestimonial.authorRole || "",
        authorRoleKa: existingTestimonial.authorRoleKa || "",
        content: existingTestimonial.content,
        contentKa: existingTestimonial.contentKa || "",
        rating: existingTestimonial.rating,
      });
      setIsEditing(true);
      setDialogOpen(true);
    }
  };

  const openCreateDialog = () => {
    form.reset({
      authorName: user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName.charAt(0)}.`
        : "",
      authorRole: "",
      authorRoleKa: "",
      content: "",
      contentKa: "",
      rating: 5,
    });
    setIsEditing(false);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquarePlus className="h-5 w-5" />
            {language === "en" ? "Your Review" : "თქვენი მიმოხილვა"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5" />
          {language === "en" ? "Your Review" : "თქვენი მიმოხილვა"}
        </CardTitle>
        <CardDescription>
          {language === "en"
            ? "Share your experience to help other families"
            : "გაუზიარეთ თქვენი გამოცდილება სხვა ოჯახებს"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {existingTestimonial ? (
          <div className="space-y-4">
            <div className="p-4 bg-accent/30 rounded-md space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= existingTestimonial.rating
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                {existingTestimonial.isApproved ? (
                  <Badge variant="secondary">
                    {language === "en" ? "Published" : "გამოქვეყნებული"}
                  </Badge>
                ) : (
                  <Badge variant="outline">
                    {language === "en" ? "Pending Approval" : "მოლოდინშია"}
                  </Badge>
                )}
              </div>
              <p className="text-sm italic">
                "{language === "en" 
                  ? existingTestimonial.content 
                  : (existingTestimonial.contentKa || existingTestimonial.content)}"
              </p>
              <p className="text-xs text-muted-foreground">
                - {existingTestimonial.authorName}
                {existingTestimonial.authorRole && (
                  <>, {language === "en" 
                    ? existingTestimonial.authorRole 
                    : (existingTestimonial.authorRoleKa || existingTestimonial.authorRole)}</>
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={openEditDialog}
                className="gap-2"
                data-testid="button-edit-testimonial"
              >
                <Pencil className="h-4 w-4" />
                {language === "en" ? "Edit" : "რედაქტირება"}
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 text-destructive"
                    data-testid="button-delete-testimonial"
                  >
                    <Trash2 className="h-4 w-4" />
                    {language === "en" ? "Delete" : "წაშლა"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {language === "en" ? "Delete Review" : "წაშალეთ მიმოხილვა"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {language === "en"
                        ? "Are you sure you want to delete your review? This action cannot be undone."
                        : "დარწმუნებული ხართ, რომ გსურთ თქვენი მიმოხილვის წაშლა? ეს მოქმედება შეუქცევადია."}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-delete">
                      {language === "en" ? "Cancel" : "გაუქმება"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteMutation.mutate()}
                      className="bg-destructive text-destructive-foreground"
                      data-testid="button-confirm-delete"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        language === "en" ? "Delete" : "წაშლა"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                onClick={openCreateDialog}
                data-testid="button-write-review"
              >
                <Star className="h-4 w-4" />
                {language === "en" ? "Write a Review" : "დაწერეთ მიმოხილვა"}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {language === "en" ? "Share Your Experience" : "გაუზიარეთ თქვენი გამოცდილება"}
                </DialogTitle>
                <DialogDescription>
                  {language === "en"
                    ? "Your review helps other families discover HIE Command Center"
                    : "თქვენი მიმოხილვა ეხმარება სხვა ოჯახებს აღმოაჩინონ HIE Command Center"}
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === "en" ? "Rating" : "შეფასება"}</FormLabel>
                        <FormControl>
                          <StarRatingPicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {language === "en" ? "Your Review" : "თქვენი მიმოხილვა"}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={
                              language === "en"
                                ? "Share how HIE Command Center has helped your family..."
                                : "გაუზიარეთ როგორ დაეხმარა HIE Command Center თქვენს ოჯახს..."
                            }
                            className="min-h-24"
                            data-testid="textarea-review-content"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contentKa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {language === "en" ? "Georgian Translation (optional)" : "ქართული თარგმანი (არჩევითი)"}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder={language === "en" ? "ქართული ვერსია..." : "ქართული ვერსია..."}
                            className="min-h-20"
                            data-testid="textarea-review-content-ka"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="authorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === "en" ? "Display Name" : "სახელი"}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder={language === "en" ? "e.g., Nino M." : "მაგ., ნინო მ."}
                            data-testid="input-author-name"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="authorRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {language === "en" ? "Role (optional)" : "როლი (არჩევითი)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder={language === "en" ? "e.g., Parent of 2-year-old with HIE" : "მაგ., 2 წლის HIE-ით დაავადებული ბავშვის მშობელი"}
                            data-testid="input-author-role"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="authorRoleKa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {language === "en" ? "Role in Georgian (optional)" : "როლი ქართულად (არჩევითი)"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="მაგ., 2 წლის HIE-ით დაავადებული ბავშვის მშობელი"
                            data-testid="input-author-role-ka"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-submit-review"
                    >
                      {(createMutation.isPending || updateMutation.isPending) ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {isEditing
                        ? (language === "en" ? "Update Review" : "განაახლეთ")
                        : (language === "en" ? "Submit Review" : "გაგზავნა")}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}

        {existingTestimonial && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {language === "en" ? "Edit Your Review" : "შეცვალეთ თქვენი მიმოხილვა"}
                </DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="rating"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === "en" ? "Rating" : "შეფასება"}</FormLabel>
                        <FormControl>
                          <StarRatingPicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {language === "en" ? "Your Review" : "თქვენი მიმოხილვა"}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-24"
                            data-testid="textarea-edit-review-content"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contentKa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {language === "en" ? "Georgian Translation (optional)" : "ქართული თარგმანი (არჩევითი)"}
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-20"
                            data-testid="textarea-edit-review-content-ka"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="authorName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{language === "en" ? "Display Name" : "სახელი"}</FormLabel>
                        <FormControl>
                          <Input data-testid="input-edit-author-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="authorRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {language === "en" ? "Role (optional)" : "როლი (არჩევითი)"}
                        </FormLabel>
                        <FormControl>
                          <Input data-testid="input-edit-author-role" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="authorRoleKa"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {language === "en" ? "Role in Georgian (optional)" : "როლი ქართულად (არჩევითი)"}
                        </FormLabel>
                        <FormControl>
                          <Input data-testid="input-edit-author-role-ka" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                      data-testid="button-update-review"
                    >
                      {updateMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {language === "en" ? "Update Review" : "განაახლეთ"}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}
