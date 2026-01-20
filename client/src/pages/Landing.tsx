import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileText,
  Bell,
  Globe,
  Shield,
  Zap,
  ChevronRight,
  ArrowRight,
  FlaskConical,
  Brain,
  Database,
  Users,
  Microscope,
  HeartPulse,
  Languages,
  Clock,
  CheckCircle2
} from "lucide-react";

const serviceTranslations = {
  ka: {
    servicesTitle: "ჩვენი სერვისები",
    servicesSubtitle: "გაიგეთ მეტი იმის შესახებ, თუ როგორ გეხმარებათ Trial Navigator",
    service1: {
      title: "გლობალური ძიება",
      description: "მოძებნეთ კლინიკური კვლევები 10+ საერთაშორისო რეესტრში ერთდროულად. ჩვენი სისტემა აერთიანებს ClinicalTrials.gov, WHO ICTRP და სხვა წამყვან პლატფორმებს.",
      features: ["10+ რეესტრი", "190+ ქვეყანა", "რეალურ დროში განახლება"]
    },
    service2: {
      title: "AI თარგმანი",
      description: "ხელოვნური ინტელექტის დახმარებით თარგმნეთ კლინიკური კვლევები 40+ ენაზე, მათ შორის ქართულზე. სამედიცინო ტერმინოლოგიის ზუსტი თარგმანი.",
      features: ["40+ ენა", "სამედიცინო ტერმინები", "მომენტალური თარგმანი"]
    },
    service3: {
      title: "ფორმა 100 ანალიზი",
      description: "ატვირთეთ თქვენი ფორმა 100 და AI ავტომატურად ამოიცნობს დიაგნოზს, სიმპტომებს და სხვა მნიშვნელოვან ინფორმაციას კვლევების მოსაძებნად.",
      features: ["ავტომატური ამოცნობა", "კონფიდენციალურობა", "სწრაფი დამუშავება"]
    },
    service4: {
      title: "Deep Search",
      description: "ჩვენი ექსპერტები პოულობენ კვლევებს, რომლებსაც AI შესაძლოა ვერ ხედავდეს. პერსონალიზებული ძიება თქვენი უნიკალური პროფილისთვის.",
      features: ["ექსპერტების გუნდი", "ინდივიდუალური მიდგომა", "დეტალური ანგარიში"]
    },
    learnMore: "გაიგეთ მეტი"
  },
  en: {
    servicesTitle: "Our Services",
    servicesSubtitle: "Learn more about how Trial Navigator helps you",
    service1: {
      title: "Global Search",
      description: "Search clinical trials across 10+ international registries simultaneously. Our system integrates ClinicalTrials.gov, WHO ICTRP and other leading platforms.",
      features: ["10+ registries", "190+ countries", "Real-time updates"]
    },
    service2: {
      title: "AI Translation",
      description: "Translate clinical trials into 40+ languages including Georgian using artificial intelligence. Accurate medical terminology translation.",
      features: ["40+ languages", "Medical terms", "Instant translation"]
    },
    service3: {
      title: "Form 100 Analysis",
      description: "Upload your Form 100 and AI automatically extracts diagnosis, symptoms and other important information to find matching trials.",
      features: ["Auto extraction", "Confidentiality", "Fast processing"]
    },
    service4: {
      title: "Deep Search",
      description: "Our experts find trials that AI might miss. Personalized search for your unique profile.",
      features: ["Expert team", "Individual approach", "Detailed report"]
    },
    learnMore: "Learn More"
  },
  ru: {
    servicesTitle: "Наши услуги",
    servicesSubtitle: "Узнайте больше о том, как Trial Navigator помогает вам",
    service1: {
      title: "Глобальный поиск",
      description: "Ищите клинические исследования в 10+ международных реестрах одновременно. Наша система интегрирует ClinicalTrials.gov, WHO ICTRP и другие ведущие платформы.",
      features: ["10+ реестров", "190+ стран", "Обновление в реальном времени"]
    },
    service2: {
      title: "ИИ-перевод",
      description: "Переводите клинические исследования на 40+ языков, включая грузинский, с помощью искусственного интеллекта. Точный перевод медицинской терминологии.",
      features: ["40+ языков", "Медицинские термины", "Мгновенный перевод"]
    },
    service3: {
      title: "Анализ Формы 100",
      description: "Загрузите Форму 100, и ИИ автоматически извлечёт диагноз, симптомы и другую важную информацию для поиска подходящих исследований.",
      features: ["Автоизвлечение", "Конфиденциальность", "Быстрая обработка"]
    },
    service4: {
      title: "Глубокий поиск",
      description: "Наши эксперты находят исследования, которые ИИ может пропустить. Персонализированный поиск для вашего уникального профиля.",
      features: ["Команда экспертов", "Индивидуальный подход", "Детальный отчёт"]
    },
    learnMore: "Узнать больше"
  }
};

