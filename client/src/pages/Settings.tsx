import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Bell, Globe, Moon, Shield, User } from "lucide-react";

export default function Settings() {
  const { t, language, setLanguage } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("settings")}</h1>
        <p className="text-muted-foreground">Manage your account and application preferences</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Settings
            </CardTitle>
            <CardDescription>Update your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" placeholder="Enter first name" data-testid="input-first-name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" placeholder="Enter last name" data-testid="input-last-name" />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="Enter email" data-testid="input-email" />
            </div>
            <Button data-testid="button-save-profile">Save Changes</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Language & Appearance
            </CardTitle>
            <CardDescription>Customize how the app looks and feels</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Language</Label>
                <p className="text-sm text-muted-foreground">Select your preferred language</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLanguage("en")}
                  data-testid="button-lang-en"
                >
                  English
                </Button>
                <Button
                  variant={language === "ka" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setLanguage("ka")}
                  data-testid="button-lang-ka"
                >
                  ქართული
                </Button>
              </div>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Moon className="h-4 w-4" />
                  Dark Mode
                </Label>
                <p className="text-sm text-muted-foreground">Toggle dark theme</p>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={toggleTheme}
                data-testid="switch-dark-mode"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Configure how you receive updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-sm text-muted-foreground">Receive updates via email</p>
              </div>
              <Switch defaultChecked data-testid="switch-email-notifications" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Appointment Reminders</Label>
                <p className="text-sm text-muted-foreground">Get reminded before appointments</p>
              </div>
              <Switch defaultChecked data-testid="switch-appointment-reminders" />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Clinical Trial Alerts</Label>
                <p className="text-sm text-muted-foreground">Notify when matching trials are found</p>
              </div>
              <Switch defaultChecked data-testid="switch-trial-alerts" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>Manage your data and security preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Data Sharing</Label>
                <p className="text-sm text-muted-foreground">Share anonymized data for research</p>
              </div>
              <Switch data-testid="switch-data-sharing" />
            </div>
            <Separator />
            <Button variant="outline" data-testid="button-export-data">
              Export My Data
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
