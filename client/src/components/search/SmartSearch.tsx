/**
 * SmartSearch Component
 * ======================
 * P1 Feature: Natural language search across the application
 * Users can ask questions like "რა წამალი აქვს კრუნჩხვებზე?"
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Sparkles,
  X,
  Loader2,
  FileText,
  Calendar,
  Pill,
  Activity,
  User,
  ArrowRight,
  History,
  Mic,
  Command,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "document" | "appointment" | "medication" | "therapy" | "child" | "research";
  title: string;
  description: string;
  url: string;
  relevance: number;
  metadata?: Record<string, any>;
}

interface SmartSearchResponse {
  query: string;
  results: SearchResult[];
  aiSummary?: string;
  suggestedActions?: { label: string; action: string }[];
}

interface SmartSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}

const SEARCH_EXAMPLES = {
  ka: [
    "რა წამალი აქვს კრუნჩხვებზე?",
    "როდის არის შემდეგი ვიზიტი?",
    "აჩვენე ბოლო MRI შედეგები",
    "რა თერაპიები მიმდინარეობს?",
    "გამომიგზავნე ექიმის საკონტაქტო",
  ],
  en: [
    "What medication is for seizures?",
    "When is the next appointment?",
    "Show latest MRI results",
    "What therapies are ongoing?",
    "Find doctor's contact info",
  ],
};

const RESULT_ICONS: Record<SearchResult["type"], React.ElementType> = {
  document: FileText,
  appointment: Calendar,
  medication: Pill,
  therapy: Activity,
  child: User,
  research: Sparkles,
};

const RESULT_COLORS: Record<SearchResult["type"], string> = {
  document: "text-blue-500 bg-blue-500/10",
  appointment: "text-green-500 bg-green-500/10",
  medication: "text-purple-500 bg-purple-500/10",
  therapy: "text-orange-500 bg-orange-500/10",
  child: "text-pink-500 bg-pink-500/10",
  research: "text-cyan-500 bg-cyan-500/10",
};

export function SmartSearch({ isOpen, onClose, onNavigate }: SmartSearchProps) {
  const { language } = useLanguage();
  const [query, setQuery] = useState("");
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("smartSearchHistory");
    if (saved) {
      setRecentSearches(JSON.parse(saved).slice(0, 5));
    }
  }, []);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search mutation
  const searchMutation = useMutation({
    mutationFn: async (searchQuery: string): Promise<SmartSearchResponse> => {
      const response = await fetch("/api/search/smart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ query: searchQuery, language }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      return response.json();
    },
    onSuccess: (data) => {
      // Save to recent searches
      const newRecent = [data.query, ...recentSearches.filter((s) => s !== data.query)].slice(0, 5);
      setRecentSearches(newRecent);
      localStorage.setItem("smartSearchHistory", JSON.stringify(newRecent));
    },
  });

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      searchMutation.mutate(query.trim());
    }
  }, [query, searchMutation]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onNavigate?.(result.url);
    onClose();
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    searchMutation.mutate(example);
  };

  const clearSearch = () => {
    setQuery("");
    searchMutation.reset();
  };

  const getResultTypeName = (type: SearchResult["type"]) => {
    const names: Record<SearchResult["type"], Record<string, string>> = {
      document: { ka: "დოკუმენტი", en: "Document" },
      appointment: { ka: "ვიზიტი", en: "Appointment" },
      medication: { ka: "წამალი", en: "Medication" },
      therapy: { ka: "თერაპია", en: "Therapy" },
      child: { ka: "პროფილი", en: "Profile" },
      research: { ka: "კვლევა", en: "Research" },
    };
    return names[type]?.[language] || type;
  };

  const examples = SEARCH_EXAMPLES[language as keyof typeof SEARCH_EXAMPLES] || SEARCH_EXAMPLES.en;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] p-0 gap-0">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {language === "ka" ? "ჭკვიანი ძიება" : "Smart Search"}
          </DialogTitle>
        </DialogHeader>

        {/* Search Input */}
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                language === "ka"
                  ? "დასვით კითხვა ბუნებრივ ენაზე..."
                  : "Ask a question in natural language..."
              }
              className="pl-10 pr-20"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={clearSearch}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleSearch}
                disabled={!query.trim() || searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
              <Command className="h-3 w-3 inline" /> K
            </kbd>
            <span>{language === "ka" ? "გასახსნელად" : "to open"}</span>
          </div>
        </div>

        <ScrollArea className="max-h-[400px]">
          <div className="p-4">
            <AnimatePresence mode="wait">
              {/* Loading State */}
              {searchMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-8"
                >
                  <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                  <p className="text-sm text-muted-foreground">
                    {language === "ka" ? "ვეძებ..." : "Searching..."}
                  </p>
                </motion.div>
              )}

              {/* Results */}
              {!searchMutation.isPending && searchMutation.data && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* AI Summary */}
                  {searchMutation.data.aiSummary && (
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          {language === "ka" ? "AI პასუხი" : "AI Answer"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {searchMutation.data.aiSummary}
                      </p>
                    </div>
                  )}

                  {/* Results List */}
                  {searchMutation.data.results.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {language === "ka"
                          ? `ნაპოვნია ${searchMutation.data.results.length} შედეგი`
                          : `Found ${searchMutation.data.results.length} results`}
                      </p>
                      {searchMutation.data.results.map((result) => {
                        const Icon = RESULT_ICONS[result.type];
                        return (
                          <motion.button
                            key={result.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="w-full flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors text-left"
                            onClick={() => handleResultClick(result)}
                          >
                            <div
                              className={cn(
                                "p-2 rounded-lg shrink-0",
                                RESULT_COLORS[result.type]
                              )}
                            >
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm truncate">
                                  {result.title}
                                </span>
                                <Badge variant="secondary" className="text-[10px] shrink-0">
                                  {getResultTypeName(result.type)}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                                {result.description}
                              </p>
                            </div>
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </motion.button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {language === "ka"
                          ? "შედეგები ვერ მოიძებნა"
                          : "No results found"}
                      </p>
                    </div>
                  )}

                  {/* Suggested Actions */}
                  {searchMutation.data.suggestedActions &&
                    searchMutation.data.suggestedActions.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs text-muted-foreground mb-2">
                          {language === "ka" ? "შემოთავაზებული მოქმედებები" : "Suggested actions"}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {searchMutation.data.suggestedActions.map((action, i) => (
                            <Button
                              key={i}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                onNavigate?.(action.action);
                                onClose();
                              }}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                </motion.div>
              )}

              {/* Initial State - Examples */}
              {!searchMutation.isPending && !searchMutation.data && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-4"
                >
                  {/* Recent Searches */}
                  {recentSearches.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <History className="h-3 w-3" />
                        {language === "ka" ? "ბოლო ძიებები" : "Recent searches"}
                      </p>
                      <div className="space-y-1">
                        {recentSearches.map((search, i) => (
                          <button
                            key={i}
                            className="w-full text-left text-sm p-2 rounded hover:bg-muted/50 transition-colors flex items-center gap-2"
                            onClick={() => handleExampleClick(search)}
                          >
                            <History className="h-3 w-3 text-muted-foreground" />
                            {search}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Examples */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {language === "ka" ? "სცადეთ მაგალითად" : "Try asking"}
                    </p>
                    <div className="space-y-1">
                      {examples.map((example, i) => (
                        <button
                          key={i}
                          className="w-full text-left text-sm p-2 rounded hover:bg-muted/50 transition-colors flex items-center gap-2"
                          onClick={() => handleExampleClick(example)}
                        >
                          <Sparkles className="h-3 w-3 text-primary" />
                          {example}
                        </button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// Hook for keyboard shortcut
export function useSmartSearch() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
  };
}
