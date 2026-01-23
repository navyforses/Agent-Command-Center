/**
 * EmailDraft Component
 * =====================
 * P1 Feature: AI-powered email drafting
 * User describes the goal → AI generates the email
 */

import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail,
  Sparkles,
  Send,
  Copy,
  Check,
  Loader2,
  Edit3,
  RefreshCw,
  ChevronDown,
  User,
  Building,
  Stethoscope,
  FileText,
  AlertCircle,
  Wand2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// Email templates/purposes
const EMAIL_PURPOSES = [
  {
    id: "request_records",
    labelKa: "სამედიცინო ჩანაწერების მოთხოვნა",
    labelEn: "Request Medical Records",
    icon: FileText,
    promptKa: "მინდა მოვითხოვო სამედიცინო ჩანაწერები",
    promptEn: "I want to request medical records",
  },
  {
    id: "schedule_appointment",
    labelKa: "ვიზიტის დაგეგმვა",
    labelEn: "Schedule Appointment",
    icon: Stethoscope,
    promptKa: "მინდა დავნიშნო ვიზიტი ექიმთან",
    promptEn: "I want to schedule a doctor's appointment",
  },
  {
    id: "insurance_inquiry",
    labelKa: "დაზღვევის შეკითხვა",
    labelEn: "Insurance Inquiry",
    icon: Building,
    promptKa: "მინდა ვიკითხო დაზღვევის შესახებ",
    promptEn: "I want to ask about insurance coverage",
  },
  {
    id: "therapy_update",
    labelKa: "თერაპევტთან მიმოწერა",
    labelEn: "Therapist Communication",
    icon: User,
    promptKa: "მინდა მივწერო თერაპევტს",
    promptEn: "I want to communicate with therapist",
  },
  {
    id: "custom",
    labelKa: "თავისუფალი თემა",
    labelEn: "Custom Topic",
    icon: Edit3,
    promptKa: "",
    promptEn: "",
  },
];

// Tone options
const TONE_OPTIONS = [
  { id: "formal", labelKa: "ფორმალური", labelEn: "Formal" },
  { id: "friendly", labelKa: "მეგობრული", labelEn: "Friendly" },
  { id: "urgent", labelKa: "გადაუდებელი", labelEn: "Urgent" },
  { id: "grateful", labelKa: "მადლიერი", labelEn: "Grateful" },
];

interface DraftResult {
  subject: string;
  body: string;
  tone: string;
  suggestions?: string[];
}

interface EmailDraftProps {
  defaultRecipient?: string;
  onDraftComplete?: (draft: DraftResult) => void;
  onSendEmail?: (email: { to: string; subject: string; body: string }) => void;
}

