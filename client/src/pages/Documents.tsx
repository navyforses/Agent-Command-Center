import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Search, Filter, Grid, List } from "lucide-react";
import { DocumentCard } from "@/components/dashboard/DocumentCard";
import { DocumentUploadZone } from "@/components/dashboard/DocumentUploadZone";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Document } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface TransformedDocument {
  id: string;
  fileName: string;
  fileType: string;
  documentType: string;
  documentDate?: string;
  sourceClinic?: string;
  status: "processed" | "pending" | "analyzed";
  aiSummary?: string;
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
    documentType: doc.category || "other",
    documentDate,
    sourceClinic: undefined,
    status,
    aiSummary: doc.aiSummary || undefined,
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
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showUploadDialog, setShowUploadDialog] = useState(false);

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

  const handleDownload = (doc: TransformedDocument) => {
    if (doc.filePath) {
      const downloadUrl = doc.filePath.startsWith('/objects/') 
        ? doc.filePath 
        : `/api/objects${doc.filePath.startsWith('/') ? '' : '/'}${doc.filePath}`;
      window.open(downloadUrl, '_blank');
    } else {
      toast({
        title: "Download Unavailable",
        description: "File is not available for download",
        variant: "destructive",
      });
    }
  };

  const handleAnalyze = (documentId: string) => {
    analyzeMutation.mutate(documentId);
  };

  const handleUploadComplete = () => {
    setShowUploadDialog(false);
    queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
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
              aiSummary={doc.aiSummary}
              onClick={() => {
                if (doc.filePath) {
                  handleDownload(doc);
                }
              }}
              onDownload={() => handleDownload(doc)}
              onAnalyze={() => handleAnalyze(doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
