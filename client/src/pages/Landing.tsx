import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Globe,
  Languages,
  Database,
  Brain,
  Shield,
  ArrowRight,
  Sparkles,
  FlaskConical,
  Users,
  BarChart3,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useLocation } from "wouter";

const registries = [
  { name: "ClinicalTrials.gov", country: "USA", trials: "450K+" },
  { name: "EU Clinical Trials Register", country: "Europe", trials: "45K+" },
  { name: "WHO ICTRP", country: "Global", trials: "800K+" },
  { name: "ISRCTN", country: "UK", trials: "25K+" },
  { name: "ANZCTR", country: "Australia", trials: "20K+" },
  { name: "Chinese CTR", country: "China", trials: "120K+" },
  { name: "JPRN", country: "Japan", trials: "35K+" },
  { name: "CTRI", country: "India", trials: "50K+" },
  { name: "DRKS", country: "Germany", trials: "15K+" },
  { name: "IRCT", country: "Iran", trials: "65K+" },
];

const features = [
  {
    icon: Database,
    title: "10+ International Registries",
    titleKa: "10+ საერთაშორისო რეესტრი",
    description: "Search across ClinicalTrials.gov, EU CTR, WHO ICTRP, and more from one unified platform",
    descriptionKa: "მოძებნეთ ClinicalTrials.gov, EU CTR, WHO ICTRP და სხვა პლატფორმებზე ერთი ინტერფეისით",
  },
  {
    icon: Languages,
    title: "40+ Language Translations",
    titleKa: "40+ ენაზე თარგმანი",
    description: "AI-powered translations including Georgian, Ukrainian, and other underserved languages",
    descriptionKa: "AI თარგმანები ქართულ, უკრაინულ და სხვა ენებზე",
  },
  {
    icon: Brain,
    title: "Intelligent Matching",
    titleKa: "ინტელექტუალური შესაბამება",
    description: "PROMETHEUS AI analyzes your criteria and matches you with relevant trials worldwide",
    descriptionKa: "PROMETHEUS AI აანალიზებს თქვენს კრიტერიუმებს და პოულობს შესაბამის კვლევებს",
  },
  {
    icon: BarChart3,
    title: "Real-time Data",
    titleKa: "რეალ-დროის მონაცემები",
    description: "Live synchronization with global registries ensures you see the latest trials",
    descriptionKa: "სინქრონიზაცია გლობალურ რეესტრებთან უზრუნველყოფს უახლეს მონაცემებს",
  },
  {
    icon: Shield,
    title: "Trusted Sources",
    titleKa: "სანდო წყაროები",
    description: "All data comes directly from official government and institutional registries",
    descriptionKa: "ყველა მონაცემი მოდის ოფიციალური სამთავრობო და ინსტიტუციური რეესტრებიდან",
  },
  {
    icon: Users,
    title: "Patient-Centric",
    titleKa: "პაციენტზე ორიენტირებული",
    description: "Designed for patients and caregivers seeking clinical trial opportunities",
    descriptionKa: "შექმნილია პაციენტებისა და მზრუნველებისთვის, რომლებიც ეძებენ კლინიკურ კვლევებს",
  },
];

const stats = [
  { value: "1M+", label: "Clinical Trials", labelKa: "კლინიკური კვლევა" },
  { value: "190+", label: "Countries", labelKa: "ქვეყანა" },
  { value: "40+", label: "Languages", labelKa: "ენა" },
  { value: "10+", label: "Registries", labelKa: "რეესტრი" },
];

