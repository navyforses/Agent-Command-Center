import { ThemeToggle } from "../shared/ThemeToggle";
import { ThemeProvider } from "@/contexts/ThemeContext";

export default function ThemeToggleExample() {
  return (
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>
  );
}
