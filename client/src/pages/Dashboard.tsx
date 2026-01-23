import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Newspaper,
  MessageSquare,
  Bookmark,
  Settings,
  User,
  LogOut,
  ArrowRight,
  Sparkles,
  FileText,
  TrendingUp,
  Clock,
  ChevronRight,
  Upload,
  Zap,
  Crown,
} from "lucide-react";

interface FeedItem {
  id: string;
  title: string;
  type: "clinical_trial" | "research_article" | "drug_info";
  source: string;
  relevanceScore: number;
  publishedAt: string;
}

interface Question {
  id: number;
  question: string;
  createdAt: string;
  status: "pending" | "answered";
}

export default function Dashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const userName = user?.firstName || user?.email?.split("@")[0] || (language === "ka" ? "მომხმარებელი" : "User");

  // Translations
  const t = {
    ka: {
      welcome: "გამარჯობა",
      subtitle: "თქვენი პერსონალური სამედიცინო გაზეთი მზადაა",
      todaysFeed: "დღევანდელი ფიდი",
      newArticles: "ახალი სტატია",
      viewAll: "ყველას ნახვა",
      recentQuestions: "ბოლო კითხვები",
      askQuestion: "კითხვის დასმა",
      noQuestions: "ჯერ არ დაგისვამთ კითხვა",
      savedItems: "შენახული",
      articles: "სტატია",
      subscription: "გამოწერა",
      freePlan: "უფასო გეგმა",
      questionsLeft: "კითხვა დარჩენილია",
      upgrade: "განახლება",
      quickActions: "სწრაფი მოქმედებები",
      browseFeeds: "ფიდის დათვალიერება",
      askAI: "AI-ს შეკითხვა",
      uploadForm: "ფორმა 100-ის ატვირთვა",
      settings: "პარამეტრები",
      completeProfile: "შეავსეთ პროფილი",
      profileDesc: "სრული პროფილი უკეთეს რეკომენდაციებს მოგცემთ",
      logout: "გასვლა",
      trial: "კლინიკური კვლევა",
      article: "სამეცნიერო სტატია",
      drug: "მედიკამენტი",
      pending: "მუშავდება",
      answered: "პასუხი მზადაა",
      relevance: "რელევანტურობა",
    },
    en: {
      welcome: "Hello",
      subtitle: "Your personal medical newspaper is ready",
      todaysFeed: "Today's Feed",
      newArticles: "new articles",
      viewAll: "View All",
      recentQuestions: "Recent Questions",
      askQuestion: "Ask a Question",
      noQuestions: "No questions yet",
      savedItems: "Saved",
      articles: "articles",
      subscription: "Subscription",
      freePlan: "Free Plan",
      questionsLeft: "questions left",
      upgrade: "Upgrade",
      quickActions: "Quick Actions",
      browseFeeds: "Browse Feed",
      askAI: "Ask AI",
      uploadForm: "Upload Form 100",
      settings: "Settings",
      completeProfile: "Complete Your Profile",
      profileDesc: "A complete profile gives better recommendations",
      logout: "Log out",
      trial: "Clinical Trial",
      article: "Research Article",
      drug: "Drug Info",
      pending: "Processing",
      answered: "Answered",
      relevance: "Relevance",
    },
    ru: {
      welcome: "Привет",
      subtitle: "Ваша персональная медицинская газета готова",
      todaysFeed: "Сегодняшняя лента",
      newArticles: "новых статей",
      viewAll: "Смотреть все",
      recentQuestions: "Последние вопросы",
      askQuestion: "Задать вопрос",
      noQuestions: "Пока нет вопросов",
      savedItems: "Сохранённые",
      articles: "статей",
      subscription: "Подписка",
      freePlan: "Бесплатный план",
      questionsLeft: "вопросов осталось",
      upgrade: "Обновить",
      quickActions: "Быстрые действия",
      browseFeeds: "Просмотр ленты",
      askAI: "Спросить AI",
      uploadForm: "Загрузить Форму 100",
      settings: "Настройки",
      completeProfile: "Заполните профиль",
      profileDesc: "Полный профиль даёт лучшие рекомендации",
      logout: "Выйти",
      trial: "Клиническое исследование",
      article: "Научная статья",
      drug: "Лекарство",
      pending: "Обрабатывается",
      answered: "Отвечено",
      relevance: "Релевантность",
    },
  };

  const tr = t[language as keyof typeof t] || t.en;

  // Fetch feed data
  const { data: feedData } = useQuery({
    queryKey: ["/api/feed"],
    queryFn: async () => {
      const res = await fetch("/api/feed?limit=5", { credentials: "include" });
      if (!res.ok) return { items: [], total: 0 };
      return res.json();
    },
  });

  // Fetch questions
  const { data: questionsData } = useQuery({
    queryKey: ["/api/questions"],
    queryFn: async () => {
      const res = await fetch("/api/questions?limit=3", { credentials: "include" });
      if (!res.ok) return { questions: [] };
      return res.json();
    },
  });

  // Fetch saved items count
  const { data: savedData } = useQuery({
    queryKey: ["/api/saved"],
    queryFn: async () => {
      const res = await fetch("/api/saved?limit=1", { credentials: "include" });
      if (!res.ok) return { pagination: { total: 0 } };
      return res.json();
    },
  });

  // Fetch subscription
  const { data: subscriptionData } = useQuery({
    queryKey: ["/api/subscriptions/current"],
    queryFn: async () => {
      const res = await fetch("/api/subscriptions/current", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
  });

  // Mock data for demo
  const mockFeedItems: FeedItem[] = [
    {
      id: "1",
      title: language === "ka"
        ? "ჰიპოქსიურ-იშემიური ენცეფალოპათიის ახალი მკურნალობა"
        : "New Treatment for Hypoxic-Ischemic Encephalopathy",
      type: "clinical_trial",
      source: "ClinicalTrials.gov",
      relevanceScore: 94,
      publishedAt: new Date().toISOString(),
    },
    {
      id: "2",
      title: language === "ka"
        ? "ცერებრალური დამბლის რეაბილიტაციის კვლევა"
        : "Cerebral Palsy Rehabilitation Study",
      type: "research_article",
      source: "PubMed",
      relevanceScore: 89,
      publishedAt: new Date().toISOString(),
    },
    {
      id: "3",
      title: language === "ka"
        ? "ნეონატალური ენცეფალოპათიის პროგნოზი"
        : "Neonatal Encephalopathy Prognosis",
      type: "research_article",
      source: "PubMed",
      relevanceScore: 85,
      publishedAt: new Date().toISOString(),
    },
  ];

  const feedItems = feedData?.items?.length > 0 ? feedData.items : mockFeedItems;
  const feedTotal = feedData?.total || mockFeedItems.length;
  const questions = questionsData?.questions || [];
  const savedCount = savedData?.pagination?.total || 0;
  const plan = subscriptionData?.plan || { id: "free", name: "Free", nameKa: "უფასო" };
  const usage = subscriptionData?.usage || { questionsThisMonth: 0 };
  const questionsLimit = plan.features?.questionsPerMonth || 5;
  const questionsRemaining = questionsLimit === -1 ? "∞" : Math.max(0, questionsLimit - usage.questionsThisMonth);

  const profileComplete = user?.firstName && user?.lastName ? 100 : user?.firstName || user?.email ? 75 : 50;

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "clinical_trial":
        return <Sparkles className="h-4 w-4" />;
      case "research_article":
        return <FileText className="h-4 w-4" />;
      case "drug_info":
        return <TrendingUp className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "clinical_trial":
        return tr.trial;
      case "research_article":
        return tr.article;
      case "drug_info":
        return tr.drug;
      default:
        return type;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/30">
      {/* Header */}
      <header className="w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 group">
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
      <main className="container px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {tr.welcome}, {userName}!
          </h1>
          <p className="text-muted-foreground">{tr.subtitle}</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content - Left 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Completion */}
            {profileComplete < 100 && (
              <Card className="border-0 shadow-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600">
                      <Upload className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">{tr.completeProfile}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{tr.profileDesc}</p>
                      <div className="flex items-center gap-4">
                        <Progress value={profileComplete} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{profileComplete}%</span>
                      </div>
                      <Button
                        variant="link"
                        className="p-0 h-auto mt-2 text-blue-600"
                        onClick={() => setLocation("/profile")}
                      >
                        {tr.completeProfile}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Today's Feed */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Newspaper className="h-5 w-5 text-purple-600" />
                      {tr.todaysFeed}
                    </CardTitle>
                    <CardDescription>
                      {feedTotal} {tr.newArticles}
                    </CardDescription>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/feed")}>
                    {tr.viewAll}
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {feedItems.slice(0, 3).map((item: FeedItem) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/article/${item.id}`)}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        item.type === "clinical_trial"
                          ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600"
                          : item.type === "research_article"
                          ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600"
                          : "bg-green-100 dark:bg-green-900/30 text-green-600"
                      }`}
                    >
                      {getTypeIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium line-clamp-2 mb-1">{item.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Badge variant="secondary" className="text-xs">
                          {getTypeLabel(item.type)}
                        </Badge>
                        <span>•</span>
                        <span>{item.source}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-purple-600">{item.relevanceScore}%</div>
                      <div className="text-xs text-muted-foreground">{tr.relevance}</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Questions */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    {tr.recentQuestions}
                  </CardTitle>
                  <Button
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
                    onClick={() => setLocation("/questions")}
                  >
                    {tr.askQuestion}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {questions.length > 0 ? (
                  <div className="space-y-3">
                    {questions.map((q: Question) => (
                      <div
                        key={q.id}
                        className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50"
                      >
                        <MessageSquare className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm line-clamp-2">{q.question}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">
                              {new Date(q.createdAt).toLocaleDateString()}
                            </span>
                            <Badge
                              variant={q.status === "answered" ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {q.status === "answered" ? tr.answered : tr.pending}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>{tr.noQuestions}</p>
                    <Button
                      variant="link"
                      className="mt-2 text-purple-600"
                      onClick={() => setLocation("/questions")}
                    >
                      {tr.askQuestion}
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{tr.quickActions}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() => setLocation("/feed")}
                >
                  <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30 mr-3">
                    <Newspaper className="h-4 w-4 text-purple-600" />
                  </div>
                  {tr.browseFeeds}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() => setLocation("/questions")}
                >
                  <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30 mr-3">
                    <MessageSquare className="h-4 w-4 text-blue-600" />
                  </div>
                  {tr.askAI}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() => setLocation("/profile")}
                >
                  <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30 mr-3">
                    <Upload className="h-4 w-4 text-orange-600" />
                  </div>
                  {tr.uploadForm}
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start h-12"
                  onClick={() => setLocation("/settings")}
                >
                  <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 mr-3">
                    <Settings className="h-4 w-4 text-slate-600" />
                  </div>
                  {tr.settings}
                </Button>
              </CardContent>
            </Card>

            {/* Saved Items */}
            <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl bg-pink-100 dark:bg-pink-900/30">
                      <Bookmark className="h-5 w-5 text-pink-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">{savedCount}</div>
                      <div className="text-sm text-muted-foreground">{tr.savedItems}</div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setLocation("/saved")}>
                    {tr.viewAll}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Subscription Status */}
            <Card
              className={`border-0 shadow-lg overflow-hidden ${
                plan.id === "free"
                  ? "bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
                  : plan.id === "standard"
                  ? "bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white"
                  : "bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 text-white"
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  {plan.id === "premium" ? (
                    <Crown className="h-5 w-5" />
                  ) : plan.id === "standard" ? (
                    <Sparkles className="h-5 w-5" />
                  ) : (
                    <Zap className="h-5 w-5" />
                  )}
                  <span className="font-semibold">{tr.subscription}</span>
                </div>
                <div className="text-lg font-bold mb-1">
                  {language === "ka" ? plan.nameKa : plan.name}
                </div>
                <div className="text-sm opacity-90 mb-4">
                  {questionsRemaining} {tr.questionsLeft}
                </div>
                {plan.id === "free" && (
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700"
                    onClick={() => setLocation("/pricing")}
                  >
                    {tr.upgrade}
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Logout */}
            <Button
              variant="outline"
              className="w-full text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              onClick={() => (window.location.href = "/api/logout")}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {tr.logout}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
