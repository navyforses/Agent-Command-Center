import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  FileText,
  Brain,
  FlaskConical,
  Mail,
  Calendar,
  Shield,
  Globe,
  ArrowRight,
  CheckCircle,
  Star,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { useQuery } from "@tanstack/react-query";
import type { Testimonial, EvolutionReport, AccumulatedKnowledge } from "@shared/schema";
import { format, parseISO } from "date-fns";

const features = [
  {
    icon: FileText,
    title: "Smart Document Management",
    titleKa: "დოკუმენტების მართვა",
    description: "Upload and organize medical records with automatic OCR text extraction",
    descriptionKa: "სამედიცინო დოკუმენტების ატვირთვა და ორგანიზება OCR ტექნოლოგიით",
  },
  {
    icon: Brain,
    title: "AI-Powered Analysis",
    titleKa: "AI ანალიზი",
    description: "Get instant summaries of complex medical reports in plain language",
    descriptionKa: "მიიღეთ რთული სამედიცინო დოკუმენტების მარტივი შეჯამება",
  },
  {
    icon: FlaskConical,
    title: "Clinical Trial Matching",
    titleKa: "კლინიკური კვლევები",
    description: "Find and track clinical trials that match your child's condition",
    descriptionKa: "იპოვეთ შესაბამისი კლინიკური კვლევები თქვენი შვილისთვის",
  },
  {
    icon: Mail,
    title: "Email Drafting",
    titleKa: "ელ.ფოსტის შეტყობინებები",
    description: "AI-assisted professional emails to healthcare providers",
    descriptionKa: "AI-ით დაწერილი პროფესიონალური წერილები ექიმებისთვის",
  },
  {
    icon: Calendar,
    title: "Appointment Tracking",
    titleKa: "ვიზიტების თვალყურის დევნება",
    description: "Never miss a therapy session or medical appointment",
    descriptionKa: "არასდროს გამოტოვოთ თერაპია ან სამედიცინო ვიზიტი",
  },
  {
    icon: Globe,
    title: "Multilingual Support",
    titleKa: "მრავალენოვანი",
    description: "Full support for English and Georgian languages",
    descriptionKa: "სრული მხარდაჭერა ინგლისური და ქართული ენებისთვის",
  },
];

