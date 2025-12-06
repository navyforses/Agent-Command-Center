import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export function LanguageToggle() {
  const { language, setLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLanguage(language === "en" ? "ka" : "en")}
      data-testid="button-language-toggle"
      className="font-medium"
    >
      {language === "en" ? "ქარ" : "EN"}
    </Button>
  );
}
