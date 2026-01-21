import { useEffect } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { FlaskConical, Loader2 } from "lucide-react";

const translations = {
  ka: {
    title: "შესვლა",
    subtitle: "გამოიყენეთ თქვენი Replit ანგარიში შესასვლელად",
    loginButton: "შესვლა Replit-ით",
    redirecting: "გადამისამართება...",
    noAccount: "არ გაქვთ ანგარიში?",
    register: "რეგისტრაცია",
    or: "ან",
    backToHome: "მთავარ გვერდზე დაბრუნება"
  },
  en: {
    title: "Sign In",
    subtitle: "Use your Replit account to sign in",
    loginButton: "Sign in with Replit",
    redirecting: "Redirecting...",
    noAccount: "Don't have an account?",
    register: "Register",
    or: "or",
    backToHome: "Back to Home"
  },
  ru: {
    title: "Вход",
    subtitle: "Используйте свою учетную запись Replit для входа",
    loginButton: "Войти через Replit",
    redirecting: "Перенаправление...",
    noAccount: "Нет аккаунта?",
    register: "Регистрация",
    or: "или",
    backToHome: "Вернуться на главную"
  }
};

export default function Login() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  const handleLogin = () => {
    // Redirect to Replit OAuth
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

      {/* Login Card */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleLogin}
              className="w-full h-12 text-lg"
              size="lg"
            >
              <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10S2 17.523 2 12zm10-6a1 1 0 0 0-1 1v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7a1 1 0 0 0-1-1z"/>
              </svg>
              {t.loginButton}
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
              {t.noAccount}{" "}
              <Link href="/register" className="text-primary hover:underline font-medium">
                {t.register}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
