import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Check,
  X,
  Newspaper,
  Zap,
  Sparkles,
  Crown,
  MessageSquare,
  Mail,
  BookOpen,
  Globe,
  ArrowLeft,
} from "lucide-react";

const translations = {
  ka: {
    brandName: "MedNews",
    brandTagline: "თქვენი პერსონალური სამედიცინო გაზეთი",
    title: "აირჩიეთ თქვენი გეგმა",
    subtitle: "მიიღეთ პერსონალიზებული სამედიცინო სიახლეები თქვენს შვილზე",
    monthly: "თვიური",
    yearly: "წლიური",
    save: "დაზოგეთ 20%",
    perMonth: "/თვე",
    perYear: "/წელი",
    getStarted: "დაწყება",
    subscribe: "გამოწერა",
    contact: "დაგვიკავშირდით",
    currentPlan: "მიმდინარე გეგმა",
    mostPopular: "პოპულარული",
    plans: {
      free: {
        name: "უფასო",
        description: "დამწყებთათვის",
        price: 0,
        features: [
          { text: "5 კითხვა თვეში", included: true },
          { text: "პერსონალური ფიდი", included: true },
          { text: "20 შენახული სტატია", included: true },
          { text: "2 ენაზე თარგმანი", included: true },
          { text: "მკვლევრებთან კონტაქტი", included: false },
          { text: "ღრმა კვლევა", included: false },
          { text: "პრიორიტეტული მხარდაჭერა", included: false },
        ],
      },
      standard: {
        name: "სტანდარტი",
        description: "აქტიური მშობლებისთვის",
        price: 25,
        features: [
          { text: "100 კითხვა თვეში", included: true },
          { text: "პერსონალური ფიდი", included: true },
          { text: "500 შენახული სტატია", included: true },
          { text: "40+ ენაზე თარგმანი", included: true },
          { text: "მკვლევრებთან კონტაქტი", included: true },
          { text: "ღრმა კვლევა", included: true },
          { text: "პრიორიტეტული მხარდაჭერა", included: false },
        ],
      },
      premium: {
        name: "პრემიუმ",
        description: "მაქსიმალური შესაძლებლობები",
        price: 60,
        features: [
          { text: "შეუზღუდავი კითხვები", included: true },
          { text: "პერსონალური ფიდი", included: true },
          { text: "შეუზღუდავი შენახვა", included: true },
          { text: "40+ ენაზე თარგმანი", included: true },
          { text: "მკვლევრებთან კონტაქტი", included: true },
          { text: "ღრმა კვლევა", included: true },
          { text: "პრიორიტეტული მხარდაჭერა", included: true },
        ],
      },
    },
    faq: {
      title: "ხშირად დასმული კითხვები",
      items: [
        {
          q: "როგორ მუშაობს AI კითხვა-პასუხი?",
          a: "ჩვენი სისტემა იყენებს 5 AI მოდელს (GPT-4, Claude, Gemini, Grok, Perplexity) და აბრუნებს კონსენსუს პასუხს ციტატებით.",
        },
        {
          q: "შემიძლია ნებისმიერ დროს გავაუქმო გამოწერა?",
          a: "დიახ, გამოწერა შეგიძლიათ გააუქმოთ ნებისმიერ დროს. თქვენი წვდომა გაგრძელდება მიმდინარე პერიოდის ბოლომდე.",
        },
        {
          q: "რა არის ღრმა კვლევა?",
          a: "ღრმა კვლევა იძლევა დეტალურ ანალიზს თქვენს მდგომარეობასთან დაკავშირებით, მოიცავს მრავალ წყაროს და პროფესიონალურ მიმოხილვას.",
        },
      ],
    },
    backToHome: "მთავარზე დაბრუნება",
    questions: "გაქვთ კითხვები? დაგვიკავშირდით support@mednews.ge",
  },
  en: {
    brandName: "MedNews",
    brandTagline: "Your Personal Medical Newspaper",
    title: "Choose Your Plan",
    subtitle: "Get personalized medical news about your child",
    monthly: "Monthly",
    yearly: "Yearly",
    save: "Save 20%",
    perMonth: "/month",
    perYear: "/year",
    getStarted: "Get Started",
    subscribe: "Subscribe",
    contact: "Contact Us",
    currentPlan: "Current Plan",
    mostPopular: "Most Popular",
    plans: {
      free: {
        name: "Free",
        description: "For beginners",
        price: 0,
        features: [
          { text: "5 questions per month", included: true },
          { text: "Personalized feed", included: true },
          { text: "20 saved articles", included: true },
          { text: "Translation in 2 languages", included: true },
          { text: "Contact researchers", included: false },
          { text: "Deep research", included: false },
          { text: "Priority support", included: false },
        ],
      },
      standard: {
        name: "Standard",
        description: "For active parents",
        price: 25,
        features: [
          { text: "100 questions per month", included: true },
          { text: "Personalized feed", included: true },
          { text: "500 saved articles", included: true },
          { text: "Translation in 40+ languages", included: true },
          { text: "Contact researchers", included: true },
          { text: "Deep research", included: true },
          { text: "Priority support", included: false },
        ],
      },
      premium: {
        name: "Premium",
        description: "Maximum capabilities",
        price: 60,
        features: [
          { text: "Unlimited questions", included: true },
          { text: "Personalized feed", included: true },
          { text: "Unlimited saved articles", included: true },
          { text: "Translation in 40+ languages", included: true },
          { text: "Contact researchers", included: true },
          { text: "Deep research", included: true },
          { text: "Priority support", included: true },
        ],
      },
    },
    faq: {
      title: "Frequently Asked Questions",
      items: [
        {
          q: "How does AI Q&A work?",
          a: "Our system uses 5 AI models (GPT-4, Claude, Gemini, Grok, Perplexity) and returns a consensus answer with citations.",
        },
        {
          q: "Can I cancel my subscription anytime?",
          a: "Yes, you can cancel your subscription at any time. Your access will continue until the end of the current billing period.",
        },
        {
          q: "What is deep research?",
          a: "Deep research provides detailed analysis related to your condition, including multiple sources and professional review.",
        },
      ],
    },
    backToHome: "Back to Home",
    questions: "Have questions? Contact us at support@mednews.com",
  },
  ru: {
    brandName: "MedNews",
    brandTagline: "Ваша персональная медицинская газета",
    title: "Выберите план",
    subtitle: "Получайте персонализированные медицинские новости о вашем ребёнке",
    monthly: "Ежемесячно",
    yearly: "Ежегодно",
    save: "Скидка 20%",
    perMonth: "/месяц",
    perYear: "/год",
    getStarted: "Начать",
    subscribe: "Подписаться",
    contact: "Связаться",
    currentPlan: "Текущий план",
    mostPopular: "Популярный",
    plans: {
      free: {
        name: "Бесплатно",
        description: "Для начинающих",
        price: 0,
        features: [
          { text: "5 вопросов в месяц", included: true },
          { text: "Персональная лента", included: true },
          { text: "20 сохранённых статей", included: true },
          { text: "Перевод на 2 языка", included: true },
          { text: "Связь с исследователями", included: false },
          { text: "Глубокое исследование", included: false },
          { text: "Приоритетная поддержка", included: false },
        ],
      },
      standard: {
        name: "Стандарт",
        description: "Для активных родителей",
        price: 25,
        features: [
          { text: "100 вопросов в месяц", included: true },
          { text: "Персональная лента", included: true },
          { text: "500 сохранённых статей", included: true },
          { text: "Перевод на 40+ языков", included: true },
          { text: "Связь с исследователями", included: true },
          { text: "Глубокое исследование", included: true },
          { text: "Приоритетная поддержка", included: false },
        ],
      },
      premium: {
        name: "Премиум",
        description: "Максимальные возможности",
        price: 60,
        features: [
          { text: "Неограниченные вопросы", included: true },
          { text: "Персональная лента", included: true },
          { text: "Неограниченное сохранение", included: true },
          { text: "Перевод на 40+ языков", included: true },
          { text: "Связь с исследователями", included: true },
          { text: "Глубокое исследование", included: true },
          { text: "Приоритетная поддержка", included: true },
        ],
      },
    },
    faq: {
      title: "Часто задаваемые вопросы",
      items: [
        {
          q: "Как работает AI вопрос-ответ?",
          a: "Наша система использует 5 AI моделей (GPT-4, Claude, Gemini, Grok, Perplexity) и возвращает консенсусный ответ с цитатами.",
        },
        {
          q: "Могу ли я отменить подписку в любое время?",
          a: "Да, вы можете отменить подписку в любое время. Ваш доступ продолжится до конца текущего расчётного периода.",
        },
        {
          q: "Что такое глубокое исследование?",
          a: "Глубокое исследование предоставляет детальный анализ вашего состояния, включая множество источников и профессиональный обзор.",
        },
      ],
    },
    backToHome: "На главную",
    questions: "Есть вопросы? Свяжитесь с нами: support@mednews.com",
  },
};

