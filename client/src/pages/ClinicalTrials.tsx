import { useState } from "react";
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
import { Search, Filter, RefreshCw, ExternalLink, Mail, MapPin, Calendar, CheckCircle, XCircle } from "lucide-react";
import { ClinicalTrialCard } from "@/components/dashboard/ClinicalTrialCard";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import type { Child } from "@shared/schema";

// Clinical trial type definition
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

// Initial trials data - will be replaced by API data when available
const initialTrials: ClinicalTrial[] = [
  {
    id: "1",
    title: "Erythropoietin for Neuroprotection in Neonatal HIE",
    sponsor: "National Institutes of Health",
    status: "recruiting",
    phase: "Phase 2",
    location: "Boston Children's Hospital, USA",
    distance: "8,500 km",
    eligibilityScore: 85,
    matchedCriteria: [
      "Age 0-3 years with HIE diagnosis",
      "GMFCS Level I-III",
      "No active seizures in past 30 days",
    ],
    unmatchedCriteria: [
      "Must be able to travel to study site",
    ],
    enrollmentDeadline: "March 2026",
    contactEmail: "hie-study@nih.gov",
    description: "This study evaluates the neuroprotective effects of erythropoietin in infants with hypoxic-ischemic encephalopathy.",
    nctId: "NCT04567890",
  },
  {
    id: "2",
    title: "Stem Cell Therapy for Pediatric Cerebral Palsy",
    sponsor: "Duke University Medical Center",
    status: "recruiting",
    phase: "Phase 1/2",
    location: "Durham, NC, USA",
    distance: "9,200 km",
    eligibilityScore: 72,
    matchedCriteria: [
      "Diagnosis of CP secondary to HIE",
      "Age 1-6 years",
    ],
    unmatchedCriteria: [
      "Cord blood must be available",
      "No prior stem cell therapy",
    ],
    enrollmentDeadline: "June 2026",
    contactEmail: "stemcell-trial@duke.edu",
    description: "Investigating the safety and efficacy of autologous cord blood infusion for children with cerebral palsy.",
    nctId: "NCT04567891",
  },
  {
    id: "3",
    title: "Intensive Physiotherapy for Motor Development",
    sponsor: "European HIE Consortium",
    status: "active",
    phase: "Phase 3",
    location: "Berlin, Germany",
    distance: "2,100 km",
    eligibilityScore: 92,
    matchedCriteria: [
      "HIE diagnosis with motor impairment",
      "Age 1-4 years",
      "GMFCS Level II-IV",
      "Able to attend daily sessions for 4 weeks",
    ],
    unmatchedCriteria: [],
    enrollmentDeadline: "January 2026",
    contactEmail: "physio-study@hie-consortium.eu",
    description: "A randomized controlled trial comparing intensive physiotherapy protocols for motor development in children with HIE.",
    nctId: "NCT04567892",
  },
  {
    id: "4",
    title: "Pharmacological Study of Melatonin in HIE",
    sponsor: "University of Barcelona",
    status: "not_yet_recruiting",
    phase: "Phase 2",
    location: "Barcelona, Spain",
    distance: "3,400 km",
    eligibilityScore: 78,
    matchedCriteria: [
      "Moderate to severe HIE",
      "Age 6 months - 2 years",
    ],
    unmatchedCriteria: [
      "No current anticonvulsant medication",
    ],
    enrollmentDeadline: "September 2026",
    contactEmail: "melatonin-hie@ub.edu",
    description: "Evaluating the potential of melatonin as an adjunct therapy for infants with hypoxic-ischemic encephalopathy.",
    nctId: "NCT04567893",
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

  // Future API integration: Replace initialTrials with API data
  // const { data: trials, isLoading, refetch } = useQuery<ClinicalTrial[]>({
  //   queryKey: ['/api/clinical-trials'],
  // });

  // For now, use initial data with simulated loading
  const [trials, setTrials] = useState<ClinicalTrial[]>(initialTrials);
  const [isLoading, setIsLoading] = useState(false);

  const refetch = async () => {
    setIsLoading(true);
    // Simulate API call - replace with actual API call when available
    await new Promise(resolve => setTimeout(resolve, 1000));
    setTrials(initialTrials);
    setIsLoading(false);
    toast({
      title: "Results refreshed",
      description: "Clinical trial data has been updated.",
    });
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
          onClick={() => refetch()}
          disabled={isLoading}
          data-testid="button-refresh-trials"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? "Refreshing..." : "Refresh Results"}
        </Button>
      </div>

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
