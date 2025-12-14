import PDFDocument from "pdfkit";
import path from "path";
import fs from "fs";
import type { EvolutionReport, EvolutionInsight } from "@shared/schema";
import { translateToGeorgian } from "./evolutionCycleEngine";

interface TranslatedHypothesis {
  hypothesis: string;
  hypothesisKa?: string;
  confidence: number;
  evidence?: string[];
  disciplines?: string[];
}

interface PDFOptions {
  language: "en" | "ka";
  includeInsights?: boolean;
}

// Georgian font path
const GEORGIAN_FONT_PATH = path.join(process.cwd(), "fonts", "NotoSansGeorgian-Regular.ttf");
const hasGeorgianFont = fs.existsSync(GEORGIAN_FONT_PATH);

function registerFonts(doc: PDFKit.PDFDocument) {
  if (hasGeorgianFont) {
    doc.registerFont("Georgian", GEORGIAN_FONT_PATH);
  }
}

function setFont(doc: PDFKit.PDFDocument, isGeorgian: boolean, bold: boolean = false) {
  if (isGeorgian && hasGeorgianFont) {
    doc.font("Georgian");
  } else {
    doc.font(bold ? "Helvetica-Bold" : "Helvetica");
  }
}

// Helper function to translate hypotheses to Georgian
async function translateHypotheses(
  hypotheses: TranslatedHypothesis[]
): Promise<TranslatedHypothesis[]> {
  console.log(`[PDF] Translating ${hypotheses.length} hypotheses to Georgian...`);
  
  const translated: TranslatedHypothesis[] = [];
  
  for (const hypo of hypotheses) {
    if (hypo.hypothesisKa) {
      // Already translated
      translated.push(hypo);
    } else {
      try {
        const translatedText = await translateToGeorgian(hypo.hypothesis);
        translated.push({
          ...hypo,
          hypothesisKa: translatedText,
        });
      } catch (error) {
        console.error(`[PDF] Translation error for hypothesis: ${error}`);
        translated.push(hypo);
      }
    }
  }
  
  console.log(`[PDF] Translation complete for ${translated.length} hypotheses`);
  return translated;
}

