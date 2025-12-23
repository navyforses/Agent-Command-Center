import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  MessageSquare,
  Send,
  Sparkles,
  Clock,
  Star,
  Activity,
  Brain,
  Heart,
  Check,
  Loader2,
  ChevronRight,
  Mic,
  Calendar,
  User,
  ThumbsUp,
  Zap,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Therapy, Child } from "@shared/schema";

interface ParsedSession {
  therapyType?: string;
  duration?: number;
  progressRating?: number;
  notes?: string;
  mood?: string;
  activities?: string[];
  date?: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  parsed?: ParsedSession;
  isTyping?: boolean;
}

interface QuickLogProps {
  onComplete?: () => void;
  onCancel?: () => void;
  preselectedTherapyId?: number;
}

const quickTemplates = {
  ka: [
    { icon: Activity, label: "ფიზიკური თერაპია", value: "ფიზიკური თერაპია 45 წუთი, კარგი პროგრესი" },
    { icon: Brain, label: "მეტყველება", value: "მეტყველების თერაპია 30 წუთი, ახალი სიტყვები ვისწავლეთ" },
    { icon: Heart, label: "ოკუპაციური", value: "ოკუპაციური თერაპია 1 საათი, მოტორიკა გაუმჯობესდა" },
  ],
  en: [
    { icon: Activity, label: "Physical Therapy", value: "Physical therapy 45 minutes, good progress" },
    { icon: Brain, label: "Speech", value: "Speech therapy 30 minutes, learned new words" },
    { icon: Heart, label: "Occupational", value: "Occupational therapy 1 hour, motor skills improved" },
  ],
};

const moodOptions = [
  { emoji: "😊", label: "ka" === "ka" ? "კარგი" : "Good", value: "good" },
  { emoji: "😐", label: "ka" === "ka" ? "ნორმა" : "Okay", value: "okay" },
  { emoji: "😔", label: "ka" === "ka" ? "რთული" : "Difficult", value: "difficult" },
];

