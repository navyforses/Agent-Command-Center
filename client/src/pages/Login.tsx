import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Newspaper, Loader2, Eye, EyeOff, Mail, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const translations = {
  ka: {
    title: "შესვლა",
    subtitle: "შედით თქვენს პერსონალურ სამედიცინო გაზეთში",
    emailLabel: "ელ-ფოსტა",
    emailPlaceholder: "თქვენი@email.com",
    passwordLabel: "პაროლი",
    passwordPlaceholder: "შეიყვანეთ პაროლი",
    loginButton: "შესვლა",
    loading: "შესვლა...",
    noAccount: "არ გაქვთ ანგარიში?",
    register: "რეგისტრაცია",
    forgotPassword: "დაგავიწყდათ პაროლი?",
    backToHome: "მთავარზე დაბრუნება",
    loginSuccess: "წარმატებით შეხვედით",
    loginError: "შესვლა ვერ მოხერხდა",
    brandName: "MedNews",
    brandTagline: "თქვენი პერსონალური სამედიცინო გაზეთი"
  },
  en: {
    title: "Sign In",
    subtitle: "Access your personal medical newspaper",
    emailLabel: "Email",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter password",
    loginButton: "Sign In",
    loading: "Signing in...",
    noAccount: "Don't have an account?",
    register: "Register",
    forgotPassword: "Forgot password?",
    backToHome: "Back to Home",
    loginSuccess: "Successfully signed in",
    loginError: "Failed to sign in",
    brandName: "MedNews",
    brandTagline: "Your Personal Medical Newspaper"
  },
  ru: {
    title: "Вход",
    subtitle: "Войдите в вашу персональную медицинскую газету",
    emailLabel: "Эл. почта",
    emailPlaceholder: "ваш@email.com",
    passwordLabel: "Пароль",
    passwordPlaceholder: "Введите пароль",
    loginButton: "Войти",
    loading: "Вход...",
    noAccount: "Нет аккаунта?",
    register: "Регистрация",
    forgotPassword: "Забыли пароль?",
    backToHome: "На главную",
    loginSuccess: "Вы успешно вошли",
    loginError: "Не удалось войти",
    brandName: "MedNews",
    brandTagline: "Ваша персональная медицинская газета"
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
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <Link href="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" />
            <span className="text-sm">{t.backToHome}</span>
          </Link>

          <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-2">
              <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                <Newspaper className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold">{t.title}</CardTitle>
              <CardDescription className="text-base">{t.subtitle}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">{t.emailLabel}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder={t.emailPlaceholder}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      data-testid="input-email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">{t.passwordLabel}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder={t.passwordPlaceholder}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      className="pl-10 pr-12 h-12 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
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
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
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
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pt-2">
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-200 dark:border-slate-700" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t.noAccount}{" "}
                <Link
                  href="/register"
                  className="font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent hover:underline"
                  data-testid="link-register"
                >
                  {t.register}
                </Link>
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm py-4">
        <div className="container px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 {t.brandName}. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
