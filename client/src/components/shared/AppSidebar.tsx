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
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useLanguage } from "@/contexts/LanguageContext";

interface AppSidebarProps {
  user?: {
    name: string;
    email: string;
    profileImageUrl?: string;
  };
}

export function AppSidebar({ user }: AppSidebarProps) {
  const [location] = useLocation();
  const { t } = useLanguage();

  const mainMenuItems = [
    { title: t("dashboard"), icon: LayoutDashboard, url: "/" },
    { title: t("childProfile"), icon: User, url: "/child-profile" },
    { title: t("documents"), icon: FileText, url: "/documents" },
    { title: t("therapyRecommendations"), icon: Activity, url: "/therapy" },
    { title: t("clinicalTrials"), icon: FlaskConical, url: "/trials" },
    { title: t("emailHub"), icon: Mail, url: "/email" },
    { title: t("calendar"), icon: Calendar, url: "/calendar" },
  ];

  const aiMenuItems = [
    { title: t("aiAssistant"), icon: Bot, url: "/assistant" },
  ];

  const bottomMenuItems = [
    { title: t("settings"), icon: Settings, url: "/settings" },
  ];

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="p-2 bg-primary rounded-md">
            <Heart className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-sm">HIE Command Center</h1>
            <p className="text-xs text-muted-foreground">Parent Portal</p>
          </div>
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "") || "dashboard"}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>AI Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {aiMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={location === item.url}
                    data-testid={`nav-${item.url.replace("/", "")}`}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <SidebarMenu>
          {bottomMenuItems.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton
                asChild
                isActive={location === item.url}
                data-testid={`nav-${item.url.replace("/", "")}`}
              >
                <Link href={item.url}>
                  <item.icon className="h-4 w-4" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
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
}
