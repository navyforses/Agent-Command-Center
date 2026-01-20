import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  FlaskConical,
  Globe,
  Languages,
  FileText,
  Search,
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Shield,
  Clock,
  Users,
  Zap,
  Database,
  Brain
} from "lucide-react";

const translations = {
  ka: {
    pageTitle: "სერვისები",
    pageSubtitle: "Trial Navigator-ის სრული სერვისების მიმოხილვა",
    getStarted: "დაწყება",
    contactUs: "დაგვიკავშირდით",

    globalSearch: {
      title: "გლობალური ძიება",
      subtitle: "მოძებნეთ კლინიკური კვლევები მთელ მსოფლიოში",
      description: "ჩვენი გლობალური ძიების სისტემა აერთიანებს 10+ საერთაშორისო რეესტრს ერთ პლატფორმაზე. თქვენ შეგიძლიათ ერთდროულად მოძებნოთ ClinicalTrials.gov, WHO ICTRP, EU Clinical Trials Register და სხვა წამყვანი პლატფორმები.",
      features: [
        { title: "10+ რეესტრი", desc: "საერთაშორისო რეესტრების ინტეგრაცია" },
        { title: "190+ ქვეყანა", desc: "კვლევები მთელი მსოფლიოდან" },
        { title: "რეალურ დროში", desc: "ავტომატური განახლება ყოველდღიურად" },
        { title: "ფილტრაცია", desc: "დეტალური ძიების პარამეტრები" }
      ],
      registries: ["ClinicalTrials.gov", "WHO ICTRP", "EU CTR", "ANZCTR", "ChiCTR", "CTRI", "DRKS", "IRCT", "JPRN", "NTR"]
    },

    aiTranslation: {
      title: "AI თარგმანი",
      subtitle: "კვლევების თარგმანი 40+ ენაზე",
      description: "ჩვენი ხელოვნური ინტელექტის სისტემა უზრუნველყოფს კლინიკური კვლევების ზუსტ თარგმანს 40+ ენაზე, მათ შორის ქართულზე. სამედიცინო ტერმინოლოგია თარგმნილია კონტექსტის გათვალისწინებით.",
      features: [
        { title: "40+ ენა", desc: "მათ შორის ქართული, რუსული, ინგლისური" },
        { title: "სამედიცინო ტერმინები", desc: "ზუსტი სამედიცინო ტერმინოლოგია" },
        { title: "კონტექსტური", desc: "AI აანალიზებს კონტექსტს" },
        { title: "მომენტალური", desc: "თარგმანი რამდენიმე წამში" }
      ]
    },

    form100: {
      title: "ფორმა 100 ანალიზი",
      subtitle: "ავტომატური დიაგნოზის ამოცნობა",
      description: "ატვირთეთ თქვენი ფორმა 100 (სამედიცინო დოკუმენტი) და ჩვენი AI სისტემა ავტომატურად ამოიცნობს დიაგნოზს, ICD კოდებს და სხვა მნიშვნელოვან ინფორმაციას. შემდეგ სისტემა მოძებნის შესაფერის კვლევებს თქვენი პროფილისთვის.",
      features: [
        { title: "ავტომატური ამოცნობა", desc: "AI ამოიცნობს დიაგნოზს და სიმპტომებს" },
        { title: "ICD კოდები", desc: "საერთაშორისო კლასიფიკაციის მხარდაჭერა" },
        { title: "კონფიდენციალურობა", desc: "თქვენი მონაცემები დაცულია" },
        { title: "სწრაფი დამუშავება", desc: "შედეგი რამდენიმე წუთში" }
      ]
    },

    deepSearch: {
      title: "Deep Search",
      subtitle: "ექსპერტების პერსონალიზებული ძიება",
      description: "Deep Search არის პრემიუმ სერვისი, სადაც ჩვენი სამედიცინო ექსპერტების გუნდი პირადად ეძებს თქვენთვის შესაფერის კვლევებს. ექსპერტები პოულობენ კვლევებს, რომლებსაც AI შესაძლოა ვერ ხედავდეს.",
      features: [
        { title: "ექსპერტების გუნდი", desc: "სამედიცინო სპეციალისტები" },
        { title: "ინდივიდუალური მიდგომა", desc: "პერსონალიზებული ძიება" },
        { title: "დეტალური ანგარიში", desc: "სრული ანალიზი და რეკომენდაციები" },
        { title: "კონსულტაცია", desc: "პირდაპირი კომუნიკაცია ექსპერტთან" }
      ],
      tiers: [
        { name: "Basic", price: "$49", features: ["5 კვლევის ანალიზი", "ანგარიში 48 საათში", "ელფოსტით მხარდაჭერა"] },
        { name: "Standard", price: "$99", features: ["15 კვლევის ანალიზი", "ანგარიში 24 საათში", "პრიორიტეტული მხარდაჭერა", "1 კონსულტაცია"] },
        { name: "Premium", price: "$199", features: ["შეუზღუდავი კვლევები", "ანგარიში 12 საათში", "VIP მხარდაჭერა", "3 კონსულტაცია", "ყოველთვიური განახლება"] }
      ]
    }
  },
  en: {
    pageTitle: "Services",
    pageSubtitle: "Complete overview of Trial Navigator services",
    getStarted: "Get Started",
    contactUs: "Contact Us",

    globalSearch: {
      title: "Global Search",
      subtitle: "Search clinical trials worldwide",
      description: "Our global search system integrates 10+ international registries into one platform. You can simultaneously search ClinicalTrials.gov, WHO ICTRP, EU Clinical Trials Register and other leading platforms.",
      features: [
        { title: "10+ Registries", desc: "International registry integration" },
        { title: "190+ Countries", desc: "Trials from around the world" },
        { title: "Real-time", desc: "Automatic daily updates" },
        { title: "Filtering", desc: "Detailed search parameters" }
      ],
      registries: ["ClinicalTrials.gov", "WHO ICTRP", "EU CTR", "ANZCTR", "ChiCTR", "CTRI", "DRKS", "IRCT", "JPRN", "NTR"]
    },

    aiTranslation: {
      title: "AI Translation",
      subtitle: "Trial translation in 40+ languages",
      description: "Our artificial intelligence system provides accurate translation of clinical trials in 40+ languages, including Georgian. Medical terminology is translated with context awareness.",
      features: [
        { title: "40+ Languages", desc: "Including Georgian, Russian, English" },
        { title: "Medical Terms", desc: "Accurate medical terminology" },
        { title: "Contextual", desc: "AI analyzes context" },
        { title: "Instant", desc: "Translation in seconds" }
      ]
    },

    form100: {
      title: "Form 100 Analysis",
      subtitle: "Automatic diagnosis extraction",
      description: "Upload your Form 100 (medical document) and our AI system will automatically extract diagnosis, ICD codes and other important information. The system then searches for matching trials for your profile.",
      features: [
        { title: "Auto Extraction", desc: "AI extracts diagnosis and symptoms" },
        { title: "ICD Codes", desc: "International classification support" },
        { title: "Confidentiality", desc: "Your data is protected" },
        { title: "Fast Processing", desc: "Results in minutes" }
      ]
    },

    deepSearch: {
      title: "Deep Search",
      subtitle: "Personalized expert search",
      description: "Deep Search is a premium service where our team of medical experts personally searches for trials matching your profile. Experts find trials that AI might miss.",
      features: [
        { title: "Expert Team", desc: "Medical specialists" },
        { title: "Individual Approach", desc: "Personalized search" },
        { title: "Detailed Report", desc: "Full analysis and recommendations" },
        { title: "Consultation", desc: "Direct communication with expert" }
      ],
      tiers: [
        { name: "Basic", price: "$49", features: ["5 trial analysis", "Report in 48 hours", "Email support"] },
        { name: "Standard", price: "$99", features: ["15 trial analysis", "Report in 24 hours", "Priority support", "1 consultation"] },
        { name: "Premium", price: "$199", features: ["Unlimited trials", "Report in 12 hours", "VIP support", "3 consultations", "Monthly updates"] }
      ]
    }
  },
  ru: {
    pageTitle: "Услуги",
    pageSubtitle: "Полный обзор услуг Trial Navigator",
    getStarted: "Начать",
    contactUs: "Связаться",

    globalSearch: {
      title: "Глобальный поиск",
      subtitle: "Поиск клинических исследований по всему миру",
      description: "Наша система глобального поиска объединяет 10+ международных реестров на одной платформе. Вы можете одновременно искать в ClinicalTrials.gov, WHO ICTRP, EU Clinical Trials Register и других ведущих платформах.",
      features: [
        { title: "10+ реестров", desc: "Интеграция международных реестров" },
        { title: "190+ стран", desc: "Исследования со всего мира" },
        { title: "В реальном времени", desc: "Автоматическое ежедневное обновление" },
        { title: "Фильтрация", desc: "Детальные параметры поиска" }
      ],
      registries: ["ClinicalTrials.gov", "WHO ICTRP", "EU CTR", "ANZCTR", "ChiCTR", "CTRI", "DRKS", "IRCT", "JPRN", "NTR"]
    },

    aiTranslation: {
      title: "ИИ-перевод",
      subtitle: "Перевод исследований на 40+ языков",
      description: "Наша система искусственного интеллекта обеспечивает точный перевод клинических исследований на 40+ языков, включая грузинский. Медицинская терминология переводится с учётом контекста.",
      features: [
        { title: "40+ языков", desc: "Включая грузинский, русский, английский" },
        { title: "Медицинские термины", desc: "Точная медицинская терминология" },
        { title: "Контекстный", desc: "ИИ анализирует контекст" },
        { title: "Мгновенный", desc: "Перевод за секунды" }
      ]
    },

    form100: {
      title: "Анализ Формы 100",
      subtitle: "Автоматическое извлечение диагноза",
      description: "Загрузите Форму 100 (медицинский документ), и наша ИИ-система автоматически извлечёт диагноз, коды МКБ и другую важную информацию. Затем система найдёт подходящие исследования для вашего профиля.",
      features: [
        { title: "Автоизвлечение", desc: "ИИ извлекает диагноз и симптомы" },
        { title: "Коды МКБ", desc: "Поддержка международной классификации" },
        { title: "Конфиденциальность", desc: "Ваши данные защищены" },
        { title: "Быстрая обработка", desc: "Результат за минуты" }
      ]
    },

    deepSearch: {
      title: "Глубокий поиск",
      subtitle: "Персонализированный поиск экспертами",
      description: "Deep Search — премиум-услуга, где наша команда медицинских экспертов лично ищет исследования, подходящие вашему профилю. Эксперты находят исследования, которые ИИ может пропустить.",
      features: [
        { title: "Команда экспертов", desc: "Медицинские специалисты" },
        { title: "Индивидуальный подход", desc: "Персонализированный поиск" },
        { title: "Детальный отчёт", desc: "Полный анализ и рекомендации" },
        { title: "Консультация", desc: "Прямая связь с экспертом" }
      ],
      tiers: [
        { name: "Basic", price: "$49", features: ["Анализ 5 исследований", "Отчёт за 48 часов", "Поддержка по email"] },
        { name: "Standard", price: "$99", features: ["Анализ 15 исследований", "Отчёт за 24 часа", "Приоритетная поддержка", "1 консультация"] },
        { name: "Premium", price: "$199", features: ["Неограниченные исследования", "Отчёт за 12 часов", "VIP поддержка", "3 консультации", "Ежемесячные обновления"] }
      ]
    }
  }
};

