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
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import { DocumentUploadZone } from "@/components/dashboard/DocumentUploadZone";
import type { Child, Therapy, Document } from "@shared/schema";

export default function ChildProfile() {
  const { t, language } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);

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
    if (!dob) return "Unknown";
    const birthDate = new Date(dob);
    const today = new Date();
    const years = today.getFullYear() - birthDate.getFullYear();
    const months = today.getMonth() - birthDate.getMonth();
    const totalMonths = years * 12 + months;
    if (years === 0) {
      return `${months} months`;
    }
    return `${years} years, ${months >= 0 ? months : 12 + months} months (${totalMonths} months)`;
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
                <h2 className="text-xl font-semibold">Child Not Found</h2>
                <p className="text-muted-foreground mt-1">
                  The child profile you're looking for doesn't exist or you don't have access to it.
                </p>
              </div>
              <Link href="/">
                <Button variant="outline" className="gap-2" data-testid="button-back-dashboard">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Dashboard
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
        <Button variant="outline" className="gap-2" data-testid="button-edit-profile">
          <Edit className="h-4 w-4" />
          Edit Profile
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
          <TabsTrigger value="medical" data-testid="tab-medical">Medical Info</TabsTrigger>
          <TabsTrigger value="therapies" data-testid="tab-therapies">Therapies</TabsTrigger>
          <TabsTrigger value="documents" data-testid="tab-documents">Documents</TabsTrigger>
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
                    <p className="text-sm text-muted-foreground">Birth Date</p>
                    <p className="font-medium" data-testid="text-birth-date">
                      {child.dateOfBirth
                        ? new Date(child.dateOfBirth).toLocaleDateString()
                        : "Not set"}
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
                    <p className="text-sm text-muted-foreground">Active Therapies</p>
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
                    <p className="text-sm text-muted-foreground">Documents</p>
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
                    <p className="text-sm text-muted-foreground">Diagnosis Date</p>
                    <p className="font-medium" data-testid="text-diagnosis-date">
                      {child.diagnosisDate
                        ? new Date(child.diagnosisDate).toLocaleDateString()
                        : "Not set"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {(child.notes || child.notesKa) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Notes</CardTitle>
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
                <CardTitle className="text-lg">Therapy Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Active therapies</span>
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
                <CardTitle className="text-lg">Diagnosis Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Primary Diagnosis</span>
                  <span className="font-medium" data-testid="text-diagnosis">
                    {language === "ka" && child.diagnosisKa ? child.diagnosisKa : (child.diagnosis || "Not specified")}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Diagnosis Date</span>
                  <span className="font-medium" data-testid="text-diagnosis-date-medical">
                    {child.diagnosisDate
                      ? new Date(child.diagnosisDate).toLocaleDateString()
                      : "Not specified"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date of Birth</span>
                  <span className="font-medium">
                    {child.dateOfBirth
                      ? new Date(child.dateOfBirth).toLocaleDateString()
                      : "Not specified"}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                {(child.notes || child.notesKa) ? (
                  <p className="text-muted-foreground">{language === "ka" && child.notesKa ? child.notesKa : child.notes}</p>
                ) : (
                  <p className="text-muted-foreground italic">No additional notes</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="therapies" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Current Therapies</h3>
            <Button className="gap-2" data-testid="button-add-therapy">
              <Plus className="h-4 w-4" />
              Add Therapy
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
                          <h4 className="font-medium">{therapy.type || "Therapy"}</h4>
                          <p className="text-sm text-muted-foreground">
                            {therapy.therapistName || "No therapist assigned"}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {therapy.frequency || "No frequency set"}
                          </p>
                        </div>
                      </div>
                      <Badge variant={therapy.isActive ? "default" : "secondary"}>
                        {therapy.isActive ? "Active" : "Paused"}
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
                    <p className="font-medium">No therapies yet</p>
                    <p className="text-sm text-muted-foreground">
                      Add a therapy to start tracking progress
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Documents</h3>
            <Button 
              className="gap-2" 
              data-testid="button-add-document"
              onClick={() => setUploadDialogOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Upload Document
            </Button>
          </div>

          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Upload Medical Document</DialogTitle>
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
                              AI Analyzed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1" data-testid={`badge-processing-${doc.id}`}>
                              <Clock className="h-3 w-3" />
                              Analysis Pending
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {doc.uploadedAt
                            ? new Date(doc.uploadedAt).toLocaleDateString()
                            : "Unknown date"}
                        </p>
                        {doc.aiSummary ? (
                          <p className="text-sm text-muted-foreground mt-2 line-clamp-2" data-testid={`text-ai-summary-${doc.id}`}>
                            {doc.aiSummary}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground/70 mt-2 italic" data-testid={`text-pending-analysis-${doc.id}`}>
                            AI analysis in progress...
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
                    <p className="font-medium">No documents yet</p>
                    <p className="text-sm text-muted-foreground">
                      Upload medical documents to keep track of records
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
