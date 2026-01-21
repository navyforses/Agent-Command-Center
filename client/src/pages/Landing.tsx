import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FlaskConical,
  Zap,
  ArrowRight,
  Upload,
  Brain,
  FileCheck,
  Globe,
  Languages,
  Shield,
  Bell,
  ChevronRight
} from "lucide-react";

const translations = {
  ka: {
    hero: {
      badge: "AI-ით მართული კვლევები",
      title: "იპოვეთ კლინიკური კვლევები თქვენი დიაგნოზისთვის",
      subtitle: "ატვირთეთ თქვენი სამედიცინო დოკუმენტი და AI მოგიძებნით შესაბამის კლინიკურ კვლევებს 40+ ენაზე, 10+ საერთაშორისო რეესტრიდან.",
      cta: "უფასო რეგისტრაცია",
      secondaryCta: "სერვისები"
    },
    howItWorks: {
      title: "როგორ მუშაობს?",
      subtitle: "სამი მარტივი ნაბიჯი თქვენთვის შესაფერისი კვლევების მოსაძებნად",
      step1: {
        title: "ატვირთეთ დოკუმენტი",
        desc: "ფორმა 100, ეპიკრიზი ან ნებისმიერი სამედიცინო დოკუმენტი"
      },
      step2: {
        title: "AI ანალიზი",
        desc: "ხელოვნური ინტელექტი ამოიცნობს დიაგნოზს და მოძებნის კვლევებს"
      },
      step3: {
        title: "მიიღეთ შედეგები",
        desc: "ნახეთ შესაბამისი კვლევები თქვენს პირად პროფილში"
      }
    },
    stats: {
      trials: "კლინიკური კვლევა",
      countries: "ქვეყანა",
      languages: "ენა",
      registries: "რეესტრი"
    },
    features: {
      title: "რატომ Trial Navigator?",
      global: { title: "გლობალური ძიება", desc: "10+ საერთაშორისო რეესტრი ერთ პლატფორმაზე" },
      ai: { title: "AI თარგმანი", desc: "კვლევების თარგმანი 40+ ენაზე, მათ შორის ქართულზე" },
      secure: { title: "უსაფრთხოება", desc: "თქვენი სამედიცინო მონაცემები დაცულია" },
      notifications: { title: "შეტყობინებები", desc: "მიიღეთ ახალი კვლევების შესახებ ინფორმაცია" }
    },
    cta: {
      title: "მზად ხართ დასაწყებად?",
      subtitle: "შექმენით უფასო ანგარიში და იპოვეთ თქვენთვის შესაფერისი კვლევები",
      button: "დაწყება"
    },
    nav: {
      services: "სერვისები",
      about: "ჩვენს შესახებ",
      login: "შესვლა",
      register: "რეგისტრაცია"
    }
  },
  en: {
    hero: {
      badge: "AI-Powered Research",
      title: "Find Clinical Trials for Your Diagnosis",
      subtitle: "Upload your medical document and AI will find matching clinical trials in 40+ languages from 10+ international registries.",
      cta: "Sign Up Free",
      secondaryCta: "Services"
    },
    howItWorks: {
      title: "How It Works",
      subtitle: "Three simple steps to find trials matching your condition",
      step1: {
        title: "Upload Document",
        desc: "Form 100, medical report, or any medical document"
      },
      step2: {
        title: "AI Analysis",
        desc: "AI extracts diagnosis and searches for matching trials"
      },
      step3: {
        title: "Get Results",
        desc: "View matching trials in your personal profile"
      }
    },
    stats: {
      trials: "Clinical Trials",
      countries: "Countries",
      languages: "Languages",
      registries: "Registries"
    },
    features: {
      title: "Why Trial Navigator?",
      global: { title: "Global Search", desc: "10+ international registries on one platform" },
      ai: { title: "AI Translation", desc: "Trial translation in 40+ languages including Georgian" },
      secure: { title: "Secure", desc: "Your medical data is protected" },
      notifications: { title: "Notifications", desc: "Get updates about new matching trials" }
    },
    cta: {
      title: "Ready to Get Started?",
      subtitle: "Create a free account and find trials matching your condition",
      button: "Get Started"
    },
    nav: {
      services: "Services",
      about: "About Us",
      login: "Sign In",
      register: "Sign Up"
    }
  },
  ru: {
    hero: {
      badge: "ИИ-исследования",
      title: "Найдите клинические исследования для вашего диагноза",
      subtitle: "Загрузите медицинский документ и ИИ найдёт подходящие клинические исследования на 40+ языках из 10+ международных реестров.",
      cta: "Бесплатная регистрация",
      secondaryCta: "Услуги"
    },
    howItWorks: {
      title: "Как это работает",
      subtitle: "Три простых шага для поиска подходящих исследований",
      step1: {
        title: "Загрузите документ",
        desc: "Форма 100, выписка или любой медицинский документ"
      },
      step2: {
        title: "ИИ-анализ",
        desc: "ИИ извлекает диагноз и ищет подходящие исследования"
      },
      step3: {
        title: "Получите результаты",
        desc: "Просмотрите подходящие исследования в личном профиле"
      }
    },
    stats: {
      trials: "Клинических исследований",
      countries: "Стран",
      languages: "Языков",
      registries: "Реестров"
    },
    features: {
      title: "Почему Trial Navigator?",
      global: { title: "Глобальный поиск", desc: "10+ международных реестров на одной платформе" },
      ai: { title: "ИИ-перевод", desc: "Перевод исследований на 40+ языков" },
      secure: { title: "Безопасность", desc: "Ваши медицинские данные защищены" },
      notifications: { title: "Уведомления", desc: "Получайте информацию о новых исследованиях" }
    },
    cta: {
      title: "Готовы начать?",
      subtitle: "Создайте бесплатный аккаунт и найдите подходящие исследования",
      button: "Начать"
    },
    nav: {
      services: "Услуги",
      about: "О нас",
      login: "Войти",
      register: "Регистрация"
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
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Trial Navigator</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t.nav.services}
            </Link>
            <Link href="/about" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t.nav.about}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t.nav.login}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  {t.nav.register}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container relative py-20 md:py-28 px-4 md:px-6">
          <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
            <Badge variant="secondary" className="gap-2 px-4 py-1.5 text-sm">
              <Zap className="h-4 w-4" />
              {t.hero.badge}
            </Badge>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              {t.hero.title}
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              {t.hero.subtitle}
            </p>

            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-8 h-12 text-base">
                  {t.hero.cta}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/services">
                <Button variant="outline" size="lg" className="px-8 h-12 text-base">
                  {t.hero.secondaryCta}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30">
        <div className="container py-12 md:py-16 px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">1M+</div>
              <div className="text-sm md:text-base text-muted-foreground mt-2">{t.stats.trials}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">190+</div>
              <div className="text-sm md:text-base text-muted-foreground mt-2">{t.stats.countries}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">40+</div>
              <div className="text-sm md:text-base text-muted-foreground mt-2">{t.stats.languages}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">10+</div>
              <div className="text-sm md:text-base text-muted-foreground mt-2">{t.stats.registries}</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container py-20 md:py-24 px-4 md:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.howItWorks.title}</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t.howItWorks.subtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="relative flex flex-col items-center text-center gap-6 p-6">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center relative">
              <Upload className="h-10 w-10 text-primary" />
              <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                1
              </div>
            </div>
            <h3 className="text-xl font-semibold">{t.howItWorks.step1.title}</h3>
            <p className="text-muted-foreground">{t.howItWorks.step1.desc}</p>
          </div>

          {/* Step 2 */}
          <div className="relative flex flex-col items-center text-center gap-6 p-6">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center relative">
              <Brain className="h-10 w-10 text-primary" />
              <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                2
              </div>
            </div>
            <h3 className="text-xl font-semibold">{t.howItWorks.step2.title}</h3>
            <p className="text-muted-foreground">{t.howItWorks.step2.desc}</p>
          </div>

          {/* Step 3 */}
          <div className="relative flex flex-col items-center text-center gap-6 p-6">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center relative">
              <FileCheck className="h-10 w-10 text-primary" />
              <div className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                3
              </div>
            </div>
            <h3 className="text-xl font-semibold">{t.howItWorks.step3.title}</h3>
            <p className="text-muted-foreground">{t.howItWorks.step3.desc}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/30 py-20 md:py-24">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t.features.title}</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="bg-background border-2 hover:border-primary/50 transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.global.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.global.desc}</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-2 hover:border-primary/50 transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <Languages className="h-6 w-6 text-green-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.ai.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.ai.desc}</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-2 hover:border-primary/50 transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.secure.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.secure.desc}</p>
              </CardContent>
            </Card>

            <Card className="bg-background border-2 hover:border-primary/50 transition-all">
              <CardContent className="pt-6">
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-orange-500" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{t.features.notifications.title}</h3>
                <p className="text-sm text-muted-foreground">{t.features.notifications.desc}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-20 md:py-24 px-4 md:px-6">
        <Card className="bg-primary text-primary-foreground overflow-hidden max-w-4xl mx-auto">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-8 p-10 md:p-12">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">{t.cta.title}</h2>
              <p className="text-primary-foreground/80 text-lg">{t.cta.subtitle}</p>
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
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <FlaskConical className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-lg">Trial Navigator</span>
            </div>

            <nav className="flex items-center gap-8">
              <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.services}
              </Link>
              <Link href="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t.nav.about}
              </Link>
            </nav>

            <p className="text-sm text-muted-foreground">
              © 2024 Trial Navigator
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
