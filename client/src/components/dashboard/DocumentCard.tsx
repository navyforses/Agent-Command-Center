import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FileText, Image, File, Download, Eye, Brain, Calendar, Building, MessageSquare, ChevronDown, Target, Lightbulb, Trash2 } from "lucide-react";
import { useState } from "react";

interface DocumentCardProps {
  id: string;
  fileName: string;
  fileType: string;
  documentType: string;
  documentDate?: string;
  sourceClinic?: string;
  status: "processed" | "pending" | "analyzed";
  aiSummary?: string;
  aiKeyFindings?: string[];
  purpose?: string;
  conversationId?: number;
  language?: string;
  onClick?: () => void;
  onDownload?: () => void;
  onAnalyze?: () => void;
  onViewConversation?: () => void;
  onDelete?: () => void;
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
  aiKeyFindings,
  purpose,
  conversationId,
  language = "en",
  onClick,
  onDownload,
  onAnalyze,
  onViewConversation,
  onDelete,
}: DocumentCardProps) {
  const [showDetails, setShowDetails] = useState(false);
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

            {purpose && (
              <div className="flex items-start gap-1.5 mt-2">
                <Target className="h-3 w-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground line-clamp-1">
                  <span className="font-medium">{language === "en" ? "Purpose:" : "მიზანი:"}</span> {purpose}
                </p>
              </div>
            )}

            {aiSummary && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{aiSummary}</p>
            )}

            {status === "analyzed" && (aiKeyFindings && aiKeyFindings.length > 0) && (
              <Collapsible open={showDetails} onOpenChange={setShowDetails}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 mt-2"
                    onClick={(e) => e.stopPropagation()}
                    data-testid={`button-toggle-findings-${id}`}
                  >
                    <ChevronDown className={`h-3 w-3 transition-transform ${showDetails ? "rotate-180" : ""}`} />
                    {showDetails 
                      ? (language === "en" ? "Hide findings" : "აღმოჩენების დამალვა")
                      : (language === "en" ? `Show ${aiKeyFindings.length} key findings` : `${aiKeyFindings.length} მთავარი აღმოჩენის ჩვენება`)
                    }
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2">
                  <div className="space-y-1.5 pl-4 border-l-2 border-border">
                    {aiKeyFindings.map((finding, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <Lightbulb className="h-3 w-3 text-chart-4 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-muted-foreground">{finding}</p>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}

            <div className="flex flex-wrap gap-2 mt-3">
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
                {language === "en" ? "Download" : "ჩამოტვირთვა"}
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
                {language === "en" ? "View" : "ნახვა"}
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
                  {language === "en" ? "Analyze" : "ანალიზი"}
                </Button>
              )}
              {onViewConversation && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewConversation();
                  }}
                  data-testid={`button-view-conversation-${id}`}
                >
                  <MessageSquare className="h-3 w-3" />
                  {language === "en" ? "View AI Chat" : "AI ჩატის ნახვა"}
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  data-testid={`button-delete-${id}`}
                >
                  <Trash2 className="h-3 w-3" />
                  {language === "en" ? "Delete" : "წაშლა"}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
