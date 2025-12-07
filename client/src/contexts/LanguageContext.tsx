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
  
  // NEXUS OMEGA Page Translations
  nexusOmegaSubtitle: { en: "Multi-AI Neuroregeneration Research Platform", ka: "მულტი-AI ნეირორეგენერაციის კვლევის პლატფორმა" },
  enterResearchTopic: { en: "Enter research topic or question...", ka: "შეიყვანეთ კვლევის თემა ან შეკითხვა..." },
  disciplines: { en: "Disciplines", ka: "დისციპლინები" },
  researchFocus: { en: "Research Focus", ka: "კვლევის ფოკუსი" },
  consensus: { en: "Consensus", ka: "კონსენსუსი" },
  individualAI: { en: "Individual AI", ka: "ინდივიდუალური AI" },
  crossDisciplinary: { en: "Cross-Disciplinary", ka: "ინტერდისციპლინარული" },
  hypotheses: { en: "Hypotheses", ka: "ჰიპოთეზები" },
  debates: { en: "Debates", ka: "დისკუსიები" },
  knowledgeGraph: { en: "Knowledge Graph", ka: "ცოდნის გრაფი" },
  knowledgeGraphVisualization: { en: "Knowledge Graph Visualization", ka: "ცოდნის გრაფის ვიზუალიზაცია" },
  interactiveConceptMapping: { en: "Interactive concept mapping will appear here", ka: "ინტერაქტიული კონცეფციის რუკა აქ გამოჩნდება" },
  researchTools: { en: "Research Tools", ka: "კვლევის ინსტრუმენტები" },
  hypothesisTracker: { en: "Hypothesis Tracker", ka: "ჰიპოთეზების ტრეკერი" },
  actionsQueue: { en: "Actions Queue", ka: "მოქმედებების რიგი" },
  bibliography: { en: "Bibliography", ka: "ბიბლიოგრაფია" },
  trackHypotheses: { en: "Track and manage research hypotheses generated during your sessions.", ka: "თვალყური ადევნეთ და მართეთ კვლევის ჰიპოთეზები, რომლებიც თქვენი სესიების დროს გენერირდება." },
  actionsQueueDesc: { en: "Queue of research actions and follow-up tasks.", ka: "კვლევის მოქმედებების და შემდგომი ამოცანების რიგი." },
  bibliographyDesc: { en: "Auto-generated bibliography from research sources.", ka: "ავტომატურად გენერირებული ბიბლიოგრაფია კვლევის წყაროებიდან." },
  crossDisciplinaryInsights: { en: "Cross-Disciplinary Insights", ka: "ინტერდისციპლინარული ინსაითები" },
  discoverConnections: { en: "Discover connections between different fields of research.", ka: "აღმოაჩინეთ კავშირები კვლევის სხვადასხვა სფეროებს შორის." },
  generatedHypotheses: { en: "Generated Hypotheses", ka: "გენერირებული ჰიპოთეზები" },
  aiGeneratedHypotheses: { en: "AI-generated research hypotheses based on cross-disciplinary analysis.", ka: "AI-ს მიერ გენერირებული კვლევითი ჰიპოთეზები ინტერდისციპლინარული ანალიზის საფუძველზე." },
  aiDebates: { en: "AI Debates", ka: "AI დისკუსიები" },
  watchAIDebate: { en: "Watch AI agents debate different perspectives on research topics.", ka: "უყურეთ AI აგენტების დისკუსიას კვლევის თემებზე სხვადასხვა პერსპექტივიდან." },
  
  // AI Statuses
  ready: { en: "ready", ka: "მზად" },
  searching: { en: "searching", ka: "ძებნა" },
  analyzing: { en: "analyzing", ka: "ანალიზი" },
  idle: { en: "idle", ka: "უმოქმედო" },
  
  // Discipline Categories
  lifeSciences: { en: "Life Sciences", ka: "სიცოცხლის მეცნიერებები" },
  physicalSciences: { en: "Physical Sciences", ka: "ფიზიკური მეცნიერებები" },
  mathematicalSciences: { en: "Mathematical Sciences", ka: "მათემატიკური მეცნიერებები" },
  engineering: { en: "Engineering", ka: "ინჟინერია" },
  crossDisciplinaryCategory: { en: "Cross-Disciplinary", ka: "ინტერდისციპლინარული" },
  
  // Individual Disciplines
  neuroscience: { en: "Neuroscience", ka: "ნეირომეცნიერება" },
  cellBiology: { en: "Cell Biology", ka: "უჯრედული ბიოლოგია" },
  molecularBiology: { en: "Molecular Biology", ka: "მოლეკულური ბიოლოგია" },
  biochemistry: { en: "Biochemistry", ka: "ბიოქიმია" },
  pharmacology: { en: "Pharmacology", ka: "ფარმაკოლოგია" },
  medicine: { en: "Medicine", ka: "მედიცინა" },
  physics: { en: "Physics", ka: "ფიზიკა" },
  chemistry: { en: "Chemistry", ka: "ქიმია" },
  quantumBiology: { en: "Quantum Biology", ka: "კვანტური ბიოლოგია" },
  mathematics: { en: "Mathematics", ka: "მათემატიკა" },
  statistics: { en: "Statistics", ka: "სტატისტიკა" },
  networkTheory: { en: "Network Theory", ka: "ქსელის თეორია" },
  biomedicalEng: { en: "Biomedical Eng", ka: "ბიოსამედიცინო ინჟ." },
  materialsScience: { en: "Materials Science", ka: "მასალათმცოდნეობა" },
  nanotechnology: { en: "Nanotechnology", ka: "ნანოტექნოლოგია" },
  computerScience: { en: "Computer Science", ka: "კომპიუტერული მეცნიერება" },
  systemsBiology: { en: "Systems Biology", ka: "სისტემური ბიოლოგია" },
  cybernetics: { en: "Cybernetics", ka: "კიბერნეტიკა" },
  
  // Research Focus Options
  stemCells: { en: "Stem Cells", ka: "ღეროვანი უჯრედები" },
  geneTherapy: { en: "Gene Therapy", ka: "გენური თერაპია" },
  exosomes: { en: "Exosomes", ka: "ეგზოსომები" },
  biomaterials: { en: "Biomaterials", ka: "ბიომასალები" },
  all: { en: "All", ka: "ყველა" },
  
  // Quick Commands
  fullSynthesis: { en: "Full synthesis", ka: "სრული სინთეზი" },
  quickScan: { en: "Quick scan", ka: "სწრაფი სკანირება" },
  aiConsensus: { en: "AI consensus", ka: "AI კონსენსუსი" },
  aiDebate: { en: "AI debate", ka: "AI დისკუსია" },
  byField: { en: "By field", ka: "დარგის მიხედვით" },
  
  // Analysis Labels
  keyPoints: { en: "Key Points", ka: "ძირითადი პუნქტები" },
  uniqueInsights: { en: "Unique Insights", ka: "უნიკალური ინსაითები" },
  confidence: { en: "Confidence", ka: "სანდოობა" },
  perspectives: { en: "Perspectives", ka: "პერსპექტივები" },
  concerns: { en: "Concerns", ka: "შეშფოთებები" },
  
  // Hypothesis Tracker
  nascent: { en: "Nascent", ka: "საწყისი" },
  developing: { en: "Developing", ka: "მზარდი" },
  strong: { en: "Strong", ka: "ძლიერი" },
  validated: { en: "Validated", ka: "დადასტურებული" },
  refuted: { en: "Refuted", ka: "უარყოფილი" },
  superseded: { en: "Superseded", ka: "ჩანაცვლებული" },
  noHypothesesYet: { en: "No Hypotheses Yet", ka: "ჯერ არ არის ჰიპოთეზები" },
  runOmegaQuery: { en: "Run an OMEGA research query to generate hypotheses from cross-disciplinary analysis.", ka: "გაუშვით OMEGA კვლევის მოთხოვნა ინტერდისციპლინარული ანალიზიდან ჰიპოთეზების გენერირებისთვის." },
  supportingEvidence: { en: "Supporting Evidence", ka: "დამადასტურებელი მტკიცებულება" },
  contradictingEvidence: { en: "Contradicting Evidence", ka: "საწინააღმდეგო მტკიცებულება" },
  crossDisciplinaryBasis: { en: "Cross-Disciplinary Basis", ka: "ინტერდისციპლინარული საფუძველი" },
  testability: { en: "Testability", ka: "ტესტირებადობა" },
  actionItems: { en: "Action Items", ka: "სამოქმედო პუნქტები" },
  updateStatus: { en: "Update status:", ka: "სტატუსის განახლება:" },
  failedToLoadHypotheses: { en: "Failed to load hypotheses", ka: "ჰიპოთეზების ჩატვირთვა ვერ მოხერხდა" },
  proposedBy: { en: "Proposed by", ka: "შემოთავაზებულია" },
  supportedBy: { en: "Supported by:", ka: "მხარდაჭერილია:" },
  moreHypotheses: { en: "more hypotheses", ka: "მეტი ჰიპოთეზა" },
  
  // Debate Panel
  highPriority: { en: "High Priority", ka: "მაღალი პრიორიტეტი" },
  mediumPriority: { en: "Medium Priority", ka: "საშუალო პრიორიტეტი" },
  lowPriority: { en: "Low Priority", ka: "დაბალი პრიორიტეტი" },
  position: { en: "Position", ka: "პოზიცია" },
  positionNotDefined: { en: "Position not defined", ka: "პოზიცია არ არის განსაზღვრული" },
  evidence: { en: "Evidence:", ka: "მტკიცებულება:" },
  resolutionNeeded: { en: "Resolution Needed", ka: "საჭიროა გადაწყვეტა" },
  noActiveDebates: { en: "No Active Debates", ka: "არ არის აქტიური დისკუსიები" },
  debatesWillAppear: { en: "When AI agents disagree on research findings, debates will appear here for resolution.", ka: "როცა AI აგენტები არ ეთანხმებიან კვლევის შედეგებს, დისკუსიები აქ გამოჩნდება გადაწყვეტისთვის." },
  failedToLoadDebates: { en: "Failed to load debates", ka: "დისკუსიების ჩატვირთვა ვერ მოხერხდა" },
  moreDebates: { en: "more debates", ka: "მეტი დისკუსია" },
  ais: { en: "AIs", ka: "AI-ები" },
  vs: { en: "vs", ka: "vs" },
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
