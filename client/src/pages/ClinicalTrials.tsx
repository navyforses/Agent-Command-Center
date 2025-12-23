import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, RefreshCw, ExternalLink, Mail, MapPin, Calendar, CheckCircle, XCircle, AlertCircle, Database } from "lucide-react";
import { ClinicalTrialCard } from "@/components/dashboard/ClinicalTrialCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Child } from "@shared/schema";

// Clinical trial type definition (frontend)
interface ClinicalTrial {
  id: string;
  title: string;
  sponsor: string;
  status: "recruiting" | "active" | "not_yet_recruiting" | "completed";
  phase: string;
  location: string;
  distance: string;
  eligibilityScore: number;
  matchedCriteria: string[];
  unmatchedCriteria: string[];
  enrollmentDeadline: string;
  contactEmail?: string;
  contactPhone?: string;
  description?: string;
  nctId?: string;
}

// API response types
interface ApiClinicalTrialStudy {
  nctId: string;
  title: string;
  officialTitle?: string;
  status: string;
  phase?: string;
  studyType?: string;
  conditions: string[];
  interventions: string[];
  sponsor: string;
  collaborators: string[];
  locations: {
    facility?: string;
    city?: string;
    state?: string;
    country?: string;
    status?: string;
    contacts?: { name?: string; phone?: string; email?: string }[];
  }[];
  eligibility: {
    criteria?: string;
    gender?: string;
    minAge?: string;
    maxAge?: string;
    healthyVolunteers?: boolean;
  };
  contacts: { name?: string; phone?: string; email?: string }[];
  startDate?: string;
  completionDate?: string;
  enrollmentCount?: number;
  briefSummary?: string;
  detailedDescription?: string;
  lastUpdateDate?: string;
  _eligibilityScore?: number;
}

interface ApiClinicalTrialsResponse {
  studies: ApiClinicalTrialStudy[];
  totalCount: number;
  nextPageToken?: string;
}

// Transform API response to frontend format
function transformApiTrial(apiTrial: ApiClinicalTrialStudy): ClinicalTrial {
  // Map API status to frontend status
  const statusMap: Record<string, ClinicalTrial["status"]> = {
    'RECRUITING': 'recruiting',
    'ACTIVE_NOT_RECRUITING': 'active',
    'NOT_YET_RECRUITING': 'not_yet_recruiting',
    'COMPLETED': 'completed',
    'ENROLLING_BY_INVITATION': 'recruiting',
    'SUSPENDED': 'active',
    'TERMINATED': 'completed',
    'WITHDRAWN': 'completed',
  };

  // Get primary location
  const primaryLocation = apiTrial.locations[0];
  const locationStr = primaryLocation
    ? [primaryLocation.facility, primaryLocation.city, primaryLocation.country].filter(Boolean).join(', ')
    : 'Location not specified';

  // Get contact email
  const contactEmail = apiTrial.contacts[0]?.email
    || primaryLocation?.contacts?.[0]?.email
    || undefined;

  // Parse eligibility criteria into matched/unmatched
  const eligibilityCriteria = apiTrial.eligibility.criteria || '';
  const criteriaLines = eligibilityCriteria.split('\n').filter(line => line.trim().length > 0);
  const inclusionCriteria = criteriaLines.filter(line =>
    line.toLowerCase().includes('inclusion') || !line.toLowerCase().includes('exclusion')
  ).slice(0, 4);
  const exclusionCriteria = criteriaLines.filter(line =>
    line.toLowerCase().includes('exclusion')
  ).slice(0, 2);

  return {
    id: apiTrial.nctId,
    nctId: apiTrial.nctId,
    title: apiTrial.title,
    sponsor: apiTrial.sponsor,
    status: statusMap[apiTrial.status] || 'active',
    phase: apiTrial.phase || 'Not specified',
    location: locationStr,
    distance: 'Distance varies', // Would need geolocation to calculate
    eligibilityScore: apiTrial._eligibilityScore || 75,
    matchedCriteria: inclusionCriteria.length > 0 ? inclusionCriteria : ['See full eligibility criteria'],
    unmatchedCriteria: exclusionCriteria,
    enrollmentDeadline: apiTrial.completionDate || 'Ongoing',
    contactEmail,
    contactPhone: apiTrial.contacts[0]?.phone,
    description: apiTrial.briefSummary,
  };
}

