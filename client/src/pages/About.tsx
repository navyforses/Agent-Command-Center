import { Link } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { LanguageToggle } from "@/components/shared/LanguageToggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  FlaskConical,
  Heart,
  Target,
  Users,
  Globe,
  Mail,
  MapPin,
  Shield,
  Lightbulb,
  Award
} from "lucide-react";

const translations = {
  ka: {
    nav: {
      services: "სერვისები",
      about: "ჩვენს შესახებ",
      login: "შესვლა",
      register: "რეგისტრაცია"
    },
    hero: {
      title: "ჩვენს შესახებ",
      subtitle: "Trial Navigator - პლატფორმა, რომელიც პაციენტებს ეხმარება იპოვონ კლინიკური კვლევები მთელი მსოფლიოდან"
    },
    mission: {
      title: "ჩვენი მისია",
      description: "ჩვენ გვჯერა, რომ ყველა პაციენტს უნდა ჰქონდეს წვდომა კლინიკურ კვლევებზე, მიუხედავად მათი გეოგრაფიული მდებარეობისა ან ენობრივი ბარიერისა. Trial Navigator-ის მისიაა ხელოვნური ინტელექტის გამოყენებით გავამარტივოთ კლინიკური კვლევების ძიება და ვთარგმნოთ ისინი პაციენტისთვის გასაგებ ენაზე."
    },
    vision: {
      title: "ჩვენი ხედვა",
      description: "ვქმნით მომავალს, სადაც ყველა პაციენტს აქვს თანაბარი შესაძლებლობა მიიღოს მონაწილეობა კლინიკურ კვლევებში და ისარგებლოს უახლესი სამედიცინო მიღწევებით."
    },
    values: {
      title: "ჩვენი ღირებულებები",
      items: [
        { icon: "Heart", title: "პაციენტზე ორიენტირება", desc: "პაციენტის ინტერესები ყოველთვის პირველ ადგილზეა" },
        { icon: "Shield", title: "კონფიდენციალურობა", desc: "თქვენი სამედიცინო მონაცემები მაქსიმალურად დაცულია" },
        { icon: "Globe", title: "გლობალური ხელმისაწვდომობა", desc: "კვლევები მთელი მსოფლიოდან, თქვენს ენაზე" },
        { icon: "Lightbulb", title: "ინოვაცია", desc: "უახლესი AI ტექნოლოგიები თქვენს სამსახურში" }
      ]
    },
    team: {
      title: "ჩვენი გუნდი",
      description: "Trial Navigator-ის უკან დგას გამოცდილი პროფესიონალების გუნდი სამედიცინო, ტექნოლოგიური და მომხმარებლის მომსახურების სფეროებიდან."
    },
    contact: {
      title: "კონტაქტი",
      email: "support@trialnavigator.com",
      location: "თბილისი, საქართველო"
    },
    cta: {
      title: "შემოგვიერთდით",
      subtitle: "დაიწყეთ კლინიკური კვლევების ძიება დღესვე",
      button: "რეგისტრაცია"
    }
  },
  en: {
    nav: {
      services: "Services",
      about: "About Us",
      login: "Sign In",
      register: "Sign Up"
    },
    hero: {
      title: "About Us",
      subtitle: "Trial Navigator - a platform that helps patients find clinical trials from around the world"
    },
    mission: {
      title: "Our Mission",
      description: "We believe that every patient should have access to clinical trials, regardless of their geographic location or language barrier. Trial Navigator's mission is to use artificial intelligence to simplify clinical trial search and translate them into patient-friendly language."
    },
    vision: {
      title: "Our Vision",
      description: "We are creating a future where every patient has equal opportunity to participate in clinical trials and benefit from the latest medical advances."
    },
    values: {
      title: "Our Values",
      items: [
        { icon: "Heart", title: "Patient-Centered", desc: "Patient interests always come first" },
        { icon: "Shield", title: "Privacy", desc: "Your medical data is maximally protected" },
        { icon: "Globe", title: "Global Access", desc: "Trials from around the world, in your language" },
        { icon: "Lightbulb", title: "Innovation", desc: "Latest AI technologies at your service" }
      ]
    },
    team: {
      title: "Our Team",
      description: "Behind Trial Navigator is an experienced team of professionals from medical, technology, and customer service fields."
    },
    contact: {
      title: "Contact",
      email: "support@trialnavigator.com",
      location: "Tbilisi, Georgia"
    },
    cta: {
      title: "Join Us",
      subtitle: "Start searching for clinical trials today",
      button: "Sign Up"
    }
  },
  ru: {
    nav: {
      services: "Услуги",
      about: "О нас",
      login: "Войти",
      register: "Регистрация"
    },
    hero: {
      title: "О нас",
      subtitle: "Trial Navigator - платформа, которая помогает пациентам найти клинические исследования со всего мира"
    },
    mission: {
      title: "Наша миссия",
      description: "Мы верим, что каждый пациент должен иметь доступ к клиническим исследованиям, независимо от географического положения или языкового барьера. Миссия Trial Navigator - использовать искусственный интеллект для упрощения поиска клинических исследований и перевода их на понятный пациенту язык."
    },
    vision: {
      title: "Наше видение",
      description: "Мы создаём будущее, где каждый пациент имеет равные возможности участвовать в клинических исследованиях и пользоваться новейшими медицинскими достижениями."
    },
    values: {
      title: "Наши ценности",
      items: [
        { icon: "Heart", title: "Ориентация на пациента", desc: "Интересы пациента всегда на первом месте" },
        { icon: "Shield", title: "Конфиденциальность", desc: "Ваши медицинские данные максимально защищены" },
        { icon: "Globe", title: "Глобальный доступ", desc: "Исследования со всего мира на вашем языке" },
        { icon: "Lightbulb", title: "Инновации", desc: "Новейшие ИИ-технологии на вашей службе" }
      ]
    },
    team: {
      title: "Наша команда",
      description: "За Trial Navigator стоит опытная команда профессионалов из медицинской, технологической сфер и сферы обслуживания клиентов."
    },
    contact: {
      title: "Контакты",
      email: "support@trialnavigator.com",
      location: "Тбилиси, Грузия"
    },
    cta: {
      title: "Присоединяйтесь",
      subtitle: "Начните поиск клинических исследований сегодня",
      button: "Регистрация"
    }
  }
};

