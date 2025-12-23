import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Email } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PenSquare,
  Search,
  Mail,
  Send,
  Inbox,
  FileText,
  Clock,
  Sparkles,
  Loader2,
  Trash2,
  Edit,
  Eye,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const emailTemplates = [
  { id: "medical_records", label: "Request Medical Records" },
  { id: "appointment", label: "Schedule Appointment" },
  { id: "trial_inquiry", label: "Clinical Trial Inquiry" },
  { id: "second_opinion", label: "Request Second Opinion" },
  { id: "custom", label: "Custom Email" },
];

function EmailSkeleton() {
  return (
    <div className="divide-y">
      {[1, 2, 3].map((i) => (
        <div key={i} className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-48" />
            </div>
            <Skeleton className="h-4 w-20" />
          </div>
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-4 w-full" />
        </div>
      ))}
    </div>
  );
}

export default function EmailHub() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState("professional");
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [isEditingDraft, setIsEditingDraft] = useState(false);

  const { data: emails, isLoading } = useQuery<Email[]>({
    queryKey: ['/api/emails']
  });

  const createEmail = useMutation({
    mutationFn: (data: { subject: string; recipient: string; body: string; status: string; category?: string; aiDraftContent?: string }) => 
      apiRequest('POST', '/api/emails', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      toast({
        title: "Success",
        description: "Email saved successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save email",
        variant: "destructive",
      });
    }
  });

  const updateEmail = useMutation({
    mutationFn: ({ id, ...data }: { id: number; subject?: string; recipient?: string; body?: string; status?: string; category?: string; aiDraftContent?: string; sentAt?: string }) => 
      apiRequest('PATCH', `/api/emails/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      toast({
        title: "Success",
        description: "Email updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update email",
        variant: "destructive",
      });
    }
  });

  const resetComposeForm = () => {
    setSelectedTemplate("");
    setEmailContent("");
    setRecipientEmail("");
    setSubject("");
    setTone("professional");
  };

  const handleSaveDraft = () => {
    if (!subject.trim() && !emailContent.trim() && !recipientEmail.trim()) {
      toast({
        title: "Cannot save empty draft",
        description: "Please enter at least a subject, recipient, or message",
        variant: "destructive",
      });
      return;
    }

    createEmail.mutate({
      subject: subject || "(No subject)",
      recipient: recipientEmail,
      body: emailContent,
      status: "draft",
      category: selectedTemplate || undefined,
      aiDraftContent: emailContent,
    });
    
    setShowComposeDialog(false);
    resetComposeForm();
  };

  const handleSendEmail = () => {
    if (!recipientEmail.trim()) {
      toast({
        title: "Recipient required",
        description: "Please enter a recipient email address",
        variant: "destructive",
      });
      return;
    }

    if (!subject.trim()) {
      toast({
        title: "Subject required",
        description: "Please enter an email subject",
        variant: "destructive",
      });
      return;
    }

    createEmail.mutate({
      subject: subject,
      recipient: recipientEmail,
      body: emailContent,
      status: "sent",
      category: selectedTemplate || undefined,
    });
    
    setShowComposeDialog(false);
    resetComposeForm();
  };

  const generateAIDraft = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const templates: Record<string, string> = {
        medical_records: `Dear Dr. [Name],

I am writing to request a copy of the complete medical records for my child, who was treated at your facility.

We require these records for ongoing care coordination with our medical team. Please include all relevant documentation including:
- MRI and EEG reports
- Discharge summaries
- Progress notes
- Treatment recommendations

Please let me know if you require any authorization forms or if there are associated fees.

Thank you for your assistance.

Best regards`,
        trial_inquiry: `Dear Clinical Trials Coordinator,

I am writing to inquire about eligibility for your clinical trial for children with Hypoxic-Ischemic Encephalopathy.

We are committed to participating in research that may benefit children with HIE. Could you please provide information about eligibility criteria, travel requirements, and the enrollment process?

Thank you for considering our inquiry.

Best regards`,
        appointment: `Dear [Provider Name],

I would like to schedule a follow-up appointment for my child regarding their ongoing treatment.

Our availability is generally flexible during weekday mornings. Please let me know your earliest available slots.

Thank you.

Best regards`,
        second_opinion: `Dear [Doctor Name],

I am reaching out to request a second opinion consultation regarding my child's diagnosis and treatment plan.

I have attached the relevant medical records for your review. Please let me know your availability for a consultation and any additional information you may need.

Thank you for your consideration.

Best regards`,
      };
      setEmailContent(templates[selectedTemplate] || "");
      setIsGenerating(false);
    }, 1500);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "replied": return <Badge variant="default">Replied</Badge>;
      case "sent": return <Badge variant="secondary">Sent</Badge>;
      case "draft": return <Badge variant="outline">Draft</Badge>;
      case "no_response": return <Badge variant="outline">Awaiting Reply</Badge>;
      default: return null;
    }
  };

  const formatEmailDate = (date: Date | string | null) => {
    if (!date) return "";
    try {
      return format(new Date(date), "MMM d, yyyy");
    } catch {
      return "";
    }
  };

  const deleteEmail = useMutation({
    mutationFn: (id: number) =>
      apiRequest('DELETE', `/api/emails/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emails'] });
      toast({
        title: "Success",
        description: "Email deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete email",
        variant: "destructive",
      });
    }
  });

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    setIsEditingDraft(false);
    setShowEmailDialog(true);
  };

  const handleEditDraft = (email: Email) => {
    setSelectedEmail(email);
    setIsEditingDraft(true);
    setRecipientEmail(email.recipient || "");
    setSubject(email.subject || "");
    setEmailContent(email.body || "");
    setSelectedTemplate(email.category || "");
    setShowEmailDialog(false);
    setShowComposeDialog(true);
  };

  const handleSendDraft = (email: Email) => {
    if (!email.recipient?.trim()) {
      toast({
        title: "Recipient required",
        description: "Please edit the draft and add a recipient",
        variant: "destructive",
      });
      return;
    }

    updateEmail.mutate({
      id: email.id,
      status: "sent",
      sentAt: new Date().toISOString(),
    });
    setShowEmailDialog(false);
    setSelectedEmail(null);
  };

  const handleDeleteEmail = (email: Email) => {
    deleteEmail.mutate(email.id);
    setShowEmailDialog(false);
    setSelectedEmail(null);
  };

  const allEmails = emails || [];
  
  const filteredEmails = allEmails.filter((email) => {
    const matchesSearch = 
      (email.subject?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
      (email.recipient?.toLowerCase() || "").includes(searchQuery.toLowerCase());
    
    if (activeTab === "inbox") {
      return matchesSearch && email.status !== "sent" && email.status !== "draft";
    } else if (activeTab === "sent") {
      return matchesSearch && email.status === "sent";
    } else if (activeTab === "drafts") {
      return matchesSearch && email.status === "draft";
    }
    return matchesSearch;
  });

  const inboxCount = allEmails.filter(e => e.status !== "sent" && e.status !== "draft").length;
  const sentCount = allEmails.filter(e => e.status === "sent").length;
  const draftCount = allEmails.filter(e => e.status === "draft").length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("emailHub")}</h1>
          <p className="text-muted-foreground">Communicate with healthcare providers</p>
        </div>
        <Dialog open={showComposeDialog} onOpenChange={setShowComposeDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2" data-testid="button-compose-email">
              <PenSquare className="h-4 w-4" />
              {t("compose")}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Compose Email</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger data-testid="select-email-template">
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {emailTemplates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Tone</label>
                  <Select value={tone} onValueChange={setTone}>
                    <SelectTrigger data-testid="select-tone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="friendly">Friendly</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Recipient Email</label>
                <Input
                  placeholder="doctor@hospital.com"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  data-testid="input-recipient-email"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Subject</label>
                <Input
                  placeholder="Subject line..."
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  data-testid="input-email-subject"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium">Message</label>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={generateAIDraft}
                    disabled={!selectedTemplate || isGenerating}
                    data-testid="button-generate-ai-draft"
                  >
                    {isGenerating ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Sparkles className="h-3 w-3" />
                    )}
                    Generate with AI
                  </Button>
                </div>
                <Textarea
                  placeholder="Write your message..."
                  value={emailContent}
                  onChange={(e) => setEmailContent(e.target.value)}
                  className="min-h-[300px]"
                  data-testid="textarea-email-content"
                />
              </div>

              <div className="flex justify-between gap-4">
                <Button 
                  variant="outline" 
                  className="gap-2" 
                  onClick={handleSaveDraft}
                  disabled={createEmail.isPending}
                  data-testid="button-save-draft"
                >
                  {createEmail.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Save Draft
                </Button>
                <Button 
                  className="gap-2" 
                  onClick={handleSendEmail}
                  disabled={createEmail.isPending}
                  data-testid="button-send-email"
                >
                  {createEmail.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send Email
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="inbox" data-testid="tab-inbox">
            <Inbox className="h-4 w-4 mr-2" />
            {t("inbox")}
            {!isLoading && <Badge variant="secondary" className="ml-2">{inboxCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="sent" data-testid="tab-sent">
            <Send className="h-4 w-4 mr-2" />
            {t("sent")}
            {!isLoading && sentCount > 0 && <Badge variant="secondary" className="ml-2">{sentCount}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="drafts" data-testid="tab-drafts">
            <FileText className="h-4 w-4 mr-2" />
            {t("drafts")}
            {!isLoading && draftCount > 0 && <Badge variant="secondary" className="ml-2">{draftCount}</Badge>}
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-emails"
            />
          </div>
        </div>

        <TabsContent value="inbox" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <EmailSkeleton />
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No emails found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredEmails.map((email) => (
                      <div
                        key={email.id}
                        className="p-4 hover-elevate cursor-pointer transition-colors hover:bg-muted/50"
                        data-testid={`email-thread-${email.id}`}
                        onClick={() => handleEmailClick(email)}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{email.recipient || "Unknown"}</h4>
                              {getStatusBadge(email.status)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{email.category || "General"}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatEmailDate(email.sentAt || email.createdAt)}
                          </div>
                        </div>
                        <h5 className="font-medium text-sm mb-1">{email.subject || "(No subject)"}</h5>
                        <p className="text-sm text-muted-foreground truncate">{email.body || ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sent" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <EmailSkeleton />
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Send className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Sent emails will appear here</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredEmails.map((email) => (
                      <div
                        key={email.id}
                        className="p-4 hover-elevate cursor-pointer transition-colors hover:bg-muted/50"
                        data-testid={`email-sent-${email.id}`}
                        onClick={() => handleEmailClick(email)}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">To: {email.recipient || "Unknown"}</h4>
                              {getStatusBadge(email.status)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatEmailDate(email.sentAt || email.createdAt)}
                          </div>
                        </div>
                        <h5 className="font-medium text-sm mb-1">{email.subject || "(No subject)"}</h5>
                        <p className="text-sm text-muted-foreground truncate">{email.body || ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[500px]">
                {isLoading ? (
                  <EmailSkeleton />
                ) : filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No drafts saved</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredEmails.map((email) => (
                      <div
                        key={email.id}
                        className="p-4 hover-elevate cursor-pointer transition-colors hover:bg-muted/50"
                        data-testid={`email-draft-${email.id}`}
                        onClick={() => handleEmailClick(email)}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{email.recipient || "(No recipient)"}</h4>
                              {getStatusBadge(email.status)}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {formatEmailDate(email.createdAt)}
                          </div>
                        </div>
                        <h5 className="font-medium text-sm mb-1">{email.subject || "(No subject)"}</h5>
                        <p className="text-sm text-muted-foreground truncate">{email.body || ""}</p>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Detail Dialog */}
      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Email Details
            </DialogTitle>
          </DialogHeader>
          {selectedEmail && (
            <div className="space-y-4 mt-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getStatusBadge(selectedEmail.status)}
                    {selectedEmail.category && (
                      <Badge variant="outline">{selectedEmail.category}</Badge>
                    )}
                  </div>
                  <h3 className="font-semibold text-lg">{selectedEmail.subject || "(No subject)"}</h3>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">To:</span>{" "}
                  <span className="font-medium">{selectedEmail.recipient || "(No recipient)"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  <span className="font-medium">
                    {formatEmailDate(selectedEmail.sentAt || selectedEmail.createdAt)}
                  </span>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="text-sm font-medium text-muted-foreground mb-2">Message</h4>
                <div className="bg-muted/50 rounded-lg p-4 whitespace-pre-wrap text-sm">
                  {selectedEmail.body || "(No content)"}
                </div>
              </div>

              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDeleteEmail(selectedEmail)}
                  disabled={deleteEmail.isPending}
                  data-testid="button-delete-email"
                >
                  {deleteEmail.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Delete
                </Button>

                {selectedEmail.status === "draft" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditDraft(selectedEmail)}
                      data-testid="button-edit-draft"
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Draft
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSendDraft(selectedEmail)}
                      disabled={updateEmail.isPending}
                      data-testid="button-send-draft"
                    >
                      {updateEmail.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Send className="h-4 w-4 mr-2" />
                      )}
                      Send Now
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
