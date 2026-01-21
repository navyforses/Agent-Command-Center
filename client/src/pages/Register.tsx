import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FlaskConical, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

const translations = {
  ka: {
    title: "რეგისტრაცია",
    subtitle: "შექმენით ახალი ანგარიში",
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
        "უფასო წვდომა 1M+ კლინიკურ კვლევაზე",
        "AI-ით მართული მოძიება",
        "პერსონალური რეკომენდაციები",
        "40+ ენაზე თარგმნა"
      ]
    },
    hasAccount: "უკვე გაქვთ ანგარიში?",
    login: "შესვლა",
    or: "ან",
    backToHome: "მთავარ გვერდზე დაბრუნება",
    registerSuccess: "რეგისტრაცია წარმატებით დასრულდა",
    registerError: "რეგისტრაცია ვერ მოხერხდა",
    passwordMismatch: "პაროლები არ ემთხვევა"
  },
  en: {
    title: "Create Account",
    subtitle: "Create a new account",
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
        "Free access to 1M+ clinical trials",
        "AI-powered search",
        "Personalized recommendations",
        "Translation in 40+ languages"
      ]
    },
    hasAccount: "Already have an account?",
    login: "Sign in",
    or: "or",
    backToHome: "Back to Home",
    registerSuccess: "Account created successfully",
    registerError: "Failed to create account",
    passwordMismatch: "Passwords do not match"
  },
  ru: {
    title: "Регистрация",
    subtitle: "Создайте новый аккаунт",
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
        "Бесплатный доступ к 1M+ клинических исследований",
        "Поиск на основе ИИ",
        "Персонализированные рекомендации",
        "Перевод на 40+ языков"
      ]
    },
    hasAccount: "Уже есть аккаунт?",
    login: "Войти",
    or: "или",
    backToHome: "Вернуться на главную",
    registerSuccess: "Аккаунт успешно создан",
    registerError: "Не удалось создать аккаунт",
    passwordMismatch: "Пароли не совпадают"
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
            <div className="space-y-3 mb-6">
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

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">{t.firstNameLabel}</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder={t.firstNamePlaceholder}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-first-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">{t.lastNameLabel}</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder={t.lastNamePlaceholder}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    data-testid="input-last-name"
                  />
                </div>
              </div>

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
                    minLength={6}
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t.confirmPasswordLabel}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder={t.confirmPasswordPlaceholder}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={isLoading}
                  data-testid="input-confirm-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-lg"
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
              {t.hasAccount}{" "}
              <Link href="/login" className="text-primary hover:underline font-medium" data-testid="link-login">
                {t.login}
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
