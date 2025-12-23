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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search,
  Pill,
  AlertTriangle,
  Info,
  Shield,
  Baby,
  ExternalLink,
  Database,
  AlertCircle,
  FileWarning,
  Activity,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";

// Drug Label type
interface DrugLabel {
  id: string;
  brandName: string;
  genericName: string;
  manufacturer: string;
  activeIngredients: string[];
  purpose?: string;
  indications?: string;
  warnings?: string;
  dosage?: string;
  adverseReactions?: string;
  drugInteractions?: string;
  pediatricUse?: string;
  pregnancyCategory?: string;
  storageHandling?: string;
  route?: string[];
  productType?: string;
  marketingStatus?: string;
  ndc?: string[];
  rxcui?: string[];
  splId?: string;
  effectiveDate?: string;
}

interface DrugSearchResult {
  results: DrugLabel[];
  totalCount: number;
}

// Adverse Event type
interface DrugAdverseEvent {
  safetyReportId: string;
  receiptDate: string;
  serious: boolean;
  seriousnessHospitalization?: boolean;
  seriousnessLifeThreatening?: boolean;
  seriousnessDeath?: boolean;
  patientAge?: number;
  patientAgeUnit?: string;
  patientSex?: string;
  drugs: {
    name: string;
    indication?: string;
    route?: string;
    dose?: string;
  }[];
  reactions: string[];
}

interface AdverseEventResult {
  results: DrugAdverseEvent[];
  totalCount: number;
}

// Drug Recall type
interface DrugRecall {
  recallNumber: string;
  recallInitiationDate: string;
  reportDate: string;
  recallClass: string;
  productDescription: string;
  reason: string;
  status: string;
  distribution: string;
  firm: string;
  city?: string;
  state?: string;
  country?: string;
}

interface DrugRecallResult {
  results: DrugRecall[];
  totalCount: number;
}