export default function Landing() {
  const { t, language } = useLanguage();
  const st = serviceTranslations[language as keyof typeof serviceTranslations] || serviceTranslations.en;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Trial Navigator</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t('nav.pricing')}
            </Link>
            <Link href="/services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {language === 'ka' ? 'სერვისები' : language === 'ru' ? 'Услуги' : 'Services'}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t('nav.login')}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                {t('nav.register')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative py-16 md:py-24 px-4 md:px-6">
          <div className="flex flex-col items-center text-center gap-6 max-w-3xl mx-auto">
            <Badge variant="secondary" className="gap-2 px-3 py-1">
              <Zap className="h-3 w-3" />
              {t('landing.badge')}
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-tight">
              {t('landing.title')}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed">
              {t('landing.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link href="/register">
                <Button size="lg" className="gap-2 px-6">
                  {t('landing.cta')}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg" className="px-6">
                  {t('landing.secondary_cta')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/40">
        <div className="container py-10 md:py-12 px-4 md:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">1M+</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{t('landing.stats.trials')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">190+</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{t('landing.stats.countries')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">40+</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{t('landing.stats.languages')}</div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary">10+</div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">{t('landing.stats.registries')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container py-16 md:py-20 px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t('landing.howItWorks.title')}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t('landing.howItWorks.subtitle')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {/* Step 1 */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center relative">
              <FileText className="h-7 w-7 text-primary" />
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                1
              </div>
            </div>
            <h3 className="text-lg font-semibold">{t('landing.howItWorks.step1.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('landing.howItWorks.step1.description')}</p>
          </div>
          {/* Step 2 */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center relative">
              <Brain className="h-7 w-7 text-primary" />
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                2
              </div>
            </div>
            <h3 className="text-lg font-semibold">{t('landing.howItWorks.step2.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('landing.howItWorks.step2.description')}</p>
          </div>
          {/* Step 3 */}
          <div className="flex flex-col items-center text-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center relative">
              <Bell className="h-7 w-7 text-primary" />
              <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">
                3
              </div>
            </div>
            <h3 className="text-lg font-semibold">{t('landing.howItWorks.step3.title')}</h3>
            <p className="text-sm text-muted-foreground">{t('landing.howItWorks.step3.description')}</p>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="bg-muted/40 py-16 md:py-20">
        <div className="container px-4 md:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">{st.servicesTitle}</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">{st.servicesSubtitle}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Service 1 - Global Search */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-3">
                  <Globe className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle className="text-xl">{st.service1.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {st.service1.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {st.service1.features.map((feature, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>
                <Link href="/services#global-search">
                  <Button variant="ghost" size="sm" className="gap-1 px-0 hover:bg-transparent hover:text-primary">
                    {st.learnMore}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Service 2 - AI Translation */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-3">
                  <Languages className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle className="text-xl">{st.service2.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {st.service2.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {st.service2.features.map((feature, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>
                <Link href="/services#ai-translation">
                  <Button variant="ghost" size="sm" className="gap-1 px-0 hover:bg-transparent hover:text-primary">
                    {st.learnMore}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Service 3 - Form 100 */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3">
                  <FileText className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle className="text-xl">{st.service3.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {st.service3.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {st.service3.features.map((feature, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>
                <Link href="/services#form-100">
                  <Button variant="ghost" size="sm" className="gap-1 px-0 hover:bg-transparent hover:text-primary">
                    {st.learnMore}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Service 4 - Deep Search */}
            <Card className="border-2 hover:border-primary/50 transition-all hover:shadow-lg">
              <CardHeader className="pb-4">
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-3">
                  <Search className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle className="text-xl">{st.service4.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {st.service4.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2 mb-4">
                  {st.service4.features.map((feature, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {feature}
                    </Badge>
                  ))}
                </div>
                <Link href="/services#deep-search">
                  <Button variant="ghost" size="sm" className="gap-1 px-0 hover:bg-transparent hover:text-primary">
                    {st.learnMore}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-16 md:py-20 px-4 md:px-6">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">{t('landing.features.title')}</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">{t('landing.features.subtitle')}</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
              <Globe className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('landing.features.global.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('landing.features.global.description')}</p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
              <Brain className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('landing.features.ai.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('landing.features.ai.description')}</p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('landing.features.secure.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('landing.features.secure.description')}</p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('landing.features.form100.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('landing.features.form100.description')}</p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('landing.features.notifications.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('landing.features.notifications.description')}</p>
            </div>
          </div>

          <div className="flex gap-4 p-4 rounded-lg hover:bg-muted/50 transition-colors">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
              <Search className="h-5 w-5 text-cyan-500" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">{t('landing.features.deepSearch.title')}</h3>
              <p className="text-sm text-muted-foreground">{t('landing.features.deepSearch.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 md:py-20 px-4 md:px-6">
        <Card className="bg-primary text-primary-foreground overflow-hidden">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-10">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{t('landing.cta_section.title')}</h2>
              <p className="text-primary-foreground/80">{t('landing.cta_section.subtitle')}</p>
            </div>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2 whitespace-nowrap">
                {t('landing.cta_section.button')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-10 px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <FlaskConical className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="font-semibold">Trial Navigator</span>
            </div>
            <nav className="flex gap-6">
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {t('nav.pricing')}
              </Link>
              <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {language === 'ka' ? 'სერვისები' : language === 'ru' ? 'Услуги' : 'Services'}
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © 2024 Trial Navigator. {t('footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
