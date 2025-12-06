import { useState } from "react";
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
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";

// todo: remove mock functionality
const mockEmails = [
  {
    id: "1",
    recipientName: "Dr. Sarah Chen",
    recipientEmail: "s.chen@bostonchildrens.org",
    clinicName: "Boston Children's Hospital",
    subject: "Request for Medical Records",
    lastMessage: "Thank you for your inquiry. We have received your request...",
    status: "replied",
    sentiment: "positive",
    date: "Dec 3, 2025",
  },
  {
    id: "2",
    recipientName: "Dr. Giorgi Khabeishvili",
    recipientEmail: "g.khabeishvili@iashvili.ge",
    clinicName: "Iashvili Children's Hospital",
    subject: "Follow-up Appointment Request",
    lastMessage: "We would like to schedule a follow-up appointment...",
    status: "sent",
    sentiment: "neutral",
    date: "Dec 1, 2025",
  },
  {
    id: "3",
    recipientName: "Clinical Trials Coordinator",
    recipientEmail: "trials@nih.gov",
    clinicName: "NIH Clinical Center",
    subject: "Eligibility Inquiry for HIE Trial",
    lastMessage: "I am writing to inquire about eligibility for the...",
    status: "no_response",
    sentiment: "neutral",
    date: "Nov 28, 2025",
  },
];

const emailTemplates = [
  { id: "medical_records", label: "Request Medical Records" },
  { id: "appointment", label: "Schedule Appointment" },
  { id: "trial_inquiry", label: "Clinical Trial Inquiry" },
  { id: "second_opinion", label: "Request Second Opinion" },
  { id: "custom", label: "Custom Email" },
];

export default function EmailHub() {
  const { t, language } = useLanguage();
  const [activeTab, setActiveTab] = useState("inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [tone, setTone] = useState("professional");

  const generateAIDraft = () => {
    setIsGenerating(true);
    // todo: remove mock functionality - simulate AI generation
    setTimeout(() => {
      const templates: Record<string, string> = {
        medical_records: `Dear Dr. [Name],

I am writing to request a copy of the complete medical records for my child, Luka Beridze (DOB: March 15, 2022), who was treated at your facility.

We require these records for ongoing care coordination with our medical team in Tbilisi, Georgia. Please include all relevant documentation including:
- MRI and EEG reports
- Discharge summaries
- Progress notes
- Treatment recommendations

Please let me know if you require any authorization forms or if there are associated fees.

Thank you for your assistance.

Best regards,
Nino Beridze`,
        trial_inquiry: `Dear Clinical Trials Coordinator,

I am writing to inquire about eligibility for your clinical trial studying [Trial Name] for children with Hypoxic-Ischemic Encephalopathy.

My child's details:
- Age: 2 years, 9 months
- Diagnosis: Moderate HIE (Sarnat Stage 2)
- GMFCS Level: II
- Current location: Tbilisi, Georgia

We are committed to participating in research that may benefit children with HIE. Could you please provide information about eligibility criteria, travel requirements, and the enrollment process?

Thank you for considering our inquiry.

Best regards,
Nino Beridze`,
        appointment: `Dear [Provider Name],

I would like to schedule a follow-up appointment for my child, Luka Beridze, regarding their ongoing treatment for HIE.

Our availability is generally flexible during weekday mornings. Please let me know your earliest available slots.

Thank you.

Best regards,
Nino Beridze`,
      };
      setEmailContent(templates[selectedTemplate] || "");
      setIsGenerating(false);
    }, 1500);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "replied": return <Badge variant="default">Replied</Badge>;
      case "sent": return <Badge variant="secondary">Sent</Badge>;
      case "no_response": return <Badge variant="outline">Awaiting Reply</Badge>;
      default: return null;
    }
  };

  const filteredEmails = mockEmails.filter((email) =>
    email.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    email.clinicName.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
                <Button variant="outline" className="gap-2" data-testid="button-save-draft">
                  <FileText className="h-4 w-4" />
                  Save Draft
                </Button>
                <Button className="gap-2" data-testid="button-send-email">
                  <Send className="h-4 w-4" />
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
            <Badge variant="secondary" className="ml-2">{mockEmails.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="sent" data-testid="tab-sent">
            <Send className="h-4 w-4 mr-2" />
            {t("sent")}
          </TabsTrigger>
          <TabsTrigger value="drafts" data-testid="tab-drafts">
            <FileText className="h-4 w-4 mr-2" />
            {t("drafts")}
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
                {filteredEmails.length === 0 ? (
                  <div className="text-center py-12">
                    <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">No emails found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredEmails.map((email) => (
                      <div
                        key={email.id}
                        className="p-4 hover-elevate cursor-pointer"
                        data-testid={`email-thread-${email.id}`}
                      >
                        <div className="flex items-start justify-between gap-4 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{email.recipientName}</h4>
                              {getStatusBadge(email.status)}
                            </div>
                            <p className="text-sm text-muted-foreground truncate">{email.clinicName}</p>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
                            <Clock className="h-3 w-3" />
                            {email.date}
                          </div>
                        </div>
                        <h5 className="font-medium text-sm mb-1">{email.subject}</h5>
                        <p className="text-sm text-muted-foreground truncate">{email.lastMessage}</p>
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
            <CardContent className="p-8 text-center">
              <Send className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Sent emails will appear here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="drafts" className="mt-4">
          <Card>
            <CardContent className="p-8 text-center">
              <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">No drafts saved</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
