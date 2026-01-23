/**
 * AutoCategorize Component
 * =========================
 * P1 Feature: AI-powered automatic document categorization
 * Analyzes uploaded documents and suggests/applies categories
 */

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sparkles,
  Check,
  X,
  Loader2,
  FolderOpen,
  Tag,
  RefreshCw,
  ChevronDown,
  AlertCircle,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

// Document categories
const DOCUMENT_CATEGORIES = [
  { id: "medical_record", labelKa: "სამედიცინო ჩანაწერი", labelEn: "Medical Record", icon: "📋" },
  { id: "lab_result", labelKa: "ლაბორატორიული შედეგი", labelEn: "Lab Result", icon: "🧪" },
  { id: "imaging", labelKa: "გამოსახულება (MRI, CT)", labelEn: "Imaging (MRI, CT)", icon: "🔬" },
  { id: "prescription", labelKa: "რეცეპტი", labelEn: "Prescription", icon: "💊" },
  { id: "therapy_report", labelKa: "თერაპიის რეპორტი", labelEn: "Therapy Report", icon: "📊" },
  { id: "insurance", labelKa: "დაზღვევა", labelEn: "Insurance", icon: "🏥" },
  { id: "legal", labelKa: "იურიდიული", labelEn: "Legal", icon: "⚖️" },
  { id: "correspondence", labelKa: "მიმოწერა", labelEn: "Correspondence", icon: "✉️" },
  { id: "other", labelKa: "სხვა", labelEn: "Other", icon: "📁" },
];

interface Document {
  id: number;
  title: string;
  category?: string;
  suggestedCategory?: string;
  categoryConfidence?: number;
  fileType?: string;
  createdAt: string;
}

interface CategorizationResult {
  documentId: number;
  suggestedCategory: string;
  confidence: number;
  alternativeCategories?: { category: string; confidence: number }[];
  extractedKeywords?: string[];
}

interface AutoCategorizeProps {
  documents: Document[];
  onCategoryChange?: (documentId: number, category: string) => void;
}

