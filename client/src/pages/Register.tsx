import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Newspaper, Check, Loader2, Eye, EyeOff, Mail, Lock, User, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const translations = {
  ka: {
    title: "რეგისტრაცია",
    subtitle: "შექმენით თქვენი პერსონალური სამედიცინო გაზეთი",
    firstNameLabel: "სახელი",
    firstNamePlaceholder: "თქვენი სახელი",
    lastNameLabel: "გვარი",
    lastNamePlaceholder: "თქვენი გვარი",
    emailLabel: "ელ-ფოსტა",
    emailPlaceholder: "თქვენი@email.com",
    passwordLabel: "პაროლი",
    passwordPlaceholder: "მინიმუმ 6 სიმბოლო",
    confirmPasswordLabel: "გაიმეორეთ პაროლი",
    confirmPasswordPlaceholder: "იგივე პაროლი",
    registerButton: "რეგისტრაცია",
    loading: "რეგისტრაცია...",
    benefits: {
      title: "რას მიიღებთ:",
      items: [
        "პერსონალიზებული სამედიცინო ფიდი",
        "AI კითხვა-პასუხი ნებისმიერ სტატიაზე",
        "კონტაქტი მკვლევრებთან",
        "40+ ენაზე თარგმანი"
      ]
    },
    hasAccount: "უკვე გაქვთ ანგარიში?",
    login: "შესვლა",
    backToHome: "მთავარზე დაბრუნება",
    registerSuccess: "რეგისტრაცია წარმატებით დასრულდა",
    registerError: "რეგისტრაცია ვერ მოხერხდა",
    passwordMismatch: "პაროლები არ ემთხვევა",
    brandName: "MedNews",
    brandTagline: "თქვენი პერსონალური სამედიცინო გაზეთი"
  },
  en: {
    title: "Create Account",
    subtitle: "Create your personal medical newspaper",
    firstNameLabel: "First Name",
    firstNamePlaceholder: "Your first name",
    lastNameLabel: "Last Name",
    lastNamePlaceholder: "Your last name",
    emailLabel: "Email",
    emailPlaceholder: "your@email.com",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 6 characters",
    confirmPasswordLabel: "Confirm Password",
    confirmPasswordPlaceholder: "Same password",
    registerButton: "Create Account",
    loading: "Creating account...",
    benefits: {
      title: "What you'll get:",
      items: [
        "Personalized medical feed",
        "AI Q&A on any article",
        "Contact researchers directly",
        "Translation in 40+ languages"
      ]
    },
    hasAccount: "Already have an account?",
    login: "Sign in",
    backToHome: "Back to Home",
    registerSuccess: "Account created successfully",
    registerError: "Failed to create account",
    passwordMismatch: "Passwords do not match",
    brandName: "MedNews",
    brandTagline: "Your Personal Medical Newspaper"
  },
  ru: {
    title: "Регистрация",
    subtitle: "Создайте вашу персональную медицинскую газету",
    firstNameLabel: "Имя",
    firstNamePlaceholder: "Ваше имя",
    lastNameLabel: "Фамилия",
    lastNamePlaceholder: "Ваша фамилия",
    emailLabel: "Эл. почта",
    emailPlaceholder: "ваш@email.com",
    passwordLabel: "Пароль",
    passwordPlaceholder: "Минимум 6 символов",
    confirmPasswordLabel: "Подтвердите пароль",
    confirmPasswordPlaceholder: "Тот же пароль",
    registerButton: "Создать аккаунт",
    loading: "Создание аккаунта...",
    benefits: {
      title: "Что вы получите:",
      items: [
        "Персонализированная медицинская лента",
        "AI вопрос-ответ по любой статье",
        "Связь с исследователями",
        "Перевод на 40+ языков"
      ]
    },
    hasAccount: "Уже есть аккаунт?",
    login: "Войти",
    backToHome: "На главную",
    registerSuccess: "Аккаунт успешно создан",
    registerError: "Не удалось создать аккаунт",
    passwordMismatch: "Пароли не совпадают",
    brandName: "MedNews",
    brandTagline: "Ваша персональная медицинская газета"
  }
};

export default function Register() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: t.passwordMismatch,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await apiRequest("POST", "/api/auth/register", {
        email,
        password,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });

      toast({
        title: t.registerSuccess,
      });

      setLocation("/");
    } catch (error: any) {
      toast({
        title: t.registerError,
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
      <div className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">
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
              {/* Benefits */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-xl p-4 mb-6">
                <p className="text-sm font-semibold mb-3 text-foreground">{t.benefits.title}</p>
                <ul className="space-y-2">
                  {t.benefits.items.map((item, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className="h-5 w-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center flex-shrink-0">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">{t.firstNameLabel}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="firstName"
                        type="text"
                        placeholder={t.firstNamePlaceholder}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        disabled={isLoading}
                        className="pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                        data-testid="input-first-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">{t.lastNameLabel}</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="lastName"
                        type="text"
                        placeholder={t.lastNamePlaceholder}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        disabled={isLoading}
                        className="pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                        data-testid="input-last-name"
                      />
                    </div>
                  </div>
                </div>

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
                      className="pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
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
                      minLength={6}
                      disabled={isLoading}
                      className="pl-10 pr-12 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
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

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">{t.confirmPasswordLabel}</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder={t.confirmPasswordPlaceholder}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                      disabled={isLoading}
                      className="pl-10 h-11 bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700"
                      data-testid="input-confirm-password"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  disabled={isLoading}
                  data-testid="button-register"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {t.loading}
                    </>
                  ) : (
                    t.registerButton
                  )}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="justify-center pt-2">
              <p className="text-sm text-muted-foreground">
                {t.hasAccount}{" "}
                <Link
                  href="/login"
                  className="font-semibold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent hover:underline"
                  data-testid="link-login"
                >
                  {t.login}
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
