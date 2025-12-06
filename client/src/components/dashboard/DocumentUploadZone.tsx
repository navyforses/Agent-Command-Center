import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Image, File, X, Check, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "complete" | "error";
  progress: number;
}

interface DocumentUploadZoneProps {
  onFilesSelected?: (files: File[]) => void;
}

export function DocumentUploadZone({ onFilesSelected }: DocumentUploadZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const simulateUpload = (file: File) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newFile: UploadedFile = {
      id,
      name: file.name,
      size: file.size,
      type: file.type,
      status: "uploading",
      progress: 0,
    };
    
    setUploadedFiles((prev) => [...prev, newFile]);
    
    // todo: remove mock functionality - simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? { ...f, progress, status: progress >= 100 ? "processing" : "uploading" }
            : f
        )
      );
      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setUploadedFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, status: "complete" } : f))
          );
        }, 1500);
      }
    }, 200);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(simulateUpload);
    onFilesSelected?.(files);
  }, [onFilesSelected]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(simulateUpload);
    onFilesSelected?.(files);
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
                  className="flex items-center gap-3 p-3 rounded-md bg-accent/30"
                  data-testid={`uploaded-file-${file.id}`}
                >
                  <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                    {file.status === "uploading" && (
                      <Progress value={file.progress} className="h-1 mt-1" />
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
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
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
      </CardContent>
    </Card>
  );
}