// Skeleton components
function DrugCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-1/3" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Medications() {
  const { t } = useLanguage();
  const { toast } = useToast();

  // Search state
  const [searchTerm, setSearchTerm] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [medicationType, setMedicationType] = useState<"all" | "anticonvulsant" | "neuroprotective" | "analgesic">("all");
  const [activeTab, setActiveTab] = useState("hie");

  // Dialog state
  const [selectedDrug, setSelectedDrug] = useState<DrugLabel | null>(null);
  const [showDrugDialog, setShowDrugDialog] = useState(false);

  // HIE Medications query
  const {
    data: hieMedications,
    isLoading: isLoadingHIE,
    isError: isErrorHIE,
    refetch: refetchHIE,
  } = useQuery<DrugSearchResult>({
    queryKey: ['/api/fda/drugs/hie', medicationType],
    staleTime: 10 * 60 * 1000,
  });

  // Drug Search query
  const {
    data: searchResults,
    isLoading: isLoadingSearch,
    isError: isErrorSearch,
    refetch: refetchSearch,
  } = useQuery<DrugSearchResult>({
    queryKey: ['/api/fda/drugs', activeSearch],
    enabled: activeSearch.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Drug Recalls query
  const {
    data: recallsData,
    isLoading: isLoadingRecalls,
    isError: isErrorRecalls,
  } = useQuery<DrugRecallResult>({
    queryKey: ['/api/fda/recalls'],
    staleTime: 30 * 60 * 1000, // 30 minutes
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

  const openDrugDetails = (drug: DrugLabel) => {
    setSelectedDrug(drug);
    setShowDrugDialog(true);
  };

  const currentResults = activeTab === "hie" ? hieMedications : searchResults;
  const isLoading = activeTab === "hie" ? isLoadingHIE : isLoadingSearch;
  const isError = activeTab === "hie" ? isErrorHIE : isErrorSearch;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Pill className="h-6 w-6" />
            {t("medications") || "Medications"}
          </h1>
          <p className="text-muted-foreground">
            Search FDA drug database for medication information, interactions, and safety alerts
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
                placeholder="Search medications by name (e.g., 'phenobarbital', 'levetiracetam')..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-9"
                data-testid="input-drug-search"
              />
            </div>
            <Button onClick={handleSearch} data-testid="button-search-drugs">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>

          <div className="flex items-center gap-4 mt-4">
            <Label className="text-sm text-muted-foreground">HIE Medication Type:</Label>
            <Select
              value={medicationType}
              onValueChange={(v) => setMedicationType(v as typeof medicationType)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All HIE Medications</SelectItem>
                <SelectItem value="anticonvulsant">Anticonvulsants</SelectItem>
                <SelectItem value="neuroprotective">Neuroprotective</SelectItem>
                <SelectItem value="analgesic">Pain Management</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Results Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="hie" data-testid="tab-hie-meds">
            <Baby className="h-4 w-4 mr-2" />
            HIE Medications
            {hieMedications && (
              <Badge variant="secondary" className="ml-2">
                {hieMedications.totalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search" disabled={!activeSearch} data-testid="tab-drug-search">
            <Search className="h-4 w-4 mr-2" />
            Search Results
            {searchResults && (
              <Badge variant="secondary" className="ml-2">
                {searchResults.totalCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="recalls" data-testid="tab-recalls">
            <AlertTriangle className="h-4 w-4 mr-2" />
            Drug Recalls
            {recallsData && (
              <Badge variant="destructive" className="ml-2">
                {recallsData.totalCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Data source indicator */}
        {currentResults && currentResults.results.length > 0 && activeTab !== "recalls" && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-purple-50 dark:bg-purple-950 px-3 py-2 rounded-md mt-4">
            <Database className="h-4 w-4 text-purple-600" />
            <span>
              Showing {currentResults.results.length} of {currentResults.totalCount} medications from <strong>OpenFDA</strong>
            </span>
          </div>
        )}

        {isError && (
          <div className="flex items-center gap-2 text-sm bg-yellow-50 dark:bg-yellow-950 px-3 py-2 rounded-md mt-4">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <span>
              Unable to fetch medication data. Please try again.
              <button
                onClick={() => activeTab === "hie" ? refetchHIE() : refetchSearch()}
                className="underline ml-2"
              >
                Retry
              </button>
            </span>
          </div>
        )}

        {/* HIE Medications Tab */}
        <TabsContent value="hie" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {isLoadingHIE ? (
              <>
                <DrugCardSkeleton />
                <DrugCardSkeleton />
                <DrugCardSkeleton />
                <DrugCardSkeleton />
              </>
            ) : hieMedications?.results.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="py-12 text-center">
                  <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No HIE medications found</p>
                </CardContent>
              </Card>
            ) : (
              hieMedications?.results.map((drug) => (
                <DrugCard
                  key={drug.id}
                  drug={drug}
                  onViewDetails={() => openDrugDetails(drug)}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Search Results Tab */}
        <TabsContent value="search" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            {isLoadingSearch ? (
              <>
                <DrugCardSkeleton />
                <DrugCardSkeleton />
              </>
            ) : !activeSearch ? (
              <Card className="md:col-span-2">
                <CardContent className="py-12 text-center">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Enter a medication name to search</p>
                </CardContent>
              </Card>
            ) : searchResults?.results.length === 0 ? (
              <Card className="md:col-span-2">
                <CardContent className="py-12 text-center">
                  <Pill className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No medications found for "{activeSearch}"</p>
                </CardContent>
              </Card>
            ) : (
              searchResults?.results.map((drug) => (
                <DrugCard
                  key={drug.id}
                  drug={drug}
                  onViewDetails={() => openDrugDetails(drug)}
                />
              ))
            )}
          </div>
        </TabsContent>

        {/* Drug Recalls Tab */}
        <TabsContent value="recalls" className="mt-4">
          {isLoadingRecalls ? (
            <div className="space-y-4">
              <DrugCardSkeleton />
              <DrugCardSkeleton />
            </div>
          ) : isErrorRecalls ? (
            <Card>
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <p className="text-muted-foreground">Unable to load drug recalls</p>
              </CardContent>
            </Card>
          ) : recallsData?.results.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Shield className="h-12 w-12 mx-auto text-green-500 mb-4" />
                <p className="text-muted-foreground">No recent drug recalls found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {recallsData?.results.map((recall) => (
                <RecallCard key={recall.recallNumber} recall={recall} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Drug Details Dialog */}
      <Dialog open={showDrugDialog} onOpenChange={setShowDrugDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedDrug && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">
                  {selectedDrug.brandName}
                </DialogTitle>
                <DialogDescription className="flex flex-wrap items-center gap-2 pt-2">
                  <Badge>{selectedDrug.genericName}</Badge>
                  <span className="text-sm">{selectedDrug.manufacturer}</span>
                </DialogDescription>
              </DialogHeader>

              <Accordion type="multiple" className="w-full">
                {selectedDrug.indications && (
                  <AccordionItem value="indications">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <Info className="h-4 w-4" />
                        Indications & Usage
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[200px]">
                        <p className="text-sm whitespace-pre-wrap">{selectedDrug.indications}</p>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {selectedDrug.dosage && (
                  <AccordionItem value="dosage">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        Dosage & Administration
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[200px]">
                        <p className="text-sm whitespace-pre-wrap">{selectedDrug.dosage}</p>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {selectedDrug.warnings && (
                  <AccordionItem value="warnings">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2 text-orange-600">
                        <AlertTriangle className="h-4 w-4" />
                        Warnings & Precautions
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[200px]">
                        <p className="text-sm whitespace-pre-wrap">{selectedDrug.warnings}</p>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {selectedDrug.adverseReactions && (
                  <AccordionItem value="adverse">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <FileWarning className="h-4 w-4" />
                        Adverse Reactions
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[200px]">
                        <p className="text-sm whitespace-pre-wrap">{selectedDrug.adverseReactions}</p>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {selectedDrug.drugInteractions && (
                  <AccordionItem value="interactions">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <Pill className="h-4 w-4" />
                        Drug Interactions
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[200px]">
                        <p className="text-sm whitespace-pre-wrap">{selectedDrug.drugInteractions}</p>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                )}

                {selectedDrug.pediatricUse && (
                  <AccordionItem value="pediatric">
                    <AccordionTrigger>
                      <span className="flex items-center gap-2 text-blue-600">
                        <Baby className="h-4 w-4" />
                        Pediatric Use
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <ScrollArea className="h-[200px]">
                        <p className="text-sm whitespace-pre-wrap">{selectedDrug.pediatricUse}</p>
                      </ScrollArea>
                    </AccordionContent>
                  </AccordionItem>
                )}
              </Accordion>

              {/* Drug Info Footer */}
              <div className="grid grid-cols-2 gap-4 text-sm pt-4 border-t">
                {selectedDrug.route && selectedDrug.route.length > 0 && (
                  <div>
                    <span className="text-muted-foreground">Route: </span>
                    <span>{selectedDrug.route.join(', ')}</span>
                  </div>
                )}
                {selectedDrug.productType && (
                  <div>
                    <span className="text-muted-foreground">Type: </span>
                    <span>{selectedDrug.productType}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDrugDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => window.open(`https://dailymed.nlm.nih.gov/dailymed/search.cfm?query=${encodeURIComponent(selectedDrug.brandName)}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on DailyMed
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Import Label component
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}

// Drug Card Component
function DrugCard({
  drug,
  onViewDetails,
}: {
  drug: DrugLabel;
  onViewDetails: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="cursor-pointer hover:text-primary" onClick={onViewDetails}>
            {drug.brandName}
          </span>
          {drug.pediatricUse && (
            <Badge variant="outline" className="ml-2">
              <Baby className="h-3 w-3 mr-1" />
              Pediatric
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {drug.genericName} • {drug.manufacturer}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {drug.purpose && (
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {drug.purpose}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          {drug.route && drug.route.slice(0, 2).map((r, i) => (
            <Badge key={i} variant="secondary" className="text-xs">
              {r}
            </Badge>
          ))}
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={onViewDetails}>
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Recall Card Component
function RecallCard({ recall }: { recall: DrugRecall }) {
  const getRecallClassColor = (recallClass: string) => {
    if (recallClass.includes('I')) return 'destructive';
    if (recallClass.includes('II')) return 'default';
    return 'secondary';
  };

  return (
    <Card className="border-l-4 border-l-red-500">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-4">
          <CardTitle className="text-base">{recall.firm}</CardTitle>
          <Badge variant={getRecallClassColor(recall.recallClass)}>
            {recall.recallClass}
          </Badge>
        </div>
        <CardDescription className="flex items-center gap-2">
          <span>{recall.recallNumber}</span>
          <span>•</span>
          <span>{new Date(recall.reportDate).toLocaleDateString()}</span>
          <span>•</span>
          <Badge variant={recall.status === 'Ongoing' ? 'destructive' : 'secondary'}>
            {recall.status}
          </Badge>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm font-medium mb-2">Product:</p>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {recall.productDescription}
        </p>
        <p className="text-sm font-medium mb-2">Reason:</p>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {recall.reason}
        </p>
        {recall.distribution && (
          <p className="text-xs text-muted-foreground mt-3">
            Distribution: {recall.distribution.slice(0, 100)}...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
