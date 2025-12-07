import { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChatMessage, Document, Conversation } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import {
  Bot,
  Send,
  User,
  Sparkles,
  Loader2,
  FileText,
  FlaskConical,
  Activity,
  Mail,
  HelpCircle,
  Copy,
  Check,
  Download,
  MoreVertical,
  Upload,
  Image,
  File,
  X,
  AlertCircle,
  CheckCircle,
  XCircle,
  UserPlus,
  Calendar,
  Stethoscope,
  Plus,
  MessageSquare,
  Trash2,
  Paperclip,
  Video,
  ArrowLeft,
} from "lucide-react";
import type { Attachment } from "@shared/schema";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

interface SuggestedAction {
  actionType: string;
  actionData: any;
  description: string;
  descriptionKa?: string;
  status: "pending" | "confirmed" | "executed" | "cancelled";
}

interface AssistantChatResponse {
  message: ChatMessage;
  suggestedActions: SuggestedAction[];
  pendingActionMessages: ChatMessage[];
  conversationId?: number;
}

interface UploadResponse {
  document: Document;
  analysis: {
    documentType: string;
    category: string;
    summary: string;
    summaryKa: string;
    keyFindings: string[];
    purpose: string;
    extractedChildInfo?: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      diagnosis?: string;
    };
  };
  suggestedActions: SuggestedAction[];
  message?: ChatMessage;
  pendingActionMessages?: ChatMessage[];
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: "uploading" | "processing" | "analyzing" | "complete" | "error";
  progress: number;
  file: File;
  errorMessage?: string;
  document?: Document;
  analysis?: UploadResponse["analysis"];
  suggestedActions?: SuggestedAction[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  actionType?: string | null;
  actionData?: any;
  actionStatus?: string | null;
  suggestedActions?: SuggestedAction[];
  attachments?: Attachment[];
}

interface PendingAttachment {
  id: string;
  file: File;
  name: string;
  type: string;
  size: number;
  previewUrl?: string;
  status: "pending" | "uploading" | "complete" | "error";
  progress: number;
  filePath?: string;
  errorMessage?: string;
}

const quickActions = [
  { icon: FileText, label: "Analyze a document", labelKa: "დოკუმენტის ანალიზი" },
  { icon: FlaskConical, label: "Find clinical trials", labelKa: "კვლევების ძებნა" },
  { icon: Activity, label: "Therapy recommendations", labelKa: "თერაპიის რეკომენდაციები" },
  { icon: Mail, label: "Draft an email", labelKa: "ელ.ფოსტის შექმნა" },
  { icon: HelpCircle, label: "Explain HIE", labelKa: "HIE-ს ახსნა" },
];

const suggestedPrompts = [
  { en: "What does moderate HIE mean for my child's development?", ka: "რას ნიშნავს ზომიერი HIE ჩემი შვილის განვითარებისთვის?" },
  { en: "Can you summarize my child's latest MRI report?", ka: "შეგიძლიათ შეაჯამოთ ჩემი შვილის უახლესი MRI ანგარიში?" },
  { en: "What therapies are most effective for motor development?", ka: "რომელი თერაპიები არის ყველაზე ეფექტური მოტორული განვითარებისთვის?" },
  { en: "Draft an email to request medical records from our hospital", ka: "შეადგინეთ ელ.წერილი საავადმყოფოდან სამედიცინო ჩანაწერების მოთხოვნისთვის" },
  { en: "Find clinical trials for HIE in Europe", ka: "იპოვეთ კლინიკური კვლევები HIE-ზე ევროპაში" },
  { en: "Explain the GMFCS levels and what they mean", ka: "ახსენით GMFCS დონეები და რას ნიშნავს ისინი" },
];

function transformChatMessage(chatMessage: ChatMessage): Message {
  return {
    id: chatMessage.id.toString(),
    role: chatMessage.role as "user" | "assistant",
    content: chatMessage.content,
    timestamp: chatMessage.createdAt ? new Date(chatMessage.createdAt) : new Date(),
    actionType: chatMessage.actionType,
    actionData: chatMessage.actionData,
    actionStatus: chatMessage.actionStatus,
    attachments: chatMessage.attachments as Attachment[] | undefined,
  };
}

function getActionIcon(actionType: string) {
  switch (actionType) {
    case "create_child":
      return UserPlus;
    case "add_therapy":
      return Stethoscope;
    case "schedule_appointment":
      return Calendar;
    case "draft_email":
      return Mail;
    case "analyze_document":
      return FileText;
    default:
      return Activity;
  }
}

