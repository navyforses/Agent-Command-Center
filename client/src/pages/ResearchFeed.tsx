/**
 * ResearchFeed - მკვლევარის რეჟიმის აღმოჩენები
 * =============================================
 * - კლინიკური კვლევების აღმოჩენები
 * - სამეცნიერო სტატიები
 * - მედიკამენტების სიახლეები
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Link } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  FlaskConical,
  FileText,
  Pill,
  Newspaper,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  X,
  Eye,
  Loader2,
  RefreshCw,
  Settings,
  AlertCircle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface Finding {
  id: number;
  findingType: string;
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
  relevanceScore: number;
  isRead: boolean;
  isSaved: boolean;
  publishedAt: string;
  foundAt: string;
  metadata: any;
}

// ============================================================================
// Translations
// ============================================================================

const translations = {
  ka: {
    title: "მკვლევარის რეჟიმი",
    subtitle: "ავტომატურად მოძებნილი კვლევები და სიახლეები",
    active: "აქტიური",
    inactive: "არააქტიური",
    lastScan: "ბოლო სკანირება",
    scanNow: "სკანირება",
    settings: "პარამეტრები",
    all: "ყველა",
    trials: "კვლევები",
    articles: "სტატიები",
    drugs: "მედიკამენტები",
    news: "სიახლეები",
    today: "დღეს",
    yesterday: "გუშინ",
    thisWeek: "ამ კვირაში",
    older: "უფრო ძველი",
    relevance: "რელევანტურობა",
    view: "ნახვა",
    save: "შენახვა",
    saved: "შენახული",
    dismiss: "არა",
    noFindings: "აღმოჩენები არ არის",
    noFindingsDescription: "როცა ახალი კვლევები ან სიახლეები გამოჩნდება, აქ ნახავთ",
    notEnabled: "მკვლევარის რეჟიმი არ არის ჩართული",
    enableFirst: "ჯერ შექმენით პროფილი და ჩართეთ მკვლევარის რეჟიმი",
    goToProfile: "პროფილის გვერდზე",
    loadMore: "მეტის ჩატვირთვა",
    newFindings: "ახალი",
  },
  en: {
    title: "Research Mode",
    subtitle: "Automatically discovered research and news",
    active: "Active",
    inactive: "Inactive",
    lastScan: "Last scan",
    scanNow: "Scan Now",
    settings: "Settings",
    all: "All",
    trials: "Trials",
    articles: "Articles",
    drugs: "Drugs",
    news: "News",
    today: "Today",
    yesterday: "Yesterday",
    thisWeek: "This Week",
    older: "Older",
    relevance: "Relevance",
    view: "View",
    save: "Save",
    saved: "Saved",
    dismiss: "Dismiss",
    noFindings: "No findings yet",
    noFindingsDescription: "When new research or news is found, it will appear here",
    notEnabled: "Research Mode is not enabled",
    enableFirst: "First create a profile and enable Research Mode",
    goToProfile: "Go to Profile",
    loadMore: "Load More",
    newFindings: "new",
  },
};

// ============================================================================
// Finding Card Component
// ============================================================================

function FindingCard({
  finding,
  onSave,
  onDismiss,
  onRead,
  t,
}: {
  finding: Finding;
  onSave: () => void;
  onDismiss: () => void;
  onRead: () => void;
  t: any;
}) {
  const getIcon = () => {
    switch (finding.findingType) {
      case "clinical_trial":
        return <FlaskConical className="h-5 w-5 text-blue-500" />;
      case "article":
        return <FileText className="h-5 w-5 text-green-500" />;
      case "drug":
        return <Pill className="h-5 w-5 text-purple-500" />;
      case "news":
        return <Newspaper className="h-5 w-5 text-orange-500" />;
      default:
        return <FileText className="h-5 w-5" />;
    }
  };

  const getTypeLabel = () => {
    switch (finding.findingType) {
      case "clinical_trial":
        return t.trials;
      case "article":
        return t.articles;
      case "drug":
        return t.drugs;
      case "news":
        return t.news;
      default:
        return finding.findingType;
    }
  };

  return (
    <Card className={`transition-colors ${!finding.isRead ? "border-primary/50 bg-primary/5" : ""}`}>
      <CardContent className="pt-4">
        <div className="flex gap-4">
          <div className="flex-shrink-0 mt-1">{getIcon()}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <Badge variant="outline" className="mb-2">
                  {getTypeLabel()}
                </Badge>
                <h3 className="font-medium line-clamp-2">{finding.title}</h3>
              </div>
              {!finding.isRead && (
                <Badge variant="default" className="flex-shrink-0">
                  {t.newFindings}
                </Badge>
              )}
            </div>

            {finding.summary && (
              <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                {finding.summary}
              </p>
            )}

            <div className="flex items-center gap-4 mb-3">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <span>{t.relevance}:</span>
                <Progress value={finding.relevanceScore * 100} className="w-20 h-2" />
                <span>{Math.round(finding.relevanceScore * 100)}%</span>
              </div>
              {finding.sourceName && (
                <span className="text-sm text-muted-foreground">
                  {finding.sourceName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {finding.sourceUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  onClick={onRead}
                >
                  <a href={finding.sourceUrl} target="_blank" rel="noopener noreferrer">
                    <Eye className="h-4 w-4 mr-1" />
                    {t.view}
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                </Button>
              )}
              <Button
                variant={finding.isSaved ? "default" : "outline"}
                size="sm"
                onClick={onSave}
              >
                {finding.isSaved ? (
                  <>
                    <BookmarkCheck className="h-4 w-4 mr-1" />
                    {t.saved}
                  </>
                ) : (
                  <>
                    <Bookmark className="h-4 w-4 mr-1" />
                    {t.save}
                  </>
                )}
              </Button>
              <Button variant="ghost" size="sm" onClick={onDismiss}>
                <X className="h-4 w-4 mr-1" />
                {t.dismiss}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ResearchFeed() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.ka;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("all");
  const [page, setPage] = useState(1);

  // Fetch profile and monitor status
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const res = await fetch("/api/patient-profile", {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  // Fetch findings
  const { data: findingsData, isLoading: findingsLoading } = useQuery({
    queryKey: ["research-findings", activeTab, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (activeTab !== "all") {
        params.set("type", activeTab);
      }
      const res = await fetch(`/api/research-monitor/findings?${params}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch findings");
      return res.json();
    },
    enabled: !!profileData?.researchMonitor?.isActive,
  });

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/research-monitor/findings/${id}/save`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Save failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research-findings"] });
    },
  });

  const dismissMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/research-monitor/findings/${id}/dismiss`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Dismiss failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research-findings"] });
    },
  });

  const readMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/research-monitor/findings/${id}/read`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Mark read failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["research-findings"] });
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/research-monitor/scan-now", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Scan failed");
      }
      return res.json();
    },
  });

  const isLoading = profileLoading || findingsLoading;
  const monitor = profileData?.researchMonitor;
  const findings = findingsData?.findings || [];
  const unreadCount = findingsData?.unreadCount || 0;

  // Not enabled state
  if (!profileLoading && (!profileData?.exists || !monitor?.isActive)) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t.notEnabled}</h2>
            <p className="text-muted-foreground mb-6">{t.enableFirst}</p>
            <Button asChild>
              <Link href="/profile">{t.goToProfile}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FlaskConical className="h-6 w-6" />
            {t.title}
            {unreadCount > 0 && (
              <Badge variant="destructive">{unreadCount}</Badge>
            )}
          </h1>
          <p className="text-muted-foreground">
            {monitor?.isActive ? (
              <>
                <Badge variant="default" className="bg-green-500 mr-2">{t.active}</Badge>
                {monitor?.lastScanAt && (
                  <span className="text-sm">
                    {t.lastScan}: {new Date(monitor.lastScanAt).toLocaleString(language)}
                  </span>
                )}
              </>
            ) : (
              <Badge variant="secondary">{t.inactive}</Badge>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => scanMutation.mutate()}
            disabled={scanMutation.isPending}
          >
            {scanMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {t.scanNow}
          </Button>
          <Button variant="outline" asChild>
            <Link href="/profile">
              <Settings className="h-4 w-4 mr-2" />
              {t.settings}
            </Link>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="all">{t.all}</TabsTrigger>
          <TabsTrigger value="clinical_trial">
            <FlaskConical className="h-4 w-4 mr-1" />
            {t.trials}
          </TabsTrigger>
          <TabsTrigger value="article">
            <FileText className="h-4 w-4 mr-1" />
            {t.articles}
          </TabsTrigger>
          <TabsTrigger value="drug">
            <Pill className="h-4 w-4 mr-1" />
            {t.drugs}
          </TabsTrigger>
          <TabsTrigger value="news">
            <Newspaper className="h-4 w-4 mr-1" />
            {t.news}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && findings.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FlaskConical className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">{t.noFindings}</h2>
            <p className="text-muted-foreground">{t.noFindingsDescription}</p>
          </CardContent>
        </Card>
      )}

      {/* Findings list */}
      {!isLoading && findings.length > 0 && (
        <div className="space-y-4">
          {findings.map((finding: Finding) => (
            <FindingCard
              key={finding.id}
              finding={finding}
              onSave={() => saveMutation.mutate(finding.id)}
              onDismiss={() => dismissMutation.mutate(finding.id)}
              onRead={() => readMutation.mutate(finding.id)}
              t={t}
            />
          ))}

          {findings.length >= 20 && (
            <div className="text-center pt-4">
              <Button variant="outline" onClick={() => setPage(page + 1)}>
                {t.loadMore}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
