import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Check, Sparkles, Zap, Crown, Search, Loader2 } from "lucide-react";
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
      saved: "Сохраненных исследований",
      deep_search: "Скидка на Deep Search",
      priority_support: "Приоритетная поддержка",
      api_access: "Доступ к API",
    },
    digestOptions: {
      weekly: "Еженедельный",
      daily: "Ежедневный",
      realtime: "В реальном времени",
    },
  },
};

const tierIcons: Record<string, React.ReactNode> = {
  free: <Zap className="h-6 w-6" />,
  premium: <Sparkles className="h-6 w-6" />,
  premium_plus: <Crown className="h-6 w-6" />,
};

export default function Pricing() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const [isYearly, setIsYearly] = useState(false);
  const t = translations[language as keyof typeof translations] || translations.en;

  // Fetch pricing data
  const { data: pricingData, isLoading } = useQuery<PricingData>({
    queryKey: ["pricing"],
    queryFn: async () => {
      const res = await fetch("/api/payments/pricing");
      if (!res.ok) throw new Error("Failed to fetch pricing");
      return res.json();
    },
  });

  // Create checkout session
  const checkoutMutation = useMutation({
    mutationFn: async ({ tier, billingPeriod }: { tier: string; billingPeriod: string }) => {
      const res = await fetch("/api/payments/checkout/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-ID": "current-user-id", // Should come from auth
        },
        body: JSON.stringify({ tier, billing_period: billingPeriod }),
      });
      if (!res.ok) throw new Error("Failed to create checkout");
      return res.json();
    },
    onSuccess: (data) => {
      // Redirect to Stripe Checkout
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

  const formatFeatureValue = (key: string, value: string | boolean): string => {
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (key === "digest" && t.digestOptions[value as keyof typeof t.digestOptions]) {
      return t.digestOptions[value as keyof typeof t.digestOptions];
    }
    if (value === "unlimited") {
      return language === "ka" ? "შეუზღუდავი" : language === "ru" ? "Неограниченно" : "Unlimited";
    }
    return value;
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">{t.title}</h1>
        <p className="text-xl text-muted-foreground mb-8">{t.subtitle}</p>

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
      <div className="grid md:grid-cols-3 gap-6 mb-16">
        {pricingData?.tiers.map((tier) => {
          const price = isYearly ? tier.price_yearly : tier.price_monthly;
          const period = isYearly ? t.perYear : t.perMonth;
          const name = tier.name[language] || tier.name.en;
          const description = tier.description[language] || tier.description.en;

          return (
            <Card
              key={tier.id}
              className={`relative ${
                tier.popular
                  ? "border-primary shadow-lg scale-105"
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

              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 w-fit">
                  {tierIcons[tier.id]}
                </div>
                <CardTitle className="text-2xl">{name}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>

              <CardContent className="text-center">
                <div className="mb-6">
                  <span className="text-4xl font-bold">
                    {price === 0 ? (language === "ka" ? "უფასო" : language === "ru" ? "Бесплатно" : "Free") : `$${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-muted-foreground">{period}</span>
                  )}
                </div>

                <ul className="space-y-3 text-left">
                  {tier.features.map((feature) => (
                    <li key={feature.key} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm">
                        <span className="text-muted-foreground">
                          {t.features[feature.key as keyof typeof t.features] || feature.key}:
                        </span>{" "}
                        <span className="font-medium">
                          {formatFeatureValue(feature.key, feature.value)}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>

              <CardFooter>
                <Button
                  className="w-full"
                  variant={tier.popular ? "default" : "outline"}
                  disabled={tier.id === "free" || checkoutMutation.isPending}
                  onClick={() => handleSubscribe(tier.id)}
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {tier.id === "free"
                    ? t.currentPlan
                    : t.subscribe}
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      <Separator className="my-12" />

      {/* Deep Search section */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Search className="h-8 w-8 text-primary" />
          <h2 className="text-3xl font-bold">{t.deepSearchTitle}</h2>
        </div>
        <p className="text-lg text-muted-foreground">{t.deepSearchSubtitle}</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {pricingData?.deep_search.map((tier) => {
          const name = tier.name[language] || tier.name.en;

          return (
            <Card
              key={tier.id}
              className={tier.popular ? "border-primary shadow-lg" : ""}
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
                <CardTitle>{name}</CardTitle>
                <div className="text-3xl font-bold mt-2">${tier.price}</div>
                <CardDescription>
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

      {/* FAQ or additional info could go here */}
      <div className="mt-16 text-center text-sm text-muted-foreground">
        <p>
          {language === "ka"
            ? "გაქვთ კითხვები? დაგვიკავშირდით support@trialnavigator.com"
            : language === "ru"
            ? "Есть вопросы? Свяжитесь с нами: support@trialnavigator.com"
            : "Questions? Contact us at support@trialnavigator.com"}
        </p>
      </div>
    </div>
  );
}
