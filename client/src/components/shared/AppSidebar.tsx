import { memo, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FlaskConical,
  Settings,
  LogOut,
  Dna,
  BookOpen,
  ChevronDown,
  Search,
  Globe,
  Languages,
  Bookmark,
  Brain,
  History,
  TrendingUp,
  User,
  Users,
  FileText,
  Stethoscope,
  Pill,
  Bot,
  Mail,
  Activity,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";

interface AppSidebarProps {
  user?: {
    name: string;
    email: string;
    profileImageUrl?: string;
  };
}

interface MenuItem {
  title: string;
  icon: React.ElementType;
  url: string;
}

interface MenuSection {
  title: string;
  icon: React.ElementType;
  items: MenuItem[];
}

export const AppSidebar = memo(function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();
  const { t, language } = useLanguage();

  const isSectionActive = (items: MenuItem[]) =>
    items.some(item => location === item.url || location.startsWith(item.url + "/"));

  const navigationSections = useMemo(() => ({
    dashboard: {
      title: language === "ka" ? "მთავარი" : "Dashboard",
      icon: LayoutDashboard,
      url: "/",
    },

    patient: {
      title: language === "ka" ? "პაციენტი" : "Patient",
      icon: User,
      items: [
        {
          title: language === "ka" ? "პროფილი" : "Profile",
          icon: User,
          url: "/profile"
        },
        {
          title: language === "ka" ? "ბავშვები" : "Children",
          icon: Users,
          url: "/children"
        },
        {
          title: language === "ka" ? "დოკუმენტები" : "Documents",
          icon: FileText,
          url: "/documents"
        },
        {
          title: language === "ka" ? "თერაპიები" : "Therapies",
          icon: Stethoscope,
          url: "/therapies"
        },
      ],
    } as MenuSection,

    trials: {
      title: language === "ka" ? "კლინიკური კვლევები" : "Clinical Trials",
      icon: FlaskConical,
      items: [
        {
          title: language === "ka" ? "ძიება" : "Search",
          icon: Search,
          url: "/search"
        },
        {
          title: language === "ka" ? "შესაბამისობა" : "Eligibility Match",
          icon: Activity,
          url: "/trials"
        },
        {
          title: language === "ka" ? "შენახული" : "Saved Trials",
          icon: Bookmark,
          url: "/saved"
        },
        {
          title: language === "ka" ? "ისტორია" : "History",
          icon: History,
          url: "/history"
        },
      ],
    } as MenuSection,

    registries: {
      title: language === "ka" ? "რეესტრები" : "Registries",
      icon: Globe,
      items: [
        {
          title: "ClinicalTrials.gov",
          icon: Globe,
          url: "/registry/ctgov"
        },
        {
          title: "EU Clinical Trials",
          icon: Globe,
          url: "/registry/euctr"
        },
        {
          title: "WHO ICTRP",
          icon: Globe,
          url: "/registry/who"
        },
      ],
    } as MenuSection,

    research: {
      title: language === "ka" ? "კვლევა" : "Research",
      icon: Brain,
      items: [
        {
          title: language === "ka" ? "მონიტორინგი" : "Research Monitor",
          icon: Activity,
          url: "/research"
        },
        {
          title: language === "ka" ? "PubMed ძიება" : "PubMed Search",
          icon: FileText,
          url: "/pubmed"
        },
        {
          title: language === "ka" ? "მედიკამენტები" : "Medications",
          icon: Pill,
          url: "/medications"
        },
      ],
    } as MenuSection,

    ai: {
      title: language === "ka" ? "AI ინსაითები" : "AI Insights",
      icon: Bot,
      items: [
        {
          title: "NEXUS",
          icon: Brain,
          url: "/nexus"
        },
        {
          title: "PROMETHEUS",
          icon: Dna,
          url: "/evolution"
        },
        {
          title: language === "ka" ? "AI ასისტენტი" : "AI Assistant",
          icon: Bot,
          url: "/assistant"
        },
        {
          title: language === "ka" ? "ტრენდები" : "Trial Trends",
          icon: TrendingUp,
          url: "/trends"
        },
      ],
    } as MenuSection,

    translation: {
      title: language === "ka" ? "თარგმანები" : "Translations",
      icon: Languages,
      items: [
        {
          title: language === "ka" ? "გლოსარი" : "Glossary",
          icon: BookOpen,
          url: "/glossary"
        },
      ],
    } as MenuSection,
  }), [language]);

  const [openSections, setOpenSections] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    Object.entries(navigationSections).forEach(([key, section]) => {
      if ('items' in section && isSectionActive(section.items)) {
        initial[key] = true;
      }
    });
    return initial;
  });

  const toggleSection = (key: string) => {
    setOpenSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const renderCollapsibleSection = (key: string, section: MenuSection) => (
    <Collapsible
      key={key}
      open={openSections[key] || isSectionActive(section.items)}
      onOpenChange={() => toggleSection(key)}
    >
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            className="w-full justify-between"
            isActive={isSectionActive(section.items)}
            data-testid={`nav-section-${key}`}
          >
            <span className="flex items-center gap-2">
              <section.icon className="h-4 w-4" />
              <span>{section.title}</span>
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections[key] || isSectionActive(section.items) ? 'rotate-180' : ''}`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {section.items.map((item) => (
              <SidebarMenuSubItem key={item.url}>
                <SidebarMenuSubButton
                  asChild
                  isActive={location === item.url || location.startsWith(item.url + "/")}
                >
                  <Link href={item.url} data-testid={`nav-${item.url.replace(/\//g, '-').slice(1) || 'home'}`}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.title}</span>
                  </Link>
                </SidebarMenuSubButton>
              </SidebarMenuSubItem>
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  );

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <Link href="/" className="flex items-center gap-2" data-testid="nav-logo">
          <FlaskConical className="h-8 w-8 text-primary" />
          <div className="flex flex-col">
            <span className="text-lg font-bold">Trial Navigator</span>
            <span className="text-xs text-muted-foreground">
              {language === "ka" ? "კლინიკური კვლევების პლატფორმა" : "Clinical Trial Platform"}
            </span>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === navigationSections.dashboard.url}
                >
                  <Link href={navigationSections.dashboard.url} data-testid="nav-dashboard">
                    <navigationSections.dashboard.icon className="h-4 w-4" />
                    <span>{navigationSections.dashboard.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {renderCollapsibleSection("patient", navigationSections.patient)}
              {renderCollapsibleSection("trials", navigationSections.trials)}
              {renderCollapsibleSection("registries", navigationSections.registries)}
              {renderCollapsibleSection("research", navigationSections.research)}
              {renderCollapsibleSection("ai", navigationSections.ai)}
              {renderCollapsibleSection("translation", navigationSections.translation)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/settings"}
            >
              <Link href="/settings" data-testid="nav-settings">
                <Settings className="h-4 w-4" />
                <span>{language === "ka" ? "პარამეტრები" : "Settings"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          {user && (
            <SidebarMenuItem>
              <SidebarMenuButton className="w-full justify-start gap-2 p-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.profileImageUrl} alt={user.name} />
                  <AvatarFallback>
                    {user.name?.slice(0, 2).toUpperCase() || "TN"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-medium">{user.name}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {user.email}
                  </span>
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}

          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <a href="/api/logout" data-testid="nav-logout">
                <LogOut className="h-4 w-4" />
                <span>{language === "ka" ? "გასვლა" : "Log out"}</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
});
