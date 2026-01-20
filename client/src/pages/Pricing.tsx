import { useState } from "react";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, Sparkles, Zap, Crown, Search, Loader2, FlaskConical, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PricingTier {
  id: string;
  name: Record<string, string>;
  description: Record<string, string>;
  price_monthly: number;
  price_yearly: number;
  features: Array<{ key: string; value: string | boolean }>;
  popular?: boolean;
  cta: string;
}

interface DeepSearchTier {
  id: string;
  name: Record<string, string>;
  price: number;
  includes: string[];
  popular?: boolean;
}

interface PricingData {
  tiers: PricingTier[];
  deep_search: DeepSearchTier[];
}

// Static fallback pricing data
const fallbackPricingData: PricingData = {
  tiers: [
    {
      id: "free",
      name: { ka: "უფასო", en: "Free", ru: "Бесплатно" },
      description: {
        ka: "იდეალურია დამწყებთათვის",
        en: "Perfect for getting started",
        ru: "Идеально для начала"
      },
      price_monthly: 0,
      price_yearly: 0,
      features: [
        { key: "searches", value: "5" },
        { key: "languages", value: "3" },
        { key: "digest", value: "weekly" },
        { key: "saved", value: "10" },
        { key: "deep_search", value: false },
        { key: "priority_support", value: false },
        { key: "api_access", value: false }
      ],
      cta: "get_started"
    },
    {
      id: "premium",
      name: { ka: "პრემიუმი", en: "Premium", ru: "Премиум" },
      description: {
        ka: "სერიოზული მომხმარებლებისთვის",
        en: "For serious users",
        ru: "Для серьёзных пользователей"
      },
      price_monthly: 19,
      price_yearly: 182,
      features: [
        { key: "searches", value: "50" },
        { key: "languages", value: "40+" },
        { key: "digest", value: "daily" },
        { key: "saved", value: "100" },
        { key: "deep_search", value: "10%" },
        { key: "priority_support", value: true },
        { key: "api_access", value: false }
      ],
      popular: true,
      cta: "subscribe"
    },
    {
      id: "premium_plus",
      name: { ka: "პრემიუმი+", en: "Premium+", ru: "Премиум+" },
      description: {
        ka: "პროფესიონალებისთვის",
        en: "For professionals",
        ru: "Для профессионалов"
      },
      price_monthly: 49,
      price_yearly: 470,
      features: [
        { key: "searches", value: "unlimited" },
        { key: "languages", value: "40+" },
        { key: "digest", value: "realtime" },
        { key: "saved", value: "unlimited" },
        { key: "deep_search", value: "25%" },
        { key: "priority_support", value: true },
        { key: "api_access", value: true }
      ],
      cta: "subscribe"
    }
  ],
  deep_search: [
    {
      id: "basic",
      name: { ka: "Basic", en: "Basic", ru: "Basic" },
      price: 49,
      includes: ["5 კვლევის ანალიზი", "48 საათში", "ელფოსტით მხარდაჭერა"]
    },
    {
      id: "standard",
      name: { ka: "Standard", en: "Standard", ru: "Standard" },
      price: 99,
      includes: ["15 კვლევის ანალიზი", "24 საათში", "პრიორიტეტული მხარდაჭერა", "1 კონსულტაცია"],
      popular: true
    },
    {
      id: "premium",
      name: { ka: "Premium", en: "Premium", ru: "Premium" },
      price: 199,
      includes: ["შეუზღუდავი კვლევები", "12 საათში", "VIP მხარდაჭერა", "3 კონსულტაცია"]
    }
  ]
};

