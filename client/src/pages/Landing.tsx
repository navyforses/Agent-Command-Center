import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Newspaper,
  Upload,
  Brain,
  MessageSquareText,
  Mail,
  Sparkles,
  ArrowRight,
  Check,
  Star,
  Shield,
  Bell,
  Search,
  BookOpen,
  Pill,
  FlaskConical,
  ChevronRight,
  Globe,
  Zap,
  Heart
} from "lucide-react";

const translations = {
  ka: {
    nav: {
      services: "სერვისები",
      pricing: "ფასები",
      about: "ჩვენს შესახებ",
      login: "შესვლა",
      register: "რეგისტრაცია"
    },
    hero: {
      badge: "სამედიცინო სიახლეების გამოწერა",
      title: "თქვენი პერსონალური",
      titleHighlight: "სამედიცინო გაზეთი",
      subtitle: "ატვირთეთ თქვენი ფორმა 100 და მიიღეთ პერსონალიზებული სიახლეები კლინიკური კვლევების, სამეცნიერო სტატიების და მედიკამენტების შესახებ. დასვით კითხვები ნებისმიერ სტატიაზე - AI გიპასუხებთ.",
      cta: "დაიწყეთ უფასოდ",
      secondaryCta: "ნახეთ ფასები"
    },
    howItWorks: {
      title: "როგორ მუშაობს?",
      subtitle: "ოთხი მარტივი ნაბიჯი პერსონალიზებული სამედიცინო სიახლეებისთვის",
      step1: {
        title: "ატვირთეთ ფორმა 100",
        desc: "AI შექმნის თქვენს სამედიცინო პროფილს დიაგნოზის და ICD-10 კოდების მიხედვით"
      },
      step2: {
        title: "მიიღეთ პერსონალური ფიდი",
        desc: "ყოველდღიურად მიიღებთ რელევანტურ კლინიკურ კვლევებს, სტატიებს და სიახლეებს"
      },
      step3: {
        title: "დასვით კითხვები",
        desc: "ნებისმიერ სტატიაზე დასვით კითხვა - 5 AI სისტემა გიპასუხებთ ერთობლივად"
      },
      step4: {
        title: "დაუკავშირდით მკვლევარებს",
        desc: "გაუგზავნეთ ელ.ფოსტა კლინიკური კვლევების ხელმძღვანელებს"
      }
    },
    features: {
      title: "რას მიიღებთ?",
      feed: {
        title: "პერსონალური ფიდი",
        desc: "კლინიკური კვლევები, PubMed სტატიები, მედიკამენტების სიახლეები - ყველაფერი თქვენს დიაგნოზზე მორგებული"
      },
      ai: {
        title: "AI კითხვა-პასუხი",
        desc: "დასვით კითხვა ნებისმიერ სტატიაზე - 5 AI (GPT-4, Claude, Gemini, Grok, Perplexity) გიპასუხებთ კონსენსუსით"
      },
      trials: {
        title: "კლინიკური კვლევები",
        desc: "ClinicalTrials.gov, EU Clinical Trials, WHO ICTRP - 10+ საერთაშორისო რეესტრი"
      },
      research: {
        title: "სამეცნიერო სტატიები",
        desc: "PubMed-დან უახლესი კვლევები თქვენი დიაგნოზის შესახებ"
      },
      drugs: {
        title: "მედიკამენტები",
        desc: "OpenFDA-დან ინფორმაცია წამლების, გვერდითი ეფექტების და ურთიერთქმედებების შესახებ"
      },
      email: {
        title: "მკვლევარებთან კავშირი",
        desc: "პირდაპირი ელ.ფოსტა კლინიკური კვლევების კოორდინატორებთან"
      }
    },
    stats: {
      trials: "კლინიკური კვლევა",
      articles: "სამეცნიერო სტატია",
      aiModels: "AI მოდელი",
      languages: "ენა"
    },
    pricing: {
      title: "აირჩიეთ გეგმა",
      subtitle: "დაიწყეთ უფასოდ, განაახლეთ როცა გსურთ",
      free: {
        name: "უფასო",
        price: "₾0",
        period: "/თვეში",
        features: [
          "პერსონალური ფიდი",
          "5 კითხვა თვეში",
          "20 შენახული ელემენტი",
          "ძირითადი ძებნა"
        ],
        cta: "დაწყება"
      },
      standard: {
        name: "სტანდარტული",
        price: "₾25",
        period: "/თვეში",
        popular: "პოპულარული",
        features: [
          "პერსონალური ფიდი",
          "100 კითხვა თვეში",
          "500 შენახული ელემენტი",
          "ღრმა AI კვლევა",
          "მკვლევარებთან ელ.ფოსტა"
        ],
        cta: "არჩევა"
      },
      premium: {
        name: "პრემიუმ",
        price: "₾60",
        period: "/თვეში",
        features: [
          "პერსონალური ფიდი",
          "ულიმიტო კითხვები",
          "ულიმიტო შენახვა",
          "ღრმა AI კვლევა",
          "მკვლევარებთან ელ.ფოსტა",
          "პრიორიტეტული მხარდაჭერა"
        ],
        cta: "არჩევა"
      }
    },
    cta: {
      title: "მზად ხართ დასაწყებად?",
      subtitle: "შექმენით უფასო ანგარიში და მიიღეთ პერსონალიზებული სამედიცინო სიახლეები",
      button: "უფასო რეგისტრაცია"
    },
    footer: {
      copyright: "© 2024 Trial Navigator. ყველა უფლება დაცულია."
    }
  },
  en: {
    nav: {
      services: "Services",
      pricing: "Pricing",
      about: "About",
      login: "Sign In",
      register: "Sign Up"
    },
    hero: {
      badge: "Medical News Subscription",
      title: "Your Personal",
      titleHighlight: "Medical Newspaper",
      subtitle: "Upload your Form 100 and receive personalized news about clinical trials, research articles, and medications. Ask questions about any article - AI will answer.",
      cta: "Start for Free",
      secondaryCta: "View Pricing"
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "Four simple steps to personalized medical news",
      step1: {
        title: "Upload Form 100",
        desc: "AI creates your medical profile based on diagnosis and ICD-10 codes"
      },
      step2: {
        title: "Get Personal Feed",
        desc: "Receive relevant clinical trials, articles, and news daily"
      },
      step3: {
        title: "Ask Questions",
        desc: "Ask questions about any article - 5 AI systems answer together"
      },
      step4: {
        title: "Contact Researchers",
        desc: "Send emails directly to clinical trial coordinators"
      }
    },
    features: {
      title: "What You Get",
      feed: {
        title: "Personal Feed",
        desc: "Clinical trials, PubMed articles, medication news - all tailored to your diagnosis"
      },
      ai: {
        title: "AI Q&A",
        desc: "Ask questions about any article - 5 AIs (GPT-4, Claude, Gemini, Grok, Perplexity) answer by consensus"
      },
      trials: {
        title: "Clinical Trials",
        desc: "ClinicalTrials.gov, EU Clinical Trials, WHO ICTRP - 10+ international registries"
      },
      research: {
        title: "Research Articles",
        desc: "Latest studies from PubMed about your diagnosis"
      },
      drugs: {
        title: "Medications",
        desc: "Drug information, side effects, and interactions from OpenFDA"
      },
      email: {
        title: "Contact Researchers",
        desc: "Direct email to clinical trial coordinators"
      }
    },
    stats: {
      trials: "Clinical Trials",
      articles: "Research Articles",
      aiModels: "AI Models",
      languages: "Languages"
    },
    pricing: {
      title: "Choose Your Plan",
      subtitle: "Start for free, upgrade when you want",
      free: {
        name: "Free",
        price: "$0",
        period: "/month",
        features: [
          "Personal feed",
          "5 questions/month",
          "20 saved items",
          "Basic search"
        ],
        cta: "Get Started"
      },
      standard: {
        name: "Standard",
        price: "$9.99",
        period: "/month",
        popular: "Popular",
        features: [
          "Personal feed",
          "100 questions/month",
          "500 saved items",
          "Deep AI research",
          "Email researchers"
        ],
        cta: "Choose"
      },
      premium: {
        name: "Premium",
        price: "$24.99",
        period: "/month",
        features: [
          "Personal feed",
          "Unlimited questions",
          "Unlimited saves",
          "Deep AI research",
          "Email researchers",
          "Priority support"
        ],
        cta: "Choose"
      }
    },
    cta: {
      title: "Ready to Get Started?",
      subtitle: "Create a free account and receive personalized medical news",
      button: "Sign Up Free"
    },
    footer: {
      copyright: "© 2024 Trial Navigator. All rights reserved."
    }
  }
};

