import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

type Language = "en" | "ka";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations: Record<string, Record<Language, string>> = {
  dashboard: { en: "Dashboard", ka: "მთავარი" },
  childProfile: { en: "Child Profile", ka: "ბავშვის პროფილი" },
  documents: { en: "Documents", ka: "დოკუმენტები" },
  therapyRecommendations: { en: "Therapy", ka: "თერაპია" },
  clinicalTrials: { en: "Clinical Trials", ka: "კლინიკური კვლევები" },
  emailHub: { en: "Email Hub", ka: "ელ.ფოსტა" },
  calendar: { en: "Calendar", ka: "კალენდარი" },
  aiAssistant: { en: "AI Assistant", ka: "AI ასისტენტი" },
  nexusOmega: { en: "NEXUS OMEGA", ka: "NEXUS OMEGA" },
  settings: { en: "Settings", ka: "პარამეტრები" },
  logout: { en: "Log Out", ka: "გასვლა" },
  login: { en: "Log In", ka: "შესვლა" },
  welcome: { en: "Welcome", ka: "მოგესალმებით" },
  uploadDocuments: { en: "Upload Documents", ka: "დოკუმენტის ატვირთვა" },
  recentActivity: { en: "Recent Activity", ka: "ბოლო აქტივობა" },
  upcomingAppointments: { en: "Upcoming Appointments", ka: "მომავალი ვიზიტები" },
  aiInsights: { en: "AI Insights", ka: "AI ანალიზი" },
  viewAll: { en: "View All", ka: "ყველას ნახვა" },
  addChild: { en: "Add Child", ka: "ბავშვის დამატება" },
  diagnosis: { en: "Diagnosis", ka: "დიაგნოზი" },
  severity: { en: "Severity", ka: "სიმძიმე" },
  age: { en: "Age", ka: "ასაკი" },
  therapySessions: { en: "Therapy Sessions", ka: "თერაპიის სესიები" },
  nextAppointment: { en: "Next Appointment", ka: "შემდეგი ვიზიტი" },
  milestones: { en: "Milestones", ka: "მიღწევები" },
  progressNotes: { en: "Progress Notes", ka: "პროგრესის ჩანაწერები" },
  searchTrials: { en: "Search Trials", ka: "კვლევების ძებნა" },
  eligibleTrials: { en: "Eligible Trials", ka: "ხელმისაწვდომი კვლევები" },
  savedTrials: { en: "Saved Trials", ka: "შენახული კვლევები" },
  compose: { en: "Compose", ka: "შეტყობინების წერა" },
  inbox: { en: "Inbox", ka: "შემოსული" },
  sent: { en: "Sent", ka: "გაგზავნილი" },
  drafts: { en: "Drafts", ka: "მონახაზები" },
  askAI: { en: "Ask AI", ka: "AI-ს შეკითხვა" },
  typeMessage: { en: "Type your message...", ka: "შეიყვანეთ შეტყობინება..." },
  mild: { en: "Mild", ka: "მსუბუქი" },
  moderate: { en: "Moderate", ka: "საშუალო" },
  severe: { en: "Severe", ka: "მძიმე" },
  processed: { en: "Processed", ka: "დამუშავებული" },
  pending: { en: "Pending", ka: "მოლოდინში" },
  analyzed: { en: "AI Analyzed", ka: "AI გაანალიზებული" },
  high: { en: "High", ka: "მაღალი" },
  medium: { en: "Medium", ka: "საშუალო" },
  low: { en: "Low", ka: "დაბალი" },
  manageYourChild: { en: "Manage your child's medical journey", ka: "მართეთ თქვენი შვილის სამედიცინო გზა" },
  platformDescription: { en: "AI-powered platform for parents of children with HIE", ka: "AI-ზე დაფუძნებული პლატფორმა HIE-ით დაავადებული ბავშვების მშობლებისთვის" },
  getStarted: { en: "Get Started", ka: "დაწყება" },
  learnMore: { en: "Learn More", ka: "მეტი ინფორმაცია" },
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>("en");

  const t = useCallback((key: string) => {
    return translations[key]?.[language] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return context;
}
