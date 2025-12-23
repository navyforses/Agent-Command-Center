import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Search,
  BookOpen,
  ExternalLink,
  Calendar,
  Users,
  FileText,
  Database,
  AlertCircle,
  RefreshCw,
  Star,
  Link2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

// PubMed Article type
interface PubMedArticle {
  pmid: string;
  title: string;
  abstract?: string;
  authors: {
    lastName?: string;
    firstName?: string;
    initials?: string;
    affiliation?: string;
  }[];
  journal: {
    name: string;
    abbreviation?: string;
    volume?: string;
    issue?: string;
    pages?: string;
  };
  publicationDate: {
    year?: string;
    month?: string;
    day?: string;
  };
  doi?: string;
  pmcid?: string;
  keywords: string[];
  meshTerms: string[];
  publicationTypes: string[];
  language?: string;
  fullTextLinks: string[];
}

interface PubMedSearchResult {
  articles: PubMedArticle[];
  totalCount: number;
  queryTranslation?: string;
}

// Article Card Skeleton
function ArticleCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// Format author names
function formatAuthors(authors: PubMedArticle["authors"]): string {
  if (!authors || authors.length === 0) return "Unknown authors";

  const formatted = authors.slice(0, 3).map(a =>
    `${a.lastName || ''}${a.initials ? ' ' + a.initials : ''}`
  ).filter(Boolean).join(', ');

  if (authors.length > 3) {
    return `${formatted} et al.`;
  }
  return formatted;
}

// Format publication date
function formatDate(date: PubMedArticle["publicationDate"]): string {
  const parts = [date.year];
  if (date.month) parts.push(date.month);
  if (date.day) parts.push(date.day);
  return parts.filter(Boolean).join(' ');
}

