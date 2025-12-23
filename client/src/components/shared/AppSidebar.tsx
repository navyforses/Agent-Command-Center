import { memo, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  User,
  FileText,
  Activity,
  FlaskConical,
  Mail,
  Calendar,
  Bot,
  Settings,
  LogOut,
  Heart,
  Dna,
  BookOpen,
  Pill,
  ChevronDown,
  Baby,
  Stethoscope,
  Search,
  MessageSquare,
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

  // Check if any sub-item in a section is active
  const isSectionActive = (items: MenuItem[]) =>
    items.some(item => location === item.url || location.startsWith(item.url + "/"));

  // 6 Section Navigation Structure
  const navigationSections = useMemo(() => ({
    // Section 1: Dashboard (standalone)
    dashboard: {
      title: t("dashboard") || "Dashboard",
      icon: LayoutDashboard,
      url: "/",
    },

    // Section 2: My Child (ჩემი შვილი)
    child: {
      title: language === "ka" ? "ჩემი შვილი" : "My Child",
      icon: Baby,
      items: [
        { title: t("childProfile") || "Child Profile", icon: User, url: "/child-profile" },
        { title: t("documents") || "Documents", icon: FileText, url: "/documents" },
      ],
    } as MenuSection,

    // Section 3: Therapy & Treatment (თერაპია & მკურნალობა)
    therapy: {
      title: language === "ka" ? "თერაპია & მკურნალობა" : "Therapy & Treatment",
      icon: Stethoscope,
      items: [
        { title: t("therapyRecommendations") || "Therapy", icon: Activity, url: "/therapy" },
        { title: t("medications") || "Medications", icon: Pill, url: "/medications" },
      ],
    } as MenuSection,

    // Section 4: Research & Resources (კვლევა & რესურსები)
    research: {
      title: language === "ka" ? "კვლევა & რესურსები" : "Research & Resources",
      icon: Search,
      items: [
        { title: t("research") || "Research", icon: BookOpen, url: "/research" },
        { title: t("clinicalTrials") || "Clinical Trials", icon: FlaskConical, url: "/trials" },
      ],
    } as MenuSection,

    // Section 5: Schedule & Communication (განრიგი & კომუნიკაცია)
    schedule: {
      title: language === "ka" ? "განრიგი & კომუნიკაცია" : "Schedule & Communication",
      icon: MessageSquare,
      items: [
        { title: t("calendar") || "Calendar", icon: Calendar, url: "/calendar" },
        { title: t("emailHub") || "Email Hub", icon: Mail, url: "/email" },
      ],
    } as MenuSection,

    // Section 6: AI Assistant (AI ასისტენტი)
    ai: {
      title: language === "ka" ? "AI ასისტენტი" : "AI Assistant",
      icon: Bot,
      items: [
        { title: t("aiAssistant") || "AI Chat", icon: Bot, url: "/assistant" },
        { title: t("evolutionCycles") || "Evolution", icon: Dna, url: "/evolution" },
      ],
    } as MenuSection,
  }), [t, language]);

  // Collapsible section state - open sections that have active items
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
            <ChevronDown className={`h-4 w-4 transition-transform ${openSections[key] ? 'rotate-180' : ''}`} />
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
                  <Link href={item.url} data-testid={`nav-${item.url.replace("/", "")}`}>
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
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="p-2 bg-primary rounded-md">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">HIE Command Center</h1>
            <p className="text-xs text-muted-foreground">
              {language === "ka" ? "მშობლის პორტალი" : "Parent Portal"}
            </p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Dashboard - Standalone */}
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={location === "/"}
                  data-testid="nav-dashboard"
                >
                  <Link href="/">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>{navigationSections.dashboard.title}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              {/* Collapsible Sections */}
              {renderCollapsibleSection("child", navigationSections.child)}
              {renderCollapsibleSection("therapy", navigationSections.therapy)}
              {renderCollapsibleSection("research", navigationSections.research)}
              {renderCollapsibleSection("schedule", navigationSections.schedule)}
              {renderCollapsibleSection("ai", navigationSections.ai)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={location === "/settings"}
              data-testid="nav-settings"
            >
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>{t("settings") || "Settings"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        {user && (
          <div className="flex items-center gap-3 p-2 rounded-md bg-sidebar-accent">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user.profileImageUrl} alt={user.name} className="object-cover" />
              <AvatarFallback className="text-xs">
                {user.name.split(" ").map((n) => n[0]).join("").toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
            <a href="/api/logout" data-testid="button-logout">
              <LogOut className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </a>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
});