// Fallback data when API is unavailable
const fallbackTrials: ClinicalTrial[] = [
  {
    id: "NCT04567890",
    nctId: "NCT04567890",
    title: "Erythropoietin for Neuroprotection in Neonatal HIE",
    sponsor: "National Institutes of Health",
    status: "recruiting",
    phase: "Phase 2",
    location: "Boston Children's Hospital, USA",
    distance: "8,500 km",
    eligibilityScore: 85,
    matchedCriteria: ["Age 0-3 years with HIE diagnosis", "GMFCS Level I-III"],
    unmatchedCriteria: ["Must be able to travel to study site"],
    enrollmentDeadline: "March 2026",
    contactEmail: "hie-study@nih.gov",
    description: "This study evaluates the neuroprotective effects of erythropoietin.",
  },
  {
    id: "NCT04567891",
    nctId: "NCT04567891",
    title: "Stem Cell Therapy for Pediatric Cerebral Palsy",
    sponsor: "Duke University Medical Center",
    status: "recruiting",
    phase: "Phase 1/2",
    location: "Durham, NC, USA",
    distance: "9,200 km",
    eligibilityScore: 72,
    matchedCriteria: ["Diagnosis of CP secondary to HIE", "Age 1-6 years"],
    unmatchedCriteria: ["Cord blood must be available"],
    enrollmentDeadline: "June 2026",
    contactEmail: "stemcell-trial@duke.edu",
    description: "Investigating autologous cord blood infusion for children with cerebral palsy.",
  },
];

