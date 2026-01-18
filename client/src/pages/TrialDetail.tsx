import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  FlaskConical,
  MapPin,
  Calendar,
  Users,
  Building,
  ExternalLink,
  ArrowLeft,
  Languages,
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  Globe,
  FileText,
  Target,
  Shield,
  Bookmark,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import type { ClinicalTrial, TrialTranslation } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";

const languages = [
  { code: "ka", name: "ქართული", nameEn: "Georgian" },
  { code: "en", name: "English", nameEn: "English" },
  { code: "es", name: "Español", nameEn: "Spanish" },
  { code: "fr", name: "Français", nameEn: "French" },
  { code: "de", name: "Deutsch", nameEn: "German" },
  { code: "ru", name: "Русский", nameEn: "Russian" },
  { code: "uk", name: "Українська", nameEn: "Ukrainian" },
  { code: "zh", name: "中文", nameEn: "Chinese" },
  { code: "ja", name: "日本語", nameEn: "Japanese" },
  { code: "ar", name: "العربية", nameEn: "Arabic" },
  { code: "hi", name: "हिन्दी", nameEn: "Hindi" },
  { code: "pt", name: "Português", nameEn: "Portuguese" },
];

interface TrialWithTranslation extends ClinicalTrial {
  translation?: TrialTranslation;
}

