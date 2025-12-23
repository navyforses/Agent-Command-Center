import { useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  Activity,
  FileText,
  Brain,
  Edit,
  Plus,
  AlertCircle,
  ArrowLeft,
  Sparkles,
  Clock,
  Wand2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { DocumentUploadZone } from "@/components/dashboard/DocumentUploadZone";
import { EditChildDialog } from "@/components/dashboard/EditChildDialog";
import { SmartOnboarding } from "@/components/onboarding/SmartOnboarding";
import type { Child, Therapy, Document } from "@shared/schema";

export default function ChildProfile() {
  const { t, language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [smartFillOpen, setSmartFillOpen] = useState(false);

  const { data: child, isLoading: childLoading, error: childError } = useQuery<Child>({
    queryKey: ['/api/children', id],
    enabled: !!id,
  });

  const { data: therapies, isLoading: therapiesLoading } = useQuery<Therapy[]>({
    queryKey: ['/api/children', id, 'therapies'],
    enabled: !!id,
  });

  const { data: documents, isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ['/api/children', id, 'documents'],
    enabled: !!id,
  });

  const calculateAge = (dob: string | null) => {
    if (!dob) return t("unknown");
    const birthDate = new Date(dob);
    const today = new Date();
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    const totalMonths = years * 12 + months;
    if (years === 0) {
      return `${months} ${t("months")}`;
    }
    return `${years} ${t("years")}, ${months >= 0 ? months : 12 + months} ${t("months")} (${totalMonths} ${t("months")})`;
  };

  const activeTherapiesCount = therapies?.filter((t) => t.isActive).length ?? 0;
  const documentsCount = documents?.length ?? 0;

  if (childLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <div className="flex gap-2 mt-2">
                <Skeleton className="h-6 w-24" />
                <Skeleton className="h-6 w-24" />
              </div>
            </div>
          </div>
          <Skeleton className="h-9 w-28" />
        </div>

        <div className="space-y-4">
          <Skeleton className="h-10 w-96" />
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-md" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (childError || !child) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <AlertCircle className="h-12 w-12 text-muted-foreground" />
              <div>
                <h2 className="text-xl font-semibold">{t("childNotFound")}</h2>
                <p className="text-muted-foreground mt-1">
                  {t("childNotFoundDescription")}
                </p>
              </div>
              <Link href="/">
                <Button variant="outline" className="gap-2" data-testid="button-back-dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  {t("backToDashboard")}
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary text-primary-foreground text-xl font-semibold">
              {child.firstName?.[0] ?? ""}{child.lastName?.[0] ?? ""}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-2xl font-bold" data-testid="text-child-name">
              {child.firstName} {child.lastName}
            </h1>
            <p className="text-muted-foreground" data-testid="text-child-age">
              {calculateAge(child.dateOfBirth)}
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {child.diagnosis && (
                <Badge variant="default" data-testid="badge-diagnosis">
                  {language === "ka" && child.diagnosisKa ? child.diagnosisKa : child.diagnosis}
                </Badge>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Dialog open={smartFillOpen} onOpenChange={setSmartFillOpen}>
            <Button
              variant="outline"
              className="gap-2"
              data-testid="button-smart-fill"
              onClick={() => setSmartFillOpen(true)}
            >
              <Wand2 className="h-4 w-4" />
              {language === "ka" ? "სმარტ შევსება" : "Smart Fill"}
            </Button>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <SmartOnboarding
                childId={id ? parseInt(id, 10) : undefined}
                existingChild={child ? {
                  id: child.id,
                  firstName: child.firstName,
                  lastName: child.lastName,
                  dateOfBirth: child.dateOfBirth,
                  diagnosis: child.diagnosis,
                  diagnosisDate: child.diagnosisDate,
                  notes: child.notes,
                } : undefined}
                onComplete={() => {
                  setSmartFillOpen(false);
                  window.location.reload();
                }}
                onCancel={() => setSmartFillOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            className="gap-2"
            data-testid="button-edit-profile"
            onClick={() => setEditDialogOpen(true)}
          >
            <Edit className="h-4 w-4" />
            {t("editProfile")}
          </Button>
        </div>

        <EditChildDialog 
          child={child} 
          open={editDialogOpen} 
          onOpenChange={setEditDialogOpen} 
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">{t("overview")}</TabsTrigger>
          <TabsTrigger value="medical" data-testid="tab-medical">{t("medicalInfo")}</TabsTrigger>
          <TabsTrigger value="therapies" data-testid="tab-therapies">{t("therapies")}</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">{t("documents")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-1/10 rounded-md">
                    <Calendar className="h-5 w-5 text-chart-1" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("birthDate")}</p>
                    <p className="font-medium" data-testid="text-birth-date">
                      {child.dateOfBirth
                        ? new Date(child.dateOfBirth).toLocaleDateString()
                        : t("notSet")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-2/10 rounded-md">
                    <Activity className="h-5 w-5 text-chart-2" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("activeTherapies")}</p>
                    <p className="font-medium" data-testid="text-active-therapies-count">
                      {therapiesLoading ? (
                        <Skeleton className="h-5 w-8 inline-block" />
                      ) : (
                        activeTherapiesCount
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-3/10 rounded-md">
                    <FileText className="h-5 w-5 text-chart-3" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("documents")}</p>
                    <p className="font-medium" data-testid="text-documents-count">
                      {documentsLoading ? (
                        <Skeleton className="h-5 w-8 inline-block" />
                      ) : (
                        documentsCount
                      )}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-chart-4/10 rounded-md">
                    <Brain className="h-5 w-5 text-chart-4" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{t("diagnosisDate")}</p>
                    <p className="font-medium" data-testid="text-diagnosis-date">
                      {child.diagnosisDate
                        ? new Date(child.diagnosisDate).toLocaleDateString()
                        : t("notSet")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {(child.notes || child.notesKa) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t("notes")}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground" data-testid="text-child-notes">
                  {language === "ka" && child.notesKa ? child.notesKa : child.notes}
                </p>
              </CardContent>
            </Card>
          )}

          {activeTherapiesCount > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{t("therapyProgress")}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("activeTherapies")}</span>
                    <span className="font-medium">{activeTherapiesCount}</span>
                  </div>
                  <Progress value={(activeTherapiesCount / (therapies?.length || 1)) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="medical" className="mt-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("diagnosisInformation")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("primaryDiagnosis")}</span>
                  <span className="font-medium" data-testid="text-diagnosis">
                    {language === "ka" && child.diagnosisKa ? child.diagnosisKa : (child.diagnosis || t("notSpecified"))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("diagnosisDate")}</span>
                  <span className="font-medium" data-testid="text-diagnosis-date-medical">
                    {child.diagnosisDate
                      ? new Date(child.diagnosisDate).toLocaleDateString()
                      : t("notSpecified")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("dateOfBirth")}</span>
                  <span className="font-medium">
                    {child.dateOfBirth
                      ? new Date(child.dateOfBirth).toLocaleDateString()
                      : t("notSpecified")}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("notes")}</CardTitle>
              </CardHeader>
              <CardContent>
                {(child.notes || child.notesKa) ? (
                  <p className="text-muted-foreground">{language === "ka" && child.notesKa ? child.notesKa : child.notes}</p>
                ) : (
                  <p className="text-muted-foreground italic">{t("noAdditionalNotes")}</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="therapies" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t("currentTherapies")}</h3>
            <Button className="gap-2" data-testid="button-add-therapy">
              <Plus className="h-4 w-4" />
              {t("addTherapy")}
            </Button>
          </div>

          {therapiesLoading ? (
            <div className="grid md:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-md" />
                        <div className="space-y-1">
                          <Skeleton className="h-5 w-32" />
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-4 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : therapies && therapies.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {therapies.map((therapy) => (
                <Card key={therapy.id} data-testid={`therapy-card-${therapy.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent rounded-md">
                          <Activity className="h-5 w-5 text-accent-foreground" />
                        </div>
                        <div>
                          <h4 className="font-medium">{therapy.type || t("therapy")}</h4>
                          <p className="text-sm text-muted-foreground">
                            {therapy.therapistName || t("noTherapistAssigned")}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {therapy.frequency || t("noFrequencySet")}
                          </p>
                        </div>
                      </div>
                      <Badge variant={therapy.isActive ? "default" : "secondary"}>
                        {therapy.isActive ? t("active") : t("paused")}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <Activity className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t("noTherapiesYet")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("addTherapyToTrack")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">{t("documents")}</h3>
            <Button 
              className="gap-2" 
              data-testid="button-add-document"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t("uploadDocument")}
            </Button>
          </div>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("uploadMedicalDocument")}</DialogTitle>
              </DialogHeader>
              <DocumentUploadZone 
                childId={id ? parseInt(id, 10) : undefined}
                onUploadComplete={() => setUploadDialogOpen(false)}
              />
            </DialogContent>
          </Dialog>

          {documentsLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Skeleton className="h-10 w-10 rounded-md" />
                      <div className="space-y-1 flex-1">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {documents.map((doc) => (
                <Card key={doc.id} data-testid={`document-card-${doc.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-accent rounded-md">
                        <FileText className="h-5 w-5 text-accent-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{doc.title}</h4>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.category && (
                            <Badge variant="secondary">
                              {doc.category}
                            </Badge>
                          )}
                          {doc.aiSummary ? (
                            <Badge variant="outline" className="gap-1">
                              <Sparkles className="h-3 w-3" />
                              {t("aiAnalyzed")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1" data-testid={`badge-processing-${doc.id}`}>
                              <Clock className="h-3 w-3" />
                              {t("analysisPending")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {doc.uploadedAt
                            ? new Date(doc.uploadedAt).toLocaleDateString()
                            : t("unknownDate")}
                        </p>
                        {doc.aiSummary ? (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2" data-testid={`text-ai-summary-${doc.id}`}>
                            {doc.aiSummary}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground/70 mt-2 italic" data-testid={`text-pending-analysis-${doc.id}`}>
                            {t("aiAnalysisInProgress")}
                          </p>
                        )}
                        {doc.aiKeyFindings && doc.aiKeyFindings.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {doc.aiKeyFindings.slice(0, 2).map((finding, idx) => (
                              <p key={idx} className="text-xs text-muted-foreground truncate" data-testid={`text-key-finding-${doc.id}-${idx}`}>
                                {finding}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="flex flex-col items-center justify-center text-center space-y-3">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{t("noDocumentsYet")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("uploadDocumentsToTrack")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
