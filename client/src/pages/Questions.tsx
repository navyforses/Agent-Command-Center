import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Newspaper,
  MessageSquare,
  Send,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Settings,
  User,
  LogOut,
  Sparkles,
  Bot,
  CheckCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface Answer {
  id: number;
  model: string;
  answer: string;
  confidence: number;
  citations?: string[];
}

interface Question {
  id: number;
  question: string;
  context?: string;
  status: "pending" | "processing" | "answered" | "failed";
  consensusAnswer?: string;
  createdAt: string;
  answers?: Answer[];
}

const AI_MODELS = [
  { id: "gpt-4", name: "GPT-4", color: "bg-green-500" },
  { id: "claude", name: "Claude", color: "bg-purple-500" },
  { id: "gemini", name: "Gemini", color: "bg-blue-500" },
  { id: "grok", name: "Grok", color: "bg-orange-500" },
  { id: "perplexity", name: "Perplexity", color: "bg-pink-500" },
];

export default function Questions() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [newQuestion, setNewQuestion] = useState("");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Translations
  const t = {
    ka: {
      title: "AI კითხვა-პასუხი",
      subtitle: "დაუსვით კითხვა ნებისმიერ სამედიცინო თემაზე",
      askPlaceholder: "დასვით თქვენი კითხვა აქ... მაგ: რა არის ჰიპოთერმიული თერაპია HIE-სთვის?",
      askButton: "კითხვის გაგზავნა",
      sending: "იგზავნება...",
      recentQuestions: "ბოლო კითხვები",
      noQuestions: "ჯერ არ დაგისვამთ კითხვა",
      startAsking: "დაიწყეთ კითხვების დასმა",
      pending: "მუშავდება",
      processing: "ანალიზი მიმდინარეობს",
      answered: "პასუხი მზადაა",
      failed: "ვერ მოხერხდა",
      consensus: "კონსენსუს პასუხი",
      individualAnswers: "ინდივიდუალური პასუხები",
      confidence: "სანდოობა",
      citations: "ციტატები",
      backToDashboard: "დაბრუნება",
      aiModels: "5 AI მოდელი აანალიზებს თქვენს კითხვას",
      questionSent: "კითხვა გაიგზავნა",
      questionError: "კითხვის გაგზავნა ვერ მოხერხდა",
      limitReached: "თვის ლიმიტი ამოიწურა",
    },
    en: {
      title: "AI Q&A",
      subtitle: "Ask questions about any medical topic",
      askPlaceholder: "Ask your question here... e.g., What is hypothermic therapy for HIE?",
      askButton: "Send Question",
      sending: "Sending...",
      recentQuestions: "Recent Questions",
      noQuestions: "No questions yet",
      startAsking: "Start asking questions",
      pending: "Pending",
      processing: "Processing",
      answered: "Answered",
      failed: "Failed",
      consensus: "Consensus Answer",
      individualAnswers: "Individual Answers",
      confidence: "Confidence",
      citations: "Citations",
      backToDashboard: "Back",
      aiModels: "5 AI models analyze your question",
      questionSent: "Question sent",
      questionError: "Failed to send question",
      limitReached: "Monthly limit reached",
    },
    ru: {
      title: "AI Вопрос-Ответ",
      subtitle: "Задавайте вопросы на любую медицинскую тему",
      askPlaceholder: "Задайте ваш вопрос здесь... напр.: Что такое гипотермическая терапия при HIE?",
      askButton: "Отправить вопрос",
      sending: "Отправка...",
      recentQuestions: "Последние вопросы",
      noQuestions: "Пока нет вопросов",
      startAsking: "Начните задавать вопросы",
      pending: "Ожидание",
      processing: "Обработка",
      answered: "Отвечено",
      failed: "Ошибка",
      consensus: "Консенсусный ответ",
      individualAnswers: "Индивидуальные ответы",
      confidence: "Уверенность",
      citations: "Цитаты",
      backToDashboard: "Назад",
      aiModels: "5 AI моделей анализируют ваш вопрос",
      questionSent: "Вопрос отправлен",
      questionError: "Не удалось отправить вопрос",
      limitReached: "Месячный лимит исчерпан",
    },
  };

  const tr = t[language as keyof typeof t] || t.en;

  // Fetch questions
  const { data: questionsData, isLoading } = useQuery({
    queryKey: ["/api/questions"],
    queryFn: async () => {
      const res = await fetch("/api/questions", { credentials: "include" });
      if (!res.ok) return { questions: [] };
      return res.json();
    },
  });

  // Submit question mutation
  const submitQuestion = useMutation({
    mutationFn: async (question: string) => {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ question }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to submit question");
      }
      return res.json();
    },
    onSuccess: () => {
      setNewQuestion("");
      queryClient.invalidateQueries({ queryKey: ["/api/questions"] });
      toast({ title: tr.questionSent });
    },
    onError: (error: Error) => {
      toast({
        title: tr.questionError,
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newQuestion.trim()) {
      submitQuestion.mutate(newQuestion.trim());
    }
  };

  const questions: Question[] = questionsData?.questions || [];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {tr.pending}
          </Badge>
        );
      case "processing":
        return (
          <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-700">
            <Loader2 className="h-3 w-3 animate-spin" />
            {tr.processing}
          </Badge>
        );
      case "answered":
        return (
          <Badge variant="default" className="gap-1 bg-green-100 text-green-700">
            <CheckCircle className="h-3 w-3" />
            {tr.answered}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            {tr.failed}
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/30">
      {/* Header */}
      <header className="w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
              <Newspaper className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              MedNews
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setLocation("/profile")}>
              <User className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => (window.location.href = "/api/logout")}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container px-4 py-8 max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">{tr.backToDashboard}</span>
        </Link>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-blue-600" />
            {tr.title}
          </h1>
          <p className="text-muted-foreground">{tr.subtitle}</p>
        </div>

        {/* Ask Question Card */}
        <Card className="border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <Textarea
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder={tr.askPlaceholder}
                className="min-h-[120px] resize-none bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                disabled={submitQuestion.isPending}
              />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex -space-x-1">
                    {AI_MODELS.map((model) => (
                      <div
                        key={model.id}
                        className={`w-6 h-6 rounded-full ${model.color} border-2 border-white flex items-center justify-center`}
                        title={model.name}
                      >
                        <Bot className="h-3 w-3 text-white" />
                      </div>
                    ))}
                  </div>
                  <span>{tr.aiModels}</span>
                </div>
                <Button
                  type="submit"
                  className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700"
                  disabled={!newQuestion.trim() || submitQuestion.isPending}
                >
                  {submitQuestion.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {tr.sending}
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      {tr.askButton}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Recent Questions */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            {tr.recentQuestions}
          </h2>

          {isLoading ? (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80">
              <CardContent className="p-8 text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
              </CardContent>
            </Card>
          ) : questions.length === 0 ? (
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80">
              <CardContent className="p-8 text-center text-muted-foreground">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="font-medium">{tr.noQuestions}</p>
                <p className="text-sm mt-1">{tr.startAsking}</p>
              </CardContent>
            </Card>
          ) : (
            questions.map((question) => (
              <Card
                key={question.id}
                className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden"
              >
                <CardHeader
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedQuestion(expandedQuestion === question.id ? null : question.id)
                  }
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base font-medium mb-2">
                        {question.question}
                      </CardTitle>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{new Date(question.createdAt).toLocaleDateString()}</span>
                        {getStatusBadge(question.status)}
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      {expandedQuestion === question.id ? (
                        <ChevronUp className="h-5 w-5" />
                      ) : (
                        <ChevronDown className="h-5 w-5" />
                      )}
                    </Button>
                  </div>
                </CardHeader>

                {expandedQuestion === question.id && question.status === "answered" && (
                  <CardContent className="pt-0">
                    <Separator className="mb-4" />

                    {/* Consensus Answer */}
                    {question.consensusAnswer && (
                      <div className="mb-6">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-5 w-5 text-purple-600" />
                          <span className="font-semibold">{tr.consensus}</span>
                        </div>
                        <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-950/30 dark:to-blue-950/30 rounded-xl p-4">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {question.consensusAnswer}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Individual Answers */}
                    {question.answers && question.answers.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Bot className="h-5 w-5 text-blue-600" />
                          <span className="font-semibold">{tr.individualAnswers}</span>
                        </div>
                        <div className="space-y-3">
                          {question.answers.map((answer) => {
                            const model = AI_MODELS.find((m) => m.id === answer.model);
                            return (
                              <div
                                key={answer.id}
                                className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-6 h-6 rounded-full ${
                                        model?.color || "bg-gray-500"
                                      } flex items-center justify-center`}
                                    >
                                      <Bot className="h-3 w-3 text-white" />
                                    </div>
                                    <span className="font-medium text-sm">
                                      {model?.name || answer.model}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="text-xs">
                                    {tr.confidence}: {answer.confidence}%
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                  {answer.answer}
                                </p>
                                {answer.citations && answer.citations.length > 0 && (
                                  <div className="mt-3 pt-3 border-t">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {tr.citations}:
                                    </span>
                                    <div className="flex flex-wrap gap-2 mt-1">
                                      {answer.citations.map((citation, idx) => (
                                        <a
                                          key={idx}
                                          href={citation}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          {new URL(citation).hostname}
                                        </a>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
