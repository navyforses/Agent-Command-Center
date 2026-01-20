import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { Globe } from "lucide-react";

const languages = [
  { code: "ka", label: "ქართული", flag: "GE" },
  { code: "en", label: "English", flag: "EN" },
  { code: "ru", label: "Русский", flag: "RU" },
] as const;

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  const currentLanguage = languages.find((l) => l.code === language) || languages[0];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          data-testid="button-language-toggle"
          className="font-medium gap-1.5"
        >
          <Globe className="h-4 w-4" />
          {currentLanguage.flag}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code as "ka" | "en" | "ru")}
            className={language === lang.code ? "bg-accent" : ""}
          >
            <span className="mr-2 font-medium">{lang.flag}</span>
            {lang.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
