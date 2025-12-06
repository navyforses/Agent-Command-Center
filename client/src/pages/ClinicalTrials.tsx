import { useState } from "react";
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
import { Search, Filter, RefreshCw } from "lucide-react";
import { ClinicalTrialCard } from "@/components/dashboard/ClinicalTrialCard";
import { useLanguage } from "@/contexts/LanguageContext";

// todo: remove mock functionality
const mockTrials = [
  {
    id: "1",
    title: "Erythropoietin for Neuroprotection in Neonatal HIE",
    sponsor: "National Institutes of Health",
    status: "recruiting" as const,
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
  },
  {
    id: "2",
    title: "Stem Cell Therapy for Pediatric Cerebral Palsy",
    sponsor: "Duke University Medical Center",
    status: "recruiting" as const,
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
  },
  {
    id: "3",
    title: "Intensive Physiotherapy for Motor Development",
    sponsor: "European HIE Consortium",
    status: "active" as const,
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
  },
  {
    id: "4",
    title: "Pharmacological Study of Melatonin in HIE",
    sponsor: "University of Barcelona",
    status: "not_yet_recruiting" as const,
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
  },
];

export default function ClinicalTrials() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [phaseFilter, setPhaseFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [savedTrials, setSavedTrials] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  const toggleSave = (id: string) => {
    setSavedTrials((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const filteredTrials = mockTrials.filter((trial) => {
    const matchesSearch = trial.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trial.sponsor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trial.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPhase = phaseFilter === "all" || trial.phase.toLowerCase().includes(phaseFilter.toLowerCase());
    const matchesStatus = statusFilter === "all" || trial.status === statusFilter;
    const matchesSaved = activeTab === "all" || (activeTab === "saved" && savedTrials.includes(trial.id));
    return matchesSearch && matchesPhase && matchesStatus && matchesSaved;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("clinicalTrials")}</h1>
          <p className="text-muted-foreground">Find clinical trials matching your child's profile</p>
        </div>
        <Button variant="outline" className="gap-2" data-testid="button-refresh-trials">
          <RefreshCw className="h-4 w-4" />
          Refresh Results
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all-trials">
            {t("eligibleTrials")}
            <Badge variant="secondary" className="ml-2">{mockTrials.length}</Badge>
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
          {filteredTrials.length === 0 ? (
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
                  onContact={() => console.log("Contact trial:", trial.id)}
                  onViewDetails={() => console.log("View trial:", trial.id)}
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
                  onContact={() => console.log("Contact trial:", trial.id)}
                  onViewDetails={() => console.log("View trial:", trial.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