const translations = {
  en: {
    title: "Choose Your Plan",
    subtitle: "Find clinical trials that matter to you",
    monthly: "Monthly",
    yearly: "Yearly",
    save: "Save 20%",
    perMonth: "/month",
    perYear: "/year",
    currentPlan: "Current Plan",
    subscribe: "Subscribe",
    getStarted: "Get Started",
    deepSearchTitle: "Deep Search",
    deepSearchSubtitle: "Get personalized trial research from our experts",
    features: {
      searches: "Daily searches",
      languages: "Translation languages",
      digest: "Email digest",
      saved: "Saved trials",
      deep_search: "Deep Search discount",
      priority_support: "Priority support",
      api_access: "API access",
    },
    digestOptions: {
      weekly: "Weekly",
      daily: "Daily",
      realtime: "Real-time",
    },
    included: "Included",
    notIncluded: "Not included",
    unlimited: "Unlimited",
    questions: "Questions? Contact us at support@trialnavigator.com"
  },
  ka: {
    title: "აირჩიეთ გეგმა",
    subtitle: "იპოვეთ თქვენთვის მნიშვნელოვანი კლინიკური კვლევები",
    monthly: "თვიური",
    yearly: "წლიური",
    save: "დაზოგეთ 20%",
    perMonth: "/თვე",
    perYear: "/წელი",
    currentPlan: "მიმდინარე გეგმა",
    subscribe: "გამოწერა",
    getStarted: "დაწყება",
    deepSearchTitle: "ღრმა ძიება",
    deepSearchSubtitle: "მიიღეთ პერსონალიზებული კვლევა ჩვენი ექსპერტებისგან",
    features: {
      searches: "ყოველდღიური ძიებები",
      languages: "თარგმანის ენები",
      digest: "ელფოსტის დაიჯესტი",
      saved: "შენახული კვლევები",
      deep_search: "ღრმა ძიების ფასდაკლება",
      priority_support: "პრიორიტეტული მხარდაჭერა",
      api_access: "API წვდომა",
    },
    digestOptions: {
      weekly: "კვირეული",
      daily: "ყოველდღიური",
      realtime: "რეალურ დროში",
    },
    included: "შედის",
    notIncluded: "არ შედის",
    unlimited: "შეუზღუდავი",
    questions: "გაქვთ კითხვები? დაგვიკავშირდით support@trialnavigator.com"
  },
  ru: {
    title: "Выберите план",
    subtitle: "Найдите важные для вас клинические исследования",
    monthly: "Ежемесячно",
    yearly: "Ежегодно",
    save: "Скидка 20%",
    perMonth: "/мес",
    perYear: "/год",
    currentPlan: "Текущий план",
    subscribe: "Подписаться",
    getStarted: "Начать",
    deepSearchTitle: "Глубокий поиск",
    deepSearchSubtitle: "Получите персонализированное исследование от наших экспертов",
    features: {
      searches: "Поисков в день",
      languages: "Языков перевода",
      digest: "Email-дайджест",
      saved: "Сохранённых исследований",
      deep_search: "Скидка на Deep Search",
      priority_support: "Приоритетная поддержка",
      api_access: "Доступ к API",
    },
    digestOptions: {
      weekly: "Еженедельный",
      daily: "Ежедневный",
      realtime: "В реальном времени",
    },
    included: "Включено",
    notIncluded: "Не включено",
    unlimited: "Неограниченно",
    questions: "Есть вопросы? Свяжитесь с нами: support@trialnavigator.com"
  },
};

const tierIcons: Record<string, React.ReactNode> = {
  free: <Zap className="h-6 w-6" />,
  premium: <Sparkles className="h-6 w-6" />,
  premium_plus: <Crown className="h-6 w-6" />,
};

