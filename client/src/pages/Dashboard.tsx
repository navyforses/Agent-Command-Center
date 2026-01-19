import { Link, useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  FileText,
  Bell,
  Settings,
  Bookmark,
  TrendingUp,
  ArrowRight,
  User,
  Calendar,
  FlaskConical,
  Upload,
  ChevronRight,
  Zap
} from "lucide-react";

export default function Dashboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const userName = user?.firstName || user?.email?.split('@')[0] || (language === 'ka' ? 'მომხმარებელი' : 'User');

  // Mock data for demo
  const stats = {
    savedTrials: 12,
    matchingTrials: 8,
    profileComplete: 75,
    lastSearch: '2024-01-15'
  };

  const recentTrials = [
    {
      id: '1',
      title: 'Phase 3 Study of Drug X for Type 2 Diabetes',
      status: 'recruiting',
      match: 92,
      location: 'Germany'
    },
    {
      id: '2',
      title: 'Immunotherapy Trial for Advanced Melanoma',
      status: 'recruiting',
      match: 87,
      location: 'USA'
    },
    {
      id: '3',
      title: 'Novel Treatment for Chronic Pain Management',
      status: 'active',
      match: 78,
      location: 'UK'
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-8 px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">
                {t('profile.welcome')}, {userName}!
              </h1>
              <p className="text-muted-foreground mt-1">
                {language === 'ka'
                  ? 'თქვენი პერსონალიზებული კლინიკური კვლევების პანელი'
                  : 'Your personalized clinical trials dashboard'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setLocation('/profile')}>
                <User className="h-4 w-4 mr-2" />
                {t('nav.profile')}
              </Button>
              <Button onClick={() => setLocation('/search')}>
                <Search className="h-4 w-4 mr-2" />
                {t('nav.search')}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 px-4">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main Content - Left 2 columns */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Completion Card */}
            {stats.profileComplete < 100 && (
              <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold mb-1">
                        {language === 'ka' ? 'შეავსეთ პროფილი' : 'Complete Your Profile'}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        {language === 'ka'
                          ? 'სრული პროფილი დაგეხმარებათ უკეთესი შესაბამისობის პოვნაში'
                          : 'A complete profile helps us find better matching trials'}
                      </p>
                      <div className="flex items-center gap-4">
                        <Progress value={stats.profileComplete} className="flex-1 h-2" />
                        <span className="text-sm font-medium">{stats.profileComplete}%</span>
                      </div>
                      <Button variant="link" className="p-0 h-auto mt-2" onClick={() => setLocation('/profile')}>
                        {language === 'ka' ? 'პროფილის შევსება' : 'Complete Profile'}
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Matching Trials */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{t('profile.matchingTrials')}</CardTitle>
                    <CardDescription>
                      {language === 'ka'
                        ? 'კვლევები რომლებიც შეესაბამება თქვენს პროფილს'
                        : 'Trials that match your profile'}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="gap-1">
                    <Zap className="h-3 w-3" />
                    {stats.matchingTrials} {language === 'ka' ? 'ახალი' : 'new'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentTrials.map((trial) => (
                  <div
                    key={trial.id}
                    className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => setLocation(`/trial/${trial.id}`)}
                  >
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FlaskConical className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium line-clamp-1">{trial.title}</h4>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                        <Badge variant={trial.status === 'recruiting' ? 'default' : 'secondary'} className="text-xs">
                          {trial.status === 'recruiting'
                            ? (language === 'ka' ? 'რეკრუტირება' : 'Recruiting')
                            : (language === 'ka' ? 'აქტიური' : 'Active')}
                        </Badge>
                        <span>•</span>
                        <span>{trial.location}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-primary">{trial.match}%</div>
                      <div className="text-xs text-muted-foreground">{t('feed.matchScore')}</div>
                    </div>
                  </div>
                ))}
                <Button variant="ghost" className="w-full" onClick={() => setLocation('/feed')}>
                  {language === 'ka' ? 'ყველას ნახვა' : 'View All'}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setLocation('/search')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <Search className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('search.title')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ka' ? 'მოძებნეთ ახალი კვლევები' : 'Find new trials'}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setLocation('/profile')}>
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-orange-500/10">
                    <Upload className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{t('profile.uploadForm100')}</h3>
                    <p className="text-sm text-muted-foreground">
                      {language === 'ka' ? 'AI ანალიზისთვის' : 'For AI analysis'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Sidebar - Right column */}
          <div className="space-y-6">
            {/* Stats Cards */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('profile.savedTrials')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-pink-500/10">
                      <Bookmark className="h-5 w-5 text-pink-500" />
                    </div>
                    <div className="text-3xl font-bold">{stats.savedTrials}</div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setLocation('/saved')}>
                    {language === 'ka' ? 'ნახვა' : 'View'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t('profile.notifications')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-green-500/10">
                      <Bell className="h-5 w-5 text-green-500" />
                    </div>
                    <div>
                      <div className="text-lg font-semibold">
                        {language === 'ka' ? 'ჩართული' : 'Enabled'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {language === 'ka' ? 'კვირეული დაიჯესტი' : 'Weekly digest'}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setLocation('/settings')}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Deep Search Promo */}
            <Card className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-5 w-5" />
                  <span className="font-semibold">Deep Search</span>
                </div>
                <p className="text-sm opacity-90 mb-4">
                  {language === 'ka'
                    ? 'ექსპერტები იპოვიან თქვენთვის იდეალურ კვლევებს'
                    : 'Let our experts find the perfect trials for you'}
                </p>
                <Button variant="secondary" size="sm" className="w-full" onClick={() => setLocation('/pricing')}>
                  {language === 'ka' ? 'გაიგეთ მეტი' : 'Learn More'}
                </Button>
              </CardContent>
            </Card>

            {/* Quick Links */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  {language === 'ka' ? 'სწრაფი ბმულები' : 'Quick Links'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/feed">
                  <Button variant="ghost" className="w-full justify-start">
                    <FlaskConical className="h-4 w-4 mr-2" />
                    {t('nav.feed')}
                  </Button>
                </Link>
                <Link href="/blog">
                  <Button variant="ghost" className="w-full justify-start">
                    <FileText className="h-4 w-4 mr-2" />
                    {t('nav.blog')}
                  </Button>
                </Link>
                <Link href="/settings">
                  <Button variant="ghost" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    {t('nav.settings')}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