export default function Services() {
  const { t: globalT, language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Trial Navigator</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {globalT('nav.pricing')}
            </Link>
            <Link href="/services" className="text-sm font-medium text-primary">
              {language === 'ka' ? 'სერვისები' : language === 'ru' ? 'Услуги' : 'Services'}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {globalT('nav.login')}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                {globalT('nav.register')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container relative py-12 md:py-16 px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{t.pageTitle}</h1>
            <p className="text-muted-foreground text-lg">{t.pageSubtitle}</p>
          </div>
        </div>
      </section>

      {/* Global Search Section */}
      <section id="global-search" className="container py-16 px-4 md:px-6 scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Globe className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t.globalSearch.title}</h2>
                <p className="text-muted-foreground text-sm">{t.globalSearch.subtitle}</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">{t.globalSearch.description}</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {t.globalSearch.features.map((feature, i) => (
                <div key={i} className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">{feature.title}</div>
                    <div className="text-xs text-muted-foreground">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/register">
              <Button className="gap-2">
                {t.getStarted}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Database className="h-5 w-5 text-muted-foreground" />
              {language === 'ka' ? 'ინტეგრირებული რეესტრები' : language === 'ru' ? 'Интегрированные реестры' : 'Integrated Registries'}
            </h3>
            <div className="flex flex-wrap gap-2">
              {t.globalSearch.registries.map((registry, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {registry}
                </Badge>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <Separator />

      {/* AI Translation Section */}
      <section id="ai-translation" className="container py-16 px-4 md:px-6 scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <Card className="p-6 order-2 lg:order-1">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Languages className="h-5 w-5 text-muted-foreground" />
              {language === 'ka' ? 'მხარდაჭერილი ენები' : language === 'ru' ? 'Поддерживаемые языки' : 'Supported Languages'}
            </h3>
            <div className="grid grid-cols-4 gap-2 text-sm text-muted-foreground">
              {['English', 'Georgian', 'Russian', 'German', 'French', 'Spanish', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Korean', 'Arabic'].map((lang, i) => (
                <div key={i} className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                  {lang}
                </div>
              ))}
              <div className="col-span-4 text-center mt-2 text-xs">
                {language === 'ka' ? '...და კიდევ 28+ ენა' : language === 'ru' ? '...и ещё 28+ языков' : '...and 28+ more'}
              </div>
            </div>
          </Card>
          <div className="order-1 lg:order-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Languages className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t.aiTranslation.title}</h2>
                <p className="text-muted-foreground text-sm">{t.aiTranslation.subtitle}</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">{t.aiTranslation.description}</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {t.aiTranslation.features.map((feature, i) => (
                <div key={i} className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">{feature.title}</div>
                    <div className="text-xs text-muted-foreground">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/register">
              <Button className="gap-2">
                {t.getStarted}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Separator />

      {/* Form 100 Section */}
      <section id="form-100" className="container py-16 px-4 md:px-6 scroll-mt-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <FileText className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{t.form100.title}</h2>
                <p className="text-muted-foreground text-sm">{t.form100.subtitle}</p>
              </div>
            </div>
            <p className="text-muted-foreground mb-6 leading-relaxed">{t.form100.description}</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-6">
              {t.form100.features.map((feature, i) => (
                <div key={i} className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-sm">{feature.title}</div>
                    <div className="text-xs text-muted-foreground">{feature.desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/register">
              <Button className="gap-2">
                {t.getStarted}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
          <Card className="p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-muted-foreground" />
              {language === 'ka' ? 'როგორ მუშაობს' : language === 'ru' ? 'Как это работает' : 'How It Works'}
            </h3>
            <div className="space-y-4">
              {[
                { step: 1, title: language === 'ka' ? 'ატვირთეთ დოკუმენტი' : language === 'ru' ? 'Загрузите документ' : 'Upload Document', desc: language === 'ka' ? 'ფორმა 100 ან სხვა სამედიცინო დოკუმენტი' : language === 'ru' ? 'Форма 100 или другой медицинский документ' : 'Form 100 or other medical document' },
                { step: 2, title: language === 'ka' ? 'AI ანალიზი' : language === 'ru' ? 'ИИ-анализ' : 'AI Analysis', desc: language === 'ka' ? 'ავტომატური დიაგნოზის ამოცნობა' : language === 'ru' ? 'Автоматическое извлечение диагноза' : 'Automatic diagnosis extraction' },
                { step: 3, title: language === 'ka' ? 'კვლევების ძიება' : language === 'ru' ? 'Поиск исследований' : 'Trial Search', desc: language === 'ka' ? 'შესაფერისი კვლევების მოძიება' : language === 'ru' ? 'Поиск подходящих исследований' : 'Find matching trials' },
                { step: 4, title: language === 'ka' ? 'შედეგები' : language === 'ru' ? 'Результаты' : 'Results', desc: language === 'ka' ? 'პერსონალიზებული რეკომენდაციები' : language === 'ru' ? 'Персонализированные рекомендации' : 'Personalized recommendations' }
              ].map((item, i) => (
                <div key={i} className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-primary">{item.step}</span>
                  </div>
                  <div>
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-muted-foreground">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <Separator />

      {/* Deep Search Section */}
      <section id="deep-search" className="container py-16 px-4 md:px-6 scroll-mt-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Search className="h-6 w-6 text-purple-500" />
              </div>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold mb-2">{t.deepSearch.title}</h2>
            <p className="text-muted-foreground">{t.deepSearch.subtitle}</p>
          </div>

          <p className="text-muted-foreground text-center max-w-3xl mx-auto mb-8 leading-relaxed">
            {t.deepSearch.description}
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12 max-w-4xl mx-auto">
            {t.deepSearch.features.map((feature, i) => (
              <div key={i} className="flex gap-3 p-4 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-sm">{feature.title}</div>
                  <div className="text-xs text-muted-foreground">{feature.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Deep Search Pricing Tiers */}
          <div className="grid md:grid-cols-3 gap-6">
            {t.deepSearch.tiers.map((tier, i) => (
              <Card key={i} className={i === 1 ? "border-primary shadow-lg relative" : ""}>
                {i === 1 && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                    {language === 'ka' ? 'რეკომენდებული' : language === 'ru' ? 'Рекомендуемый' : 'Recommended'}
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle>{tier.name}</CardTitle>
                  <div className="text-3xl font-bold mt-2">{tier.price}</div>
                  <CardDescription>
                    {language === 'ka' ? 'ერთჯერადი გადახდა' : language === 'ru' ? 'Разовый платёж' : 'One-time payment'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {tier.features.map((feature, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <div className="p-6 pt-0">
                  <Button className="w-full" variant={i === 1 ? "default" : "outline"}>
                    {language === 'ka' ? 'შეკვეთა' : language === 'ru' ? 'Заказать' : 'Order Now'}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-16 px-4 md:px-6">
        <Card className="bg-primary text-primary-foreground overflow-hidden max-w-4xl mx-auto">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 md:p-10">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold mb-2">
                {language === 'ka' ? 'მზად ხართ დასაწყებად?' : language === 'ru' ? 'Готовы начать?' : 'Ready to Get Started?'}
              </h2>
              <p className="text-primary-foreground/80">
                {language === 'ka' ? 'შექმენით უფასო ანგარიში და დაიწყეთ კვლევების ძიება' : language === 'ru' ? 'Создайте бесплатный аккаунт и начните поиск исследований' : 'Create a free account and start searching for trials'}
              </p>
            </div>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2 whitespace-nowrap">
                {t.getStarted}
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
                {globalT('nav.pricing')}
              </Link>
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {globalT('nav.home')}
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © 2024 Trial Navigator. {globalT('footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