export default function Research() {
  const { t } = useLanguage();
  const { toast } = useToast();

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [sortBy, setSortBy] = useState<"relevance" | "pub_date">("relevance");
  const [recentOnly, setRecentOnly] = useState(false);
  const [activeTab, setActiveTab] = useState("hie");

  // Dialog state
  const [selectedArticle, setSelectedArticle] = useState<PubMedArticle | null>(null);
  const [showArticleDialog, setShowArticleDialog] = useState(false);

  // Saved articles (local state - could be persisted)
  const [savedArticles, setSavedArticles] = useState<string[]>([]);

  // HIE Research query
  const {
    data: hieResults,
    isLoading: isLoadingHIE,
    isError: isErrorHIE,
    refetch: refetchHIE,
  } = useQuery<PubMedSearchResult>({
    queryKey: ['/api/pubmed/hie', recentOnly],
    staleTime: 10 * 60 * 1000, // 10 minutes
  });

  // Custom search query
  const {
    data: searchResults,
    isLoading: isLoadingSearch,
    isError: isErrorSearch,
    refetch: refetchSearch,
  } = useQuery<PubMedSearchResult>({
    queryKey: ['/api/pubmed/search', activeSearch, sortBy],
    enabled: activeSearch.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setActiveSearch(searchTerm.trim());
      setActiveTab("search");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const toggleSave = (pmid: string) => {
    setSavedArticles(prev => {
      const newSaved = prev.includes(pmid)
        ? prev.filter(id => id !== pmid)
        : [...prev, pmid];

      toast({
        title: prev.includes(pmid) ? "Article removed" : "Article saved",
        description: prev.includes(pmid)
          ? "Article removed from your library"
          : "Article added to your library",
      });

      return newSaved;
    });
  };

  const openArticleDetails = (article: PubMedArticle) => {
    setSelectedArticle(article);
    setShowArticleDialog(true);
  };

  const currentResults = activeTab === "hie" ? hieResults : searchResults;
  const isLoading = activeTab === "hie" ? isLoadingHIE : isLoadingSearch;
  const isError = activeTab === "hie" ? isErrorHIE : isErrorSearch;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            {t("research") || "Medical Research"}
          </h1>
          <p className="text-muted-foreground">
            Search PubMed for the latest HIE research and medical literature
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search PubMed (e.g., 'HIE stem cell therapy', 'neonatal hypothermia')..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9"
                data-testid="input-pubmed-search"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as "relevance" | "pub_date")}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="pub_date">Date</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} data-testid="button-search-pubmed">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="recent-only"
                checked={recentOnly}
                onCheckedChange={setRecentOnly}
              />
              <Label htmlFor="recent-only" className="text-sm">
                Last 5 years only
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="hie" data-testid="tab-hie-research">
            <FileText className="h-4 w-4 mr-2" />
            HIE Research
            {hieResults && (
              <Badge variant="secondary" className="ml-2">
                {hieResults.totalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search" disabled={!activeSearch} data-testid="tab-search-results">
            <Search className="h-4 w-4 mr-2" />
            Search Results
            {searchResults && (
              <Badge variant="secondary" className="ml-2">
                {searchResults.totalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="saved" data-testid="tab-saved-articles">
            <Star className="h-4 w-4 mr-2" />
            Saved
            <Badge variant="secondary" className="ml-2">
              {savedArticles.length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        {/* Data source indicator */}
        {currentResults && currentResults.articles.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950 px-3 py-2 rounded-md mt-4">
            <Database className="h-4 w-4 text-blue-600" />
            <span>
              Showing {currentResults.articles.length} of {currentResults.totalCount} articles from <strong>PubMed</strong>
            </span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-sm bg-yellow-50 dark:bg-yellow-950 px-3 py-2 rounded-md mt-4">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span>
              Unable to fetch articles. Please try again.
              <button
                onClick={() => activeTab === "hie" ? refetchHIE() : refetchSearch()}
                className="underline ml-2"
              >
                Retry
              </button>
            </span>
          </div>
        )}

        <TabsContent value="hie" className="mt-4">
          <div className="grid gap-4">
            {isLoadingHIE ? (
              <>
                <ArticleCardSkeleton />
                <ArticleCardSkeleton />
                <ArticleCardSkeleton />
              </>
            ) : hieResults?.articles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No HIE research articles found</p>
                </CardContent>
              </Card>
            ) : (
              hieResults?.articles.map((article) => (
                <ArticleCard
                  key={article.pmid}
                  article={article}
                  isSaved={savedArticles.includes(article.pmid)}
                  onSave={() => toggleSave(article.pmid)}
                  onViewDetails={() => openArticleDetails(article)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <div className="grid gap-4">
            {isLoadingSearch ? (
              <>
                <ArticleCardSkeleton />
                <ArticleCardSkeleton />
                <ArticleCardSkeleton />
              </>
            ) : !activeSearch ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Enter a search term to find articles</p>
                </CardContent>
              </Card>
            ) : searchResults?.articles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No articles found for "{activeSearch}"</p>
                </CardContent>
              </Card>
            ) : (
              searchResults?.articles.map((article) => (
                <ArticleCard
                  key={article.pmid}
                  article={article}
                  isSaved={savedArticles.includes(article.pmid)}
                  onSave={() => toggleSave(article.pmid)}
                  onViewDetails={() => openArticleDetails(article)}
                />
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-4">
          <div className="grid gap-4">
            {savedArticles.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Star className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No saved articles yet</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Click the star icon on articles to save them here
                  </p>
                </CardContent>
              </Card>
            ) : (
              // Filter saved articles from current results
              [...(hieResults?.articles || []), ...(searchResults?.articles || [])]
                .filter(a => savedArticles.includes(a.pmid))
                .map((article) => (
                  <ArticleCard
                    key={article.pmid}
                    article={article}
                    isSaved={true}
                    onSave={() => toggleSave(article.pmid)}
                    onViewDetails={() => openArticleDetails(article)}
                  />
                ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Article Details Dialog */}
      <Dialog open={showArticleDialog} onOpenChange={setShowArticleDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedArticle && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl leading-tight">
                  {selectedArticle.title}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge variant="outline">{selectedArticle.journal.name}</Badge>
                  <span className="text-sm">
                    {formatDate(selectedArticle.publicationDate)}
                  </span>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Authors */}
                <div>
                  <h4 className="font-medium mb-1 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Authors
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedArticle.authors.map(a =>
                      `${a.firstName || ''} ${a.lastName || ''}`.trim()
                    ).filter(Boolean).join(', ') || 'Unknown'}
                  </p>
                </div>

                {/* Abstract */}
                {selectedArticle.abstract && (
                  <div>
                    <h4 className="font-medium mb-1">Abstract</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {selectedArticle.abstract}
                    </p>
                  </div>
                )}

                {/* Keywords */}
                {selectedArticle.keywords.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">Keywords</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedArticle.keywords.map((keyword, i) => (
                        <Badge key={i} variant="secondary">{keyword}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* MeSH Terms */}
                {selectedArticle.meshTerms.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">MeSH Terms</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedArticle.meshTerms.slice(0, 10).map((term, i) => (
                        <Badge key={i} variant="outline">{term}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Citation Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">PMID: </span>
                    <span className="font-mono">{selectedArticle.pmid}</span>
                  </div>
                  {selectedArticle.doi && (
                    <div>
                      <span className="text-muted-foreground">DOI: </span>
                      <span className="font-mono">{selectedArticle.doi}</span>
                    </div>
                  )}
                  {selectedArticle.pmcid && (
                    <div>
                      <span className="text-muted-foreground">PMCID: </span>
                      <span className="font-mono">{selectedArticle.pmcid}</span>
                    </div>
                  )}
                </div>

                {/* Links */}
                <div className="flex flex-wrap gap-2 pt-4 border-t">
                  <Button
                    variant="default"
                    onClick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/${selectedArticle.pmid}/`, '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View on PubMed
                  </Button>
                  {selectedArticle.doi && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(`https://doi.org/${selectedArticle.doi}`, '_blank')}
                    >
                      <Link2 className="h-4 w-4 mr-2" />
                      Full Text (DOI)
                    </Button>
                  )}
                  {selectedArticle.pmcid && (
                    <Button
                      variant="outline"
                      onClick={() => window.open(`https://www.ncbi.nlm.nih.gov/pmc/articles/${selectedArticle.pmcid}/`, '_blank')}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Free Full Text (PMC)
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Article Card Component
function ArticleCard({
  article,
  isSaved,
  onSave,
  onViewDetails,
}: {
  article: PubMedArticle;
  isSaved: boolean;
  onSave: () => void;
  onViewDetails: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <CardTitle
            className="text-base leading-tight cursor-pointer hover:text-primary transition-colors"
            onClick={onViewDetails}
          >
            {article.title}
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSave}
            className="shrink-0"
            data-testid={`button-save-article-${article.pmid}`}
          >
            <Star className={`h-4 w-4 ${isSaved ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </Button>
        </div>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span>{formatAuthors(article.authors)}</span>
          <span>•</span>
          <span>{article.journal.abbreviation || article.journal.name}</span>
          <span>•</span>
          <span>{formatDate(article.publicationDate)}</span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {article.abstract && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {article.abstract}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {article.publicationTypes.slice(0, 2).map((type, i) => (
            <Badge key={i} variant="outline" className="text-xs">
              {type}
            </Badge>
          ))}
          {article.pmcid && (
            <Badge variant="secondary" className="text-xs">
              Free Full Text
            </Badge>
          )}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            View Details
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`, '_blank')}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
