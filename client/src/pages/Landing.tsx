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
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";

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

const testimonials = [
  {
    quote: "This platform helped us understand our son's MRI results and find the right therapies.",
    quoteKa: "ეს პლატფორმა დაგვეხმარა გვესმოდა ჩვენი შვილის MRI შედეგები.",
    author: "Nino M.",
    role: "Parent of 2-year-old with HIE",
    roleKa: "2 წლის HIE-ით დაავადებული ბავშვის დედა",
  },
  {
    quote: "The AI assistant saved us hours of research and helped us communicate with specialists abroad.",
    quoteKa: "AI ასისტენტმა დაგვიზოგა საათობით კვლევა და დაგვეხმარა უცხოელ სპეციალისტებთან კომუნიკაციაში.",
    author: "Giorgi K.",
    role: "Father of twins with HIE",
    roleKa: "HIE-ით დაავადებული ტყუპების მამა",
  },
];

export default function Landing() {
  const { language, t } = useLanguage();

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

        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-12">
              {language === "en" ? "Trusted by Families" : "ოჯახების ნდობა"}
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              {testimonials.map((testimonial, i) => (
                <Card key={i} data-testid={`testimonial-card-${i}`}>
                  <CardContent className="p-6">
                    <p className="text-muted-foreground mb-4 italic">
                      "{language === "en" ? testimonial.quote : testimonial.quoteKa}"
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {testimonial.author[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{testimonial.author}</p>
                        <p className="text-xs text-muted-foreground">
                          {language === "en" ? testimonial.role : testimonial.roleKa}
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
