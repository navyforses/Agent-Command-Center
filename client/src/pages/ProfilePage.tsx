/**
 * ProfilePage - პაციენტის პროფილის გვერდი
 * =========================================
 * - ფორმა 100-ის ატვირთვა
 * - პროფილის ნახვა/რედაქტირება
 * - მკვლევარის რეჟიმის მართვა
 */

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  FileText,
  User,
  Stethoscope,
  FlaskConical,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Pencil,
  Trash2,
  RefreshCw,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

interface PatientProfile {
  id: number;
  fullName: string | null;
  birthDate: string | null;
  gender: string | null;
  personalNumber: string | null;
  primaryDiagnosis: string | null;
  icd10Codes: string[] | null;
  secondaryDiagnoses: string[] | null;
  diagnosisDate: string | null;
  attendingPhysician: string | null;
  medicalInstitution: string | null;
  disabilityStatus: string | null;
  disabilityGroup: string | null;
  extractionConfidence: number | null;
}

interface ResearchMonitor {
  id: number;
  isActive: boolean;
  searchKeywords: string[] | null;
  monitorClinicalTrials: boolean;
  monitorPubmed: boolean;
  monitorDrugs: boolean;
  monitorNews: boolean;
  lastScanAt: string | null;
}

// ============================================================================
// Translations
// ============================================================================

const translations = {
  ka: {
    title: "პაციენტის დოსიე",
    uploadTitle: "ფორმა 100-ის ატვირთვა",
    uploadDescription: "ჩააგდეთ ფორმა 100 აქ ან დააჭირეთ ასატვირთად",
    uploadFormats: "PDF, JPG, PNG (მაქს. 10MB)",
    uploadHelp: "ფორმა 100 შეგიძლიათ მიიღოთ სამედიცინო დაწესებულებაში",
    processing: "დოკუმენტი მუშავდება...",
    step1: "ფაილი აიტვირთა",
    step2: "ტექსტი ამოიკითხა",
    step3: "მონაცემები მუშავდება...",
    step4: "პროფილი იქმნება",
    reviewTitle: "მონაცემების დადასტურება",
    reviewDescription: "გთხოვთ შეამოწმოთ და დაადასტუროთ",
    personalInfo: "პირადი მონაცემები",
    medicalInfo: "სამედიცინო მონაცემები",
    fullName: "სახელი, გვარი",
    birthDate: "დაბადების თარიღი",
    personalNumber: "პირადი ნომერი",
    gender: "სქესი",
    male: "მამრობითი",
    female: "მდედრობითი",
    diagnosis: "ძირითადი დიაგნოზი",
    icd10: "ICD-10 კოდები",
    diagnosisDate: "დიაგნოზის თარიღი",
    physician: "მკურნალი ექიმი",
    institution: "სამედიცინო დაწესებულება",
    lowConfidence: "დაბალი სანდოობის ველები",
    lowConfidenceWarning: "გთხოვთ შეამოწმოთ მონიშნული ველები",
    cancel: "გაუქმება",
    edit: "შესწორება",
    confirm: "დადასტურება",
    save: "შენახვა",
    delete: "წაშლა",
    newUpload: "ახალი ატვირთვა",
    researchMode: "მკვლევარის რეჟიმი",
    researchModeDescription: "ავტომატურად მოძებნე კვლევები, სტატიები და სიახლეები",
    enable: "ჩართვა",
    disable: "გამორთვა",
    monitorTrials: "კლინიკური კვლევები",
    monitorArticles: "სამეცნიერო სტატიები",
    monitorDrugs: "ახალი მედიკამენტები",
    monitorNews: "სამედიცინო სიახლეები",
    lastScan: "ბოლო სკანირება",
    deleteConfirmTitle: "პროფილის წაშლა",
    deleteConfirmDescription: "ნამდვილად გსურთ პროფილის წაშლა? ეს მოქმედება შეუქცევადია.",
    deleteCancel: "გაუქმება",
    deleteConfirm: "წაშლა",
  },
  en: {
    title: "Patient Profile",
    uploadTitle: "Upload Form 100",
    uploadDescription: "Drop Form 100 here or click to upload",
    uploadFormats: "PDF, JPG, PNG (max 10MB)",
    uploadHelp: "Form 100 can be obtained from medical institutions",
    processing: "Processing document...",
    step1: "File uploaded",
    step2: "Text extracted",
    step3: "Processing data...",
    step4: "Creating profile",
    reviewTitle: "Confirm Data",
    reviewDescription: "Please review and confirm the extracted data",
    personalInfo: "Personal Information",
    medicalInfo: "Medical Information",
    fullName: "Full Name",
    birthDate: "Date of Birth",
    personalNumber: "Personal Number",
    gender: "Gender",
    male: "Male",
    female: "Female",
    diagnosis: "Primary Diagnosis",
    icd10: "ICD-10 Codes",
    diagnosisDate: "Diagnosis Date",
    physician: "Attending Physician",
    institution: "Medical Institution",
    lowConfidence: "Low Confidence Fields",
    lowConfidenceWarning: "Please verify the highlighted fields",
    cancel: "Cancel",
    edit: "Edit",
    confirm: "Confirm",
    save: "Save",
    delete: "Delete",
    newUpload: "New Upload",
    researchMode: "Research Mode",
    researchModeDescription: "Automatically search for trials, articles, and news",
    enable: "Enable",
    disable: "Disable",
    monitorTrials: "Clinical Trials",
    monitorArticles: "Scientific Articles",
    monitorDrugs: "New Medications",
    monitorNews: "Medical News",
    lastScan: "Last Scan",
    deleteConfirmTitle: "Delete Profile",
    deleteConfirmDescription: "Are you sure you want to delete your profile? This action cannot be undone.",
    deleteCancel: "Cancel",
    deleteConfirm: "Delete",
  },
};

