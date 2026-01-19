import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  FileText,
  Bell,
  Globe,
  Shield,
  Zap,
  ChevronRight,
  ArrowRight,
  FlaskConical,
  Brain,
  Database
} from "lucide-react";

export default function Landing() {
  const { t, language } = useLanguage();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Trial Navigator</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t('nav.pricing')}
            </Link>
            <Link href="/blog" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t('nav.blog')}
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t('nav.login')}
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                {t('nav.register')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container py-24 md:py-32 px-4">
        <div className="flex flex-col items-center text-center gap-8 max-w-4xl mx-auto">
          <Badge variant="secondary" className="gap-2">
            <Zap className="h-3 w-3" />
            {t('landing.badge')}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            {t('landing.title')}
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            {t('landing.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/register">
              <Button size="lg" className="gap-2">
                {t('landing.cta')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="outline" size="lg">
                {t('landing.secondary_cta')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary md:text-4xl">1M+</div>
              <div className="text-sm text-muted-foreground">{t('landing.stats.trials')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary md:text-4xl">190+</div>
              <div className="text-sm text-muted-foreground">{t('landing.stats.countries')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary md:text-4xl">40+</div>
              <div className="text-sm text-muted-foreground">{t('landing.stats.languages')}</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary md:text-4xl">10+</div>
              <div className="text-sm text-muted-foreground">{t('landing.stats.registries')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="container py-24 px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.howItWorks.title')}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t('landing.howItWorks.subtitle')}</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="relative">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center relative">
                <FileText className="h-8 w-8 text-primary" />
                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  1
                </div>
              </div>
              <h3 className="text-xl font-semibold">{t('landing.howItWorks.step1.title')}</h3>
              <p className="text-muted-foreground">{t('landing.howItWorks.step1.description')}</p>
            </div>
          </div>
          {/* Step 2 */}
          <div className="relative">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center relative">
                <Brain className="h-8 w-8 text-primary" />
                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  2
                </div>
              </div>
              <h3 className="text-xl font-semibold">{t('landing.howItWorks.step2.title')}</h3>
              <p className="text-muted-foreground">{t('landing.howItWorks.step2.description')}</p>
            </div>
          </div>
          {/* Step 3 */}
          <div className="relative">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center relative">
                <Bell className="h-8 w-8 text-primary" />
                <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                  3
                </div>
              </div>
              <h3 className="text-xl font-semibold">{t('landing.howItWorks.step3.title')}</h3>
              <p className="text-muted-foreground">{t('landing.howItWorks.step3.description')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-muted/30 py-24">
        <div className="container px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('landing.features.title')}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">{t('landing.features.subtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                  <Globe className="h-6 w-6 text-blue-500" />
                </div>
                <CardTitle>{t('landing.features.global.title')}</CardTitle>
                <CardDescription>{t('landing.features.global.description')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-green-500" />
                </div>
                <CardTitle>{t('landing.features.ai.title')}</CardTitle>
                <CardDescription>{t('landing.features.ai.description')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-purple-500" />
                </div>
                <CardTitle>{t('landing.features.secure.title')}</CardTitle>
                <CardDescription>{t('landing.features.secure.description')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-orange-500" />
                </div>
                <CardTitle>{t('landing.features.form100.title')}</CardTitle>
                <CardDescription>{t('landing.features.form100.description')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-pink-500/10 flex items-center justify-center mb-4">
                  <Bell className="h-6 w-6 text-pink-500" />
                </div>
                <CardTitle>{t('landing.features.notifications.title')}</CardTitle>
                <CardDescription>{t('landing.features.notifications.description')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-xl bg-cyan-500/10 flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-cyan-500" />
                </div>
                <CardTitle>{t('landing.features.deepSearch.title')}</CardTitle>
                <CardDescription>{t('landing.features.deepSearch.description')}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24 px-4">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-8 p-12">
            <div className="text-center md:text-left">
              <h2 className="text-3xl font-bold mb-2">{t('landing.cta_section.title')}</h2>
              <p className="text-primary-foreground/80">{t('landing.cta_section.subtitle')}</p>
            </div>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="gap-2">
                {t('landing.cta_section.button')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-12 px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-6 w-6 rounded bg-primary flex items-center justify-center">
                <FlaskConical className="h-3 w-3 text-primary-foreground" />
              </div>
              <span className="font-semibold">Trial Navigator</span>
            </div>
            <nav className="flex gap-6">
              <Link href="/pricing" className="text-sm text-muted-foreground hover:text-foreground">
                {t('nav.pricing')}
              </Link>
              <Link href="/blog" className="text-sm text-muted-foreground hover:text-foreground">
                {t('nav.blog')}
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              © 2024 Trial Navigator. {t('footer.rights')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
