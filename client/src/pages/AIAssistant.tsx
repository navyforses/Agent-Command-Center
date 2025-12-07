import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChatMessage } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
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
  Search,
  ExternalLink,
  Globe,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SearchSource {
  title: string;
  url: string;
  snippet: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: { title: string; type: string }[];
  searchSources?: SearchSource[];
  isSearchResult?: boolean;
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

function transformChatMessage(chatMessage: ChatMessage): Message {
  return {
    id: chatMessage.id.toString(),
    role: chatMessage.role as "user" | "assistant",
    content: chatMessage.content,
    timestamp: chatMessage.createdAt ? new Date(chatMessage.createdAt) : new Date(),
    searchSources: chatMessage.searchSources as SearchSource[] | undefined,
    isSearchResult: chatMessage.isSearchResult ?? false,
  };
}

export default function AIAssistant() {
  const { language, t } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  const { data: chatHistory, isLoading: historyLoading } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/messages']
  });

  useEffect(() => {
    if (chatHistory) {
      const sortedHistory = [...chatHistory].sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateA - dateB;
      });
      setMessages(sortedHistory.map(transformChatMessage));
    }
  }, [chatHistory]);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const response = await apiRequest('POST', '/api/chat', { content });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/chat/messages'] });
    }
  });

  const handleSend = async (message?: string) => {
    const text = message || input;
    if (!text.trim()) return;

    const userMessage: Message = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      await sendMessage.mutateAsync(text);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
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

  if (historyLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        <div className="p-6 pb-0">
          <div className="flex items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary rounded-md">
                <Bot className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <Skeleton className="h-8 w-40 mb-2" />
                <Skeleton className="h-4 w-56" />
              </div>
            </div>
            <Skeleton className="h-6 w-32" />
          </div>
        </div>
        <div className="flex-1 p-6">
          <div className="space-y-4 max-w-3xl mx-auto">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-3/4 ml-auto" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

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
                      {message.searchSources && message.searchSources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-1 mb-2">
                            <Globe className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Web Sources:</p>
                          </div>
                          <div className="space-y-2">
                            {message.searchSources.map((source, i) => (
                              <a
                                key={i}
                                href={source.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-start gap-2 p-2 rounded-md bg-background/50 hover-elevate group"
                                data-testid={`link-source-${i}`}
                              >
                                <Badge variant="secondary" className="text-xs shrink-0 mt-0.5">
                                  {i + 1}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate group-hover:underline">
                                    {source.title}
                                  </p>
                                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                    {source.snippet}
                                  </p>
                                </div>
                                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
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
              {sendMessage.isPending && (
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
                        <span className="text-sm text-muted-foreground">Searching and analyzing...</span>
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
            disabled={sendMessage.isPending}
            className="flex-1"
            data-testid="input-ai-message"
          />
          <Button type="submit" disabled={!input.trim() || sendMessage.isPending} data-testid="button-send-ai-message">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