export function AutoCategorize({ documents, onCategoryChange }: AutoCategorizeProps) {
  const { language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [categorizationResults, setCategorizationResults] = useState<Map<number, CategorizationResult>>(new Map());

  // Get uncategorized documents
  const uncategorizedDocs = documents.filter((doc) => !doc.category || doc.category === "other");

  // Categorize single document
  const categorizeSingleMutation = useMutation({
    mutationFn: async (documentId: number): Promise<CategorizationResult> => {
      const response = await fetch(`/api/documents/${documentId}/categorize`, {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to categorize document");
      }

      return response.json();
    },
    onSuccess: (result) => {
      setCategorizationResults((prev) => new Map(prev).set(result.documentId, result));
    },
    onError: () => {
      toast({
        title: language === "ka" ? "შეცდომა" : "Error",
        description: language === "ka" ? "კატეგორიზაცია ვერ მოხერხდა" : "Categorization failed",
        variant: "destructive",
      });
    },
  });

  // Categorize all uncategorized documents
  const categorizeAllMutation = useMutation({
    mutationFn: async (): Promise<CategorizationResult[]> => {
      const response = await fetch("/api/documents/categorize-all", {
        method: "POST",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to categorize documents");
      }

      return response.json();
    },
    onSuccess: (results) => {
      const newMap = new Map(categorizationResults);
      results.forEach((result) => newMap.set(result.documentId, result));
      setCategorizationResults(newMap);
      toast({
        title: language === "ka" ? "კატეგორიზაცია დასრულდა" : "Categorization complete",
        description: language === "ka"
          ? `${results.length} დოკუმენტი გაანალიზდა`
          : `${results.length} documents analyzed`,
      });
    },
    onError: () => {
      toast({
        title: language === "ka" ? "შეცდომა" : "Error",
        description: language === "ka" ? "კატეგორიზაცია ვერ მოხერხდა" : "Categorization failed",
        variant: "destructive",
      });
    },
  });

  // Apply category to document
  const applyCategoryMutation = useMutation({
    mutationFn: async ({ documentId, category }: { documentId: number; category: string }) => {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ category }),
      });

      if (!response.ok) {
        throw new Error("Failed to update document");
      }

      return response.json();
    },
    onSuccess: (_, { documentId, category }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      onCategoryChange?.(documentId, category);
      toast({
        title: language === "ka" ? "კატეგორია შენახულია" : "Category saved",
      });
    },
  });

  const toggleExpanded = (docId: number) => {
    setExpandedDocs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(docId)) {
        newSet.delete(docId);
      } else {
        newSet.add(docId);
      }
      return newSet;
    });
  };

  const getCategoryLabel = (categoryId: string) => {
    const category = DOCUMENT_CATEGORIES.find((c) => c.id === categoryId);
    if (!category) return categoryId;
    return language === "ka" ? category.labelKa : category.labelEn;
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = DOCUMENT_CATEGORIES.find((c) => c.id === categoryId);
    return category?.icon || "📁";
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.5) return "text-yellow-600";
    return "text-red-600";
  };

  if (uncategorizedDocs.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Check className="h-12 w-12 mx-auto text-green-500 mb-4" />
          <p className="font-medium">
            {language === "ka"
              ? "ყველა დოკუმენტი კატეგორიზებულია"
              : "All documents are categorized"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {language === "ka"
              ? "ახალი დოკუმენტის ატვირთვისას AI ავტომატურად მოახდენს კატეგორიზაციას"
              : "AI will automatically categorize new documents when uploaded"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {language === "ka" ? "AI კატეგორიზაცია" : "AI Categorization"}
            </CardTitle>
            <CardDescription>
              {language === "ka"
                ? `${uncategorizedDocs.length} დოკუმენტი საჭიროებს კატეგორიზაციას`
                : `${uncategorizedDocs.length} documents need categorization`}
            </CardDescription>
          </div>
          <Button
            onClick={() => categorizeAllMutation.mutate()}
            disabled={categorizeAllMutation.isPending}
          >
            {categorizeAllMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {language === "ka" ? "ყველას ანალიზი" : "Analyze All"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {uncategorizedDocs.map((doc) => {
          const result = categorizationResults.get(doc.id);
          const isExpanded = expandedDocs.has(doc.id);
          const isAnalyzing = categorizeSingleMutation.isPending &&
            categorizeSingleMutation.variables === doc.id;

          return (
            <Collapsible
              key={doc.id}
              open={isExpanded}
              onOpenChange={() => toggleExpanded(doc.id)}
            >
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center gap-3 p-3 hover:bg-muted/50 cursor-pointer">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(doc.createdAt).toLocaleDateString(
                          language === "ka" ? "ka-GE" : "en-US"
                        )}
                      </p>
                    </div>

                    {result ? (
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="gap-1">
                          <span>{getCategoryIcon(result.suggestedCategory)}</span>
                          {getCategoryLabel(result.suggestedCategory)}
                        </Badge>
                        <span className={cn("text-xs", getConfidenceColor(result.confidence))}>
                          {Math.round(result.confidence * 100)}%
                        </span>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          categorizeSingleMutation.mutate(doc.id);
                        }}
                        disabled={isAnalyzing}
                      >
                        {isAnalyzing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-1" />
                            {language === "ka" ? "ანალიზი" : "Analyze"}
                          </>
                        )}
                      </Button>
                    )}

                    <ChevronDown
                      className={cn(
                        "h-4 w-4 text-muted-foreground transition-transform",
                        isExpanded && "rotate-180"
                      )}
                    />
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="border-t"
                      >
                        <div className="p-3 space-y-3">
                          {result ? (
                            <>
                              {/* Confidence Bar */}
                              <div className="space-y-1">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">
                                    {language === "ka" ? "სიზუსტე" : "Confidence"}
                                  </span>
                                  <span className={getConfidenceColor(result.confidence)}>
                                    {Math.round(result.confidence * 100)}%
                                  </span>
                                </div>
                                <Progress value={result.confidence * 100} className="h-1" />
                              </div>

                              {/* Alternative Categories */}
                              {result.alternativeCategories && result.alternativeCategories.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {language === "ka" ? "ალტერნატივები" : "Alternatives"}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {result.alternativeCategories.map((alt, i) => (
                                      <Badge
                                        key={i}
                                        variant="outline"
                                        className="cursor-pointer hover:bg-muted"
                                        onClick={() =>
                                          applyCategoryMutation.mutate({
                                            documentId: doc.id,
                                            category: alt.category,
                                          })
                                        }
                                      >
                                        {getCategoryIcon(alt.category)}{" "}
                                        {getCategoryLabel(alt.category)}
                                        <span className="ml-1 text-muted-foreground">
                                          {Math.round(alt.confidence * 100)}%
                                        </span>
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Keywords */}
                              {result.extractedKeywords && result.extractedKeywords.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-2">
                                    {language === "ka" ? "საკვანძო სიტყვები" : "Keywords"}
                                  </p>
                                  <div className="flex flex-wrap gap-1">
                                    {result.extractedKeywords.map((keyword, i) => (
                                      <Badge key={i} variant="secondary" className="text-xs">
                                        <Tag className="h-3 w-3 mr-1" />
                                        {keyword}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-2">
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    applyCategoryMutation.mutate({
                                      documentId: doc.id,
                                      category: result.suggestedCategory,
                                    })
                                  }
                                  disabled={applyCategoryMutation.isPending}
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  {language === "ka" ? "დადასტურება" : "Apply"}
                                </Button>
                                <Select
                                  onValueChange={(category) =>
                                    applyCategoryMutation.mutate({
                                      documentId: doc.id,
                                      category,
                                    })
                                  }
                                >
                                  <SelectTrigger className="w-[180px] h-9">
                                    <SelectValue
                                      placeholder={
                                        language === "ka" ? "სხვა კატეგორია" : "Other category"
                                      }
                                    />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {DOCUMENT_CATEGORIES.map((cat) => (
                                      <SelectItem key={cat.id} value={cat.id}>
                                        {cat.icon} {language === "ka" ? cat.labelKa : cat.labelEn}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">
                                {language === "ka"
                                  ? 'დააჭირეთ "ანალიზი" კატეგორიის მისაღებად'
                                  : 'Click "Analyze" to get category suggestion'}
                              </p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CollapsibleContent>
              </div>
            </Collapsible>
          );
        })}
      </CardContent>
    </Card>
  );
}

export { DOCUMENT_CATEGORIES };