const iconMap: Record<string, React.ElementType> = {
  Heart,
  Shield,
  Globe,
  Lightbulb
};

export default function About() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.en;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Trial Navigator</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link href="/services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
              {t.nav.services}
            </Link>
            <Link href="/about" className="text-sm font-medium text-primary">
              {t.nav.about}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <LanguageToggle />
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  {t.nav.login}
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">
                  {t.nav.register}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10" />
        <div className="container relative py-16 md:py-20 px-4 md:px-6">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{t.hero.title}</h1>
            <p className="text-lg md:text-xl text-muted-foreground">{t.hero.subtitle}</p>
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="container py-16 md:py-20 px-4 md:px-6">
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <Card className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Target className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{t.mission.title}</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">{t.mission.description}</p>
          </Card>

          <Card className="p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Award className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold">{t.vision.title}</h2>
            </div>
            <p className="text-muted-foreground leading-relaxed">{t.vision.description}</p>
          </Card>
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted/30 py-16 md:py-20">
        <div className="container px-4 md:px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">{t.values.title}</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {t.values.items.map((item, index) => {
              const Icon = iconMap[item.icon] || Heart;
              return (
                <Card key={index} className="p-6 text-center">
                  <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="container py-16 md:py-20 px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Users className="h-8 w-8 text-primary" />
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t.team.title}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">{t.team.description}</p>
        </div>
      </section>

      {/* Contact */}
      <section className="bg-muted/30 py-16 md:py-20">
        <div className="container px-4 md:px-6">
          <div className="max-w-xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-8">{t.contact.title}</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <span className="text-muted-foreground">{t.contact.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <span className="text-muted-foreground">{t.contact.location}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container py-16 md:py-20 px-4 md:px-6">
        <Card className="bg-primary text-primary-foreground max-w-4xl mx-auto">
          <CardContent className="flex flex-col md:flex-row items-center justify-between gap-6 p-10">
            <div className="text-center md:text-left">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">{t.cta.title}</h2>
              <p className="text-primary-foreground/80">{t.cta.subtitle}</p>
            </div>
            <Link href="/register">
              <Button size="lg" variant="secondary" className="whitespace-nowrap">
                {t.cta.button}
              </Button>
            </Link>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/30">
        <div className="container py-10 px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <FlaskConical className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-bold">Trial Navigator</span>
            </div>
            <nav className="flex gap-6">
              <Link href="/services" className="text-sm text-muted-foreground hover:text-foreground">
                {t.nav.services}
              </Link>
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
                {language === 'ka' ? 'მთავარი' : language === 'ru' ? 'Главная' : 'Home'}
              </Link>
            </nav>
            <p className="text-sm text-muted-foreground">© 2024 Trial Navigator</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