export default function Landing() {
  const { language, t } = useLanguage();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 gap-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Trial Navigator</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {language === "ka" ? "ფუნქციები" : "Features"}
            </a>
            <a href="#registries" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              {language === "ka" ? "რეესტრები" : "Registries"}
            </a>
            <a href="/evolution" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              PROMETHEUS
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Button variant="default" onClick={() => setLocation("/dashboard")} data-testid="button-dashboard">
              {language === "ka" ? "პანელი" : "Dashboard"}
            </Button>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden py-20 md:py-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container relative mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6">
            <Sparkles className="mr-1 h-3 w-3" />
            {language === "ka" ? "AI-ით გაძლიერებული კვლევა" : "AI-Powered Research"}
          </Badge>
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            {language === "ka" ? (
              <>
                იპოვეთ კლინიკური კვლევები
                <br />
                <span className="text-primary">მსოფლიოს მასშტაბით</span>
              </>
            ) : (
              <>
                Find Clinical Trials
                <br />
                <span className="text-primary">Across the Globe</span>
              </>
            )}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-muted-foreground md:text-xl">
            {language === "ka"
              ? "მოძებნეთ 1 მილიონზე მეტ კლინიკურ კვლევაზე 10+ საერთაშორისო რეესტრიდან. AI თარგმანი 40+ ენაზე, მათ შორის ქართულზე."
              : "Search over 1 million clinical trials from 10+ international registries. AI translation in 40+ languages, including Georgian and other underserved languages."}
          </p>

          <form onSubmit={handleSearch} className="mx-auto mb-8 flex max-w-xl flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder={language === "ka" ? "მოძებნეთ დაავადება, მკურნალობა, მდებარეობა..." : "Search condition, treatment, location..."}
                className="h-12 pl-10 text-base"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <Button type="submit" size="lg" className="h-12" data-testid="button-search">
              {language === "ka" ? "ძიება" : "Search Trials"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{language === "ka" ? "პოპულარული:" : "Popular:"}</span>
            {["Alzheimer's", "Cancer", "Diabetes", "Heart Disease", "COVID-19"].map((term) => (
              <Button
                key={term}
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => {
                  setSearchQuery(term);
                  setLocation(`/search?q=${encodeURIComponent(term)}`);
                }}
                data-testid={`button-popular-${term.toLowerCase().replace(/[^a-z0-9]/g, '')}`}
              >
                {term}
              </Button>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-primary md:text-4xl">{stat.value}</div>
                <div className="text-sm text-muted-foreground">
                  {language === "ka" ? stat.labelKa : stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              {language === "ka" ? "რატომ Trial Navigator?" : "Why Trial Navigator?"}
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {language === "ka"
                ? "ერთიანი პლატფორმა კლინიკური კვლევების მოსაძებნად მსოფლიოს ყველა კუთხიდან"
                : "One unified platform to search clinical trials from every corner of the world"}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} className="hover-elevate">
                <CardContent className="p-6">
                  <feature.icon className="mb-4 h-10 w-10 text-primary" />
                  <h3 className="mb-2 text-lg font-semibold">
                    {language === "ka" ? feature.titleKa : feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {language === "ka" ? feature.descriptionKa : feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y bg-primary/5 py-20">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2 md:items-center">
            <div>
              <Badge variant="outline" className="mb-4">
                <Languages className="mr-1 h-3 w-3" />
                {language === "ka" ? "მრავალენოვანი" : "Multilingual"}
              </Badge>
              <h2 className="mb-4 text-3xl font-bold">
                {language === "ka"
                  ? "კლინიკური კვლევები თქვენს ენაზე"
                  : "Clinical Trials in Your Language"}
              </h2>
              <p className="mb-6 text-muted-foreground">
                {language === "ka"
                  ? "ჩვენი AI თარგმანი აქცევს რთულ სამედიცინო ინფორმაციას გასაგებ ენაზე. მხარდაჭერილია 40+ ენა, მათ შორის ქართული, უკრაინული, და სხვა იშვიათი ენები."
                  : "Our AI translation makes complex medical information accessible in your language. Support for 40+ languages including Georgian, Ukrainian, and other underserved languages."}
              </p>
              <div className="flex flex-wrap gap-2">
                {["ქართული", "English", "Español", "Français", "Deutsch", "日本語", "中文", "العربية", "हिन्दी", "Português"].map((lang) => (
                  <Badge key={lang} variant="secondary">{lang}</Badge>
                ))}
                <Badge variant="outline">+30 more</Badge>
              </div>
            </div>
            <div className="relative">
              <Card className="p-6">
                <div className="mb-4 flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  <span className="font-medium">
                    {language === "ka" ? "თარგმანის მაგალითი" : "Translation Example"}
                  </span>
                </div>
                <div className="space-y-4">
                  <div className="rounded-md bg-muted p-3">
                    <div className="text-xs text-muted-foreground mb-1">Original (English)</div>
                    <p className="text-sm">
                      A randomized, double-blind, placebo-controlled study to evaluate the efficacy and safety of drug X in patients with type 2 diabetes.
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Zap className="h-4 w-4 text-primary animate-pulse" />
                  </div>
                  <div className="rounded-md bg-primary/10 p-3 border border-primary/20">
                    <div className="text-xs text-muted-foreground mb-1">ქართული (Georgian)</div>
                    <p className="text-sm">
                      რანდომიზებული, ორმაგი ბრმა, პლაცებო-კონტროლირებადი კვლევა მე-2 ტიპის დიაბეტის მქონე პაციენტებში X პრეპარატის ეფექტურობისა და უსაფრთხოების შესაფასებლად.
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section id="registries" className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">
              {language === "ka" ? "საერთაშორისო რეესტრები" : "International Registries"}
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              {language === "ka"
                ? "მოძებნეთ ყველა ძირითად კლინიკური კვლევების რეესტრში ერთდროულად"
                : "Search all major clinical trial registries simultaneously"}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            {registries.map((registry) => (
              <Card key={registry.name} className="text-center hover-elevate">
                <CardContent className="p-4">
                  <Database className="mx-auto mb-2 h-8 w-8 text-primary/60" />
                  <div className="font-medium text-sm">{registry.name}</div>
                  <div className="text-xs text-muted-foreground">{registry.country}</div>
                  <Badge variant="secondary" className="mt-2 text-xs">
                    {registry.trials} trials
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t bg-muted/30 py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mx-auto max-w-2xl">
            <Brain className="mx-auto mb-6 h-16 w-16 text-primary" />
            <h2 className="mb-4 text-3xl font-bold">
              {language === "ka" ? "PROMETHEUS-MIND" : "PROMETHEUS-MIND"}
            </h2>
            <p className="mb-6 text-muted-foreground">
              {language === "ka"
                ? "ჩვენი კოგნიტური ევოლუციის სისტემა სწავლობს და იხვეწება თქვენს საჭიროებებზე. PROMETHEUS აანალიზებს კლინიკური კვლევების მონაცემებს და გაძლევთ პერსონალიზებულ შეხედულებებს."
                : "Our cognitive evolution system learns and improves based on your needs. PROMETHEUS analyzes clinical trial data and provides personalized insights."}
            </p>
            <Button onClick={() => setLocation("/evolution")} variant="outline" data-testid="button-prometheus">
              {language === "ka" ? "გაიგეთ მეტი" : "Learn More"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-4 text-3xl font-bold">
            {language === "ka" ? "მზად ხართ დასაწყებად?" : "Ready to Get Started?"}
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-muted-foreground">
            {language === "ka"
              ? "დაიწყეთ კლინიკური კვლევების ძიება უფასოდ. რეგისტრაცია არ არის საჭირო."
              : "Start searching clinical trials for free. No registration required."}
          </p>
          <form onSubmit={handleSearch} className="mx-auto flex max-w-md flex-col gap-2 sm:flex-row">
            <Input
              type="text"
              placeholder={language === "ka" ? "შეიყვანეთ დაავადება ან მკურნალობა" : "Enter a condition or treatment"}
              className="h-12"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-bottom"
            />
            <Button type="submit" size="lg" className="h-12" data-testid="button-search-bottom">
              <Search className="mr-2 h-4 w-4" />
              {language === "ka" ? "ძიება" : "Search"}
            </Button>
          </form>
        </div>
      </section>

      <footer className="border-t py-8">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row">
          <div className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            <span className="font-semibold">Trial Navigator</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {language === "ka"
              ? "© 2026 Trial Navigator. ყველა უფლება დაცულია."
              : "© 2026 Trial Navigator. All rights reserved."}
          </p>
          <div className="flex gap-4">
            <a href="/evolution" className="text-sm text-muted-foreground hover:text-foreground">
              PROMETHEUS
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              {language === "ka" ? "კონფიდენციალურობა" : "Privacy"}
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
              {language === "ka" ? "პირობები" : "Terms"}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
