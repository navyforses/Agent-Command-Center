import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const translations = {
  ka: {
    title: "შესვლა",
    subtitle: "შედით თქვენი ანგარიშით",
    emailLabel: "ელ-ფოსტა",
    emailPlaceholder: "თქვენი@email.com",
    passwordLabel: "პაროლი",
    passwordPlaceholder: "შეიყვანეთ პაროლი",
    loginButton: "შესვლა",
    loading: "შესვლა...",
    noAccount: "არ გაქვთ ანგარიში?",
    register: "რეგისტრაცია",
    or: "ან",
    backToHome: "მთავარ გვერდზე დაბრუნება",
    loginSuccess: "წარმატებით შეხვედით",
    loginError: "შესვლა ვერ მოხერხდა"
  },
  en: {
    title: "Sign In",
    subtitle: "Sign in to your account",
    emailLabel: "Email",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    loginButton: "Sign In",
    loading: "Signing in...",
    noAccount: "Don't have an account?",
    register: "Register",
    or: "or",
    backToHome: "Back to Home",
    loginSuccess: "Successfully signed in",
    loginError: "Failed to sign in"
  },
  ru: {
    title: "Вход",
    subtitle: "Войдите в свой аккаунт",
    emailLabel: "Эл. почта",
    emailPlaceholder: "ваш@email.com",
    passwordLabel: "Пароль",
    passwordPlaceholder: "Введите пароль",
    loginButton: "Войти",
    loading: "Вход...",
    noAccount: "Нет аккаунта?",
    register: "Регистрация",
    or: "или",
    backToHome: "Вернуться на главную",
    loginSuccess: "Вы успешно вошли",
    loginError: "Не удалось войти"
  }
};

export default function Login() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/login", { email, password });
      
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: t.loginSuccess,
      });
      
      setLocation("/");
    } catch (error: any) {
      toast({
        title: t.loginError,
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col">
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

      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{t.title}</CardTitle>
            <CardDescription>{t.subtitle}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t.emailLabel}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t.emailPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  data-testid="input-email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t.passwordLabel}</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder={t.passwordPlaceholder}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    data-testid="input-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="button-toggle-password"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg"
                size="lg"
                disabled={isLoading}
                data-testid="button-login"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t.loading}
                  </>
                ) : (
                  t.loginButton
                )}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t.or}</span>
              </div>
            </div>

            <Link href="/">
              <Button variant="outline" className="w-full" data-testid="button-back-home">
                {t.backToHome}
              </Button>
            </Link>
          </CardContent>
          <CardFooter className="justify-center">
            <p className="text-sm text-muted-foreground">
              {t.noAccount}{" "}
              <Link href="/register" className="text-primary hover:underline font-medium" data-testid="link-register">
                {t.register}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
