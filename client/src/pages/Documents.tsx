import { useState } from "react";
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
import { useLanguage } from "@/contexts/LanguageContext";

// todo: remove mock functionality
const mockDocuments = [
  {
    id: "1",
    fileName: "brain_mri_scan_2025.pdf",
    fileType: "application/pdf",
    documentType: "mri",
    documentDate: "Nov 15, 2025",
    sourceClinic: "Tbilisi Medical Center",
    status: "analyzed" as const,
    aiSummary: "MRI shows improvement in white matter integrity compared to previous scan. No new lesions detected.",
  },
  {
    id: "2",
    fileName: "eeg_report_october.pdf",
    fileType: "application/pdf",
    documentType: "eeg",
    documentDate: "Oct 20, 2025",
    sourceClinic: "Iashvili Children's Hospital",
    status: "processed" as const,
  },
  {
    id: "3",
    fileName: "blood_work_results.pdf",
    fileType: "application/pdf",
    documentType: "blood_test",
    documentDate: "Nov 1, 2025",
    sourceClinic: "LabCorp",
    status: "analyzed" as const,
    aiSummary: "All values within normal range. Vitamin D levels slightly low - consider supplementation.",
  },
  {
    id: "4",
    fileName: "physiotherapy_progress.pdf",
    fileType: "application/pdf",
    documentType: "therapy_report",
    documentDate: "Nov 25, 2025",
    sourceClinic: "Rehabilitation Center",
    status: "pending" as const,
  },
  {
    id: "5",
    fileName: "discharge_summary_sept.pdf",
    fileType: "application/pdf",
    documentType: "discharge_summary",
    documentDate: "Sep 5, 2025",
    sourceClinic: "Boston Children's Hospital",
    status: "analyzed" as const,
    aiSummary: "Follow-up recommendations include continued PT 3x/week and neuropsychological evaluation at 3 years.",
  },
];

export default function Documents() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showUploadDialog, setShowUploadDialog] = useState(false);

  const filteredDocuments = mockDocuments.filter((doc) => {
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
            <DocumentUploadZone onFilesSelected={() => setShowUploadDialog(false)} />
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

      {filteredDocuments.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No documents found</p>
        </div>
      ) : (
        <div className={viewMode === "grid" ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
          {filteredDocuments.map((doc) => (
            <DocumentCard
              key={doc.id}
              {...doc}
              onClick={() => console.log("View document:", doc.id)}
              onDownload={() => console.log("Download document:", doc.id)}
              onAnalyze={() => console.log("Analyze document:", doc.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