export async function generateReportPDF(
  report: EvolutionReport,
  insights: EvolutionInsight[],
  options: PDFOptions
): Promise<Buffer> {
  const isGeorgian = options.language === "ka";
  
  // Translate hypotheses if Georgian language is selected
  let translatedHypotheses: TranslatedHypothesis[] = [];
  const rawHypotheses = report.hypothesesGenerated as TranslatedHypothesis[] | null;
  if (rawHypotheses && Array.isArray(rawHypotheses) && rawHypotheses.length > 0) {
    if (isGeorgian) {
      translatedHypotheses = await translateHypotheses(rawHypotheses);
    } else {
      translatedHypotheses = rawHypotheses;
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: options.language === "ka" 
            ? `HIE Research Report - ${report.reportDate}` 
            : `HIE Research Report - ${report.reportDate}`,
          Author: "HIE Parent Command Center",
          Subject: "Evolution Cycle Research Report",
        },
      });

      registerFonts(doc);

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on("error", reject);

      doc.fontSize(20);
      setFont(doc, isGeorgian, true);
      doc.text(
        isGeorgian 
          ? "HIE kvlevis angarishi" 
          : "HIE Research Report",
        { align: "center" }
      );
      
      doc.moveDown(0.5);
      doc.fontSize(12);
      setFont(doc, isGeorgian, false);
      doc.text(
        isGeorgian 
          ? `Tarigi: ${new Date(report.reportDate).toLocaleDateString("ka-GE")}` 
          : `Date: ${new Date(report.reportDate).toLocaleDateString("en-US")}`,
        { align: "center" }
      );
      
      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      doc.fontSize(14);
      setFont(doc, isGeorgian, true);
      doc.text(
        isGeorgian ? "Shemajamebeli mimoxilva / Executive Summary" : "Executive Summary",
        { underline: true }
      );
      doc.moveDown(0.5);
      
      doc.fontSize(11);
      setFont(doc, isGeorgian, false);
      const summary = isGeorgian 
        ? (report.summaryKa || report.summaryEn || "N/A")
        : (report.summaryEn || "N/A");
      doc.text(summary, { align: "justify", lineGap: 2 });

      doc.moveDown(1.5);

      doc.fontSize(14);
      setFont(doc, isGeorgian, true);
      doc.text(
        isGeorgian ? "Mtavari agmochenebi / Key Findings" : "Key Findings",
        { underline: true }
      );
      doc.moveDown(0.5);
      
      const keyFindings = isGeorgian 
        ? (report.keyFindingsKa || report.keyFindingsEn || [])
        : (report.keyFindingsEn || []);
      
      if (keyFindings.length > 0) {
        doc.fontSize(11);
        setFont(doc, isGeorgian, false);
        keyFindings.forEach((finding, index) => {
          if (finding) {
            doc.text(`${index + 1}. ${finding}`, { 
              indent: 15,
              lineGap: 2,
            });
            doc.moveDown(0.3);
          }
        });
      } else {
        doc.fontSize(11);
        setFont(doc, isGeorgian, false);
        doc.text(isGeorgian ? "No findings available" : "No findings available");
      }

      doc.moveDown(1.5);

      if (translatedHypotheses.length > 0) {
        doc.fontSize(14);
        setFont(doc, isGeorgian, true);
        doc.text(
          isGeorgian ? "სინთეზირებული ჰიპოთეზები" : "Synthesized Hypotheses",
          { underline: true }
        );
        doc.moveDown(0.5);
        
        doc.fontSize(11);
        setFont(doc, isGeorgian, false);
        
        translatedHypotheses.forEach((hypo, index) => {
          const hypothesisText = isGeorgian && hypo.hypothesisKa 
            ? hypo.hypothesisKa 
            : hypo.hypothesis;
          
          setFont(doc, isGeorgian, true);
          doc.text(`${isGeorgian ? "ჰიპოთეზა" : "Hypothesis"} ${index + 1}:`, { continued: true });
          setFont(doc, isGeorgian, false);
          doc.text(` ${hypothesisText}`);
          
          doc.text(`  ${isGeorgian ? "სანდოობა" : "Confidence"}: ${hypo.confidence}%`);
          
          if (hypo.disciplines && hypo.disciplines.length > 0) {
            doc.text(`  ${isGeorgian ? "დისციპლინები" : "Disciplines"}: ${hypo.disciplines.join(", ")}`);
          }
          
          if (hypo.evidence && hypo.evidence.length > 0) {
            doc.text(`  ${isGeorgian ? "მტკიცებულებები" : "Evidence"}:`);
            hypo.evidence.slice(0, 3).forEach((ev: string) => {
              doc.text(`    - ${ev.substring(0, 150)}${ev.length > 150 ? "..." : ""}`, { indent: 20 });
            });
          }
          
          doc.moveDown(0.5);
        });
      }

      doc.moveDown(1);

      if (options.includeInsights && insights.length > 0) {
        doc.addPage();
        
        doc.fontSize(16).font("Helvetica-Bold");
        doc.text(
          isGeorgian ? "დღის ინსაიტების დეტალები" : "Daily Insights Details",
          { align: "center" }
        );
        doc.moveDown(1);

        const phaseNames: Record<string, { en: string; ka: string }> = {
          observe: { en: "Observe", ka: "დაკვირვება" },
          learn: { en: "Learn", ka: "სწავლა" },
          connect: { en: "Connect", ka: "დაკავშირება" },
          theorize: { en: "Theorize", ka: "თეორიზება" },
          synthesize: { en: "Synthesize", ka: "სინთეზი" },
          validate: { en: "Validate", ka: "ვალიდაცია" },
          adapt: { en: "Adapt", ka: "ადაპტაცია" },
        };

        const phases = ["observe", "learn", "connect", "theorize", "synthesize", "validate", "adapt"];
        
        for (const phase of phases) {
          const phaseInsights = insights.filter(i => i.phase === phase);
          if (phaseInsights.length === 0) continue;

          doc.fontSize(13).font("Helvetica-Bold");
          const phaseName = phaseNames[phase] || { en: phase, ka: phase };
          doc.text(
            isGeorgian ? phaseName.ka : phaseName.en,
            { underline: true }
          );
          doc.moveDown(0.3);

          doc.fontSize(10).font("Helvetica");
          phaseInsights.forEach((insight, idx) => {
            const content = isGeorgian 
              ? (insight.contentKa || insight.contentEn || "N/A")
              : (insight.contentEn || "N/A");
            
            const truncatedContent = content.length > 500 
              ? content.substring(0, 500) + "..." 
              : content;
            
            doc.text(`${idx + 1}. ${truncatedContent}`, {
              indent: 10,
              lineGap: 1,
            });
            
            if (insight.confidence) {
              doc.text(`   [${isGeorgian ? "სანდოობა" : "Confidence"}: ${insight.confidence}%]`, {
                indent: 10,
              });
            }
            
            doc.moveDown(0.5);
          });

          doc.moveDown(0.5);
        }
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      
      doc.fontSize(9).font("Helvetica-Oblique");
      doc.text(
        isGeorgian 
          ? `გენერირებულია: ${new Date().toLocaleString("ka-GE")} | HIE Parent Command Center`
          : `Generated: ${new Date().toLocaleString("en-US")} | HIE Parent Command Center`,
        { align: "center" }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

export async function generateCycleSummaryPDF(
  cycleId: number,
  reports: EvolutionReport[],
  allInsights: EvolutionInsight[],
  options: PDFOptions
): Promise<Buffer> {
  const isGeorgian = options.language === "ka";
  
  // Collect and translate all hypotheses if Georgian
  const allHypothesesRaw: TranslatedHypothesis[] = [];
  reports.forEach(report => {
    const hypos = report.hypothesesGenerated as TranslatedHypothesis[] | null;
    if (hypos && Array.isArray(hypos)) {
      allHypothesesRaw.push(...hypos);
    }
  });
  
  let translatedHypotheses: TranslatedHypothesis[] = [];
  if (allHypothesesRaw.length > 0) {
    const sortedHypos = allHypothesesRaw
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .slice(0, 10);
    
    if (isGeorgian) {
      translatedHypotheses = await translateHypotheses(sortedHypos);
    } else {
      translatedHypotheses = sortedHypos;
    }
  }

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: `HIE Cycle Summary Report #${cycleId}`,
          Author: "HIE Parent Command Center",
          Subject: "Evolution Cycle Summary",
        },
      });

      registerFonts(doc);

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on("error", reject);

      doc.fontSize(22);
      setFont(doc, isGeorgian, true);
      doc.text(
        isGeorgian 
          ? `HIE ciklis shemajamebeli angarishi` 
          : `HIE Cycle Summary Report`,
        { align: "center" }
      );
      
      doc.moveDown(0.5);
      doc.fontSize(14);
      setFont(doc, isGeorgian, false);
      doc.text(
        isGeorgian 
          ? `Cikli #${cycleId}` 
          : `Cycle #${cycleId}`,
        { align: "center" }
      );
      
      doc.moveDown(0.3);
      doc.fontSize(11);
      doc.text(
        isGeorgian 
          ? `Sul ${reports.length} angarishi | ${allInsights.length} insaiti`
          : `Total ${reports.length} reports | ${allInsights.length} insights`,
        { align: "center" }
      );
      
      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      const allKeyFindings: string[] = [];
      reports.forEach(report => {
        const findings = isGeorgian 
          ? (report.keyFindingsKa || report.keyFindingsEn || [])
          : (report.keyFindingsEn || []);
        findings.forEach(f => {
          if (f) allKeyFindings.push(f);
        });
      });

      const uniqueFindings = Array.from(new Set(allKeyFindings)).slice(0, 15);
      
      if (uniqueFindings.length > 0) {
        doc.fontSize(14);
        setFont(doc, isGeorgian, true);
        doc.text(
          isGeorgian ? "Mtavari agmochenebi ciklidan / Key Findings" : "Key Findings from Cycle",
          { underline: true }
        );
        doc.moveDown(0.5);
        
        doc.fontSize(11);
        setFont(doc, isGeorgian, false);
        uniqueFindings.forEach((finding, index) => {
          doc.text(`${index + 1}. ${finding}`, { 
            indent: 15,
            lineGap: 2,
          });
          doc.moveDown(0.3);
        });
      }

      doc.moveDown(1.5);

      if (translatedHypotheses.length > 0) {
        doc.fontSize(14);
        setFont(doc, isGeorgian, true);
        doc.text(
          isGeorgian ? "ტოპ ჰიპოთეზები (სანდოობის მიხედვით)" : "Top Hypotheses (by confidence)",
          { underline: true }
        );
        doc.moveDown(0.5);
        
        doc.fontSize(11);
        setFont(doc, isGeorgian, false);
        translatedHypotheses.forEach((hypo, index) => {
          const hypothesisText = isGeorgian && hypo.hypothesisKa 
            ? hypo.hypothesisKa 
            : hypo.hypothesis;
          
          setFont(doc, isGeorgian, true);
          doc.text(`${index + 1}. [${hypo.confidence}%] `, { continued: true });
          setFont(doc, isGeorgian, false);
          
          doc.text(hypothesisText);
          
          if (hypo.disciplines && hypo.disciplines.length > 0) {
            doc.fontSize(9);
            doc.text(`   ${hypo.disciplines.join(", ")}`, { indent: 20 });
            doc.fontSize(11);
          }
          
          doc.moveDown(0.4);
        });
      }

      doc.moveDown(1);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      
      doc.fontSize(9);
      setFont(doc, isGeorgian, false);
      doc.text(
        isGeorgian 
          ? `Generated: ${new Date().toLocaleString("en-US")} | HIE Parent Command Center`
          : `Generated: ${new Date().toLocaleString("en-US")} | HIE Parent Command Center`,
        { align: "center" }
      );

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
