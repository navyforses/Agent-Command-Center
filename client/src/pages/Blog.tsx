import { useState } from "react";
import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FlaskConical,
  Search,
  Calendar,
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";

// Mock blog posts data
const blogPosts = [
  {
    id: '1',
    slug: 'understanding-clinical-trials-2024',
    title: {
      ka: 'კლინიკური კვლევების გაგება 2024 წელს',
      en: 'Understanding Clinical Trials in 2024',
      ru: 'Понимание клинических исследований в 2024 году'
    },
    excerpt: {
      ka: 'კლინიკური კვლევები არის სამედიცინო კვლევის ფუნდამენტური ნაწილი. ამ სტატიაში განვიხილავთ რა არის კლინიკური კვლევა და როგორ მუშაობს.',
      en: 'Clinical trials are a fundamental part of medical research. In this article, we explore what clinical trials are and how they work.',
      ru: 'Клинические исследования являются фундаментальной частью медицинских исследований. В этой статье мы рассмотрим, что такое клинические исследования и как они работают.'
    },
    category: 'research',
    date: '2024-01-15',
    readTime: 5,
    image: '/images/blog/clinical-trials.jpg'
  },
  {
    id: '2',
    slug: 'ai-in-medicine',
    title: {
      ka: 'ხელოვნური ინტელექტი მედიცინაში',
      en: 'Artificial Intelligence in Medicine',
      ru: 'Искусственный интеллект в медицине'
    },
    excerpt: {
      ka: 'AI ტექნოლოგია რევოლუციას ახდენს სამედიცინო დიაგნოსტიკაში და მკურნალობის პერსონალიზაციაში.',
      en: 'AI technology is revolutionizing medical diagnostics and treatment personalization.',
      ru: 'Технологии ИИ революционизируют медицинскую диагностику и персонализацию лечения.'
    },
    category: 'technology',
    date: '2024-01-10',
    readTime: 7,
    image: '/images/blog/ai-medicine.jpg'
  },
  {
    id: '3',
    slug: 'new-cancer-treatments',
    title: {
      ka: 'ახალი მიდგომები კიბოს მკურნალობაში',
      en: 'New Approaches in Cancer Treatment',
      ru: 'Новые подходы в лечении рака'
    },
    excerpt: {
      ka: 'იმუნოთერაპია და მიზანმიმართული თერაპია ცვლის კიბოს მკურნალობის ლანდშაფტს.',
      en: 'Immunotherapy and targeted therapy are changing the landscape of cancer treatment.',
      ru: 'Иммунотерапия и таргетная терапия меняют ландшафт лечения рака.'
    },
    category: 'research',
    date: '2024-01-05',
    readTime: 6,
    image: '/images/blog/cancer-research.jpg'
  },
  {
    id: '4',
    slug: 'diabetes-clinical-trials',
    title: {
      ka: 'დიაბეტის კვლევების უახლესი სიახლეები',
      en: 'Latest News in Diabetes Research',
      ru: 'Последние новости в исследованиях диабета'
    },
    excerpt: {
      ka: 'მე-2 ტიპის დიაბეტის მკურნალობის ახალი მიმართულებები და კლინიკური კვლევები.',
      en: 'New directions in Type 2 diabetes treatment and clinical trials.',
      ru: 'Новые направления в лечении диабета 2 типа и клинические исследования.'
    },
    category: 'health',
    date: '2024-01-01',
    readTime: 4,
    image: '/images/blog/diabetes.jpg'
  },
  {
    id: '5',
    slug: 'patient-rights-trials',
    title: {
      ka: 'პაციენტის უფლებები კლინიკურ კვლევებში',
      en: 'Patient Rights in Clinical Trials',
      ru: 'Права пациентов в клинических исследованиях'
    },
    excerpt: {
      ka: 'რა უნდა იცოდეთ კლინიკურ კვლევაში მონაწილეობამდე - თქვენი უფლებები და დაცვა.',
      en: 'What you need to know before participating in a clinical trial - your rights and protections.',
      ru: 'Что нужно знать перед участием в клиническом исследовании - ваши права и защита.'
    },
    category: 'news',
    date: '2023-12-28',
    readTime: 5,
    image: '/images/blog/patient-rights.jpg'
  }
];

const categories = ['all', 'research', 'news', 'health', 'technology'] as const;

export default function Blog() {
  const { t, language } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory = activeCategory === 'all' || post.category === activeCategory;
    const matchesSearch = searchQuery === '' ||
      post.title[language as 'ka' | 'en' | 'ru'].toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.excerpt[language as 'ka' | 'en' | 'ru'].toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryLabel = (category: string) => {
    const key = `blog.categories.${category}` as const;
    return t(key);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <FlaskConical className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Trial Navigator</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t('nav.pricing')}
            </Link>
            <Link href="/blog" className="text-sm font-medium text-primary">
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

      {/* Hero */}
      <section className="container py-12 px-4">
        <div className="text-center mb-8">
          <Badge variant="secondary" className="mb-4 gap-2">
            <Sparkles className="h-3 w-3" />
            AI
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{t('blog.title')}</h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">{t('blog.subtitle')}</p>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ka' ? 'მოძებნეთ სტატია...' : 'Search articles...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <Button
                key={category}
                variant={activeCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActiveCategory(category)}
              >
                {getCategoryLabel(category)}
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Posts Grid */}
      <section className="container px-4 pb-16">
        {filteredPosts.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <Card key={post.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-video bg-muted relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <FlaskConical className="h-12 w-12 text-primary/30" />
                  </div>
                </div>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryLabel(post.category)}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {post.readTime} {language === 'ka' ? 'წთ' : 'min'}
                    </span>
                  </div>
                  <CardTitle className="line-clamp-2">
                    {post.title[language as 'ka' | 'en' | 'ru']}
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {post.excerpt[language as 'ka' | 'en' | 'ru']}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(post.date).toLocaleDateString(
                        language === 'ka' ? 'ka-GE' : language === 'ru' ? 'ru-RU' : 'en-US',
                        { year: 'numeric', month: 'short', day: 'numeric' }
                      )}
                    </span>
                    <Button variant="ghost" size="sm" className="gap-1">
                      {t('blog.readMore')}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <FlaskConical className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {language === 'ka' ? 'სტატიები არ მოიძებნა' : 'No articles found'}
            </h3>
            <p className="text-muted-foreground">
              {language === 'ka'
                ? 'სცადეთ სხვა საძიებო სიტყვა ან კატეგორია'
                : 'Try a different search term or category'}
            </p>
          </div>
        )}
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
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                {t('nav.home')}
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
