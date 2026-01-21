/**
 * ResetPassword Page
 * ==================
 * პაროლის აღდგენის გვერდი
 */

import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { FlaskConical, Loader2, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const translations = {
  ka: {
    title: "პაროლის აღდგენა",
    subtitle: "შეიყვანეთ ახალი პაროლი",
    newPassword: "ახალი პაროლი",
    confirmPassword: "გაიმეორეთ პაროლი",
    resetButton: "პაროლის შეცვლა",
    resetting: "იცვლება...",
    success: "პაროლი წარმატებით შეიცვალა!",
    successSubtitle: "ახლა შეგიძლიათ შეხვიდეთ ახალი პაროლით",
    loginButton: "შესვლა",
    error: "შეცდომა",
    invalidToken: "ბმული არასწორია ან ვადაგასულია",
    passwordMismatch: "პაროლები არ ემთხვევა",
    passwordTooShort: "პაროლი უნდა იყოს მინიმუმ 8 სიმბოლო",
    backToLogin: "შესვლის გვერდზე დაბრუნება",
    replitAuth: "ეს აპლიკაცია იყენებს Replit ავტორიზაციას",
    replitAuthSubtitle: "პაროლის შესაცვლელად გადადით თქვენს Replit ანგარიშზე",
    goToReplit: "Replit-ზე გადასვლა",
  },
  en: {
    title: "Reset Password",
    subtitle: "Enter your new password",
    newPassword: "New Password",
    confirmPassword: "Confirm Password",
    resetButton: "Reset Password",
    resetting: "Resetting...",
    success: "Password successfully reset!",
    successSubtitle: "You can now sign in with your new password",
    loginButton: "Sign In",
    error: "Error",
    invalidToken: "This link is invalid or has expired",
    passwordMismatch: "Passwords do not match",
    passwordTooShort: "Password must be at least 8 characters",
    backToLogin: "Back to Sign In",
    replitAuth: "This app uses Replit authentication",
    replitAuthSubtitle: "To change your password, go to your Replit account settings",
    goToReplit: "Go to Replit",
  },
  ru: {
    title: "Сброс пароля",
    subtitle: "Введите новый пароль",
    newPassword: "Новый пароль",
    confirmPassword: "Подтвердите пароль",
    resetButton: "Сбросить пароль",
    resetting: "Сброс...",
    success: "Пароль успешно изменен!",
    successSubtitle: "Теперь вы можете войти с новым паролем",
    loginButton: "Войти",
    error: "Ошибка",
    invalidToken: "Эта ссылка недействительна или срок её действия истёк",
    passwordMismatch: "Пароли не совпадают",
    passwordTooShort: "Пароль должен содержать минимум 8 символов",
    backToLogin: "Вернуться к входу",
    replitAuth: "Это приложение использует авторизацию Replit",
    replitAuthSubtitle: "Чтобы изменить пароль, перейдите в настройки вашего аккаунта Replit",
    goToReplit: "Перейти в Replit",
  },
};

export default function ResetPassword() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Get token from URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    setToken(tokenParam);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (newPassword.length < 8) {
      setError(t.passwordTooShort);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    if (!token) {
      setError(t.invalidToken);
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || t.invalidToken);
      }

      setIsSuccess(true);
      toast({
        title: t.success,
        description: t.successSubtitle,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error);
    } finally {
      setIsLoading(false);
    }
  };

  // Since this app uses Replit Auth, show appropriate message
  const useReplitAuth = true; // Set to false if you implement custom password reset

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

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          {useReplitAuth ? (
            // Replit Auth message
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                  <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-2xl">{t.replitAuth}</CardTitle>
                <CardDescription>{t.replitAuthSubtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <a
                  href="https://replit.com/account"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button className="w-full h-12 text-lg" size="lg">
                    {t.goToReplit}
                  </Button>
                </a>
                <Link href="/login">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {t.backToLogin}
                  </Button>
                </Link>
              </CardContent>
            </>
          ) : isSuccess ? (
            // Success state
            <>
              <CardHeader className="text-center">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-2xl">{t.success}</CardTitle>
                <CardDescription>{t.successSubtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <Link href="/login">
                  <Button className="w-full h-12 text-lg" size="lg">
                    {t.loginButton}
                  </Button>
                </Link>
              </CardContent>
            </>
          ) : (
            // Password reset form
            <>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t.title}</CardTitle>
                <CardDescription>{t.subtitle}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">{t.newPassword}</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg"
                    size="lg"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t.resetting}
                      </>
                    ) : (
                      t.resetButton
                    )}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="justify-center">
                <Link
                  href="/login"
                  className="text-sm text-muted-foreground hover:text-primary"
                >
                  <ArrowLeft className="inline mr-1 h-3 w-3" />
                  {t.backToLogin}
                </Link>
              </CardFooter>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
