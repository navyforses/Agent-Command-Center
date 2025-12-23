import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileText,
  Sparkles,
  Check,
  AlertCircle,
  Loader2,
  Baby,
  Calendar,
  Stethoscope,
  StickyNote,
  ArrowRight,
  ArrowLeft,
  Wand2,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ExtractedData {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  diagnosis?: string;
  diagnosisDate?: string;
  notes?: string;
  confidence: number;
  sourceDocument?: string;
}

interface SmartOnboardingProps {
  childId?: number;
  existingChild?: {
    id: number;
    firstName: string;
    lastName: string;
    dateOfBirth?: string | null;
    diagnosis?: string | null;
    diagnosisDate?: string | null;
    notes?: string | null;
  };
  onComplete?: () => void;
  onCancel?: () => void;
}

type OnboardingStep = "upload" | "analyzing" | "preview" | "saving" | "complete";

export function SmartOnboarding({ childId, existingChild, onComplete, onCancel }: SmartOnboardingProps) {
  const { language } = useLanguage();
  const { toast } = useToast();

  const [step, setStep] = useState<OnboardingStep>("upload");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [editedData, setEditedData] = useState<ExtractedData | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const texts = {
    title: language === "ka" ? "სმარტ პროფილის შექმნა" : "Smart Profile Setup",
    subtitle: language === "ka"
      ? "ატვირთეთ სამედიცინო დოკუმენტი და AI ავტომატურად შეავსებს პროფილს"
      : "Upload a medical document and AI will automatically fill the profile",
    uploadTitle: language === "ka" ? "დოკუმენტის ატვირთვა" : "Upload Document",
    uploadDescription: language === "ka"
      ? "ჩააგდეთ სამედიცინო დოკუმენტი აქ"
      : "Drop your medical document here",
    supportedFormats: language === "ka"
      ? "მხარდაჭერილი: PDF, სურათები (PNG, JPG)"
      : "Supported: PDF, Images (PNG, JPG)",
    browseFiles: language === "ka" ? "ფაილის არჩევა" : "Browse Files",
    analyzing: language === "ka" ? "AI ანალიზი მიმდინარეობს..." : "AI Analysis in Progress...",
    analyzingDocument: language === "ka" ? "დოკუმენტის დამუშავება" : "Processing Document",
    extractingInfo: language === "ka" ? "ინფორმაციის ამოღება" : "Extracting Information",
    reviewData: language === "ka" ? "მონაცემების გადამოწმება" : "Review Extracted Data",
    reviewDescription: language === "ka"
      ? "გადაამოწმეთ და შეასწორეთ საჭიროებისამებრ"
      : "Review and edit as needed",
    firstName: language === "ka" ? "სახელი" : "First Name",
    lastName: language === "ka" ? "გვარი" : "Last Name",
    dateOfBirth: language === "ka" ? "დაბადების თარიღი" : "Date of Birth",
    diagnosis: language === "ka" ? "დიაგნოზი" : "Diagnosis",
    diagnosisDate: language === "ka" ? "დიაგნოზის თარიღი" : "Diagnosis Date",
    notes: language === "ka" ? "შენიშვნები" : "Notes",
    confidence: language === "ka" ? "სიზუსტე" : "Confidence",
    saveProfile: language === "ka" ? "პროფილის შენახვა" : "Save Profile",
    saving: language === "ka" ? "ინახება..." : "Saving...",
    cancel: language === "ka" ? "გაუქმება" : "Cancel",
    back: language === "ka" ? "უკან" : "Back",
    continue: language === "ka" ? "გაგრძელება" : "Continue",
    complete: language === "ka" ? "დასრულდა!" : "Complete!",
    profileCreated: language === "ka"
      ? "პროფილი წარმატებით შეიქმნა"
      : "Profile created successfully",
    aiExtracted: language === "ka" ? "AI-მ ამოიღო" : "AI Extracted",
    skipAndManual: language === "ka" ? "ხელით შევსება" : "Fill Manually",
    documentTypes: language === "ka"
      ? "ფორმა 100, დიაგნოზის ცნობა, გამოწერის ეპიკრიზი"
      : "Form 100, Diagnosis Report, Discharge Summary",
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file);
    setStep("analyzing");
    setUploadProgress(0);
    setAnalyzingProgress(0);

    // Simulate upload progress
    const uploadInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(uploadInterval);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    // Wait for upload to complete
    await new Promise(resolve => setTimeout(resolve, 1200));

    // Start AI analysis
    const analyzeInterval = setInterval(() => {
      setAnalyzingProgress(prev => {
        if (prev >= 100) {
          clearInterval(analyzeInterval);
          return 100;
        }
        return prev + 5;
      });
    }, 150);

    // Simulate AI document parsing
    await simulateDocumentParsing(file);
  };

  const simulateDocumentParsing = async (file: File) => {
    // In a real implementation, this would call an API to parse the document
    // For now, we simulate AI extracting data from the document
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Generate simulated extracted data based on file name for demo
    const fileName = file.name.toLowerCase();
    const isForm100 = fileName.includes("form") || fileName.includes("100") || fileName.includes("ფორმა");
    const isDiagnosis = fileName.includes("diagnosis") || fileName.includes("დიაგნოზ");

    // Simulated extraction - in production, this comes from actual AI parsing
    const simulatedData: ExtractedData = {
      firstName: existingChild?.firstName || (language === "ka" ? "გიორგი" : "George"),
      lastName: existingChild?.lastName || (language === "ka" ? "მაისურაძე" : "Johnson"),
      dateOfBirth: existingChild?.dateOfBirth || "2023-03-15",
      diagnosis: existingChild?.diagnosis || (language === "ka"
        ? "ჰიპოქსიურ-იშემიური ენცეფალოპათია (HIE), II ხარისხი"
        : "Hypoxic-Ischemic Encephalopathy (HIE), Grade II"),
      diagnosisDate: existingChild?.diagnosisDate || "2023-03-17",
      notes: language === "ka"
        ? "36 კვირა გესტაციური ასაკი. კეისრის კვეთა გადაუდებელი ჩვენებით. აპგარის შკალა: 4/6/7. ჰიპოთერმიული თერაპია ჩატარდა 72 საათის განმავლობაში."
        : "36 weeks gestational age. Emergency C-section due to fetal distress. Apgar scores: 4/6/7. Hypothermia therapy administered for 72 hours.",
      confidence: isForm100 || isDiagnosis ? 92 : 78,
      sourceDocument: file.name,
    };

    setExtractedData(simulatedData);
    setEditedData(simulatedData);
    setAnalyzingProgress(100);

    // Small delay to show 100% before transitioning
    await new Promise(resolve => setTimeout(resolve, 500));
    setStep("preview");
  };

  const updateChildMutation = useMutation({
    mutationFn: async (data: Partial<ExtractedData>) => {
      if (childId) {
        // Update existing child
        const response = await apiRequest("PATCH", `/api/children/${childId}`, {
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth || null,
          diagnosis: data.diagnosis || null,
          diagnosisDate: data.diagnosisDate || null,
          notes: data.notes || null,
        });
        return response.json();
      } else {
        // Create new child
        const response = await apiRequest("POST", "/api/children", {
          firstName: data.firstName,
          lastName: data.lastName,
          dateOfBirth: data.dateOfBirth || null,
          diagnosis: data.diagnosis || null,
          diagnosisDate: data.diagnosisDate || null,
          notes: data.notes || null,
        });
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/children"] });
      if (childId) {
        queryClient.invalidateQueries({ queryKey: ["/api/children", String(childId)] });
      }
      setStep("complete");
      toast({
        title: language === "ka" ? "წარმატება!" : "Success!",
        description: language === "ka"
          ? "პროფილი წარმატებით განახლდა"
          : "Profile updated successfully",
      });
      setTimeout(() => {
        onComplete?.();
      }, 2000);
    },
    onError: (error: Error) => {
      toast({
        title: language === "ka" ? "შეცდომა" : "Error",
        description: error.message,
        variant: "destructive",
      });
      setStep("preview");
    },
  });

  const handleSaveProfile = () => {
    if (!editedData) return;
    setStep("saving");
    updateChildMutation.mutate(editedData);
  };

  const handleInputChange = (field: keyof ExtractedData, value: string) => {
    setEditedData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const renderUploadStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex p-3 bg-primary/10 rounded-full">
          <Wand2 className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">{texts.title}</h2>
        <p className="text-muted-foreground max-w-md mx-auto">{texts.subtitle}</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div
            className={cn(
              "relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200",
              isDragOver
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-muted-foreground/25 hover:border-primary/50"
            )}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="absolute inset-0 opacity-0 cursor-pointer"
              onChange={handleFileSelect}
              data-testid="smart-onboarding-file-input"
            />

            <div className="space-y-4">
              <div className="inline-flex p-4 bg-muted rounded-full">
                <Upload className="h-8 w-8 text-muted-foreground" />
              </div>

              <div>
                <p className="text-lg font-medium">{texts.uploadDescription}</p>
                <p className="text-sm text-muted-foreground mt-1">{texts.supportedFormats}</p>
                <p className="text-xs text-muted-foreground mt-2 opacity-75">{texts.documentTypes}</p>
              </div>

              <Button variant="outline" data-testid="smart-onboarding-browse">
                <FileText className="h-4 w-4 mr-2" />
                {texts.browseFiles}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="ghost" onClick={onCancel} data-testid="smart-onboarding-skip">
          {texts.skipAndManual}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );

  const renderAnalyzingStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-6"
    >
      <Card>
        <CardContent className="p-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="relative">
              <div className="p-4 bg-primary/10 rounded-full">
                <Sparkles className="h-10 w-10 text-primary animate-pulse" />
              </div>
              <motion.div
                className="absolute -inset-2 border-2 border-primary/30 rounded-full"
                animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.2, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold">{texts.analyzing}</h3>
              <p className="text-muted-foreground">
                {uploadedFile?.name}
              </p>
            </div>

            <div className="w-full max-w-xs space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{texts.analyzingDocument}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>

              {uploadProgress === 100 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="space-y-2"
                >
                  <div className="flex justify-between text-sm">
                    <span>{texts.extractingInfo}</span>
                    <span>{analyzingProgress}%</span>
                  </div>
                  <Progress value={analyzingProgress} className="h-2" />
                </motion.div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderPreviewStep = () => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      <div className="text-center space-y-2">
        <div className="inline-flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" />
            {texts.aiExtracted}
          </Badge>
          <Badge variant="outline" className="gap-1">
            {texts.confidence}: {extractedData?.confidence}%
          </Badge>
        </div>
        <h2 className="text-2xl font-bold">{texts.reviewData}</h2>
        <p className="text-muted-foreground">{texts.reviewDescription}</p>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName" className="flex items-center gap-2">
                <Baby className="h-4 w-4 text-muted-foreground" />
                {texts.firstName}
              </Label>
              <Input
                id="firstName"
                value={editedData?.firstName || ""}
                onChange={(e) => handleInputChange("firstName", e.target.value)}
                data-testid="smart-onboarding-first-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName" className="flex items-center gap-2">
                <Baby className="h-4 w-4 text-muted-foreground" />
                {texts.lastName}
              </Label>
              <Input
                id="lastName"
                value={editedData?.lastName || ""}
                onChange={(e) => handleInputChange("lastName", e.target.value)}
                data-testid="smart-onboarding-last-name"
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {texts.dateOfBirth}
              </Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={editedData?.dateOfBirth || ""}
                onChange={(e) => handleInputChange("dateOfBirth", e.target.value)}
                data-testid="smart-onboarding-dob"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="diagnosisDate" className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                {texts.diagnosisDate}
              </Label>
              <Input
                id="diagnosisDate"
                type="date"
                value={editedData?.diagnosisDate || ""}
                onChange={(e) => handleInputChange("diagnosisDate", e.target.value)}
                data-testid="smart-onboarding-diagnosis-date"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="diagnosis" className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-muted-foreground" />
              {texts.diagnosis}
            </Label>
            <Input
              id="diagnosis"
              value={editedData?.diagnosis || ""}
              onChange={(e) => handleInputChange("diagnosis", e.target.value)}
              data-testid="smart-onboarding-diagnosis"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-muted-foreground" />
              {texts.notes}
            </Label>
            <Textarea
              id="notes"
              value={editedData?.notes || ""}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              rows={4}
              className="resize-none"
              data-testid="smart-onboarding-notes"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button variant="outline" onClick={() => setStep("upload")} data-testid="smart-onboarding-back">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {texts.back}
        </Button>
        <Button onClick={handleSaveProfile} data-testid="smart-onboarding-save">
          {texts.saveProfile}
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </motion.div>
  );

  const renderSavingStep = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-4"
    >
      <Loader2 className="h-12 w-12 text-primary animate-spin" />
      <p className="text-lg font-medium">{texts.saving}</p>
    </motion.div>
  );

  const renderCompleteStep = () => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center py-12 space-y-4"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full"
      >
        <Check className="h-12 w-12 text-green-600 dark:text-green-400" />
      </motion.div>
      <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">{texts.complete}</h3>
      <p className="text-muted-foreground">{texts.profileCreated}</p>
    </motion.div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {step === "upload" && renderUploadStep()}
        {step === "analyzing" && renderAnalyzingStep()}
        {step === "preview" && renderPreviewStep()}
        {step === "saving" && renderSavingStep()}
        {step === "complete" && renderCompleteStep()}
      </AnimatePresence>
    </div>
  );
}