export default function TrialDetail() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const trialId = params.id;
  
  const [selectedLanguage, setSelectedLanguage] = useState(language === "ka" ? "ka" : "en");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: trial, isLoading } = useQuery<TrialWithTranslation>({
    queryKey: ["/api/trials", trialId, selectedLanguage],
    queryFn: async () => {
      const res = await fetch(`/api/trials/${trialId}?lang=${selectedLanguage}`);
      if (!res.ok) throw new Error("Failed to fetch trial");
      return res.json();
    },
    enabled: !!trialId,
  });

  const translateMutation = useMutation({
    mutationFn: async (targetLang: string) => {
      const res = await apiRequest("POST", "/api/translate", {
        trialId: trial?.id,
        targetLanguage: targetLang,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trials", trialId] });
    },
  });

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    if (lang !== "en" && trial?.id) {
      translateMutation.mutate(lang);
    }
  };

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

  const getStatusIcon = (status: string | null) => {
    switch (status?.toLowerCase()) {
      case "recruiting":
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case "active":
        return <Clock className="h-4 w-4 text-blue-600" />;
      case "completed":
        return <CheckCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  const displayTitle = trial?.translation?.titleTranslated || trial?.titleEn || "";
  const displaySummary = trial?.translation?.summaryTranslated || trial?.briefSummaryEn || "";
  const displayEligibility = trial?.translation?.eligibilityTranslated || trial?.eligibilityCriteriaEn || "";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-8 w-32" />
          </div>
        </header>
        <div className="container mx-auto px-4 py-6">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-10 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/4 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!trial) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h2 className="mb-2 text-xl font-semibold">
              {language === "ka" ? "კვლევა ვერ მოიძებნა" : "Trial Not Found"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {language === "ka"
                ? "მოთხოვნილი კვლევა ვერ მოიძებნა"
                : "The requested trial could not be found"}
            </p>
            <Button onClick={() => setLocation("/search")} data-testid="button-back-to-search">
              {language === "ka" ? "ძიებაზე დაბრუნება" : "Back to Search"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.history.back()}
          className="mb-4"
          data-testid="button-back"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {language === "ka" ? "უკან" : "Back"}
        </Button>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {trial.nctNumber && (
                  <Badge variant="outline" className="text-sm">
                    {trial.nctNumber}
                  </Badge>
                )}
                {trial.status && (
                  <Badge className={getStatusColor(trial.status)}>
                    {getStatusIcon(trial.status)}
                    <span className="ml-1">{trial.status}</span>
                  </Badge>
                )}
                {trial.phase && (
                  <Badge variant="secondary">
                    {trial.phase}
                  </Badge>
                )}
              </div>
              <h1 className="text-2xl font-bold md:text-3xl mb-4" data-testid="text-trial-title">
                {displayTitle}
              </h1>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Languages className="h-4 w-4" />
                  {language === "ka" ? "ენის არჩევა" : "Select Language"}
                </CardTitle>
                <Select value={selectedLanguage} onValueChange={handleLanguageChange}>
                  <SelectTrigger className="w-40" data-testid="select-language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.code} value={lang.code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardHeader>
              {translateMutation.isPending && (
                <CardContent className="pt-0 pb-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {language === "ka" ? "თარგმნის..." : "Translating..."}
                  </div>
                </CardContent>
              )}
              {trial.translation && (
                <CardContent className="pt-0 pb-3">
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    {language === "ka" ? "თარგმნილია AI-ით" : "Translated by AI"}
                  </div>
                </CardContent>
              )}
            </Card>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start">
                <TabsTrigger value="overview" data-testid="tab-overview">
                  {language === "ka" ? "მიმოხილვა" : "Overview"}
                </TabsTrigger>
                <TabsTrigger value="eligibility" data-testid="tab-eligibility">
                  {language === "ka" ? "ჩართვის კრიტერიუმები" : "Eligibility"}
                </TabsTrigger>
                <TabsTrigger value="locations" data-testid="tab-locations">
                  {language === "ka" ? "მდებარეობები" : "Locations"}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-3">
                      {language === "ka" ? "კვლევის აღწერა" : "Study Description"}
                    </h3>
                    <p className="text-muted-foreground whitespace-pre-wrap" data-testid="text-trial-summary">
                      {displaySummary}
                    </p>

                    {trial.conditions && trial.conditions.length > 0 && (
                      <>
                        <Separator className="my-6" />
                        <h3 className="font-semibold mb-3">
                          {language === "ka" ? "მდგომარეობები" : "Conditions"}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {trial.conditions.map((condition, i) => (
                            <Badge key={i} variant="outline">
                              {condition}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}

                    {trial.interventions && trial.interventions.length > 0 && (
                      <>
                        <Separator className="my-6" />
                        <h3 className="font-semibold mb-3">
                          {language === "ka" ? "ინტერვენციები" : "Interventions"}
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {trial.interventions.map((intervention, i) => (
                            <Badge key={i} variant="secondary">
                              {intervention.type}: {intervention.name}
                            </Badge>
                          ))}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="eligibility" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Target className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">
                        {language === "ka" ? "ჩართვის კრიტერიუმები" : "Eligibility Criteria"}
                      </h3>
                    </div>
                    {displayEligibility ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground bg-muted/50 p-4 rounded-md">
                          {displayEligibility}
                        </pre>
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {language === "ka"
                          ? "ჩართვის კრიტერიუმები არ არის მითითებული"
                          : "Eligibility criteria not specified"}
                      </p>
                    )}

                    <Separator className="my-6" />

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <Label className="text-muted-foreground">
                          {language === "ka" ? "ასაკი" : "Age"}
                        </Label>
                        <p className="font-medium">
                          {trial.minAge && trial.maxAge
                            ? `${trial.minAge} - ${trial.maxAge}`
                            : trial.minAge
                            ? `${trial.minAge}+`
                            : trial.maxAge
                            ? `Up to ${trial.maxAge}`
                            : language === "ka"
                            ? "არ არის მითითებული"
                            : "Not specified"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-muted-foreground">
                          {language === "ka" ? "სქესი" : "Sex"}
                        </Label>
                        <p className="font-medium">
                          {trial.gender || (language === "ka" ? "ყველა" : "All")}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="locations" className="mt-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold">
                        {language === "ka" ? "კვლევის ადგილები" : "Study Locations"}
                      </h3>
                    </div>
                    {trial.locations && trial.locations.length > 0 ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        {trial.locations.map((location, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 p-3 rounded-md bg-muted/50"
                          >
                            <Globe className="h-4 w-4 mt-0.5 text-muted-foreground" />
                            <div className="text-sm">
                              <div className="font-medium">{location.facility}</div>
                              <div className="text-muted-foreground">{location.city}, {location.country}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">
                        {language === "ka"
                          ? "მდებარეობები არ არის მითითებული"
                          : "Locations not specified"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {language === "ka" ? "კვლევის დეტალები" : "Study Details"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {trial.sponsorName && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Building className="h-3 w-3" />
                      {language === "ka" ? "სპონსორი" : "Sponsor"}
                    </Label>
                    <p className="font-medium text-sm">{trial.sponsorName}</p>
                  </div>
                )}

                {trial.startDate && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {language === "ka" ? "დაწყების თარიღი" : "Start Date"}
                    </Label>
                    <p className="font-medium text-sm">
                      {new Date(trial.startDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {trial.completionDate && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {language === "ka" ? "დასრულების თარიღი" : "Completion Date"}
                    </Label>
                    <p className="font-medium text-sm">
                      {new Date(trial.completionDate).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {trial.studyType && (
                  <div>
                    <Label className="text-muted-foreground flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {language === "ka" ? "კვლევის ტიპი" : "Study Type"}
                    </Label>
                    <p className="font-medium text-sm">{trial.studyType}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {trial.nctNumber && (
              <Card>
                <CardContent className="pt-6">
                  <Button
                    className="w-full"
                    onClick={() => window.open(`https://clinicaltrials.gov/study/${trial.nctNumber}`, "_blank")}
                    data-testid="button-view-source"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    {language === "ka" ? "ორიგინალის ნახვა" : "View Original"}
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">
                    {language === "ka" ? "მნიშვნელოვანი" : "Important"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {language === "ka"
                    ? "ამ ინფორმაციის გამოყენებამდე კონსულტაცია გაიარეთ თქვენს ექიმთან. AI თარგმანი შეიძლება შეიცავდეს უზუსტობებს."
                    : "Consult with your healthcare provider before acting on this information. AI translations may contain inaccuracies."}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`text-xs mb-1 ${className || ""}`} {...props}>
      {children}
    </div>
  );
}
