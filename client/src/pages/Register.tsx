import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FlaskConical, Check } from "lucide-react";

const translations = {
  ka: {
    title: "რეგისტრაცია",
    subtitle: "შექმენით ანგარიში თქვენი Replit-ით",
    registerButton: "რეგისტრაცია Replit-ით",
    benefits: {
      title: "რას მიიღებთ:",
      items: [
        "უფასო წვდომა 1M+ კლინიკურ კვლევაზე",
        "AI-ით მართული მოძიება",
        "პერსონალური რეკომენდაციები",
        "40+ ენაზე თარგმნა"
      ]
    },
    hasAccount: "უკვე გაქვთ ანგარიში?",
    login: "შესვლა",
    or: "ან",
    backToHome: "მთავარ გვერდზე დაბრუნება"
  },
  en: {
    title: "Create Account",
    subtitle: "Create an account using your Replit",
    registerButton: "Sign up with Replit",
    benefits: {
      title: "What you'll get:",
      items: [
        "Free access to 1M+ clinical trials",
        "AI-powered search",
        "Personalized recommendations",
        "Translation in 40+ languages"
      ]
    },
    hasAccount: "Already have an account?",
    login: "Sign in",
    or: "or",
    backToHome: "Back to Home"
  },
  ru: {
    title: "Регистрация",
    subtitle: "Создайте аккаунт с помощью Replit",
    registerButton: "Зарегистрироваться через Replit",
    benefits: {
      title: "Что вы получите:",
      items: [
        "Бесплатный доступ к 1M+ клинических исследований",
        "Поиск на основе ИИ",
        "Персонализированные рекомендации",
        "Перевод на 40+ языков"
      ]
    },
    hasAccount: "Уже есть аккаунт?",
    login: "Войти",
    or: "или",
    backToHome: "Вернуться на главную"
  }
};

export default function Register() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  const handleRegister = () => {
    // Redirect to Replit OAuth (same as login, Replit handles both)
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
      {/* Header */}
      <header className="w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Trial Navigator</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Register Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Benefits list */}
            <div className="space-y-3">
              <p className="text-sm font-medium">{t.benefits.title}</p>
              <ul className="space-y-2">
                {t.benefits.items.map((item, index) => (
                  <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <Button
              onClick={handleRegister}
              className="w-full h-12 text-lg"
              size="lg"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12zm10-6a1 1 0 0 0-1 1v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7a1 1 0 0 0-1-1z"/>
              </svg>
              {t.registerButton}
            </Button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t.or}</span>
              </div>
            </div>

            <Link href="/">
              <Button variant="outline" className="w-full">
                {t.backToHome}
              </Button>
            </Link>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              {t.hasAccount}{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                {t.login}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