const planIcons = {
  free: <Zap className="h-6 w-6" />,
  standard: <Sparkles className="h-6 w-6" />,
  premium: <Crown className="h-6 w-6" />,
};

const planGradients = {
  free: "from-slate-500 to-slate-600",
  standard: "from-blue-500 via-purple-500 to-pink-500",
  premium: "from-amber-500 via-orange-500 to-red-500",
};

export default function Pricing() {
  const { language } = useLanguage();
  const [isYearly, setIsYearly] = useState(false);
  const t = translations[language as keyof typeof translations] || translations.en;

  const getPrice = (monthlyPrice: number) => {
    if (monthlyPrice === 0) return 0;
    return isYearly ? Math.round(monthlyPrice * 12 * 0.8) : monthlyPrice;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 dark:from-slate-950 dark:via-blue-950/30 dark:to-purple-950/30">
      {/* Header */}
      <header className="w-full border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-shadow">
              <Newspaper className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {t.brandName}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {t.brandTagline}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {language === "ka" ? "შესვლა" : language === "ru" ? "Войти" : "Login"}
              </Button>
            </Link>
            <Link href="/register">
              <Button
                size="sm"
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700"
              >
                {language === "ka" ? "რეგისტრაცია" : language === "ru" ? "Регистрация" : "Register"}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 max-w-6xl">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">{t.backToHome}</span>
        </Link>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            {t.title}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">{t.subtitle}</p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-full px-6 py-3 w-fit mx-auto shadow-lg">
            <Label
              htmlFor="billing-toggle"
              className={`cursor-pointer transition-colors ${!isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {t.monthly}
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-600 data-[state=checked]:to-purple-600"
            />
            <Label
              htmlFor="billing-toggle"
              className={`cursor-pointer transition-colors flex items-center gap-2 ${isYearly ? "font-semibold text-foreground" : "text-muted-foreground"}`}
            >
              {t.yearly}
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                {t.save}
              </Badge>
            </Label>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {(["free", "standard", "premium"] as const).map((planKey) => {
            const plan = t.plans[planKey];
            const isPopular = planKey === "standard";
            const price = getPrice(plan.price);

            return (
              <Card
                key={planKey}
                className={`relative flex flex-col border-0 shadow-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm overflow-hidden ${
                  isPopular ? "ring-2 ring-purple-500 scale-105 z-10" : ""
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white text-center py-2 text-sm font-semibold">
                    {t.mostPopular}
                  </div>
                )}

                <CardHeader className={`text-center ${isPopular ? "pt-12" : "pt-6"}`}>
                  <div className={`mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br ${planGradients[planKey]} w-fit shadow-lg`}>
                    <div className="text-white">{planIcons[planKey]}</div>
                  </div>
                  <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                  <CardDescription className="text-base">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="text-center flex-1">
                  <div className="mb-6">
                    {price === 0 ? (
                      <span className="text-4xl font-bold">
                        {language === "ka" ? "უფასო" : language === "ru" ? "Бесплатно" : "Free"}
                      </span>
                    ) : (
                      <>
                        <span className="text-4xl font-bold">
                          {language === "ka" ? "₾" : "$"}{price}
                        </span>
                        <span className="text-muted-foreground">
                          {isYearly ? t.perYear : t.perMonth}
                        </span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-3 text-left">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        {feature.included ? (
                          <div className="h-5 w-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <X className="h-3 w-3 text-slate-400" />
                          </div>
                        )}
                        <span className={feature.included ? "text-foreground" : "text-muted-foreground"}>
                          {feature.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter className="pt-4">
                  <Link href="/register" className="w-full">
                    <Button
                      className={`w-full h-12 text-base font-semibold transition-all ${
                        isPopular
                          ? "bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl"
                          : "bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900"
                      }`}
                    >
                      {planKey === "free" ? t.getStarted : t.subscribe}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Features Grid */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-center mb-8">
            {language === "ka" ? "რა შედის ყველა გეგმაში" : language === "ru" ? "Что включено во все планы" : "What's included in all plans"}
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: <BookOpen className="h-6 w-6" />,
                title: language === "ka" ? "პერსონალური ფიდი" : language === "ru" ? "Персональная лента" : "Personalized Feed",
                desc: language === "ka" ? "AI-ით შერჩეული სტატიები" : language === "ru" ? "Статьи, подобранные AI" : "AI-curated articles",
              },
              {
                icon: <MessageSquare className="h-6 w-6" />,
                title: language === "ka" ? "AI კითხვა-პასუხი" : language === "ru" ? "AI вопрос-ответ" : "AI Q&A",
                desc: language === "ka" ? "5 AI მოდელის კონსენსუსი" : language === "ru" ? "Консенсус 5 AI моделей" : "5 AI model consensus",
              },
              {
                icon: <Globe className="h-6 w-6" />,
                title: language === "ka" ? "მულტიენოვანი" : language === "ru" ? "Многоязычность" : "Multi-language",
                desc: language === "ka" ? "40+ ენაზე თარგმანი" : language === "ru" ? "Перевод на 40+ языков" : "Translation in 40+ languages",
              },
              {
                icon: <Mail className="h-6 w-6" />,
                title: language === "ka" ? "შეტყობინებები" : language === "ru" ? "Уведомления" : "Notifications",
                desc: language === "ka" ? "ახალი კვლევების შესახებ" : language === "ru" ? "О новых исследованиях" : "About new research",
              },
            ].map((feature, index) => (
              <div key={index} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 text-center shadow-lg">
                <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center text-white">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">{t.faq.title}</h2>
          <div className="space-y-4">
            {t.faq.items.map((item, index) => (
              <div key={index} className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl p-6 shadow-lg">
                <h3 className="font-semibold mb-2">{item.q}</h3>
                <p className="text-muted-foreground">{item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contact */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>{t.questions}</p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-6">
        <div className="container px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center">
                <Newspaper className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                {t.brandName}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 {t.brandName}. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