function getActionLabel(actionType: string): { en: string; ka: string } {
  switch (actionType) {
    case "create_child":
      return { en: "Create Child Profile", ka: "შვილის პროფილის შექმნა" };
    case "add_therapy":
      return { en: "Add Therapy", ka: "თერაპიის დამატება" };
    case "schedule_appointment":
      return { en: "Schedule Appointment", ka: "ვიზიტის დაგეგმვა" };
    case "draft_email":
      return { en: "Draft Email", ka: "ელ.ფოსტის შექმნა" };
    case "analyze_document":
      return { en: "Analyze Document", ka: "დოკუმენტის ანალიზი" };
    default:
      return { en: actionType, ka: actionType };
  }
}

interface ActionButtonsProps {
  messageId: string;
  actionType: string;
  actionData: any;
  actionStatus: string | null;
  onExecute: (messageId: string, actionType: string, actionData: any) => void;
  onCancel: (messageId: string) => void;
  isExecuting: boolean;
  language: string;
}

function ActionButtons({
  messageId,
  actionType,
  actionData,
  actionStatus,
  onExecute,
  onCancel,
  isExecuting,
  language,
}: ActionButtonsProps) {
  const Icon = getActionIcon(actionType);
  const label = getActionLabel(actionType);

  if (actionStatus === "executed") {
    return (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
        <Badge variant="outline" className="gap-1.5 text-chart-2 border-chart-2/50">
          <CheckCircle className="h-3 w-3" />
          {language === "en" ? "Completed" : "დასრულებულია"}
        </Badge>
      </div>
    );
  }

  if (actionStatus === "cancelled") {
    return (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50">
        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
          <XCircle className="h-3 w-3" />
          {language === "en" ? "Cancelled" : "გაუქმებულია"}
        </Badge>
      </div>
    );
  }

  if (actionStatus === "pending") {
    return (
      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border/50 flex-wrap">
        <Button
          size="sm"
          variant="default"
          className="gap-1.5"
          onClick={() => onExecute(messageId, actionType, actionData)}
          disabled={isExecuting}
          data-testid={`button-execute-action-${messageId}`}
        >
          {isExecuting ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Icon className="h-3 w-3" />
          )}
          {language === "en" ? label.en : label.ka}
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => onCancel(messageId)}
          disabled={isExecuting}
          data-testid={`button-cancel-action-${messageId}`}
        >
          <X className="h-3 w-3 mr-1" />
          {language === "en" ? "Cancel" : "გაუქმება"}
        </Button>
      </div>
    );
  }

  return null;
}

interface MessageItemProps {
  message: Message;
  onCopy: (content: string, id: string) => void;
  copiedId: string | null;
  onExecuteAction: (messageId: string, actionType: string, actionData: any) => void;
  onCancelAction: (messageId: string) => void;
  isExecuting: boolean;
  language: string;
}