export default function Pricing() {
  const { t: globalT, language } = useLanguage();
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(false);
  const t = translations[language as keyof typeof translations] || translations.en;

  // Fetch pricing data with fallback
  const { data: pricingData, isLoading } = useQuery<PricingData>({
    queryKey: ["pricing"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/payments/pricing");
        if (!res.ok) throw new Error("Failed to fetch pricing");
        const data = await res.json();
        // If no tiers returned, use fallback
        if (!data?.tiers?.length) return fallbackPricingData;
        return data;
      } catch {
        return fallbackPricingData;
      }
    },
    initialData: fallbackPricingData,
  });

  // Create checkout session
  const checkoutMutation = useMutation({
    mutationFn: async ({ tier, billingPeriod }: { tier: string; billingPeriod: string }) => {
      const res = await fetch("/api/payments/checkout/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": "current-user-id",
        },
        body: JSON.stringify({ tier, billing_period: billingPeriod }),
      });
      if (!res.ok) throw new Error("Failed to create checkout");
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to start checkout. Please try again.",
      });
    },
  });

  const handleSubscribe = (tierId: string) => {
    if (tierId === "free") return;
    checkoutMutation.mutate({
      tier: tierId,
      billingPeriod: isYearly ? "yearly" : "monthly",
    });
  };

  const formatFeatureValue = (key: string, value: string | boolean): { text: string; included: boolean } => {
    if (typeof value === "boolean") {
      return { text: value ? t.included : t.notIncluded, included: value };
    }
    if (key === "digest" && t.digestOptions[value as keyof typeof t.digestOptions]) {
      return { text: t.digestOptions[value as keyof typeof t.digestOptions], included: true };
    }
    if (value === "unlimited") {
      return { text: t.unlimited, included: true };
    }
    if (key === "deep_search" && typeof value === "string" && value.includes("%")) {
      return { text: value + " " + (language === 'ka' ? 'ფასდაკლება' : language === 'ru' ? 'скидка' : 'discount'), included: true };
    }
    return { text: value, included: true };
  };

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
            <Link href="/pricing" className="text-sm font-medium text-primary">
              {globalT('nav.pricing')}
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

      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{t.title}</h1>
          <p className="text-lg text-muted-foreground mb-8">{t.subtitle}</p>

          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-4">
            <Label
              htmlFor="billing-toggle"
              className={!isYearly ? "font-semibold" : "text-muted-foreground"}
            >
              {t.monthly}
            </Label>
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
            />
            <Label
              htmlFor="billing-toggle"
              className={isYearly ? "font-semibold" : "text-muted-foreground"}
            >
              {t.yearly}
              <Badge variant="secondary" className="ml-2">
                {t.save}
              </Badge>
            </Label>
          </div>
        </div>

        {/* Pricing tiers */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {pricingData?.tiers.map((tier) => {
              const price = isYearly ? tier.price_yearly : tier.price_monthly;
              const period = isYearly ? t.perYear : t.perMonth;
              const name = tier.name[language] || tier.name.en;
              const description = tier.description[language] || tier.description.en;

              return (
                <Card
                  key={tier.id}
                  className={`relative flex flex-col ${
                    tier.popular
                      ? "border-primary shadow-lg scale-[1.02]"
                      : ""
                  }`}
                >
                  {tier.popular && (
                    <Badge
                      className="absolute -top-3 left-1/2 -translate-x-1/2"
                      variant="default"
                    >
                      {language === "ka" ? "პოპულარული" : language === "ru" ? "Популярный" : "Most Popular"}
                    </Badge>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-3 p-3 rounded-full bg-primary/10 w-fit">
                      {tierIcons[tier.id]}
                    </div>
                    <CardTitle className="text-xl">{name}</CardTitle>
                    <CardDescription className="text-sm">{description}</CardDescription>
                  </CardHeader>

                  <CardContent className="text-center flex-1">
                    <div className="mb-6">
                      <span className="text-4xl font-bold">
                        {price === 0 ? (language === "ka" ? "უფასო" : language === "ru" ? "Бесплатно" : "Free") : `$${price}`}
                      </span>
                      {price > 0 && (
                        <span className="text-muted-foreground text-sm">{period}</span>
                      )}
                    </div>

                    <ul className="space-y-3 text-left">
                      {tier.features.map((feature) => {
                        const { text, included } = formatFeatureValue(feature.key, feature.value);
                        return (
                          <li key={feature.key} className="flex items-start gap-2">
                            {included ? (
                              <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                            ) : (
                              <X className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                            )}
                            <span className={`text-sm ${!included ? 'text-muted-foreground' : ''}`}>
                              <span className="text-muted-foreground">
                                {t.features[feature.key as keyof typeof t.features] || feature.key}:
                              </span>{" "}
                              <span className={`font-medium ${!included ? 'text-muted-foreground' : ''}`}>
                                {text}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>

                  <CardFooter className="pt-4">
                    <Button
                      className="w-full"
                      variant={tier.popular ? "default" : "outline"}
                      disabled={checkoutMutation.isPending}
                      onClick={() => tier.id === "free" ? window.location.href = "/register" : handleSubscribe(tier.id)}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : null}
                      {tier.id === "free" ? t.getStarted : t.subscribe}
                    </Button>
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}

        <Separator className="my-12" />

        {/* Deep Search section */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Search className="h-7 w-7 text-primary" />
            <h2 className="text-2xl md:text-3xl font-bold">{t.deepSearchTitle}</h2>
          </div>
          <p className="text-muted-foreground">{t.deepSearchSubtitle}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {pricingData?.deep_search.map((tier) => {
            const name = tier.name[language] || tier.name.en;

            return (
              <Card
                key={tier.id}
                className={`relative ${tier.popular ? "border-primary shadow-lg" : ""}`}
              >
                {tier.popular && (
                  <Badge
                    className="absolute -top-3 left-1/2 -translate-x-1/2"
                    variant="default"
                  >
                    {language === "ka" ? "რეკომენდებული" : language === "ru" ? "Рекомендуемый" : "Recommended"}
                  </Badge>
                )}

                <CardHeader className="text-center">
                  <CardTitle className="text-lg">{name}</CardTitle>
                  <div className="text-3xl font-bold mt-2">${tier.price}</div>
                  <CardDescription className="text-sm">
                    {language === "ka" ? "ერთჯერადი გადახდა" : language === "ru" ? "Разовый платёж" : "One-time payment"}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-2">
                    {tier.includes.map((item, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button className="w-full" variant={tier.popular ? "default" : "outline"}>
                    {language === "ka" ? "შეკვეთა" : language === "ru" ? "Заказать" : "Order Now"}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* FAQ or additional info */}
        <div className="mt-16 text-center text-sm text-muted-foreground">
          <p>{t.questions}</p>
        </div>
      </div>

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
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {globalT('nav.home')}
              </Link>
              <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {language === 'ka' ? 'სერვისები' : language === 'ru' ? 'Услуги' : 'Services'}
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