export function EmailDraft({ defaultRecipient, onDraftComplete, onSendEmail }: EmailDraftProps) {
  const { language } = useLanguage();
  const { toast } = useToast();

  const [purpose, setPurpose] = useState<string>("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [recipient, setRecipient] = useState(defaultRecipient || "");
  const [recipientName, setRecipientName] = useState("");
  const [tone, setTone] = useState("formal");
  const [additionalContext, setAdditionalContext] = useState("");

  const [draft, setDraft] = useState<DraftResult | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubject, setEditedSubject] = useState("");
  const [editedBody, setEditedBody] = useState("");
  const [copied, setCopied] = useState(false);

  // Generate draft mutation
  const generateMutation = useMutation({
    mutationFn: async (): Promise<DraftResult> => {
      const selectedPurpose = EMAIL_PURPOSES.find((p) => p.id === purpose);
      const prompt = purpose === "custom"
        ? customPrompt
        : language === "ka"
        ? selectedPurpose?.promptKa
        : selectedPurpose?.promptEn;

      const response = await fetch("/api/emails/generate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          purpose,
          prompt,
          recipientName,
          tone,
          additionalContext,
          language,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate draft");
      }

      return response.json();
    },
    onSuccess: (result) => {
      setDraft(result);
      setEditedSubject(result.subject);
      setEditedBody(result.body);
      onDraftComplete?.(result);
    },
    onError: () => {
      toast({
        title: language === "ka" ? "შეცდომა" : "Error",
        description: language === "ka"
          ? "წერილის გენერაცია ვერ მოხერხდა"
          : "Failed to generate email draft",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!purpose) {
      toast({
        title: language === "ka" ? "აირჩიეთ მიზანი" : "Select purpose",
        variant: "destructive",
      });
      return;
    }
    if (purpose === "custom" && !customPrompt.trim()) {
      toast({
        title: language === "ka" ? "აღწერეთ მიზანი" : "Describe purpose",
        variant: "destructive",
      });
      return;
    }
    generateMutation.mutate();
  };

  const handleRegenerate = () => {
    generateMutation.mutate();
  };

  const handleCopy = async () => {
    const textToCopy = `Subject: ${editedSubject}\n\n${editedBody}`;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: language === "ka" ? "დაკოპირდა" : "Copied to clipboard",
    });
  };

  const handleSend = () => {
    if (!recipient) {
      toast({
        title: language === "ka" ? "შეიყვანეთ მიმღების ელ-ფოსტა" : "Enter recipient email",
        variant: "destructive",
      });
      return;
    }
    onSendEmail?.({
      to: recipient,
      subject: editedSubject,
      body: editedBody,
    });
  };

  const getPurposeLabel = (purposeId: string) => {
    const p = EMAIL_PURPOSES.find((ep) => ep.id === purposeId);
    if (!p) return purposeId;
    return language === "ka" ? p.labelKa : p.labelEn;
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            {language === "ka" ? "AI წერილის შემდგენელი" : "AI Email Composer"}
          </CardTitle>
          <CardDescription>
            {language === "ka"
              ? "აღწერეთ რა გსურთ დაწეროთ და AI შეადგენს წერილს"
              : "Describe what you want to write and AI will compose the email"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Purpose Selection */}
          <div className="space-y-2">
            <Label>{language === "ka" ? "წერილის მიზანი" : "Email Purpose"}</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {EMAIL_PURPOSES.map((p) => {
                const Icon = p.icon;
                const isSelected = purpose === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => setPurpose(p.id)}
                    className={cn(
                      "flex items-center gap-2 p-3 rounded-lg border text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-muted hover:border-primary/50"
                    )}
                  >
                    <Icon className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <span className="text-sm font-medium">
                      {language === "ka" ? p.labelKa : p.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Prompt (if custom selected) */}
          <AnimatePresence>
            {purpose === "custom" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2"
              >
                <Label>{language === "ka" ? "აღწერეთ თქვენი მიზანი" : "Describe your purpose"}</Label>
                <Textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder={
                    language === "ka"
                      ? "მაგ: მინდა მოვითხოვო ბოლო ვიზიტის ჩანაწერები..."
                      : "e.g., I want to request records from the last visit..."
                  }
                  className="min-h-[100px]"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Recipient & Tone */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{language === "ka" ? "მიმღების სახელი (არასავალდებულო)" : "Recipient Name (optional)"}</Label>
              <Input
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                placeholder={language === "ka" ? "მაგ: დოქტორი ნინო" : "e.g., Dr. Smith"}
              />
            </div>
            <div className="space-y-2">
              <Label>{language === "ka" ? "ტონი" : "Tone"}</Label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TONE_OPTIONS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {language === "ka" ? t.labelKa : t.labelEn}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Context */}
          <div className="space-y-2">
            <Label>{language === "ka" ? "დამატებითი კონტექსტი (არასავალდებულო)" : "Additional Context (optional)"}</Label>
            <Textarea
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              placeholder={
                language === "ka"
                  ? "ნებისმიერი დამატებითი ინფორმაცია რომელიც უნდა ჩაირთოს წერილში..."
                  : "Any additional information to include in the email..."
              }
              className="min-h-[80px]"
            />
          </div>

          {/* Generate Button */}
          <Button
            onClick={handleGenerate}
            disabled={generateMutation.isPending || !purpose}
            className="w-full"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {language === "ka" ? "იქმნება..." : "Generating..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {language === "ka" ? "წერილის გენერაცია" : "Generate Email"}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Generated Draft */}
      <AnimatePresence>
        {draft && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    {language === "ka" ? "შედგენილი წერილი" : "Generated Draft"}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handleRegenerate}>
                      <RefreshCw className="h-4 w-4 mr-1" />
                      {language === "ka" ? "ხელახლა" : "Regenerate"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit3 className="h-4 w-4 mr-1" />
                      {isEditing
                        ? language === "ka"
                          ? "შენახვა"
                          : "Save"
                        : language === "ka"
                        ? "რედაქტირება"
                        : "Edit"}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Recipient Email */}
                <div className="space-y-2">
                  <Label>{language === "ka" ? "მიმღები" : "To"}</Label>
                  <Input
                    type="email"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={language === "ka" ? "ელ-ფოსტის მისამართი" : "Email address"}
                  />
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <Label>{language === "ka" ? "სათაური" : "Subject"}</Label>
                  {isEditing ? (
                    <Input
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                    />
                  ) : (
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {editedSubject}
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="space-y-2">
                  <Label>{language === "ka" ? "ტექსტი" : "Body"}</Label>
                  {isEditing ? (
                    <Textarea
                      value={editedBody}
                      onChange={(e) => setEditedBody(e.target.value)}
                      className="min-h-[200px]"
                    />
                  ) : (
                    <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                      {editedBody}
                    </div>
                  )}
                </div>

                {/* AI Suggestions */}
                {draft.suggestions && draft.suggestions.length > 0 && (
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <Sparkles className="h-3 w-3" />
                      {language === "ka" ? "AI შემოთავაზებები" : "AI Suggestions"}
                    </Label>
                    <div className="flex flex-wrap gap-2">
                      {draft.suggestions.map((suggestion, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {suggestion}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex items-center gap-2 pt-4">
                  <Button onClick={handleCopy} variant="outline">
                    {copied ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {language === "ka" ? "კოპირება" : "Copy"}
                  </Button>
                  {onSendEmail && (
                    <Button onClick={handleSend}>
                      <Send className="h-4 w-4 mr-2" />
                      {language === "ka" ? "გაგზავნა" : "Send"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export { EMAIL_PURPOSES, TONE_OPTIONS };
