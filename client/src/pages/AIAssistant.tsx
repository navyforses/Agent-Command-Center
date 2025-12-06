import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: { title: string; type: string }[];
}

const quickActions = [
  { icon: FileText, label: "Analyze a document", labelKa: "დოკუმენტის ანალიზი" },
  { icon: FlaskConical, label: "Find clinical trials", labelKa: "კვლევების ძებნა" },
  { icon: Activity, label: "Therapy recommendations", labelKa: "თერაპიის რეკომენდაციები" },
  { icon: Mail, label: "Draft an email", labelKa: "ელ.ფოსტის შექმნა" },
  { icon: HelpCircle, label: "Explain HIE", labelKa: "HIE-ს ახსნა" },
];

const suggestedPrompts = [
  "What does moderate HIE mean for my child's development?",
  "Can you summarize my child's latest MRI report?",
  "What therapies are most effective for motor development?",
  "Draft an email to request medical records from our hospital",
  "Find clinical trials for HIE in Europe",
  "Explain the GMFCS levels and what they mean",
];

export default function AIAssistant() {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = (message?: string) => {
    const text = message || input;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // todo: remove mock functionality - simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Thank you for your question. Based on the medical literature and your child's records, I can provide some insights about "${text}".

This is a demonstration response. In the full application, I would:
- Analyze your uploaded documents
- Search relevant medical databases
- Provide personalized recommendations based on your child's specific condition
- Offer translations in both English and Georgian

Would you like me to elaborate on any specific aspect?`,
        timestamp: new Date(),
        sources: [
          { title: "PubMed: HIE Treatment Guidelines 2024", type: "research" },
          { title: "Luka's MRI Report - Nov 2025", type: "document" },
        ],
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 2000);
  };

  const handleQuickAction = (action: typeof quickActions[0]) => {
    const promptMap: Record<string, string> = {
      "Analyze a document": "Help me understand my child's latest medical document",
      "Find clinical trials": "What clinical trials are available for HIE treatment?",
      "Therapy recommendations": "What therapies do you recommend for my child with HIE?",
      "Draft an email": "Help me draft a professional email to a specialist",
      "Explain HIE": "Can you explain what Hypoxic-Ischemic Encephalopathy is?",
    };
    handleSend(promptMap[action.label] || action.label);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary rounded-md">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{t("aiAssistant")}</h1>
              <p className="text-muted-foreground">Your personal medical AI helper</p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" />
            Powered by GPT-5
          </Badge>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto">
            <div className="p-4 bg-primary/10 rounded-full mb-6">
              <Bot className="h-12 w-12 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">How can I help you today?</h2>
            <p className="text-muted-foreground text-center mb-8">
              I can help you understand medical documents, find clinical trials, get therapy recommendations, and more.
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
              <p className="text-sm text-muted-foreground mb-3">Or try one of these:</p>
              <div className="grid gap-2">
                {suggestedPrompts.slice(0, 4).map((prompt, i) => (
                  <Button
                    key={i}
                    variant="ghost"
                    className="justify-start text-left h-auto py-3 px-4"
                    onClick={() => handleSend(prompt)}
                    data-testid={`button-suggested-${i}`}
                  >
                    {prompt}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="space-y-6 py-4 max-w-3xl mx-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="h-10 w-10 flex-shrink-0">
                    <AvatarFallback className={message.role === "assistant" ? "bg-primary text-primary-foreground" : "bg-secondary"}>
                      {message.role === "assistant" ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                    </AvatarFallback>
                  </Avatar>
                  <Card className={`max-w-[80%] ${message.role === "user" ? "bg-primary text-primary-foreground" : ""}`}>
                    <CardContent className="p-4">
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground mb-2">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {message.sources.map((source, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {source.title}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      <p className={`text-xs mt-2 ${message.role === "user" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      <Bot className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          </ScrollArea>
        )}
      </div>

      <div className="p-6 pt-4 border-t">
        <form
          className="flex gap-2 max-w-3xl mx-auto"
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("typeMessage")}
            disabled={isLoading}
            className="flex-1"
            data-testid="input-ai-message"
          />
          <Button type="submit" disabled={!input.trim() || isLoading} data-testid="button-send-ai-message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
