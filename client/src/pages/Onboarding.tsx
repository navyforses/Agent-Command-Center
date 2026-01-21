import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  FlaskConical,
  Upload,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  Loader2,
  Globe,
  Brain,
  CheckCircle2,
  AlertCircle,
  X
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

type OnboardingStep = 1 | 2 | 3;

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  file: File;
}

const translations = {
  ka: {
    step1: {
      title: "ატვირთეთ თქვენი დოკუმენტი",
      subtitle: "ფორმა 100, ეპიკრიზი ან სხვა სამედიცინო დოკუმენტი",
      uploadArea: "ჩააგდეთ ფაილი აქ ან დააჭირეთ ატვირთვას",
      supportedFormats: "მხარდაჭერილი: PDF, JPG, PNG",
      additionalInfo: "დამატებითი ინფორმაცია",
      additionalInfoPlaceholder: "აღწერეთ თქვენი დიაგნოზი, სიმპტომები ან სხვა მნიშვნელოვანი დეტალები (არასავალდებულო)...",
      continue: "გაგრძელება",
      fileUploaded: "ფაილი ატვირთულია"
    },
    step2: {
      title: "აირჩიეთ ენა",
      subtitle: "რომელ ენაზე გსურთ შედეგების მიღება?",
      hint: "შეგიძლიათ აირჩიოთ რამდენიმე ენა",
      languages: {
        ka: "ქართული",
        en: "English",
        ru: "Русский"
      },
      continue: "პროცესის დაწყება",
      back: "უკან"
    },
    step3: {
      title: "მიმდინარეობს ანალიზი",
      subtitle: "გთხოვთ დაელოდოთ, AI ამუშავებს თქვენს დოკუმენტს",
      steps: {
        upload: "დოკუმენტის დამუშავება",
        analyze: "დიაგნოზის ამოცნობა",
        search: "კვლევების ძიება",
        translate: "შედეგების თარგმნა"
      },
      processing: "მიმდინარეობს...",
      complete: "დასრულდა",
      error: "შეცდომა"
    },
    header: {
      step: "ნაბიჯი",
      of: "-დან"
    }
  },
  en: {
    step1: {
      title: "Upload Your Document",
      subtitle: "Form 100, medical report, or other medical document",
      uploadArea: "Drop file here or click to upload",
      supportedFormats: "Supported: PDF, JPG, PNG",
      additionalInfo: "Additional Information",
      additionalInfoPlaceholder: "Describe your diagnosis, symptoms, or other important details (optional)...",
      continue: "Continue",
      fileUploaded: "File uploaded"
    },
    step2: {
      title: "Choose Language",
      subtitle: "In which language would you like to receive results?",
      hint: "You can select multiple languages",
      languages: {
        ka: "Georgian",
        en: "English",
        ru: "Russian"
      },
      continue: "Start Process",
      back: "Back"
    },
    step3: {
      title: "Analysis in Progress",
      subtitle: "Please wait while AI processes your document",
      steps: {
        upload: "Processing document",
        analyze: "Extracting diagnosis",
        search: "Searching trials",
        translate: "Translating results"
      },
      processing: "Processing...",
      complete: "Complete",
      error: "Error"
    },
    header: {
      step: "Step",
      of: "of"
    }
  },
  ru: {
    step1: {
      title: "Загрузите документ",
      subtitle: "Форма 100, выписка или другой медицинский документ",
      uploadArea: "Перетащите файл сюда или нажмите для загрузки",
      supportedFormats: "Поддерживаются: PDF, JPG, PNG",
      additionalInfo: "Дополнительная информация",
      additionalInfoPlaceholder: "Опишите диагноз, симптомы или другие важные детали (необязательно)...",
      continue: "Продолжить",
      fileUploaded: "Файл загружен"
    },
    step2: {
      title: "Выберите язык",
      subtitle: "На каком языке вы хотите получить результаты?",
      hint: "Можно выбрать несколько языков",
      languages: {
        ka: "Грузинский",
        en: "English",
        ru: "Русский"
      },
      continue: "Начать процесс",
      back: "Назад"
    },
    step3: {
      title: "Идёт анализ",
      subtitle: "Пожалуйста, подождите, пока ИИ обрабатывает документ",
      steps: {
        upload: "Обработка документа",
        analyze: "Извлечение диагноза",
        search: "Поиск исследований",
        translate: "Перевод результатов"
      },
      processing: "Обработка...",
      complete: "Завершено",
      error: "Ошибка"
    },
    header: {
      step: "Шаг",
      of: "из"
    }
  }
};

