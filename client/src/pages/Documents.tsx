import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Search, Filter, Grid, List, Zap, Calendar, Loader2, Trash2 } from "lucide-react";
import { DocumentCard } from "@/components/dashboard/DocumentCard";
import { DocumentUploadZone } from "@/components/dashboard/DocumentUploadZone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";

interface TransformedDocument {
  id: string;
  fileName: string;
  fileType: string;
  documentType: string;
  documentDate?: string;
  sourceClinic?: string;
  status: "processed" | "pending" | "analyzed";
  aiSummary?: string;
  aiSummaryKa?: string;
  aiKeyFindings?: string[];
  purpose?: string;
  conversationId?: number;
  filePath?: string | null;
}

function transformDocument(doc: Document): TransformedDocument {
  const status: "processed" | "pending" | "analyzed" = doc.aiSummary 
    ? "analyzed" 
    : doc.filePath 
      ? "processed" 
      : "pending";

  const documentDate = doc.uploadedAt 
    ? format(new Date(doc.uploadedAt), "MMM d, yyyy")
    : undefined;

  return {
    id: String(doc.id),
    fileName: doc.title,
    fileType: doc.fileType || "application/octet-stream",
    documentType: doc.documentType || doc.category || "other",
    documentDate,
    sourceClinic: undefined,
    status,
    aiSummary: doc.aiSummary || undefined,
    aiSummaryKa: doc.aiSummaryKa || undefined,
    aiKeyFindings: doc.aiKeyFindings || undefined,
    purpose: doc.purpose || undefined,
    conversationId: doc.conversationId || undefined,
    filePath: doc.filePath,
  };
}

function DocumentSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 border rounded-lg">
          <div className="flex items-start gap-3">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
              <div className="flex gap-2 mt-3">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Documents() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showEvolutionDialog, setShowEvolutionDialog] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<number | null>(null);
  const [endDate, setEndDate] = useState<Date | undefined>(addDays(new Date(), 30));
  const [deleteDocumentId, setDeleteDocumentId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: documents, isLoading } = useQuery<Document[]>({
    queryKey: ['/api/documents'],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("POST", `/api/documents/${documentId}/analyze`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      toast({
        title: "Analysis Started",
        description: "Document analysis has been queued. Results will appear shortly.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze document",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (documentId: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${documentId}`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to delete document");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
      setShowDeleteDialog(false);
      setDeleteDocumentId(null);
      toast({
        title: language === "ka" ? "წარმატება" : "Success",
        description: language === "ka" ? "დოკუმენტი წაიშალა" : "Document deleted successfully",
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

  const createEvolutionCycleMutation = useMutation({
    mutationFn: async ({ documentId, endDate }: { documentId: number; endDate: Date }) => {
      const response = await apiRequest("POST", "/api/evolution/cycles", {
        childId: 1,
        startDate: new Date().toISOString(),
        endDate: endDate.toISOString(),
        triggerDocumentId: documentId,
        diagnosisContext: "Extracted from uploaded document",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to create evolution cycle");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/evolution/cycles'] });
      setShowEvolutionDialog(false);
      toast({
        title: t("cycleCreated"),
        description: t("cycleCreatedDescription"),
      });
      setLocation("/evolution");
    },
    onError: (error: Error) => {
      toast({
        title: t("cycleCreationFailed"),
        description: error.message || "Failed to create evolution cycle",
        variant: "destructive",
      });
    },
  });

  const handleDownload = async (doc: TransformedDocument) => {
    if (doc.filePath) {
      try {
        // Correct URL: /objects/... (not /api/objects/)
        const downloadUrl = doc.filePath.startsWith('/objects/')
          ? doc.filePath
          : `/objects/${doc.filePath.replace(/^\//, '')}`;

        const response = await fetch(downloadUrl, {
          credentials: 'include', // Include auth cookies
        });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        // Create blob and download
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: language === "ka" ? "წარმატება" : "Success",
          description: language === "ka" ? "ფაილი ჩამოიტვირთა" : "File downloaded successfully",
        });
      } catch (error) {
        console.error('Download error:', error);
        toast({
          title: language === "ka" ? "შეცდომა" : "Download Failed",
          description: language === "ka" ? "ფაილის ჩამოტვირთვა ვერ მოხერხდა" : "Failed to download file",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: language === "ka" ? "მიუწვდომელია" : "Download Unavailable",
        description: language === "ka" ? "ფაილი არ არის ხელმისაწვდომი" : "File is not available for download",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = (documentId: string) => {
    analyzeMutation.mutate(documentId);
  };

  const handleUploadComplete = (documentId?: number) => {
    setShowUploadDialog(false);
    queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
    
    if (documentId) {
      setUploadedDocumentId(documentId);
      setShowEvolutionDialog(true);
    }
  };

  const handleStartEvolutionCycle = () => {
    if (uploadedDocumentId && endDate) {
      createEvolutionCycleMutation.mutate({ documentId: uploadedDocumentId, endDate });
    }
  };

  const handleViewConversation = (conversationId: number) => {
    setLocation(`/ai-assistant?conversation=${conversationId}`);
  };

  const handleDeleteClick = (documentId: string) => {
    setDeleteDocumentId(documentId);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = () => {
    if (deleteDocumentId) {
      deleteMutation.mutate(deleteDocumentId);
    }
  };

  const transformedDocuments = documents?.map(transformDocument) || [];

  const filteredDocuments = transformedDocuments.filter((doc) => {
    const matchesSearch = doc.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.sourceClinic?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === "all" || doc.documentType === typeFilter;
    const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("documents")}</h1>
          <p className="text-muted-foreground">Manage and analyze medical documents</p>
        </div>
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-upload-new">
              <Upload className="h-4 w-4" />
              Upload New
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t("uploadDocuments")}</DialogTitle>
            </DialogHeader>
            <DocumentUploadZone onUploadComplete={handleUploadComplete} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-documents"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-type-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="mri">MRI Scan</SelectItem>
            <SelectItem value="eeg">EEG Report</SelectItem>
            <SelectItem value="blood_test">Blood Test</SelectItem>
            <SelectItem value="therapy_report">Therapy Report</SelectItem>
            <SelectItem value="discharge_summary">Discharge Summary</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]" data-testid="select-status-filter">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="analyzed">AI Analyzed</SelectItem>
            <SelectItem value="processed">Processed</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-1 border rounded-md p-1">
          <Button
            variant={viewMode === "list" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "secondary" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
          >
            <Grid className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <DocumentSkeleton />
      ) : filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No documents found</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              id={doc.id}
              fileName={doc.fileName}
              fileType={doc.fileType}
              documentType={doc.documentType}
              documentDate={doc.documentDate}
              sourceClinic={doc.sourceClinic}
              status={doc.status}
              aiSummary={language === "ka" && doc.aiSummaryKa ? doc.aiSummaryKa : doc.aiSummary}
              aiKeyFindings={doc.aiKeyFindings}
              purpose={doc.purpose}
              conversationId={doc.conversationId}
              language={language}
              onClick={() => {
                if (doc.filePath) {
                  handleDownload(doc);
                }
              }}
              onDownload={() => handleDownload(doc)}
              onAnalyze={() => handleAnalyze(doc.id)}
              onViewConversation={doc.conversationId ? () => handleViewConversation(doc.conversationId!) : undefined}
              onDelete={() => handleDeleteClick(doc.id)}
            />
          ))}
        </div>
      )}

      <Dialog open={showEvolutionDialog} onOpenChange={setShowEvolutionDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-start-evolution">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {t("startEvolutionCycle")}
            </DialogTitle>
            <DialogDescription>
              {t("evolutionCycleDescription")}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t("selectEndDate")}</label>
              <p className="text-xs text-muted-foreground">{t("endDateDescription")}</p>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !endDate && "text-muted-foreground"
                    )}
                    data-testid="button-select-end-date"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    disabled={(date) => date < new Date() || date < addDays(new Date(), 1)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowEvolutionDialog(false)}
              data-testid="button-skip-evolution"
            >
              {t("skipForNow")}
            </Button>
            <Button
              onClick={handleStartEvolutionCycle}
              disabled={!endDate || createEvolutionCycleMutation.isPending}
              data-testid="button-confirm-start-cycle"
            >
              {createEvolutionCycleMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {t("analyzingDocument")}
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  {t("startCycle")}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {language === "ka" ? "დოკუმენტის წაშლა" : "Delete Document"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {language === "ka" 
                ? "დარწმუნებული ხართ, რომ გსურთ ამ დოკუმენტის წაშლა? ეს მოქმედება შეუქცევადია."
                : "Are you sure you want to delete this document? This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              {language === "ka" ? "გაუქმება" : "Cancel"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? (
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
