import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Bot, 
  Send, 
  User, 
  Sparkles, 
  Loader2, 
  Copy, 
  Check, 
  Download,
  MoreVertical
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface MessageItemProps {
  message: Message;
  onCopy: (content: string) => void;
  copiedId: string | null;
}

function MessageItem({ message, onCopy, copiedId }: MessageItemProps) {
  const isUser = message.role === "user";
  const isCopied = copiedId === message.id;

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      data-testid={`message-item-${message.id}`}
    >
      <Avatar className="h-9 w-9 flex-shrink-0 mt-1">
        <AvatarFallback 
          className={isUser 
            ? "bg-secondary text-secondary-foreground" 
            : "bg-primary text-primary-foreground"
          }
        >
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      
      <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div className={`flex items-center gap-2 mb-1 ${isUser ? "flex-row-reverse" : ""}`}>
          <span className="text-xs font-medium text-foreground">
            {isUser ? "You" : "AI Assistant"}
          </span>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString([], { 
              hour: "2-digit", 
              minute: "2-digit" 
            })}
          </span>
        </div>
        
        <div
          className={`rounded-lg p-4 ${
            isUser
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-foreground border border-border"
          }`}
        >
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
          
          <div className={`flex items-center gap-1 mt-3 pt-2 border-t ${isUser ? "border-primary-foreground/20 justify-end" : "border-border justify-start"}`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant={isUser ? "secondary" : "ghost"}
                  className={`h-7 px-2 text-xs gap-1.5 ${isUser ? "" : ""}`}
                  onClick={() => onCopy(message.content)}
                  data-testid={`button-copy-message-${message.id}`}
                >
                  {isCopied ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copy
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isCopied ? "Copied to clipboard!" : "Copy message text"}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}

interface AIChatPanelProps {
  childName?: string;
}

const suggestedPrompts = [
  "What therapies are recommended for moderate HIE?",
  "Explain my child's latest MRI results",
  "What clinical trials are available in Europe?",
  "How can I track developmental milestones?",
];

export function AIChatPanel({ childName = "your child" }: AIChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I'm your AI assistant for managing ${childName}'s medical journey. I can help you understand medical documents, find clinical trials, draft emails to healthcare providers, and answer questions about HIE. How can I help you today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCopy = async (content: string, messageId?: string) => {
    try {
      await navigator.clipboard.writeText(content);
      if (messageId) {
        setCopiedId(messageId);
        setTimeout(() => setCopiedId(null), 2000);
      }
      toast({
        title: "Copied to clipboard",
        description: "Message content has been copied.",
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = (format: "txt" | "md") => {
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

    const header = format === "md" 
      ? `# Chat Conversation\n\nExported on ${new Date().toLocaleString()}\n\n---\n\n`
      : `Chat Conversation\nExported on ${new Date().toLocaleString()}\n${"=".repeat(50)}\n\n`;

    const fullContent = header + content;
    const blob = new Blob([fullContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `chat-export-${new Date().toISOString().split("T")[0]}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Downloaded successfully",
      description: `Conversation exported as ${format.toUpperCase()} file.`,
    });
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
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
        content: `Thank you for your question about "${input}". Based on my analysis of ${childName}'s medical records and the latest research, I can provide some insights. [This is a demo response - the actual AI will analyze your documents and provide personalized recommendations.]`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handlePromptClick = (prompt: string) => {
    setInput(prompt);
  };

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3 flex-shrink-0 border-b">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/10">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base font-semibold">AI Assistant</CardTitle>
            <p className="text-xs text-muted-foreground">Medical support for {childName}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-2.5">
            <Sparkles className="h-3 w-3" />
            <span className="text-xs">Multi-AI</span>
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="icon" 
                variant="ghost"
                data-testid="button-chat-menu"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={() => handleDownload("txt")}
                data-testid="button-download-txt"
              >
                <Download className="h-4 w-4 mr-2" />
                Download as TXT
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => handleDownload("md")}
                data-testid="button-download-md"
              >
                <Download className="h-4 w-4 mr-2" />
                Download as Markdown
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-4 space-y-6">
            {messages.map((message) => (
              <MessageItem
                key={message.id}
                message={message}
                onCopy={(content) => handleCopy(content, message.id)}
                copiedId={copiedId}
              />
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium text-foreground mb-1">AI Assistant</span>
                  <div className="rounded-lg p-4 bg-muted/50 border border-border">
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-sm text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {messages.length === 1 && (
          <div className="px-4 pb-3 border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium">Suggested questions:</p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts.map((prompt, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="text-xs h-auto py-1.5 px-3"
                  onClick={() => handlePromptClick(prompt)}
                  data-testid={`button-suggested-prompt-${i}`}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="p-4 border-t flex-shrink-0 bg-muted/30">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="bg-background"
              data-testid="input-chat-message"
            />
            <Button 
              type="submit" 
              size="icon" 
              disabled={!input.trim() || isLoading} 
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