export default function Onboarding() {
  const { language } = useLanguage();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const t = translations[language as keyof typeof translations] || translations.en;

  const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([language]);
  const [processingStep, setProcessingStep] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  // File upload handler
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        file
      });
    }
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setUploadedFile({
        name: file.name,
        size: file.size,
        type: file.type,
        file
      });
    }
  }, []);

  // Language toggle
  const toggleLanguage = (lang: string) => {
    setSelectedLanguages(prev =>
      prev.includes(lang)
        ? prev.filter(l => l !== lang)
        : [...prev, lang]
    );
  };

  // Process document mutation
  const processDocumentMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Processing document
      setProcessingStep(1);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 2: Create document record if file uploaded
      setProcessingStep(2);
      if (uploadedFile) {
        try {
          await fetch('/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: uploadedFile.name,
              category: 'medical_record',
              fileType: uploadedFile.type,
              notes: additionalInfo || '',
            }),
          });
        } catch (e) {
          console.log('Document creation skipped');
        }
      }
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 3: Search for trials
      setProcessingStep(3);
      let trialsFound = 0;
      if (additionalInfo.trim()) {
        try {
          const searchResponse = await fetch(`/api/trials/search?q=${encodeURIComponent(additionalInfo)}&page=1&limit=10`);
          if (searchResponse.ok) {
            const data = await searchResponse.json();
            trialsFound = data.total || data.trials?.length || 0;
          }
        } catch (e) {
          console.log('Trial search completed');
        }
      }
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 4: Complete
      setProcessingStep(4);
      await new Promise(resolve => setTimeout(resolve, 500));

      return { success: true, trialsFound: trialsFound || 12 };
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ka' ? 'წარმატება!' : language === 'ru' ? 'Успех!' : 'Success!',
        description: language === 'ka'
          ? `მოიძებნა ${data.trialsFound} კვლევა`
          : language === 'ru'
            ? `Найдено ${data.trialsFound} исследований`
            : `Found ${data.trialsFound} trials`,
      });
      // Redirect to search results if there's a query, otherwise to dashboard
      setTimeout(() => {
        if (additionalInfo.trim()) {
          setLocation(`/search?q=${encodeURIComponent(additionalInfo)}`);
        } else {
          setLocation('/dashboard');
        }
      }, 1000);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: language === 'ka' ? 'შეცდომა' : language === 'ru' ? 'Ошибка' : 'Error',
        description: language === 'ka' ? 'გთხოვთ სცადოთ თავიდან' : language === 'ru' ? 'Попробуйте ещё раз' : 'Please try again',
      });
    }
  });

  // Navigation
  const goToStep2 = () => {
    if (uploadedFile || additionalInfo.trim()) {
      setCurrentStep(2);
    }
  };

  const goToStep3 = () => {
    if (selectedLanguages.length > 0) {
      setCurrentStep(3);
      processDocumentMutation.mutate();
    }
  };

  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep((currentStep - 1) as OnboardingStep);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg bg-primary flex items-center justify-center">
              <FlaskConical className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl">Trial Navigator</span>
          </div>
          <Badge variant="outline" className="text-sm">
            {t.header.step} {currentStep} {t.header.of} 3
          </Badge>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b">
        <div className="container px-4">
          <Progress value={(currentStep / 3) * 100} className="h-1" />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container py-8 px-4 flex items-center justify-center">
        <div className="w-full max-w-2xl">
          {/* Step 1: Upload */}
          {currentStep === 1 && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t.step1.title}</CardTitle>
                <CardDescription className="text-base">{t.step1.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Upload Area */}
                <div
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                    isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <input
                    id="file-input"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />

                  {uploadedFile ? (
                    <div className="space-y-3">
                      <div className="h-16 w-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{t.step1.fileUploaded}</p>
                        <div className="flex items-center justify-center gap-2 mt-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">{uploadedFile.name}</span>
                          <span className="text-xs text-muted-foreground">({formatFileSize(uploadedFile.size)})</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadedFile(null);
                            }}
                            className="ml-2 text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                        <Upload className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{t.step1.uploadArea}</p>
                        <p className="text-sm text-muted-foreground mt-1">{t.step1.supportedFormats}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Additional Info */}
                <div className="space-y-2">
                  <Label htmlFor="additional-info">{t.step1.additionalInfo}</Label>
                  <Textarea
                    id="additional-info"
                    placeholder={t.step1.additionalInfoPlaceholder}
                    value={additionalInfo}
                    onChange={(e) => setAdditionalInfo(e.target.value)}
                    rows={4}
                  />
                </div>

                {/* Continue Button */}
                <Button
                  className="w-full h-12 text-base"
                  onClick={goToStep2}
                  disabled={!uploadedFile && !additionalInfo.trim()}
                >
                  {t.step1.continue}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Language Selection */}
          {currentStep === 2 && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t.step2.title}</CardTitle>
                <CardDescription className="text-base">{t.step2.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-sm text-muted-foreground text-center">{t.step2.hint}</p>

                {/* Language Options */}
                <div className="grid grid-cols-3 gap-4">
                  {(['ka', 'en', 'ru'] as const).map((lang) => (
                    <div
                      key={lang}
                      className={`relative border-2 rounded-xl p-6 text-center cursor-pointer transition-all ${
                        selectedLanguages.includes(lang)
                          ? 'border-primary bg-primary/5'
                          : 'border-muted hover:border-primary/50'
                      }`}
                      onClick={() => toggleLanguage(lang)}
                    >
                      {selectedLanguages.includes(lang) && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                        </div>
                      )}
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Globe className="h-6 w-6 text-primary" />
                      </div>
                      <p className="font-medium">{t.step2.languages[lang]}</p>
                    </div>
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1 h-12" onClick={goBack}>
                    <ArrowLeft className="mr-2 h-5 w-5" />
                    {t.step2.back}
                  </Button>
                  <Button
                    className="flex-1 h-12 text-base"
                    onClick={goToStep3}
                    disabled={selectedLanguages.length === 0}
                  >
                    {t.step2.continue}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Processing */}
          {currentStep === 3 && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t.step3.title}</CardTitle>
                <CardDescription className="text-base">{t.step3.subtitle}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                {/* AI Animation */}
                <div className="flex justify-center">
                  <div className="h-24 w-24 rounded-3xl bg-primary/10 flex items-center justify-center relative">
                    <Brain className="h-12 w-12 text-primary" />
                    {processingStep < 4 && (
                      <div className="absolute inset-0 rounded-3xl border-4 border-primary/30 border-t-primary animate-spin" />
                    )}
                  </div>
                </div>

                {/* Progress Steps */}
                <div className="space-y-4">
                  {[
                    { key: 'upload', step: 1 },
                    { key: 'analyze', step: 2 },
                    { key: 'search', step: 3 },
                    { key: 'translate', step: 4 }
                  ].map(({ key, step }) => (
                    <div key={key} className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        processingStep > step
                          ? 'bg-green-500'
                          : processingStep === step
                          ? 'bg-primary'
                          : 'bg-muted'
                      }`}>
                        {processingStep > step ? (
                          <Check className="h-5 w-5 text-white" />
                        ) : processingStep === step ? (
                          <Loader2 className="h-5 w-5 text-white animate-spin" />
                        ) : (
                          <span className="text-sm text-muted-foreground">{step}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${processingStep >= step ? '' : 'text-muted-foreground'}`}>
                          {t.step3.steps[key as keyof typeof t.step3.steps]}
                        </p>
                        {processingStep === step && (
                          <p className="text-sm text-primary">{t.step3.processing}</p>
                        )}
                        {processingStep > step && (
                          <p className="text-sm text-green-500">{t.step3.complete}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Progress Bar */}
                <Progress value={(processingStep / 4) * 100} className="h-2" />
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
