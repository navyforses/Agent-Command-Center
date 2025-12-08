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
  originNexus: { en: "NEXUS", ka: "NEXUS" },
  originEvolution: { en: "Evolution", ka: "ევოლუცია" },
  originMerged: { en: "Merged", ka: "გაერთიანებული" },
  filterByOrigin: { en: "Filter by origin:", ka: "ფილტრაცია წარმოშობით:" },
  
  // Evolution Cycle Dashboard
  evolutionDashboard: { en: "Evolution Dashboard", ka: "ევოლუციის პანელი" },
  evolutionSubtitle: { en: "Autonomous 24-hour research cycles monitoring your child's condition", ka: "ავტონომიური 24-საათიანი კვლევითი ციკლები თქვენი შვილის მდგომარეობის მონიტორინგისთვის" },
  evolutionCycle: { en: "Evolution Cycle", ka: "ევოლუციის ციკლი" },
  evolutionCycles: { en: "Evolution", ka: "ევოლუცია" },
  evolutionActive: { en: "Evolution Active", ka: "ევოლუცია აქტიურია" },
  noActiveCycle: { en: "No Active Evolution Cycle", ka: "არ არის აქტიური ევოლუციის ციკლი" },
  noActiveCycleDescription: { en: "Upload a medical document to start an autonomous research cycle that monitors the latest findings for your child's condition.", ka: "ატვირთეთ სამედიცინო დოკუმენტი ავტონომიური კვლევითი ციკლის დასაწყებად, რომელიც აკვირდება უახლეს აღმოჩენებს თქვენი შვილის მდგომარეობისთვის." },
  uploadDocumentToStart: { en: "Upload Document to Start", ka: "ატვირთეთ დოკუმენტი დასაწყებად" },
  noDiagnosisContext: { en: "No diagnosis context available", ka: "დიაგნოზის კონტექსტი არ არის ხელმისაწვდომი" },
  cycleStatus_active: { en: "Active", ka: "აქტიური" },
  cycleStatus_paused: { en: "Paused", ka: "შეჩერებული" },
  cycleStatus_completed: { en: "Completed", ka: "დასრულებული" },
  cycleStatus_cancelled: { en: "Cancelled", ka: "გაუქმებული" },
  daysRemaining: { en: "days remaining", ka: "დღე დარჩა" },
  cycleProgress: { en: "Cycle Progress", ka: "ციკლის პროგრესი" },
  currentDayPhase: { en: "Current Day Phase", ka: "მიმდინარე დღის ფაზა" },
  phaseObserve: { en: "Observe", ka: "დაკვირვება" },
  phaseLearn: { en: "Learn", ka: "სწავლა" },
  phaseConnect: { en: "Connect", ka: "დაკავშირება" },
  phaseTheorize: { en: "Theorize", ka: "თეორიზება" },
  phaseSynthesize: { en: "Synthesize", ka: "სინთეზი" },
  phaseValidate: { en: "Validate", ka: "ვალიდაცია" },
  phaseAdapt: { en: "Adapt", ka: "ადაპტაცია" },
  dailyReports: { en: "Daily Reports", ka: "ყოველდღიური ანგარიშები" },
  dailyReport: { en: "Daily Report", ka: "ყოველდღიური ანგარიში" },
  noReportsYet: { en: "No Reports Yet", ka: "ჯერ არ არის ანგარიშები" },
  reportsWillAppear: { en: "Daily research reports will appear here as the evolution cycle progresses.", ka: "ყოველდღიური კვლევითი ანგარიშები აქ გამოჩნდება ევოლუციის ციკლის პროგრესის მიხედვით." },
  keyFindings: { en: "Key Findings", ka: "ძირითადი აღმოჩენები" },
  moreFindings: { en: "more findings", ka: "მეტი აღმოჩენა" },
  chat: { en: "Chat", ka: "ჩატი" },
  chatAboutReport: { en: "Chat About This Report", ka: "ჩატი ამ ანგარიშზე" },
  noMessagesYet: { en: "No messages yet", ka: "ჯერ არ არის შეტყობინებები" },
  askAboutReport: { en: "Ask questions about this research report", ka: "დაუსვით შეკითხვები ამ კვლევით ანგარიშს" },
  typeYourQuestion: { en: "Type your question...", ka: "შეიყვანეთ თქვენი შეკითხვა..." },
  downloadPdf: { en: "Download PDF", ka: "PDF ჩამოტვირთვა" },

  // Evolution Cycle Activation
  startEvolutionCycle: { en: "Start Evolution Cycle", ka: "ევოლუციის ციკლის დაწყება" },
  evolutionCycleDescription: { en: "Start an autonomous 24-hour research cycle that continuously monitors the latest medical findings relevant to your child's condition.", ka: "დაიწყეთ ავტონომიური 24-საათიანი კვლევითი ციკლი, რომელიც მუდმივად აკვირდება უახლეს სამედიცინო აღმოჩენებს თქვენი შვილის მდგომარეობისთვის." },
  selectEndDate: { en: "Select End Date", ka: "აირჩიეთ დასრულების თარიღი" },
  endDateDescription: { en: "The cycle will run autonomously until this date, generating daily research reports.", ka: "ციკლი ავტონომიურად იმუშავებს ამ თარიღამდე, აგენერირებს ყოველდღიურ კვლევით ანგარიშებს." },
  startCycle: { en: "Start Cycle", ka: "ციკლის დაწყება" },
  cycleCreated: { en: "Evolution Cycle Started", ka: "ევოლუციის ციკლი დაიწყო" },
  cycleCreatedDescription: { en: "The autonomous research cycle has begun. You'll receive daily reports.", ka: "ავტონომიური კვლევითი ციკლი დაიწყო. მიიღებთ ყოველდღიურ ანგარიშებს." },
  cycleCreationFailed: { en: "Failed to Start Cycle", ka: "ციკლის დაწყება ვერ მოხერხდა" },
  documentUploadedSuccessfully: { en: "Document Uploaded", ka: "დოკუმენტი აიტვირთა" },
  wouldYouLikeToStartCycle: { en: "Would you like to start an Evolution Cycle?", ka: "გსურთ ევოლუციის ციკლის დაწყება?" },
  skipForNow: { en: "Skip for Now", ka: "გამოტოვება" },
  analyzingDocument: { en: "Analyzing document to extract diagnosis context...", ka: "დოკუმენტის ანალიზი დიაგნოზის კონტექსტის ამოსაღებად..." },

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

  // Start Cycle Dialog
  selectChild: { en: "Select Child", ka: "აირჩიეთ ბავშვი" },
  selectChildPlaceholder: { en: "Choose a child...", ka: "აირჩიეთ ბავშვი..." },
  cycleDuration: { en: "Cycle End Date", ka: "ციკლის დასრულების თარიღი" },
  selectDate: { en: "Select date", ka: "აირჩიეთ თარიღი" },
  diagnosisContext: { en: "Diagnosis Context", ka: "დიაგნოზის კონტექსტი" },
  diagnosisContextPlaceholder: { en: "Describe your child's condition and what you want the AI to research...", ka: "აღწერეთ თქვენი შვილის მდგომარეობა და რა გსურთ AI-მ გამოიკვლიოს..." },
  diagnosisContextHelp: { en: "The more details you provide, the more relevant the research findings will be.", ka: "რაც უფრო მეტ დეტალს მოგვაწოდებთ, მით უფრო რელევანტური იქნება კვლევის შედეგები." },
  cycleStarted: { en: "Evolution Cycle Started", ka: "ევოლუციის ციკლი დაიწყო" },
  cycleStartedDesc: { en: "Your research cycle has begun and will run autonomously.", ka: "თქვენი კვლევითი ციკლი დაიწყო და ავტონომიურად იმუშავებს." },
  errorStartingCycle: { en: "Error Starting Cycle", ka: "ციკლის დაწყების შეცდომა" },
  missingFields: { en: "Missing Fields", ka: "არასრული ველები" },
  fillAllFields: { en: "Please fill in all required fields.", ka: "გთხოვთ შეავსოთ ყველა სავალდებულო ველი." },
  addChildFirst: { en: "Add a child profile first to start an Evolution Cycle", ka: "ჯერ დაამატეთ ბავშვის პროფილი ევოლუციის ციკლის დასაწყებად" },
  cancel: { en: "Cancel", ka: "გაუქმება" },

  // NEXUS OMEGA Tab Labels
  research: { en: "Research", ka: "კვლევა" },
  evolution: { en: "Evolution", ka: "ევოლუცია" },
  reports: { en: "Reports", ka: "ანგარიშები" },

  // File Upload
  uploadDiagnosis: { en: "Upload Diagnosis", ka: "დიაგნოზის ატვირთვა" },
  uploadDiagnosisDocument: { en: "Upload Diagnosis Document", ka: "ატვირთეთ დიაგნოზის დოკუმენტი" },
  clickToUpload: { en: "Click to upload", ka: "დააჭირეთ ასატვირთად" },
  supportedFormats: { en: "PDF, JPEG, PNG, WebP (max 10MB)", ka: "PDF, JPEG, PNG, WebP (მაქს. 10MB)" },
  fileExtractionHelp: { en: "Child information and diagnosis details will be automatically extracted from this document.", ka: "ბავშვის ინფორმაცია და დიაგნოზის დეტალები ავტომატურად ამოიღება ამ დოკუმენტიდან." },
  evolutionCycleDescriptionFile: { en: "Upload your child's diagnosis document. The AI will extract the relevant information and start researching.", ka: "ატვირთეთ თქვენი შვილის დიაგნოზის დოკუმენტი. AI ამოიღებს რელევანტურ ინფორმაციას და დაიწყებს კვლევას." },
  uploadDiagnosisRequired: { en: "Please upload a diagnosis file and select an end date.", ka: "გთხოვთ ატვირთოთ დიაგნოზის ფაილი და აირჩიოთ დასრულების თარიღი." },
  analyzeDiagnosis: { en: "Analyze this diagnosis and recommend treatment", ka: "გააანალიზეთ ეს დიაგნოზი და რეკომენდაცია გაუწიეთ მკურნალობას" },
  fileTooLarge: { en: "File too large", ka: "ფაილი ზედმეტად დიდია" },
  maxFileSize: { en: "Maximum file size is 10MB", ka: "მაქსიმალური ფაილის ზომა 10MB-ია" },
  invalidFileType: { en: "Invalid file type", ka: "არასწორი ფაილის ტიპი" },
  allowedFileTypes: { en: "Please upload PDF or image files (JPEG, PNG, WebP)", ka: "გთხოვთ ატვირთოთ PDF ან სურათის ფაილები (JPEG, PNG, WebP)" },

  // Research States
  researchingWithAI: { en: "Researching with 5 AI agents...", ka: "კვლევა 5 AI აგენტით..." },
  noResearchYet: { en: "No Research Yet", ka: "კვლევა ჯერ არ ჩატარებულა" },
  enterQueryToBegin: { en: "Enter a research query above and click OMEGA to begin multi-AI research synthesis.", ka: "შეიყვანეთ კვლევის მოთხოვნა ზემოთ და დააჭირეთ OMEGA-ს მულტი-AI კვლევის სინთეზის დასაწყებად." },
  noIndividualPerspectives: { en: "Run a research query to see individual AI perspectives.", ka: "გაუშვით კვლევის მოთხოვნა ინდივიდუალური AI პერსპექტივების სანახავად." },

  // Accumulated Knowledge Section
  accumulatedKnowledge: { en: "Accumulated Knowledge", ka: "დაგროვებული ცოდნა" },
  accumulatedKnowledgeSubtitle: { en: "Insights discovered and validated across research cycles", ka: "ინსაითები აღმოჩენილი და დადასტურებული კვლევის ციკლებში" },
  noAccumulatedKnowledge: { en: "No Accumulated Knowledge Yet", ka: "ჯერ არ არის დაგროვებული ცოდნა" },
  noAccumulatedKnowledgeDesc: { en: "As research cycles complete, validated insights and discoveries will appear here.", ka: "კვლევის ციკლების დასრულებისას, დადასტურებული ინსაითები და აღმოჩენები აქ გამოჩნდება." },
  knowledgeConfidence: { en: "Confidence", ka: "სანდოობა" },
  knowledgeValidations: { en: "Validations", ka: "ვალიდაციები" },
  knowledgeCycles: { en: "Contributing Cycles", ka: "მონაწილე ციკლები" },
  knowledgeType_hypothesis: { en: "Hypothesis", ka: "ჰიპოთეზა" },
  knowledgeType_discovery: { en: "Discovery", ka: "აღმოჩენა" },
  knowledgeType_treatment_insight: { en: "Treatment Insight", ka: "მკურნალობის ინსაითი" },
  knowledgeType_mechanism: { en: "Mechanism", ka: "მექანიზმი" },
  knowledgeType_pattern: { en: "Pattern", ka: "ნიმუში" },
  knowledgeType_connection: { en: "Connection", ka: "კავშირი" },
  knowledgeType_prediction: { en: "Prediction", ka: "პროგნოზი" },
  knowledgeStatus_emerging: { en: "Emerging", ka: "წარმოშობადი" },
  knowledgeStatus_active: { en: "Active", ka: "აქტიური" },
  knowledgeStatus_validated: { en: "Validated", ka: "დადასტურებული" },
  knowledgeStatus_superseded: { en: "Superseded", ka: "ჩანაცვლებული" },
  knowledgeStatus_refuted: { en: "Refuted", ka: "უარყოფილი" },
  knowledgeGrowth: { en: "Knowledge Growth", ka: "ცოდნის ზრდა" },
  totalKnowledge: { en: "Total Knowledge Items", ka: "ცოდნის ერთეულები" },
  viewDetails: { en: "View Details", ka: "დეტალების ნახვა" },
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