function getAttachmentIcon(fileType: string) {
  if (fileType.startsWith("image/")) return Image;
  if (fileType.startsWith("video/")) return Video;
  if (fileType === "application/pdf") return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function MessageItem({
  message,
  onCopy,
  copiedId,
  onExecuteAction,
  onCancelAction,
  isExecuting,
  language,
}: MessageItemProps) {
  const isUser = message.role === "user";
  const isCopied = copiedId === message.id;

  return (
    <div
      className={`flex gap-4 ${isUser ? "flex-row-reverse" : ""}`}
      data-testid={`message-item-${message.id}`}
    >
      <Avatar className="h-10 w-10 flex-shrink-0">
        <AvatarFallback className={isUser ? "bg-secondary" : "bg-primary text-primary-foreground"}>
          {isUser ? <User className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
        </AvatarFallback>
      </Avatar>
      <div className={`flex flex-col max-w-[80%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-2 mb-1.5 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-sm font-medium">
            {isUser ? (language === "en" ? "You" : "თქვენ") : (language === "en" ? "AI Assistant" : "AI ასისტენტი")}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
        <Card className={`${isUser ? "bg-primary text-primary-foreground" : ""}`}>
          <CardContent className="p-4">
            {message.attachments && message.attachments.length > 0 && (
              <div className="mb-3 pb-3 border-b border-border/50">
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map((attachment) => {
                    const AttachmentIcon = getAttachmentIcon(attachment.fileType);
                    const isImage = attachment.fileType.startsWith("image/");
                    
                    return (
                      <div
                        key={attachment.id}
                        className={`flex items-center gap-2 rounded-md border p-2 ${
                          isUser ? "border-primary-foreground/30 bg-primary-foreground/10" : "border-border bg-muted/50"
                        }`}
                        data-testid={`message-attachment-${attachment.id}`}
                      >
                        {isImage && attachment.filePath ? (
                          <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img
                              src={`/api/objects${attachment.filePath}`}
                              alt={attachment.fileName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className={`h-10 w-10 rounded flex items-center justify-center flex-shrink-0 ${
                            isUser ? "bg-primary-foreground/20" : "bg-muted"
                          }`}>
                            <AttachmentIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate max-w-[120px]">{attachment.fileName}</p>
                          <p className={`text-xs ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                            {formatFileSize(attachment.fileSize)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>

            {!isUser && message.actionType && message.actionStatus && (
              <ActionButtons
                messageId={message.id}
                actionType={message.actionType}
                actionData={message.actionData}
                actionStatus={message.actionStatus}
                onExecute={onExecuteAction}
                onCancel={onCancelAction}
                isExecuting={isExecuting}
                language={language}
              />
            )}

            <div className={`flex items-center gap-2 mt-3 pt-2 border-t ${isUser ? "border-primary-foreground/20 justify-end" : "border-border justify-start"}`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="sm"
                    variant={isUser ? "secondary" : "ghost"}
                    className="h-7 px-2 text-xs gap-1.5"
                    onClick={() => onCopy(message.content, message.id)}
                    data-testid={`button-copy-message-${message.id}`}
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3" />
                        {language === "en" ? "Copied" : "კოპირებულია"}
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        {language === "en" ? "Copy" : "კოპირება"}
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCopied ? (language === "en" ? "Copied to clipboard!" : "კოპირებულია!") : (language === "en" ? "Copy message text" : "ტექსტის კოპირება")}
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface DocumentUploadPanelProps {
  uploadedFiles: UploadedFile[];
  onFilesSelected: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onExecuteAction: (action: SuggestedAction) => void;
  language: string;
}

function DocumentUploadPanel({
  uploadedFiles,
  onFilesSelected,
  onRemoveFile,
  onExecuteAction,
  language,
}: DocumentUploadPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    onFilesSelected(files);
  }, [onFilesSelected]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    onFilesSelected(files);
    e.target.value = "";
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

  const getStatusText = (status: UploadedFile["status"]) => {
    switch (status) {
      case "uploading":
        return language === "en" ? "Uploading..." : "იტვირთება...";
      case "processing":
        return language === "en" ? "Processing..." : "მუშავდება...";
      case "analyzing":
        return language === "en" ? "AI Analyzing..." : "AI ანალიზი...";
      case "complete":
        return language === "en" ? "Complete" : "დასრულებულია";
      case "error":
        return language === "en" ? "Error" : "შეცდომა";
      default:
        return "";
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Upload className="h-4 w-4" />
          {language === "en" ? "Upload Documents for AI Analysis" : "დოკუმენტების ატვირთვა AI ანალიზისთვის"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-6 text-center transition-colors
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
            data-testid="input-ai-file-upload"
          />
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium mb-1">
            {language === "en" ? "Drag and drop medical documents here" : "გადაათრიეთ სამედიცინო დოკუმენტები აქ"}
          </p>
          <p className="text-xs text-muted-foreground mb-2">
            {language === "en" ? "PDF, Images (PNG, JPG), Word documents" : "PDF, სურათები (PNG, JPG), Word დოკუმენტები"}
          </p>
          <Button variant="outline" size="sm" data-testid="button-ai-browse-files">
            {language === "en" ? "Browse Files" : "ფაილების არჩევა"}
          </Button>
        </div>

        {uploadedFiles.length > 0 && (
          <div className="space-y-3">
            {uploadedFiles.map((file) => {
              const FileIcon = getFileIcon(file.type);
              return (
                <div
                  key={file.id}
                  className={`rounded-md border ${
                    file.status === "error" ? "border-destructive/50 bg-destructive/5" : "border-border"
                  }`}
                  data-testid={`ai-uploaded-file-${file.id}`}
                >
                  <div className="flex items-center gap-3 p-3">
                    <FileIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{file.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                        <span className="text-xs text-muted-foreground">-</span>
                        <span className={`text-xs ${file.status === "error" ? "text-destructive" : file.status === "complete" ? "text-chart-2" : "text-muted-foreground"}`}>
                          {getStatusText(file.status)}
                        </span>
                      </div>
                      {(file.status === "uploading" || file.status === "processing" || file.status === "analyzing") && (
                        <Progress value={file.progress} className="h-1 mt-2" />
                      )}
                      {file.status === "error" && file.errorMessage && (
                        <p className="text-xs text-destructive mt-1">{file.errorMessage}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {(file.status === "uploading" || file.status === "processing" || file.status === "analyzing") && (
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      )}
                      {file.status === "complete" && (
                        <CheckCircle className="h-4 w-4 text-chart-2" />
                      )}
                      {file.status === "error" && (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveFile(file.id)}
                        data-testid={`button-remove-ai-file-${file.id}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {file.status === "complete" && file.analysis && (
                    <div className="px-3 pb-3 border-t border-border/50 mt-2 pt-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {file.analysis.category}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {file.analysis.documentType}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {language === "en" ? file.analysis.summary : file.analysis.summaryKa}
                      </p>
                      {file.analysis.keyFindings && file.analysis.keyFindings.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium mb-1">{language === "en" ? "Key Findings:" : "მთავარი აღმოჩენები:"}</p>
                          <ul className="text-xs text-muted-foreground list-disc list-inside">
                            {file.analysis.keyFindings.slice(0, 3).map((finding, i) => (
                              <li key={i}>{finding}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {file.suggestedActions && file.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {file.suggestedActions.map((action, i) => {
                            const Icon = getActionIcon(action.actionType);
                            return (
                              <Button
                                key={i}
                                size="sm"
                                variant="outline"
                                className="text-xs gap-1.5"
                                onClick={() => onExecuteAction(action)}
                                data-testid={`button-suggested-action-${file.id}-${i}`}
                              >
                                <Icon className="h-3 w-3" />
                                {language === "en" ? action.description : action.descriptionKa || action.description}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ConversationSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  isLoading,
  language,
}: {
  conversations: Conversation[] | undefined;
  activeConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: number) => void;
  isLoading: boolean;
  language: string;
}) {
  const formatDate = (date: Date | string | null | undefined) => {
    if (!date) return "";
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } else if (diffDays === 1) {
      return language === "en" ? "Yesterday" : "გუშინ";
    } else if (diffDays < 7) {
      return d.toLocaleDateString(language === "en" ? "en-US" : "ka-GE", { weekday: "short" });
    } else {
      return d.toLocaleDateString(language === "en" ? "en-US" : "ka-GE", { month: "short", day: "numeric" });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Button 
          onClick={onNewChat} 
          className="w-full gap-2"
          data-testid="button-new-chat"
        >
          <Plus className="h-4 w-4" />
          {language === "en" ? "New Chat" : "ახალი ჩატი"}
        </Button>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoading ? (
                <div className="p-4 space-y-3">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : conversations && conversations.length > 0 ? (
                conversations.map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <SidebarMenuButton
                      isActive={activeConversationId === conversation.id}
                      onClick={() => onSelectConversation(conversation.id)}
                      className="w-full justify-start group"
                      data-testid={`conversation-item-${conversation.id}`}
                    >
                      <div className="flex items-center gap-3 w-full min-w-0">
                        <MessageSquare className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0 text-left">
                          <p className="text-sm font-medium truncate">
                            {conversation.title || (language === "en" ? "New Conversation" : "ახალი საუბარი")}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {conversation.preview || formatDate(conversation.updatedAt || conversation.createdAt)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteConversation(conversation.id);
                          }}
                          data-testid={`button-delete-conversation-${conversation.id}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  {language === "en" ? "No conversations yet" : "საუბრები ჯერ არ არის"}
                </div>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

export default function AIAssistant() {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [executingActionId, setExecutingActionId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [pendingAttachments, setPendingAttachments] = useState<PendingAttachment[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sidebarStyle = {
    "--sidebar-width": "18rem",
    "--sidebar-width-icon": "3rem",
  };

  const { data: conversations, isLoading: conversationsLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: conversationMessages, isLoading: messagesLoading } = useQuery<ChatMessage[]>({
    queryKey: ["/api/conversations", activeConversationId, "messages"],
    enabled: !!activeConversationId,
  });

  useEffect(() => {
    if (conversationMessages && activeConversationId) {
      const sortedMessages = [...conversationMessages].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
      setMessages(sortedMessages.map(transformChatMessage));
    } else if (!activeConversationId) {
      setMessages([]);
    }
  }, [conversationMessages, activeConversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector("[data-radix-scroll-area-viewport]");
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const handleCopy = async (content: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
      toast({
        title: language === "en" ? "Copied to clipboard" : "კოპირებულია",
        description: language === "en" ? "Message content has been copied." : "შეტყობინება კოპირებულია.",
      });
    } catch {
      toast({
        title: language === "en" ? "Failed to copy" : "კოპირება ვერ მოხერხდა",
        description: language === "en" ? "Could not copy to clipboard." : "ბუფერში კოპირება ვერ მოხერხდა.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (format: "txt" | "md") => {
    if (messages.length === 0) {
      toast({
        title: language === "en" ? "No messages to export" : "ექსპორტისთვის შეტყობინებები არ არის",
        description: language === "en" ? "Start a conversation first." : "დაიწყეთ საუბარი.",
        variant: "destructive",
      });
      return;
    }

    const content = messages
      .map((msg) => {
        const role = msg.role === "user" ? "You" : "AI Assistant";
        const time = msg.timestamp.toLocaleString();
        if (format === "md") {
          return `## ${role}\n*${time}*\n\n${msg.content}\n\n---\n`;
        }
        return `[${role}] (${time})\n${msg.content}\n\n`;
      })
      .join("\n");

    const header =
      format === "md"
        ? `# HIE Command Center - Chat Export\n\nExported on ${new Date().toLocaleString()}\n\n---\n\n`
        : `HIE Command Center - Chat Export\nExported on ${new Date().toLocaleString()}\n${"=".repeat(50)}\n\n`;

    const fullContent = header + content;
    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `hie-chat-export-${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: language === "en" ? "Downloaded successfully" : "წარმატებით ჩამოიტვირთა",
      description: language === "en" ? `Conversation exported as ${format.toUpperCase()} file.` : `საუბარი ექსპორტირებულია ${format.toUpperCase()} ფორმატში.`,
    });
  };

  const createConversation = useMutation({
    mutationFn: async (title: string) => {
      const response = await apiRequest("POST", "/api/conversations", { title });
      return response.json() as Promise<Conversation>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(data.id);
    },
    onError: (error: Error) => {
      console.error("Create conversation error:", error);
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: language === "en" ? "Failed to create conversation." : "საუბრის შექმნა ვერ მოხერხდა.",
        variant: "destructive",
      });
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
      return id;
    },
    onSuccess: (deletedId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (activeConversationId === deletedId) {
        setActiveConversationId(null);
        setMessages([]);
      }
      toast({
        title: language === "en" ? "Conversation deleted" : "საუბარი წაიშალა",
        description: language === "en" ? "The conversation has been removed." : "საუბარი წაიშალა.",
      });
    },
    onError: (error: Error) => {
      console.error("Delete conversation error:", error);
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: language === "en" ? "Failed to delete conversation." : "საუბრის წაშლა ვერ მოხერხდა.",
        variant: "destructive",
      });
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ content, documentIds, conversationId, attachments }: { content: string; documentIds?: number[]; conversationId?: number; attachments?: Attachment[] }) => {
      const response = await apiRequest("POST", "/api/assistant/chat", { content, documentIds, conversationId, attachments });
      return response.json() as Promise<AssistantChatResponse>;
    },
    onSuccess: (data) => {
      if (data.conversationId) {
        setActiveConversationId(data.conversationId);
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", data.conversationId, "messages"] });
      }
      if (data.suggestedActions && data.suggestedActions.length > 0) {
        toast({
          title: language === "en" ? "Actions Available" : "ხელმისაწვდომი მოქმედებები",
          description: language === "en"
            ? `AI suggested ${data.suggestedActions.length} action(s). Review and confirm below.`
            : `AI-მ შემოგთავაზათ ${data.suggestedActions.length} მოქმედება. გადახედეთ და დაადასტურეთ ქვემოთ.`,
        });
      }
    },
    onError: (error: Error) => {
      console.error("Chat mutation error:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: language === "en"
          ? "I apologize, but I encountered an error processing your request. Please try again."
          : "ბოდიში, შეცდომა მოხდა თქვენი მოთხოვნის დამუშავებისას. გთხოვთ სცადოთ ხელახლა.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: language === "en" ? "Failed to get AI response. Please try again." : "AI პასუხის მიღება ვერ მოხერხდა.",
        variant: "destructive",
      });
    },
  });

  const executeAction = useMutation({
    mutationFn: async ({ messageId, actionType, actionData }: { messageId: string; actionType: string; actionData: any }) => {
      setExecutingActionId(messageId);
      const response = await apiRequest("POST", "/api/assistant/execute", {
        actionType,
        actionData,
        messageId: parseInt(messageId, 10),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (activeConversationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId, "messages"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      queryClient.invalidateQueries({ queryKey: ["/api/therapies"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      setExecutingActionId(null);
      toast({
        title: language === "en" ? "Action Completed" : "მოქმედება დასრულდა",
        description: data.message || (language === "en" ? "The action was executed successfully." : "მოქმედება წარმატებით შესრულდა."),
      });
    },
    onError: (error: Error) => {
      console.error("Execute action error:", error);
      setExecutingActionId(null);
      toast({
        title: language === "en" ? "Action Failed" : "მოქმედება ვერ შესრულდა",
        description: language === "en" ? "Failed to execute the action. Please try again." : "მოქმედების შესრულება ვერ მოხერხდა.",
        variant: "destructive",
      });
    },
  });

  const cancelAction = useMutation({
    mutationFn: async (messageId: string) => {
      const response = await apiRequest("POST", "/api/assistant/cancel", {
        messageId: parseInt(messageId, 10),
      });
      return response.json();
    },
    onSuccess: () => {
      if (activeConversationId) {
        queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId, "messages"] });
      }
      toast({
        title: language === "en" ? "Action Cancelled" : "მოქმედება გაუქმდა",
        description: language === "en" ? "The suggested action has been cancelled." : "შემოთავაზებული მოქმედება გაუქმდა.",
      });
    },
    onError: (error: Error) => {
      console.error("Cancel action error:", error);
      toast({
        title: language === "en" ? "Error" : "შეცდომა",
        description: language === "en" ? "Failed to cancel the action." : "მოქმედების გაუქმება ვერ მოხერხდა.",
        variant: "destructive",
      });
    },
  });

  const handleSend = async (message?: string) => {
    const text = message || input;
    if (!text.trim() && pendingAttachments.length === 0) return;

    let uploadedAttachments: Attachment[] = [];

    if (pendingAttachments.length > 0) {
      setIsUploadingAttachments(true);
      try {
        uploadedAttachments = await Promise.all(
          pendingAttachments.map((attachment) => uploadAttachment(attachment))
        );
        pendingAttachments.forEach((a) => {
          if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
        });
        setPendingAttachments([]);
      } catch (error) {
        console.error("Attachment upload error:", error);
        toast({
          title: language === "en" ? "Upload Failed" : "ატვირთვა ვერ მოხერხდა",
          description: language === "en" ? "Failed to upload attachments." : "ფაილების ატვირთვა ვერ მოხერხდა.",
          variant: "destructive",
        });
        setIsUploadingAttachments(false);
        return;
      }
      setIsUploadingAttachments(false);
    }

    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: text || (language === "en" ? "Attached files" : "მიმაგრებული ფაილები"),
      timestamp: new Date(),
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const completedDocIds = uploadedFiles
      .filter((f) => f.status === "complete" && f.document?.id)
      .map((f) => f.document!.id);

    sendMessage.mutate({
      content: text || (language === "en" ? "Attached files" : "მიმაგრებული ფაილები"),
      documentIds: completedDocIds.length > 0 ? completedDocIds : undefined,
      conversationId: activeConversationId || undefined,
      attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined,
    });
  };

  const handleQuickAction = (action: (typeof quickActions)[0]) => {
    const promptMap: Record<string, string> = {
      "Analyze a document": language === "en"
        ? "Help me understand my child's latest medical document"
        : "დამეხმარეთ ჩემი შვილის უახლესი სამედიცინო დოკუმენტის გაგებაში",
      "Find clinical trials": language === "en"
        ? "What clinical trials are available for HIE treatment?"
        : "რა კლინიკური კვლევებია ხელმისაწვდომი HIE მკურნალობისთვის?",
      "Therapy recommendations": language === "en"
        ? "What therapies do you recommend for my child with HIE?"
        : "რა თერაპიებს მირჩევთ ჩემი შვილისთვის HIE-ით?",
      "Draft an email": language === "en"
        ? "Help me draft a professional email to a specialist"
        : "დამეხმარეთ პროფესიონალური ელ.წერილის შედგენაში სპეციალისტისთვის",
      "Explain HIE": language === "en"
        ? "Can you explain what Hypoxic-Ischemic Encephalopathy is?"
        : "შეგიძლიათ ახსნათ რა არის ჰიპოქსიურ-იშემიური ენცეფალოპათია?",
    };
    handleSend(promptMap[action.label] || action.label);
  };

  const handleExecuteAction = (messageId: string, actionType: string, actionData: any) => {
    executeAction.mutate({ messageId, actionType, actionData });
  };

  const handleCancelAction = (messageId: string) => {
    cancelAction.mutate(messageId);
  };

  const handleAttachmentSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newAttachments: PendingAttachment[] = files.map((file) => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      type: file.type,
      size: file.size,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
      status: "pending" as const,
      progress: 0,
    }));
    setPendingAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setPendingAttachments((prev) => {
      const attachment = prev.find((a) => a.id === id);
      if (attachment?.previewUrl) {
        URL.revokeObjectURL(attachment.previewUrl);
      }
      return prev.filter((a) => a.id !== id);
    });
  };

  const uploadAttachment = async (attachment: PendingAttachment): Promise<Attachment> => {
    const uploadUrlResponse = await apiRequest("POST", "/api/objects/upload");
    if (!uploadUrlResponse.ok) {
      throw new Error("Failed to get upload URL");
    }
    const { uploadURL } = await uploadUrlResponse.json();

    const uploadResponse = await fetch(uploadURL, {
      method: "PUT",
      body: attachment.file,
      headers: { "Content-Type": attachment.type || "application/octet-stream" },
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload file");
    }

    const url = new URL(uploadURL);
    const filePath = url.pathname;

    await apiRequest("POST", "/api/objects/acl", {
      uploadURL: uploadURL,
      aclPolicy: { visibility: "private" },
    });

    return {
      id: attachment.id,
      fileName: attachment.name,
      fileType: attachment.type,
      fileSize: attachment.size,
      filePath: filePath,
    };
  };

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
      setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: 10, status: "uploading" } : f)));

      const uploadUrlResponse = await apiRequest("POST", "/api/objects/upload");
      if (!uploadUrlResponse.ok) {
        const errorData = await uploadUrlResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to get upload URL");
      }
      const { uploadURL } = await uploadUrlResponse.json();

      setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: 30, status: "uploading" } : f)));

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

      setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: 50, status: "processing" } : f)));

      const url = new URL(uploadURL);
      const filePath = url.pathname;

      const aclResponse = await apiRequest("POST", "/api/objects/acl", {
        uploadURL: uploadURL,
        aclPolicy: {
          visibility: "private",
        },
      });

      if (!aclResponse.ok) {
        const errorData = await aclResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to set file permissions");
      }

      setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, progress: 70, status: "analyzing" } : f)));

      const analyzeResponse = await apiRequest("POST", "/api/assistant/upload", {
        title: file.name,
        filePath,
        fileType: file.type,
        fileSize: file.size,
      });

      if (!analyzeResponse.ok) {
        const errorData = await analyzeResponse.json().catch(() => ({}));
        throw new Error(errorData.message || "AI analysis failed");
      }

      const analyzeResult: UploadResponse = await analyzeResponse.json();

      setUploadedFiles((prev) =>
        prev.map((f) =>
          f.id === id
            ? {
                ...f,
                progress: 100,
                status: "complete",
                document: analyzeResult.document,
                analysis: analyzeResult.analysis,
                suggestedActions: analyzeResult.suggestedActions,
              }
            : f
        )
      );

      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });

      toast({
        title: language === "en" ? "Document Analyzed" : "დოკუმენტი გაანალიზებულია",
        description: language === "en"
          ? `${file.name} has been processed and analyzed by AI.`
          : `${file.name} დამუშავდა და გაანალიზდა AI-ს მიერ.`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "Upload failed";

      setUploadedFiles((prev) => prev.map((f) => (f.id === id ? { ...f, status: "error", errorMessage } : f)));

      toast({
        title: language === "en" ? "Upload Failed" : "ატვირთვა ვერ მოხერხდა",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleFilesSelected = (files: File[]) => {
    files.forEach(uploadFile);
  };

  const handleRemoveFile = (id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleExecuteSuggestedAction = (action: SuggestedAction) => {
    executeAction.mutate({
      messageId: `suggested-${Date.now()}`,
      actionType: action.actionType,
      actionData: action.actionData,
    });
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setMessages([]);
    setUploadedFiles([]);
  };

  const handleSelectConversation = (id: number) => {
    setActiveConversationId(id);
    setUploadedFiles([]);
  };

  const handleDeleteConversation = (id: number) => {
    deleteConversation.mutate(id);
  };

  const isLoading = conversationsLoading || (activeConversationId && messagesLoading);

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-[calc(100vh-4rem)] w-full">
        <ConversationSidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          isLoading={conversationsLoading}
          language={language}
        />
        
        <SidebarInset className="flex flex-col flex-1 overflow-hidden">
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      asChild
                      data-testid="button-back-to-dashboard"
                    >
                      <Link href="/">
                        <ArrowLeft className="h-5 w-5" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {language === "en" ? "Back to Dashboard" : "მთავარ გვერდზე დაბრუნება"}
                  </TooltipContent>
                </Tooltip>
                <SidebarTrigger data-testid="button-sidebar-toggle" />
                <div className="p-2 bg-primary rounded-md">
                  <Bot className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold" data-testid="text-ai-title">{t("aiAssistant")}</h1>
                  <p className="text-muted-foreground">
                    {language === "en" ? "Your personal medical AI helper" : "თქვენი პირადი სამედიცინო AI დამხმარე"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  {language === "en" ? "AI Command Center" : "AI სამართავი ცენტრი"}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="ghost" data-testid="button-chat-menu">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownload("txt")} data-testid="button-download-txt">
                      <Download className="h-4 w-4 mr-2" />
                      {language === "en" ? "Download as TXT" : "ჩამოტვირთვა TXT-ად"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDownload("md")} data-testid="button-download-md">
                      <Download className="h-4 w-4 mr-2" />
                      {language === "en" ? "Download as Markdown" : "ჩამოტვირთვა Markdown-ად"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-hidden px-6">
            {isLoading ? (
              <div className="h-full flex flex-col max-w-3xl mx-auto py-4">
                <div className="space-y-4">
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-20 w-3/4 ml-auto" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="h-full flex flex-col max-w-3xl mx-auto py-4">
                <DocumentUploadPanel
                  uploadedFiles={uploadedFiles}
                  onFilesSelected={handleFilesSelected}
                  onRemoveFile={handleRemoveFile}
                  onExecuteAction={handleExecuteSuggestedAction}
                  language={language}
                />

                <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="p-4 bg-primary/10 rounded-full mb-6">
                    <Bot className="h-12 w-12 text-primary" />
                  </div>
                  <h2 className="text-xl font-semibold mb-2">
                    {language === "en" ? "How can I help you today?" : "როგორ შემიძლია დაგეხმაროთ დღეს?"}
                  </h2>
                  <p className="text-muted-foreground text-center mb-8">
                    {language === "en"
                      ? "I can analyze documents, find clinical trials, help with therapy recommendations, and more."
                      : "შემიძლია დოკუმენტების ანალიზი, კლინიკური კვლევების ძებნა, თერაპიის რეკომენდაციები და სხვა."}
                  </p>

                  <div className="flex flex-wrap justify-center gap-2 mb-8">
                    {quickActions.map((action, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        className="gap-2"
                        onClick={() => handleQuickAction(action)}
                        data-testid={`button-quick-action-${i}`}
                      >
                        <action.icon className="h-4 w-4" />
                        {language === "en" ? action.label : action.labelKa}
                      </Button>
                    ))}
                  </div>

                  <div className="w-full">
                    <p className="text-sm text-muted-foreground mb-3">
                      {language === "en" ? "Or try one of these:" : "ან სცადეთ ერთ-ერთი ამათგანი:"}
                    </p>
                    <div className="grid gap-2">
                      {suggestedPrompts.slice(0, 4).map((prompt, i) => (
                        <Button
                          key={i}
                          variant="ghost"
                          className="justify-start text-left h-auto py-3 px-4"
                          onClick={() => handleSend(language === "en" ? prompt.en : prompt.ka)}
                          data-testid={`button-suggested-${i}`}
                        >
                          {language === "en" ? prompt.en : prompt.ka}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full" ref={scrollRef}>
                <div className="py-4 max-w-3xl mx-auto">
                  {uploadedFiles.length > 0 && (
                    <DocumentUploadPanel
                      uploadedFiles={uploadedFiles}
                      onFilesSelected={handleFilesSelected}
                      onRemoveFile={handleRemoveFile}
                      onExecuteAction={handleExecuteSuggestedAction}
                      language={language}
                    />
                  )}
                  <div className="space-y-6">
                    {messages.map((message) => (
                      <MessageItem
                        key={message.id}
                        message={message}
                        onCopy={handleCopy}
                        copiedId={copiedId}
                        onExecuteAction={handleExecuteAction}
                        onCancelAction={handleCancelAction}
                        isExecuting={executingActionId === message.id}
                        language={language}
                      />
                    ))}
                    {sendMessage.isPending && (
                      <div className="flex gap-4">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            <Bot className="h-5 w-5" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-medium">
                              {language === "en" ? "AI Assistant" : "AI ასისტენტი"}
                            </span>
                          </div>
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-center gap-2">
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <p className="text-sm text-muted-foreground">
                                  {language === "en" ? "Thinking..." : "ვფიქრობ..."}
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </div>

          <div className="p-6 pt-4 border-t">
            <div className="max-w-3xl mx-auto">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAttachmentSelect}
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.txt"
                className="hidden"
                data-testid="input-file-attachment"
              />

              {pendingAttachments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2" data-testid="attachment-preview-container">
                  {pendingAttachments.map((attachment) => {
                    const AttachmentIcon = getAttachmentIcon(attachment.type);
                    return (
                      <div
                        key={attachment.id}
                        className="flex items-center gap-2 rounded-md border bg-muted/50 p-2"
                        data-testid={`attachment-preview-${attachment.id}`}
                      >
                        {attachment.previewUrl ? (
                          <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                            <img src={attachment.previewUrl} alt={attachment.name} className="h-full w-full object-cover" />
                          </div>
                        ) : (
                          <div className="h-10 w-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                            <AttachmentIcon className="h-5 w-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium truncate max-w-[100px]">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 flex-shrink-0"
                          onClick={() => handleRemoveAttachment(attachment.id)}
                          data-testid={`button-remove-attachment-${attachment.id}`}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={sendMessage.isPending || isUploadingAttachments}
                  data-testid="button-attach-file"
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Input
                  placeholder={language === "en" ? "Ask me anything about your child's care..." : "მკითხეთ ნებისმიერი კითხვა თქვენი შვილის მოვლის შესახებ..."}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={sendMessage.isPending || isUploadingAttachments}
                  className="flex-1"
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={() => handleSend()}
                  disabled={(!input.trim() && pendingAttachments.length === 0) || sendMessage.isPending || isUploadingAttachments}
                  data-testid="button-send-message"
                >
                  {(sendMessage.isPending || isUploadingAttachments) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
