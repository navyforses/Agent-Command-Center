import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, File, X, Check, Loader2, AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "complete" | "error";
  progress: number;
  file: File;
  errorMessage?: string;
}

interface DocumentUploadZoneProps {
  onUploadComplete?: () => void;
}

export function DocumentUploadZone({ onUploadComplete }: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const { toast } = useToast();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const uploadFile = async (file: File) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newFile: UploadedFile = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading",
      progress: 0,
      file,
    };
    
    setUploadedFiles((prev) => [...prev, newFile]);

    try {
      setUploadedFiles((prev) =>
        prev.map((f) => f.id === id ? { ...f, progress: 10, status: "uploading" } : f)
      );

      const uploadUrlResponse = await apiRequest("POST", "/api/objects/upload");
      const { uploadURL } = await uploadUrlResponse.json();

      setUploadedFiles((prev) =>
        prev.map((f) => f.id === id ? { ...f, progress: 30 } : f)
      );

      const uploadResponse = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to storage");
      }

      setUploadedFiles((prev) =>
        prev.map((f) => f.id === id ? { ...f, progress: 70, status: "processing" } : f)
      );

      const url = new URL(uploadURL);
      const filePath = url.pathname;

      await apiRequest("POST", "/api/objects/acl", {
        uploadURL: uploadURL,
        aclPolicy: {
          visibility: "private",
        },
      });

      setUploadedFiles((prev) =>
        prev.map((f) => f.id === id ? { ...f, progress: 85 } : f)
      );

      const category = getCategoryFromFileType(file.type, file.name);

      await apiRequest("POST", "/api/documents", {
        title: file.name,
        category,
        filePath,
        fileType: file.type,
        fileSize: file.size,
      });

      setUploadedFiles((prev) =>
        prev.map((f) => f.id === id ? { ...f, progress: 100, status: "complete" } : f)
      );

      queryClient.invalidateQueries({ queryKey: ['/api/documents'] });

    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      
      setUploadedFiles((prev) =>
        prev.map((f) => f.id === id ? { ...f, status: "error", errorMessage } : f)
      );
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getCategoryFromFileType = (mimeType: string, fileName: string): string => {
    const lowerName = fileName.toLowerCase();
    
    if (lowerName.includes("mri") || lowerName.includes("scan")) return "mri";
    if (lowerName.includes("eeg")) return "eeg";
    if (lowerName.includes("blood") || lowerName.includes("lab")) return "blood_test";
    if (lowerName.includes("therapy") || lowerName.includes("pt") || lowerName.includes("ot")) return "therapy_report";
    if (lowerName.includes("discharge") || lowerName.includes("summary")) return "discharge_summary";
    if (lowerName.includes("prescription") || lowerName.includes("rx")) return "prescription";
    
    return "other";
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(uploadFile);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(uploadFile);
  };

  const removeFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith("image/")) return Image;
    if (type === "application/pdf") return FileText;
    return File;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allComplete = uploadedFiles.length > 0 && 
    uploadedFiles.every((f) => f.status === "complete" || f.status === "error");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">Upload Documents</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver ? "border-primary bg-primary/5" : "border-muted-foreground/25"}
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            className="absolute inset-0 opacity-0 cursor-pointer"
            onChange={handleFileSelect}
            data-testid="input-file-upload"
          />
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            Drag and drop medical documents here
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Supported: PDF, Images (PNG, JPG), Word documents
          </p>
          <Button variant="outline" size="sm" data-testid="button-browse-files">
            Browse Files
          </Button>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-2">
            {uploadedFiles.map((file) => {
              const FileIcon = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className={`flex items-center gap-3 p-3 rounded-md ${
                    file.status === "error" ? "bg-destructive/10" : "bg-accent/30"
                  }`}
                  data-testid={`uploaded-file-${file.id}`}
                >
                  <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                    {file.status === "uploading" && (
                      <Progress value={file.progress} className="h-1 mt-1" />
                    )}
                    {file.status === "error" && file.errorMessage && (
                      <p className="text-xs text-destructive mt-1">{file.errorMessage}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === "uploading" && (
                      <span className="text-xs text-muted-foreground">{file.progress}%</span>
                    )}
                    {file.status === "processing" && (
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    )}
                    {file.status === "complete" && (
                      <Check className="h-4 w-4 text-chart-2" />
                    )}
                    {file.status === "error" && (
                      <AlertCircle className="h-4 w-4 text-destructive" />
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(file.id)}
                      data-testid={`button-remove-file-${file.id}`}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {allComplete && (
          <Button
            className="w-full"
            onClick={onUploadComplete}
            data-testid="button-done-uploading"
          >
            Done
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
