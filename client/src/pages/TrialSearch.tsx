import { useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search,
  Filter,
  FlaskConical,
  MapPin,
  Calendar,
  Users,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building,
  ExternalLink,
  Languages,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import type { ClinicalTrial } from "@shared/schema";

const statusOptions = [
  { value: "recruiting", label: "Recruiting", labelKa: "მიმდინარე რეკრუტირება" },
  { value: "active", label: "Active", labelKa: "აქტიური" },
  { value: "completed", label: "Completed", labelKa: "დასრულებული" },
  { value: "not_yet_recruiting", label: "Not Yet Recruiting", labelKa: "ჯერ არ იწყება" },
];

const phaseOptions = [
  { value: "phase_1", label: "Phase 1", labelKa: "ფაზა 1" },
  { value: "phase_2", label: "Phase 2", labelKa: "ფაზა 2" },
  { value: "phase_3", label: "Phase 3", labelKa: "ფაზა 3" },
  { value: "phase_4", label: "Phase 4", labelKa: "ფაზა 4" },
];

interface TrialSearchResponse {
  trials: ClinicalTrial[];
  total: number;
  page: number;
  pageSize: number;
}

export default function TrialSearch() {
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(useSearch());
  
  const initialQuery = searchParams.get("q") || "";
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [activeQuery, setActiveQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({
    status: [] as string[],
    phases: [] as string[],
    location: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  const { data, isLoading, isFetching } = useQuery<TrialSearchResponse>({
    queryKey: ["/api/trials/search", activeQuery, page, JSON.stringify(filters)],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: activeQuery,
        page: page.toString(),
        pageSize: "20",
      });
      if (filters.status.length) params.set("status", filters.status.join(","));
      if (filters.phases.length) params.set("phases", filters.phases.join(","));
      if (filters.location) params.set("location", filters.location);
      
      const res = await fetch(`/api/trials/search?${params}`);
      if (!res.ok) throw new Error("Search failed");
      return res.json();
    },
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setActiveQuery(searchQuery.trim());
      setPage(1);
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const toggleStatus = (status: string) => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status.includes(status)
        ? prev.status.filter((s) => s !== status)
        : [...prev.status, status],
    }));
    setPage(1);
  };

  const togglePhase = (phase: string) => {
    setFilters((prev) => ({
      ...prev,
      phases: prev.phases.includes(phase)
        ? prev.phases.filter((p) => p !== phase)
        : [...prev.phases, phase],
    }));
    setPage(1);
  };

  const totalPages = data ? Math.ceil(data.total / 20) : 0;

  const getStatusColor = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "recruiting":
        return "bg-green-500/10 text-green-600 border-green-500/20";
      case "active":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "completed":
        return "bg-gray-500/10 text-gray-600 border-gray-500/20";
      default:
        return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setLocation("/")}
            data-testid="link-home"
          >
            <FlaskConical className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Trial Navigator</span>
          </div>
          <form onSubmit={handleSearch} className="flex-1 max-w-xl mx-4">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder={language === "ka" ? "მოძებნეთ კვლევები..." : "Search trials..."}
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-header"
                />
              </div>
              <Button type="submit" size="sm" data-testid="button-search-header">
                {language === "ka" ? "ძიება" : "Search"}
              </Button>
            </div>
          </form>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          <aside className="w-full lg:w-64 shrink-0">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4" />
                  {language === "ka" ? "ფილტრები" : "Filters"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    {language === "ka" ? "სტატუსი" : "Status"}
                  </Label>
                  <div className="space-y-2">
                    {statusOptions.map((option) => (
                      <div key={option.value} className="flex items-center gap-2">
                        <Checkbox
                          id={option.value}
                          checked={filters.status.includes(option.value)}
                          onCheckedChange={() => toggleStatus(option.value)}
                          data-testid={`checkbox-status-${option.value}`}
                        />
                        <Label htmlFor={option.value} className="text-sm cursor-pointer">
                          {language === "ka" ? option.labelKa : option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-3 block">
                    {language === "ka" ? "ფაზა" : "Phase"}
                  </Label>
                  <div className="space-y-2">
                    {phaseOptions.map((option) => (
                      <div key={option.value} className="flex items-center gap-2">
                        <Checkbox
                          id={option.value}
                          checked={filters.phases.includes(option.value)}
                          onCheckedChange={() => togglePhase(option.value)}
                          data-testid={`checkbox-phase-${option.value}`}
                        />
                        <Label htmlFor={option.value} className="text-sm cursor-pointer">
                          {language === "ka" ? option.labelKa : option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    {language === "ka" ? "მდებარეობა" : "Location"}
                  </Label>
                  <Input
                    placeholder={language === "ka" ? "ქვეყანა ან ქალაქი" : "Country or city"}
                    value={filters.location}
                    onChange={(e) => {
                      setFilters((prev) => ({ ...prev, location: e.target.value }));
                      setPage(1);
                    }}
                    data-testid="input-location"
                  />
                </div>

                {(filters.status.length > 0 || filters.phases.length > 0 || filters.location) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setFilters({ status: [], phases: [], location: "" });
                      setPage(1);
                    }}
                    data-testid="button-clear-filters"
                  >
                    {language === "ka" ? "ფილტრების გასუფთავება" : "Clear Filters"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </aside>

          <main className="flex-1">
            {!activeQuery ? (
              <Card>
                <CardContent className="py-16 text-center">
                  <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h2 className="mb-2 text-xl font-semibold">
                    {language === "ka" ? "მოძებნეთ კლინიკური კვლევები" : "Search Clinical Trials"}
                  </h2>
                  <p className="text-muted-foreground">
                    {language === "ka"
                      ? "შეიყვანეთ დაავადება, მკურნალობა ან საკვანძო სიტყვა"
                      : "Enter a condition, treatment, or keyword"}
                  </p>
                </CardContent>
              </Card>
            ) : isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardContent className="p-6">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <Skeleton className="h-4 w-1/4 mb-4" />
                      <Skeleton className="h-20 w-full mb-4" />
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-6 w-20" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : data?.trials && data.trials.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {isFetching && <Loader2 className="inline mr-2 h-4 w-4 animate-spin" />}
                    {language === "ka"
                      ? `ნაპოვნია ${data.total} კვლევა`
                      : `Found ${data.total} trials`}
                  </p>
                </div>

                {data.trials.map((trial) => (
                  <Card
                    key={trial.id}
                    className="hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/trial/${trial.nctNumber || trial.id}`)}
                    data-testid={`card-trial-${trial.nctNumber || trial.id}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {trial.nctNumber && (
                              <Badge variant="outline" className="text-xs">
                                {trial.nctNumber}
                              </Badge>
                            )}
                            {trial.status && (
                              <Badge className={getStatusColor(trial.status)}>
                                {trial.status}
                              </Badge>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold mb-2 line-clamp-2">
                            {trial.titleEn}
                          </h3>
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                            {trial.briefSummaryEn}
                          </p>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            {trial.sponsorName && (
                              <div className="flex items-center gap-1">
                                <Building className="h-4 w-4" />
                                {trial.sponsorName}
                              </div>
                            )}
                            {trial.locations && trial.locations.length > 0 && (
                              <div className="flex items-center gap-1">
                                <MapPin className="h-4 w-4" />
                                {trial.locations.slice(0, 2).map(l => l.country).join(", ")}
                                {trial.locations.length > 2 && ` +${trial.locations.length - 2}`}
                              </div>
                            )}
                            {trial.phase && (
                              <div className="flex items-center gap-1">
                                <FlaskConical className="h-4 w-4" />
                                {trial.phase}
                              </div>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0" data-testid={`button-view-${trial.nctNumber || trial.id}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {language === "ka"
                        ? `გვერდი ${page} / ${totalPages}`
                        : `Page ${page} of ${totalPages}`}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <Card>
                <CardContent className="py-16 text-center">
                  <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
                  <h2 className="mb-2 text-xl font-semibold">
                    {language === "ka" ? "კვლევები ვერ მოიძებნა" : "No Trials Found"}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {language === "ka"
                      ? `"${activeQuery}" - ამ ძიებით კვლევები ვერ მოიძებნა`
                      : `No trials match "${activeQuery}"`}
                  </p>
                  <Button variant="outline" onClick={() => setLocation("/")}>
                    {language === "ka" ? "სცადეთ სხვა ძიება" : "Try a Different Search"}
                  </Button>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