const fallbackTestimonials = [
  {
    id: 0,
    content: "This platform helped us understand our son's MRI results and find the right therapies.",
    contentKa: "ეს პლატფორმა დაგვეხმარა გვესმოდა ჩვენი შვილის MRI შედეგები.",
    authorName: "Nino M.",
    authorRole: "Parent of 2-year-old with HIE",
    authorRoleKa: "2 წლის HIE-ით დაავადებული ბავშვის დედა",
    rating: 5,
  },
  {
    id: 1,
    content: "The AI assistant saved us hours of research and helped us communicate with specialists abroad.",
    contentKa: "AI ასისტენტმა დაგვიზოგა საათობით კვლევა და დაგვეხმარა უცხოელ სპეციალისტებთან კომუნიკაციაში.",
    authorName: "Giorgi K.",
    authorRole: "Father of twins with HIE",
    authorRoleKa: "HIE-ით დაავადებული ტყუპების მამა",
    rating: 5,
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5" data-testid="star-rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

export default function Landing() {
  const { language, t } = useLanguage();
  
  const { data: testimonials = [] } = useQuery<Testimonial[]>({
    queryKey: ['/api/testimonials'],
  });

  // Evolution research data - visible to everyone
  const { data: evolutionReports } = useQuery<EvolutionReport[]>({
    queryKey: ["/api/evolution/reports"],
  });

  const { data: accumulatedKnowledge } = useQuery<AccumulatedKnowledge[]>({
    queryKey: ["/api/evolution/accumulated-knowledge"],
  });

  const displayTestimonials = testimonials.length > 0 ? testimonials : fallbackTestimonials;

  // Get latest research discovery for narrative display
  const latestReport = evolutionReports?.[0];
  const latestKnowledge = accumulatedKnowledge?.find(k => k.status === "active" || k.status === "validated");
  const hasResearchData = (evolutionReports && evolutionReports.length > 0) || (accumulatedKnowledge && accumulatedKnowledge.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-md">
              <Heart className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">HIE Command Center</span>
          </div>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <a href="/api/login">
              <Button data-testid="button-login">{t("login")}</Button>
            </a>
          </div>
        </div>
      </header>

      <main>
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <Badge variant="secondary" className="mb-4">
              <Shield className="h-3 w-3 mr-1" />
              {language === "en" ? "Secure & Private" : "უსაფრთხო და კონფიდენციალური"}
            </Badge>
            <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
              {language === "en"
                ? "Empower Your Child's Medical Journey"
                : "მართეთ თქვენი შვილის სამედიცინო გზა"}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {language === "en"
                ? "A comprehensive AI-powered platform designed for parents of children with Hypoxic-Ischemic Encephalopathy (HIE)"
                : "AI-ზე დაფუძნებული პლატფორმა HIE-ით დაავადებული ბავშვების მშობლებისთვის"}
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <a href="/api/login">
                <Button size="lg" className="gap-2" data-testid="button-get-started">
                  {t("getStarted")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
              <Button size="lg" variant="outline" data-testid="button-learn-more">
                {t("learnMore")}
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-accent/30">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              {language === "en" ? "Everything You Need in One Place" : "ყველაფერი ერთ ადგილას"}
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, i) => (
                <Card key={i} className="hover-elevate" data-testid={`feature-card-${i}`}>
                  <CardContent className="p-6">
                    <div className="p-3 bg-primary/10 rounded-md w-fit mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">
                      {language === "en" ? feature.title : feature.titleKa}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {language === "en" ? feature.description : feature.descriptionKa}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Research Results Section - Visible to Everyone */}
        {hasResearchData && (
          <section className="py-16 px-4">
            <div className="container mx-auto max-w-4xl">
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {language === "en" ? "Live Research" : "მიმდინარე კვლევა"}
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {language === "en" ? "Today's Discovery" : "დღის აღმოჩენა"}
                </h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  {language === "en"
                    ? "Our AI continuously researches the latest developments in HIE treatment and therapy"
                    : "ჩვენი AI მუდმივად იკვლევს HIE მკურნალობის უახლეს მიღწევებს"}
                </p>
              </div>

              <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-blue-500/5">
                <CardContent className="p-6 md:p-8">
                  {/* Narrative Discovery */}
                  {(() => {
                    const narrativeText = latestReport
                      ? (language === "ka" && latestReport.summaryKa ? latestReport.summaryKa : latestReport.summaryEn)
                      : latestKnowledge
                        ? (language === "ka" && latestKnowledge.contentKa ? latestKnowledge.contentKa : latestKnowledge.contentEn)
                        : null;

                    const narrativeTitle = latestReport
                      ? (language === "ka" && latestReport.titleKa ? latestReport.titleKa : latestReport.titleEn)
                      : latestKnowledge
                        ? (language === "ka" && latestKnowledge.titleKa ? latestKnowledge.titleKa : latestKnowledge.titleEn)
                        : null;

                    const narrativeDate = latestReport?.reportDate
                      ? format(parseISO(latestReport.reportDate), "d MMM, yyyy")
                      : latestKnowledge?.createdAt
                        ? format(new Date(latestKnowledge.createdAt), "d MMM, yyyy")
                        : null;

                    if (!narrativeText) return null;

                    return (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Brain className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            {narrativeTitle && (
                              <h3 className="font-semibold text-lg">{narrativeTitle}</h3>
                            )}
                            {narrativeDate && (
                              <p className="text-sm text-muted-foreground">{narrativeDate}</p>
                            )}
                          </div>
                        </div>
                        <p className="text-muted-foreground leading-relaxed">
                          {narrativeText}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Knowledge Stats */}
                  {accumulatedKnowledge && accumulatedKnowledge.length > 0 && (
                    <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-primary">
                          {accumulatedKnowledge.filter(k => k.status === "validated").length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language === "en" ? "Validated" : "დადასტურებული"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-green-600">
                          {accumulatedKnowledge.filter(k => k.status === "active").length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language === "en" ? "Active" : "აქტიური"}
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-blue-600">
                          {accumulatedKnowledge.length}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {language === "en" ? "Total Discoveries" : "სულ აღმოჩენები"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Recent Findings */}
                  {accumulatedKnowledge && accumulatedKnowledge.length > 1 && (
                    <div className="mt-6 pt-6 border-t">
                      <p className="text-sm font-medium mb-3">
                        {language === "en" ? "Recent Findings" : "ბოლო აღმოჩენები"}
                      </p>
                      <div className="space-y-2">
                        {accumulatedKnowledge
                          .filter(k => k.status === "active" || k.status === "validated")
                          .slice(0, 3)
                          .map((knowledge) => {
                            const title = language === "ka" && knowledge.titleKa
                              ? knowledge.titleKa
                              : knowledge.titleEn;
                            return (
                              <div
                                key={knowledge.id}
                                className="flex items-center gap-2 p-2 bg-background/50 rounded-md"
                              >
                                <Lightbulb className="h-4 w-4 text-yellow-500 shrink-0" />
                                <span className="text-sm truncate">{title}</span>
                                <Badge variant="outline" className="ml-auto text-xs shrink-0">
                                  {knowledge.confidence ?? 50}%
                                </Badge>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  <div className="mt-6 text-center">
                    <a href="/api/login">
                      <Button variant="outline" className="gap-2">
                        {language === "en" ? "View Full Research" : "სრული კვლევის ნახვა"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              {language === "en" ? "Trusted by Families" : "ოჯახების ნდობა"}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {displayTestimonials.map((testimonial, i) => (
                <Card key={testimonial.id} data-testid={`testimonial-card-${testimonial.id}`}>
                  <CardContent className="p-6">
                    <div className="mb-3">
                      <StarRating rating={testimonial.rating} />
                    </div>
                    <p className="text-muted-foreground mb-4 italic">
                      "{language === "en" ? testimonial.content : (testimonial.contentKa || testimonial.content)}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {testimonial.authorName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{testimonial.authorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {language === "en" ? testimonial.authorRole : (testimonial.authorRoleKa || testimonial.authorRole)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 bg-primary text-primary-foreground">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-6">
              {language === "en"
                ? "Start Managing Your Child's Care Today"
                : "დაიწყეთ თქვენი შვილის მოვლის მართვა დღესვე"}
            </h2>
            <p className="text-lg mb-8 opacity-90">
              {language === "en"
                ? "Join hundreds of families who trust HIE Command Center"
                : "შეუერთდით ასობით ოჯახს, რომლებიც ენდობიან HIE Command Center-ს"}
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-8">
              {[
                language === "en" ? "Free to start" : "უფასოდ დაწყება",
                language === "en" ? "No credit card required" : "საკრედიტო ბარათი არ სჭირდება",
                language === "en" ? "HIPAA compliant" : "HIPAA შესაბამისი",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
            <a href="/api/login">
              <Button size="lg" variant="secondary" className="gap-2" data-testid="button-cta-get-started">
                {t("getStarted")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </section>
      </main>

      <footer className="py-8 px-4 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-primary" />
              <span className="text-sm text-muted-foreground">
                HIE Parent Command Center
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {language === "en"
                ? "Made with care for HIE families worldwide"
                : "შექმნილია სიყვარულით HIE ოჯახებისთვის მთელ მსოფლიოში"}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