export function QuickLog({ onComplete, onCancel, preselectedTherapyId }: QuickLogProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [currentStep, setCurrentStep] = useState<"input" | "confirm" | "saved">("input");
  const [parsedData, setParsedData] = useState<ParsedSession | null>(null);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  // Fetch active therapies for context
  const { data: therapies } = useQuery<Therapy[]>({
    queryKey: ["/api/therapies"],
  });

  const { data: children } = useQuery<Child[]>({
    queryKey: ["/api/children"],
  });

  const texts = {
    title: language === "ka" ? "სწრაფი ჩანაწერი" : "Quick Log",
    placeholder: language === "ka"
      ? "მაგ: ფიზიკური თერაპია 45 წუთი, კარგად წავიდა..."
      : "e.g., Physical therapy 45 min, went well...",
    greeting: language === "ka"
      ? "გამარჯობა! როგორი იყო დღევანდელი სესია?"
      : "Hi! How was today's session?",
    quickOptions: language === "ka" ? "სწრაფი არჩევა:" : "Quick options:",
    analyzing: language === "ka" ? "ვაანალიზებ..." : "Analyzing...",
    understood: language === "ka" ? "გავიგე! აი რა გაიგე:" : "Got it! Here's what I understood:",
    confirm: language === "ka" ? "სწორია?" : "Is this correct?",
    save: language === "ka" ? "შენახვა" : "Save",
    edit: language === "ka" ? "რედაქტირება" : "Edit",
    saved: language === "ka" ? "ჩანაწერი შენახულია!" : "Session logged!",
    moodQuestion: language === "ka" ? "როგორ გრძნობდა თავს?" : "How did they feel?",
    duration: language === "ka" ? "ხანგრძლივობა" : "Duration",
    progress: language === "ka" ? "პროგრესი" : "Progress",
    notes: language === "ka" ? "შენიშვნები" : "Notes",
    type: language === "ka" ? "თერაპიის ტიპი" : "Therapy Type",
    minutes: language === "ka" ? "წუთი" : "min",
    addAnother: language === "ka" ? "კიდევ ერთის დამატება" : "Add Another",
    done: language === "ka" ? "დასრულება" : "Done",
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Initial greeting
  useEffect(() => {
    const timer = setTimeout(() => {
      setMessages([
        {
          id: "greeting",
          role: "assistant",
          content: texts.greeting,
        },
      ]);
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  // Parse natural language input
  const parseInput = (text: string): ParsedSession => {
    const lowerText = text.toLowerCase();
    const parsed: ParsedSession = {};

    // Detect therapy type
    if (lowerText.includes("ფიზიკური") || lowerText.includes("physical")) {
      parsed.therapyType = language === "ka" ? "ფიზიკური თერაპია" : "Physical Therapy";
    } else if (lowerText.includes("მეტყველება") || lowerText.includes("speech")) {
      parsed.therapyType = language === "ka" ? "მეტყველების თერაპია" : "Speech Therapy";
    } else if (lowerText.includes("ოკუპაციური") || lowerText.includes("occupational")) {
      parsed.therapyType = language === "ka" ? "ოკუპაციური თერაპია" : "Occupational Therapy";
    }

    // Detect duration
    const durationMatch = text.match(/(\d+)\s*(წუთი|წთ|min|minutes?|საათი|hour)/i);
    if (durationMatch) {
      let duration = parseInt(durationMatch[1]);
      if (durationMatch[2].toLowerCase().includes("საათი") || durationMatch[2].toLowerCase().includes("hour")) {
        duration *= 60;
      }
      parsed.duration = duration;
    }

    // Detect progress rating
    if (lowerText.includes("შესანიშნავი") || lowerText.includes("excellent") || lowerText.includes("great")) {
      parsed.progressRating = 5;
    } else if (lowerText.includes("კარგი") || lowerText.includes("good") || lowerText.includes("კარგად")) {
      parsed.progressRating = 4;
    } else if (lowerText.includes("ნორმალური") || lowerText.includes("okay") || lowerText.includes("normal")) {
      parsed.progressRating = 3;
    } else if (lowerText.includes("რთული") || lowerText.includes("difficult") || lowerText.includes("hard")) {
      parsed.progressRating = 2;
    }

    // Extract notes (the remaining meaningful content)
    parsed.notes = text;
    parsed.date = new Date().toISOString().split("T")[0];

    return parsed;
  };

  // Save session mutation
  const saveSessionMutation = useMutation({
    mutationFn: async (data: ParsedSession) => {
      // Find matching therapy or use first active one
      const matchingTherapy = therapies?.find(
        (t) => t.type?.toLowerCase().includes(data.therapyType?.toLowerCase() || "") && t.isActive
      ) || therapies?.find((t) => t.isActive);

      if (!matchingTherapy) {
        throw new Error(language === "ka" ? "აქტიური თერაპია ვერ მოიძებნა" : "No active therapy found");
      }

      const response = await apiRequest("POST", `/api/therapies/${matchingTherapy.id}/sessions`, {
        sessionDate: data.date || new Date().toISOString().split("T")[0],
        duration: data.duration || 30,
        notes: data.notes,
        progressRating: data.progressRating || 3,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/therapies"] });
      setCurrentStep("saved");
      toast({
        title: language === "ka" ? "წარმატება!" : "Success!",
        description: texts.saved,
      });
    },
    onError: (error: Error) => {
      toast({
        title: language === "ka" ? "შეცდომა" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    // Add typing indicator
    const typingMessage: Message = {
      id: "typing",
      role: "assistant",
      content: "",
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingMessage]);

    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Parse input
    const parsed = parseInput(userMessage.content);
    setParsedData(parsed);

    // Remove typing indicator and add response
    setMessages((prev) => [
      ...prev.filter((m) => m.id !== "typing"),
      {
        id: Date.now().toString(),
        role: "assistant",
        content: texts.understood,
        parsed,
      },
    ]);

    setCurrentStep("confirm");
  };

  const handleQuickTemplate = (template: string) => {
    setInputValue(template);
    inputRef.current?.focus();
  };

  const handleConfirm = () => {
    if (parsedData) {
      saveSessionMutation.mutate({
        ...parsedData,
        mood: selectedMood || undefined,
      });
    }
  };

  const handleAddAnother = () => {
    setMessages([
      {
        id: "greeting-again",
        role: "assistant",
        content: language === "ka" ? "კარგი! რა იყო მომდევნო სესია?" : "Great! What was the next session?",
      },
    ]);
    setParsedData(null);
    setSelectedMood(null);
    setCurrentStep("input");
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "h-4 w-4",
              star <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
            )}
          />
        ))}
      </div>
    );
  };

  const templates = quickTemplates[language === "ka" ? "ka" : "en"];

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <div className="p-2 bg-primary/10 rounded-full">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{texts.title}</h3>
          <p className="text-sm text-muted-foreground">
            {language === "ka" ? "თერაპიის სწრაფი ჩანაწერი" : "Log therapy sessions quickly"}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence mode="popLayout">
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </AvatarFallback>
                </Avatar>
              )}

              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                )}
              >
                {message.isTyping ? (
                  <div className="flex gap-1 py-1">
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                ) : (
                  <>
                    <p className="text-sm">{message.content}</p>

                    {/* Parsed data display */}
                    {message.parsed && (
                      <div className="mt-3 space-y-2 p-3 bg-background/50 rounded-lg">
                        {message.parsed.therapyType && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{texts.type}</span>
                            <Badge variant="outline">{message.parsed.therapyType}</Badge>
                          </div>
                        )}
                        {message.parsed.duration && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{texts.duration}</span>
                            <span className="text-sm font-medium">
                              {message.parsed.duration} {texts.minutes}
                            </span>
                          </div>
                        )}
                        {message.parsed.progressRating && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">{texts.progress}</span>
                            {renderStars(message.parsed.progressRating)}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {message.role === "user" && (
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-muted">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Mood selection in confirm step */}
        {currentStep === "confirm" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <p className="text-sm text-muted-foreground text-center">{texts.moodQuestion}</p>
            <div className="flex justify-center gap-2">
              {moodOptions.map((mood) => (
                <button
                  key={mood.value}
                  onClick={() => setSelectedMood(mood.value)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                    selectedMood === mood.value
                      ? "border-primary bg-primary/10"
                      : "border-muted hover:border-primary/50"
                  )}
                >
                  <span className="text-2xl">{mood.emoji}</span>
                  <span className="text-xs">{mood.label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Success state */}
        {currentStep === "saved" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-6 space-y-4"
          >
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
              <Check className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <p className="font-medium text-green-600 dark:text-green-400">{texts.saved}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleAddAnother}>
                {texts.addAnother}
              </Button>
              <Button onClick={onComplete}>
                {texts.done}
              </Button>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Quick templates */}
      {currentStep === "input" && messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-muted-foreground mb-2">{texts.quickOptions}</p>
          <div className="flex flex-wrap gap-2">
            {templates.map((template) => (
              <button
                key={template.label}
                onClick={() => handleQuickTemplate(template.value)}
                className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-full border hover:bg-muted transition-colors"
              >
                <template.icon className="h-3 w-3" />
                {template.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input area */}
      {currentStep === "input" && (
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder={texts.placeholder}
              className="flex-1"
              data-testid="quick-log-input"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              size="icon"
              data-testid="quick-log-send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Confirm actions */}
      {currentStep === "confirm" && (
        <div className="p-4 border-t flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setCurrentStep("input")}
          >
            {texts.edit}
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={handleConfirm}
            disabled={saveSessionMutation.isPending}
          >
            {saveSessionMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {texts.save}
          </Button>
        </div>
      )}
    </div>
  );
}
