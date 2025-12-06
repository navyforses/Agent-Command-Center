import { AppSidebar } from "../shared/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { LanguageProvider } from "@/contexts/LanguageContext";

// todo: remove mock functionality
const mockUser = {
  name: "Nino Beridze",
  email: "nino@example.com",
};

export default function AppSidebarExample() {
  return (
    <LanguageProvider>
      <SidebarProvider>
        <AppSidebar user={mockUser} />
      </SidebarProvider>
    </LanguageProvider>
  );
}
