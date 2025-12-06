import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Image, File, Download, Eye, Brain, Calendar, Building } from "lucide-react";

interface DocumentCardProps {
  id: string;
  fileName: string;
  fileType: string;
  documentType: string;
  documentDate?: string;
  sourceClinic?: string;
  status: "processed" | "pending" | "analyzed";
  aiSummary?: string;
  onClick?: () => void;
  onDownload?: () => void;
  onAnalyze?: () => void;
}

export function DocumentCard({
  id,
  fileName,
  fileType,
  documentType,
  documentDate,
  sourceClinic,
  status,
  aiSummary,
  onClick,
  onDownload,
  onAnalyze,
}: DocumentCardProps) {
  const getFileIcon = () => {
    if (fileType.includes("image")) return Image;
    if (fileType.includes("pdf")) return FileText;
    return File;
  };

  const getStatusVariant = (s: string) => {
    switch (s) {
      case "analyzed": return "default";
      case "processed": return "secondary";
      case "pending": return "outline";
      default: return "secondary";
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      mri: "MRI Scan",
      eeg: "EEG Report",
      blood_test: "Blood Test",
      therapy_report: "Therapy Report",
      discharge_summary: "Discharge Summary",
      prescription: "Prescription",
      other: "Other",
    };
    return labels[type] || type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const FileIcon = getFileIcon();

  return (
    <Card className="hover-elevate cursor-pointer" onClick={onClick} data-testid={`document-card-${id}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 p-3 bg-accent rounded-md">
            <FileIcon className="h-6 w-6 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="font-medium text-sm truncate">{fileName}</h4>
                <p className="text-xs text-muted-foreground">{getDocumentTypeLabel(documentType)}</p>
              </div>
              <Badge variant={getStatusVariant(status)} className="flex-shrink-0 text-xs">
                {status === "analyzed" && <Brain className="h-3 w-3 mr-1" />}
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
              {documentDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{documentDate}</span>
                </div>
              )}
              {sourceClinic && (
                <div className="flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  <span>{sourceClinic}</span>
                </div>
              )}
            </div>

            {aiSummary && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{aiSummary}</p>
            )}

            <div className="flex gap-2 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onDownload?.();
                }}
                data-testid={`button-download-${id}`}
              >
                <Download className="h-3 w-3" />
                Download
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
                data-testid={`button-view-${id}`}
              >
                <Eye className="h-3 w-3" />
                View
              </Button>
              {status !== "analyzed" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAnalyze?.();
                  }}
                  data-testid={`button-analyze-${id}`}
                >
                  <Brain className="h-3 w-3" />
                  Analyze
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
