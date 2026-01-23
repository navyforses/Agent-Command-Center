import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Newspaper,
  Bookmark,
  Settings,
  User,
  LogOut,
  ArrowLeft,
  Search,
  Trash2,
  ExternalLink,
  FileText,
  Sparkles,
  Pill,
  Filter,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface SavedItem {
  id: number;
  itemType: "clinical_trial" | "research_article" | "drug_info" | "question";
  itemId: string;
  title: string;
  summary?: string;
  sourceUrl?: string;
  savedAt: string;
  tags?: string[];
}

export default function SavedItems() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // Translations
  const t = {
    ka: {
      title: "შენახული სტატიები",
      subtitle: "თქვენი შენახული სამედიცინო მასალები",
      search: "ძებნა...",
      all: "ყველა",
      trials: "კვლევები",
      articles: "სტატიები",
      drugs: "მედიკამენტები",
      questions: "კითხვები",
      noItems: "შენახული სტატიები არ არის",
      startSaving: "დაიწყეთ სტატიების შენახვა ფიდიდან",
      remove: "წაშლა",
      removed: "წაიშალა შენახულიდან",
      removeError: "წაშლა ვერ მოხერხდა",
      backToDashboard: "დაბრუნება",
      viewOriginal: "ორიგინალის ნახვა",
      savedOn: "შენახულია",
    },
    en: {
      title: "Saved Articles",
      subtitle: "Your saved medical materials",
      search: "Search...",
      all: "All",
      trials: "Trials",
      articles: "Articles",
      drugs: "Drugs",
      questions: "Questions",
      noItems: "No saved items",
      startSaving: "Start saving articles from your feed",
      remove: "Remove",
      removed: "Removed from saved",
      removeError: "Failed to remove",
      backToDashboard: "Back",
      viewOriginal: "View Original",
      savedOn: "Saved on",
    },
    ru: {
      title: "Сохранённые статьи",
      subtitle: "Ваши сохранённые медицинские материалы",
      search: "Поиск...",
      all: "Все",
      trials: "Исследования",
      articles: "Статьи",
      drugs: "Лекарства",
      questions: "Вопросы",
      noItems: "Нет сохранённых",
      startSaving: "Начните сохранять статьи из ленты",
      remove: "Удалить",
      removed: "Удалено из сохранённых",
      removeError: "Не удалось удалить",
      backToDashboard: "Назад",
      viewOriginal: "Открыть оригинал",
      savedOn: "Сохранено",
    },
  };

  const tr = t[language as keyof typeof t] || t.en;

  // Fetch saved items
  const { data: savedData, isLoading } = useQuery({
    queryKey: ["/api/saved", activeFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeFilter) params.set("type", activeFilter);
      const res = await fetch(`/api/saved?${params}`, { credentials: "include" });
      if (!res.ok) return { items: [], pagination: { total: 0 } };
      return res.json();
    },
  });

  // Delete saved item
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/saved/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved"] });
      toast({ title: tr.removed });
    },
    onError: () => {
      toast({ title: tr.removeError, variant: "destructive" });
    },
  });

  const items: SavedItem[] = savedData?.items || [];

  // Filter items by search query
  const filteredItems = items.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "clinical_trial":
        return <Sparkles className="h-4 w-4" />;
      case "research_article":
        return <FileText className="h-4 w-4" />;
      case "drug_info":
        return <Pill className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case "clinical_trial":
        return "bg-purple-100 dark:bg-purple-900/30 text-purple-600";
      case "research_article":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-600";
      case "drug_info":
        return "bg-green-100 dark:bg-green-900/30 text-green-600";
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-600";
    }
  };

  const filters = [
    { id: null, label: tr.all },
    { id: "clinical_trial", label: tr.trials },
    { id: "research_article", label: tr.articles },
    { id: "drug_info", label: tr.drugs },
  ];

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
            <Bookmark className="h-8 w-8 text-pink-600" />
            {tr.title}
          </h1>
          <p className="text-muted-foreground">{tr.subtitle}</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tr.search}
              className="pl-10 bg-white/80 dark:bg-slate-900/80"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {filters.map((filter) => (
              <Button
                key={filter.id || "all"}
                variant={activeFilter === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter.id)}
                className={
                  activeFilter === filter.id
                    ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600"
                    : ""
                }
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Items List */}
        {isLoading ? (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80">
            <CardContent className="p-8 text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-purple-600" />
            </CardContent>
          </Card>
        ) : filteredItems.length === 0 ? (
          <Card className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">{tr.noItems}</p>
              <p className="text-sm mt-1">{tr.startSaving}</p>
              <Button
                variant="link"
                className="mt-4 text-purple-600"
                onClick={() => setLocation("/feed")}
              >
                {language === "ka" ? "ფიდზე გადასვლა" : "Go to Feed"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className="border-0 shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden hover:shadow-xl transition-shadow"
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${getTypeColor(item.itemType)}`}>
                      {getTypeIcon(item.itemType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium line-clamp-2 mb-2">{item.title}</h3>
                      {item.summary && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                          {item.summary}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>
                          {tr.savedOn}: {new Date(item.savedAt).toLocaleDateString()}
                        </span>
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex gap-1">
                            {item.tags.map((tag, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      {item.sourceUrl && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => deleteMutation.mutate(item.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