export default function Landing() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <Newspaper className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-xl hidden sm:inline">Trial Navigator</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t.nav.pricing}
            </Link>
            <Link href="/services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t.nav.services}
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t.nav.about}
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t.nav.login}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  {t.nav.register}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/20 dark:via-purple-950/20 dark:to-pink-950/20" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-5" />
        <div className="container relative py-20 md:py-32 px-4 md:px-6">
          <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
            <Badge variant="secondary" className="gap-2 px-4 py-1.5 text-sm bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/50 dark:to-purple-900/50 border-0">
              <Sparkles className="h-4 w-4 text-purple-600" />
              {t.hero.badge}
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
              {t.hero.title}{" "}
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {t.hero.titleHighlight}
              </span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-8 h-12 text-base bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                  {t.hero.cta}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="px-8 h-12 text-base">
                  {t.hero.secondaryCta}
                </Button>
              </Link>
            </div>

            {/* Floating cards animation hint */}
            <div className="flex items-center gap-4 pt-8 opacity-60">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">AI</div>
                <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center text-white text-xs font-bold">5x</div>
              </div>
              <span className="text-sm text-muted-foreground">GPT-4, Claude, Gemini, Grok, Perplexity</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="container py-12 md:py-16 px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">1M+</div>
              <div className="text-sm md:text-base text-muted-foreground mt-2">{t.stats.trials}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">35M+</div>
              <div className="text-sm md:text-base text-muted-foreground mt-2">{t.stats.articles}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-pink-600 to-red-600 bg-clip-text text-transparent">5</div>
              <div className="text-sm md:text-base text-muted-foreground mt-2">{t.stats.aiModels}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">40+</div>
              <div className="text-sm md:text-base text-muted-foreground mt-2">{t.stats.languages}</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container py-20 md:py-28 px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.howItWorks.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.howItWorks.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-6xl mx-auto">
          {/* Step 1 */}
          <div className="relative flex flex-col items-center text-center gap-6 p-6 rounded-2xl bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-950/20">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center relative shadow-lg">
              <Upload className="h-10 w-10 text-white" />
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white dark:bg-gray-900 text-blue-600 flex items-center justify-center font-bold shadow-md border-2 border-blue-500">
                1
              </div>
            </div>
            <h3 className="text-xl font-semibold">{t.howItWorks.step1.title}</h3>
            <p className="text-muted-foreground text-sm">{t.howItWorks.step1.desc}</p>
          </div>

          {/* Step 2 */}
          <div className="relative flex flex-col items-center text-center gap-6 p-6 rounded-2xl bg-gradient-to-b from-purple-50 to-transparent dark:from-purple-950/20">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center relative shadow-lg">
              <Newspaper className="h-10 w-10 text-white" />
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white dark:bg-gray-900 text-purple-600 flex items-center justify-center font-bold shadow-md border-2 border-purple-500">
                2
              </div>
            </div>
            <h3 className="text-xl font-semibold">{t.howItWorks.step2.title}</h3>
            <p className="text-muted-foreground text-sm">{t.howItWorks.step2.desc}</p>
          </div>

          {/* Step 3 */}
          <div className="relative flex flex-col items-center text-center gap-6 p-6 rounded-2xl bg-gradient-to-b from-pink-50 to-transparent dark:from-pink-950/20">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-pink-500 to-pink-600 flex items-center justify-center relative shadow-lg">
              <MessageSquareText className="h-10 w-10 text-white" />
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white dark:bg-gray-900 text-pink-600 flex items-center justify-center font-bold shadow-md border-2 border-pink-500">
                3
              </div>
            </div>
            <h3 className="text-xl font-semibold">{t.howItWorks.step3.title}</h3>
            <p className="text-muted-foreground text-sm">{t.howItWorks.step3.desc}</p>
          </div>

          {/* Step 4 */}
          <div className="relative flex flex-col items-center text-center gap-6 p-6 rounded-2xl bg-gradient-to-b from-orange-50 to-transparent dark:from-orange-950/20">
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center relative shadow-lg">
              <Mail className="h-10 w-10 text-white" />
              <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-white dark:bg-gray-900 text-orange-600 flex items-center justify-center font-bold shadow-md border-2 border-orange-500">
                4
              </div>
            </div>
            <h3 className="text-xl font-semibold">{t.howItWorks.step4.title}</h3>
            <p className="text-muted-foreground text-sm">{t.howItWorks.step4.desc}</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="bg-muted/30 py-20 md:py-28">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.features.title}</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="bg-background border-2 hover:border-blue-500/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Newspaper className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.feed.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.feed.desc}</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-2 hover:border-purple-500/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.ai.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.ai.desc}</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-2 hover:border-green-500/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <FlaskConical className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.trials.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.trials.desc}</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-2 hover:border-orange-500/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.research.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.research.desc}</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-2 hover:border-pink-500/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4">
                  <Pill className="h-6 w-6 text-pink-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.drugs.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.drugs.desc}</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-2 hover:border-cyan-500/50 transition-all hover:shadow-lg">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-cyan-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.email.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.email.desc}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="container py-20 md:py-28 px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.pricing.title}</h2>
          <p className="text-lg text-muted-foreground">{t.pricing.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Free Plan */}
          <Card className="relative border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <CardTitle className="text-xl">{t.pricing.free.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">{t.pricing.free.price}</span>
                <span className="text-muted-foreground">{t.pricing.free.period}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {t.pricing.free.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  {t.pricing.free.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Standard Plan */}
          <Card className="relative border-2 border-purple-500 shadow-lg shadow-purple-500/10">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white border-0">
                <Star className="h-3 w-3 mr-1" />
                {t.pricing.standard.popular}
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-xl">{t.pricing.standard.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">{t.pricing.standard.price}</span>
                <span className="text-muted-foreground">{t.pricing.standard.period}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {t.pricing.standard.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  {t.pricing.standard.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative border-2 hover:border-primary/50 transition-all">
            <CardHeader>
              <CardTitle className="text-xl">{t.pricing.premium.name}</CardTitle>
              <div className="mt-4">
                <span className="text-4xl font-bold">{t.pricing.premium.price}</span>
                <span className="text-muted-foreground">{t.pricing.premium.period}</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 mb-6">
                {t.pricing.premium.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
              <Link href="/register">
                <Button variant="outline" className="w-full">
                  {t.pricing.premium.cta}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container pb-20 md:pb-28 px-4 md:px-6">
        <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white overflow-hidden max-w-4xl mx-auto">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 md:p-12">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.cta.title}</h2>
              <p className="text-white/80 text-lg">{t.cta.subtitle}</p>
            </div>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2 whitespace-nowrap h-12 px-8">
                {t.cta.button}
                <ChevronRight className="h-5 w-5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-12 px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <Newspaper className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-lg">Trial Navigator</span>
            </div>

            <nav className="flex items-center gap-8">
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.pricing}
              </Link>
              <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.services}
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.about}
              </Link>
            </nav>

            <p className="text-sm text-muted-foreground">
              {t.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