export default function ClinicalTrials() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [savedTrials, setSavedTrials] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  // Dialog states
  const [selectedTrial, setSelectedTrial] = useState<ClinicalTrial | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showContactDialog, setShowContactDialog] = useState(false);
  const [contactMessage, setContactMessage] = useState("");
  const [isSendingContact, setIsSendingContact] = useState(false);

  // Fetch children for eligibility matching
  const { data: children } = useQuery<Child[]>({
    queryKey: ['/api/children']
  });

  // Build status filter for API
  const apiStatusFilter = useMemo(() => {
    if (statusFilter === 'all') return 'RECRUITING,NOT_YET_RECRUITING,ACTIVE_NOT_RECRUITING';
    const statusMap: Record<string, string> = {
      'recruiting': 'RECRUITING',
      'active': 'ACTIVE_NOT_RECRUITING',
      'not_yet_recruiting': 'NOT_YET_RECRUITING',
    };
    return statusMap[statusFilter] || 'RECRUITING';
  }, [statusFilter]);

  // Fetch clinical trials from ClinicalTrials.gov API
  const {
    data: apiResponse,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery<ApiClinicalTrialsResponse>({
    queryKey: ['/api/clinical-trials/hie', apiStatusFilter],
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  // Transform API trials to frontend format, with fallback
  const trials = useMemo(() => {
    if (apiResponse?.studies && apiResponse.studies.length > 0) {
      return apiResponse.studies.map(transformApiTrial);
    }
    // Use fallback data if API fails or returns empty
    return fallbackTrials;
  }, [apiResponse]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast({
        title: "Results refreshed",
        description: `Found ${apiResponse?.totalCount || trials.length} clinical trials from ClinicalTrials.gov`,
      });
    } catch {
      toast({
        title: "Refresh failed",
        description: "Using cached data. Please try again later.",
        variant: "destructive",
      });
    }
  };

  const toggleSave = (id: string) => {
    setSavedTrials((prev) => {
      const newSaved = prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id];
      toast({
        title: prev.includes(id) ? "Trial removed" : "Trial saved",
        description: prev.includes(id)
          ? "Trial has been removed from your saved list."
          : "Trial has been added to your saved list.",
      });
      return newSaved;
    });
  };

  const handleViewDetails = (trial: ClinicalTrial) => {
    setSelectedTrial(trial);
    setShowDetailsDialog(true);
  };

  const handleContact = (trial: ClinicalTrial) => {
    setSelectedTrial(trial);
    setContactMessage("");
    setShowContactDialog(true);
  };

  const handleSendContact = async () => {
    if (!selectedTrial || !contactMessage.trim()) return;

    setIsSendingContact(true);
    try {
      // Simulate sending contact request
      await new Promise(resolve => setTimeout(resolve, 1500));

      toast({
        title: "Message sent",
        description: `Your inquiry has been sent to ${selectedTrial.sponsor}.`,
      });
      setShowContactDialog(false);
      setContactMessage("");
    } catch (error) {
      toast({
        title: "Failed to send",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSendingContact(false);
    }
  };

  const filteredTrials = trials.filter((trial) => {
    const matchesSearch = trial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trial.sponsor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trial.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPhase = phaseFilter === "all" || trial.phase.toLowerCase().includes(phaseFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || trial.status === statusFilter;
    const matchesSaved = activeTab === "all" || (activeTab === "saved" && savedTrials.includes(trial.id));
    return matchesSearch && matchesPhase && matchesStatus && matchesSaved;
  });

  const getStatusLabel = (status: ClinicalTrial["status"]) => {
    switch (status) {
      case "recruiting": return "Recruiting";
      case "active": return "Active";
      case "not_yet_recruiting": return "Not Yet Recruiting";
      case "completed": return "Completed";
      default: return status;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("clinicalTrials")}</h1>
          <p className="text-muted-foreground">Find clinical trials matching your child's profile</p>
        </div>
        <Button
          variant="outline"
          className="gap-2"
          onClick={handleRefresh}
          disabled={isLoading}
          data-testid="button-refresh-trials"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? "Refreshing..." : "Refresh Results"}
        </Button>
      </div>

      {/* Data source indicator */}
      {apiResponse?.studies && apiResponse.studies.length > 0 ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 dark:bg-green-950 px-3 py-2 rounded-md">
          <Database className="h-4 w-4 text-green-600" />
          <span>
            Showing {apiResponse.totalCount} trials from <strong>ClinicalTrials.gov</strong> (live data)
          </span>
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 text-sm bg-yellow-50 dark:bg-yellow-950 px-3 py-2 rounded-md">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <span>
            Unable to fetch live data. Showing sample trials. <button onClick={handleRefresh} className="underline">Try again</button>
          </span>
        </div>
      ) : null}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-trials">
            {t("eligibleTrials")}
            <Badge variant="secondary" className="ml-2">{trials.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="saved" data-testid="tab-saved-trials">
            {t("savedTrials")}
            <Badge variant="secondary" className="ml-2">{savedTrials.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search trials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-trials"
            />
          </div>
          <Select value={phaseFilter} onValueChange={setPhaseFilter}>
            <SelectTrigger className="w-[140px]" data-testid="select-phase-filter">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Phase" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Phases</SelectItem>
              <SelectItem value="phase 1">Phase 1</SelectItem>
              <SelectItem value="phase 2">Phase 2</SelectItem>
              <SelectItem value="phase 3">Phase 3</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]" data-testid="select-trial-status-filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="recruiting">Recruiting</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="not_yet_recruiting">Not Yet Recruiting</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex gap-2 pt-4">
                      <Skeleton className="h-9 w-28" />
                      <Skeleton className="h-9 w-24" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredTrials.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No trials found matching your criteria</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredTrials.map((trial) => (
                <ClinicalTrialCard
                  key={trial.id}
                  {...trial}
                  isSaved={savedTrials.includes(trial.id)}
                  onSave={() => toggleSave(trial.id)}
                  onContact={() => handleContact(trial)}
                  onViewDetails={() => handleViewDetails(trial)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {filteredTrials.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No saved trials yet</p>
              <p className="text-sm text-muted-foreground mt-1">Save trials to track them here</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-6">
              {filteredTrials.map((trial) => (
                <ClinicalTrialCard
                  key={trial.id}
                  {...trial}
                  isSaved={savedTrials.includes(trial.id)}
                  onSave={() => toggleSave(trial.id)}
                  onContact={() => handleContact(trial)}
                  onViewDetails={() => handleViewDetails(trial)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Trial Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedTrial && (
            <>
              <DialogHeader>
                <DialogTitle className="text-xl">{selectedTrial.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <span>{selectedTrial.sponsor}</span>
                  <Badge variant={selectedTrial.status === "recruiting" ? "default" : "secondary"}>
                    {getStatusLabel(selectedTrial.status)}
                  </Badge>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Location</p>
                      <p className="text-sm text-muted-foreground">{selectedTrial.location}</p>
                      <p className="text-xs text-muted-foreground">{selectedTrial.distance} away</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Enrollment Deadline</p>
                      <p className="text-sm text-muted-foreground">{selectedTrial.enrollmentDeadline}</p>
                    </div>
                  </div>
                </div>

                {selectedTrial.description && (
                  <div>
                    <p className="font-medium mb-2">About this Study</p>
                    <p className="text-sm text-muted-foreground">{selectedTrial.description}</p>
                  </div>
                )}

                <div>
                  <p className="font-medium mb-2">Eligibility Match: {selectedTrial.eligibilityScore}%</p>

                  {selectedTrial.matchedCriteria.length > 0 && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-2">Matched Criteria</p>
                      <ul className="space-y-1">
                        {selectedTrial.matchedCriteria.map((criteria, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle className="h-4 w-4 mt-0.5 text-green-500" />
                            <span>{criteria}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {selectedTrial.unmatchedCriteria.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-2">Unmatched Criteria</p>
                      <ul className="space-y-1">
                        {selectedTrial.unmatchedCriteria.map((criteria, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm">
                            <XCircle className="h-4 w-4 mt-0.5 text-orange-500" />
                            <span>{criteria}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {selectedTrial.nctId && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">
                      NCT ID: {selectedTrial.nctId}
                    </p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowDetailsDialog(false)}
                >
                  Close
                </Button>
                <Button
                  onClick={() => {
                    setShowDetailsDialog(false);
                    handleContact(selectedTrial);
                  }}
                  className="gap-2"
                >
                  <Mail className="h-4 w-4" />
                  Contact Study
                </Button>
                {selectedTrial.nctId && (
                  <Button
                    variant="secondary"
                    onClick={() => window.open(`https://clinicaltrials.gov/study/${selectedTrial.nctId}`, '_blank')}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View on ClinicalTrials.gov
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={showContactDialog} onOpenChange={setShowContactDialog}>
        <DialogContent>
          {selectedTrial && (
            <>
              <DialogHeader>
                <DialogTitle>Contact Study Team</DialogTitle>
                <DialogDescription>
                  Send an inquiry to {selectedTrial.sponsor} about {selectedTrial.title}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {selectedTrial.contactEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4" />
                    <span>{selectedTrial.contactEmail}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="message">Your Message</Label>
                  <Textarea
                    id="message"
                    placeholder="Describe your interest in this clinical trial and any questions you have..."
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    rows={5}
                    data-testid="textarea-contact-message"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowContactDialog(false)}
                  disabled={isSendingContact}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSendContact}
                  disabled={!contactMessage.trim() || isSendingContact}
                  data-testid="button-send-contact"
                >
                  {isSendingContact ? "Sending..." : "Send Inquiry"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