// ============================================================================
// Component
// ============================================================================

export default function ProfilePage() {
  const { language } = useLanguage();
  const t = translations[language as keyof typeof translations] || translations.ka;
  const queryClient = useQueryClient();

  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "processing" | "review" | "complete">("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<PatientProfile>>({});

  // Fetch profile
  const { data: profileData, isLoading } = useQuery({
    queryKey: ["patient-profile"],
    queryFn: async () => {
      const res = await fetch("/api/patient-profile");
      if (!res.ok) throw new Error("Failed to fetch profile");
      return res.json();
    },
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploadState("uploading");
      setUploadProgress(25);

      const formData = new FormData();
      formData.append("file", file);

      setUploadProgress(50);
      setUploadState("processing");

      const res = await fetch("/api/patient-profile/upload-form100", {
        method: "POST",
        body: formData,
      });

      setUploadProgress(75);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      setUploadProgress(100);
      return res.json();
    },
    onSuccess: () => {
      setUploadState("complete");
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
    onError: () => {
      setUploadState("idle");
      setUploadProgress(0);
    },
  });

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<PatientProfile>) => {
      const res = await fetch("/api/patient-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    },
    onSuccess: () => {
      setEditMode(false);
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });

  // Delete profile mutation
  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/patient-profile", { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });

  // Research monitor mutations
  const enableResearchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/research-monitor/enable", { method: "POST" });
      if (!res.ok) throw new Error("Enable failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });

  const disableResearchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/research-monitor/disable", { method: "POST" });
      if (!res.ok) throw new Error("Disable failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
    },
  });

  // Dropzone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadMutation.mutate(acceptedFiles[0]);
    }
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const profile = profileData?.profile as PatientProfile | undefined;
  const researchMonitor = profileData?.researchMonitor as ResearchMonitor | undefined;

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // No profile - show upload UI
  if (!profile) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-2xl">
        <Card>
          <CardHeader className="text-center">
            <User className="h-12 w-12 mx-auto text-primary mb-2" />
            <CardTitle>{t.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {uploadState === "idle" && (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
                }`}
              >
                <input {...getInputProps()} />
                <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium mb-2">{t.uploadDescription}</p>
                <p className="text-sm text-muted-foreground mb-4">{t.uploadFormats}</p>
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  {t.uploadTitle}
                </Button>
              </div>
            )}

            {(uploadState === "uploading" || uploadState === "processing") && (
              <div className="py-8 text-center">
                <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
                <p className="text-lg font-medium mb-4">{t.processing}</p>
                <div className="space-y-2 max-w-xs mx-auto text-left">
                  <div className="flex items-center gap-2">
                    {uploadProgress >= 25 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )}
                    <span>{t.step1}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadProgress >= 50 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : uploadProgress >= 25 ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2" />
                    )}
                    <span>{t.step2}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadProgress >= 75 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : uploadProgress >= 50 ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2" />
                    )}
                    <span>{t.step3}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {uploadProgress >= 100 ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : uploadProgress >= 75 ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2" />
                    )}
                    <span>{t.step4}</span>
                  </div>
                </div>
                <Progress value={uploadProgress} className="mt-4 max-w-xs mx-auto" />
              </div>
            )}

            <p className="text-sm text-muted-foreground text-center mt-4">
              {t.uploadHelp}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile exists - show profile view
  return (
    <div className="container mx-auto py-8 px-4 max-w-3xl">
      {/* Profile Header */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">{profile.fullName || "—"}</CardTitle>
                <CardDescription>
                  {profile.birthDate && `${t.birthDate}: ${profile.birthDate}`}
                  {profile.personalNumber && ` | ${t.personalNumber}: ${profile.personalNumber}`}
                </CardDescription>
              </div>
            </div>
            {profile.extractionConfidence && (
              <Badge variant={profile.extractionConfidence > 0.7 ? "default" : "secondary"}>
                {Math.round(profile.extractionConfidence * 100)}% {language === "ka" ? "სანდოობა" : "confidence"}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Medical Info */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Stethoscope className="h-5 w-5" />
            <CardTitle>{t.medicalInfo}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {editMode ? (
            <div className="space-y-4">
              <div>
                <Label>{t.diagnosis}</Label>
                <Input
                  value={editData.primaryDiagnosis || profile.primaryDiagnosis || ""}
                  onChange={(e) => setEditData({ ...editData, primaryDiagnosis: e.target.value })}
                />
              </div>
              <div>
                <Label>{t.icd10}</Label>
                <Input
                  value={(editData.icd10Codes || profile.icd10Codes || []).join(", ")}
                  onChange={(e) => setEditData({ ...editData, icd10Codes: e.target.value.split(",").map(s => s.trim()) })}
                  placeholder="G80.0, P91.6"
                />
              </div>
              <div>
                <Label>{t.physician}</Label>
                <Input
                  value={editData.attendingPhysician || profile.attendingPhysician || ""}
                  onChange={(e) => setEditData({ ...editData, attendingPhysician: e.target.value })}
                />
              </div>
              <div>
                <Label>{t.institution}</Label>
                <Input
                  value={editData.medicalInstitution || profile.medicalInstitution || ""}
                  onChange={(e) => setEditData({ ...editData, medicalInstitution: e.target.value })}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={() => updateMutation.mutate(editData)} disabled={updateMutation.isPending}>
                  {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {t.save}
                </Button>
                <Button variant="outline" onClick={() => { setEditMode(false); setEditData({}); }}>
                  {t.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground">{t.diagnosis}</p>
                <p className="font-medium">{profile.primaryDiagnosis || "—"}</p>
              </div>
              {profile.icd10Codes && profile.icd10Codes.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">{t.icd10}</p>
                  <div className="flex gap-2 flex-wrap mt-1">
                    {profile.icd10Codes.map((code) => (
                      <Badge key={code} variant="outline">{code}</Badge>
                    ))}
                  </div>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t.physician}</p>
                  <p>{profile.attendingPhysician || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t.institution}</p>
                  <p>{profile.medicalInstitution || "—"}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Research Monitor */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5" />
              <CardTitle>{t.researchMode}</CardTitle>
            </div>
            {researchMonitor?.isActive && (
              <Badge variant="default" className="bg-green-500">
                {language === "ka" ? "აქტიური" : "Active"}
              </Badge>
            )}
          </div>
          <CardDescription>{t.researchModeDescription}</CardDescription>
        </CardHeader>
        <CardContent>
          {researchMonitor?.isActive ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Switch checked={researchMonitor.monitorClinicalTrials} disabled />
                  <span className="text-sm">{t.monitorTrials}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={researchMonitor.monitorPubmed} disabled />
                  <span className="text-sm">{t.monitorArticles}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={researchMonitor.monitorDrugs} disabled />
                  <span className="text-sm">{t.monitorDrugs}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={researchMonitor.monitorNews} disabled />
                  <span className="text-sm">{t.monitorNews}</span>
                </div>
              </div>
              {researchMonitor.lastScanAt && (
                <p className="text-sm text-muted-foreground">
                  {t.lastScan}: {new Date(researchMonitor.lastScanAt).toLocaleString(language)}
                </p>
              )}
              <Button
                variant="outline"
                onClick={() => disableResearchMutation.mutate()}
                disabled={disableResearchMutation.isPending}
              >
                {disableResearchMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t.disable}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => enableResearchMutation.mutate()}
              disabled={enableResearchMutation.isPending}
              className="w-full"
            >
              {enableResearchMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <FlaskConical className="h-4 w-4 mr-2" />
              {t.enable}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={() => setEditMode(true)}>
          <Pencil className="h-4 w-4 mr-2" />
          {t.edit}
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="h-4 w-4 mr-2" />
              {t.delete}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t.deleteConfirmTitle}</AlertDialogTitle>
              <AlertDialogDescription>{t.deleteConfirmDescription}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t.deleteCancel}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground"
              >
                {t.deleteConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button
          variant="outline"
          onClick={() => {
            setUploadState("idle");
            queryClient.invalidateQueries({ queryKey: ["patient-profile"] });
          }}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          {t.newUpload}
        </Button>
      </div>
    </div>
  );
}
