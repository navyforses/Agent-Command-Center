import PDFDocument from "pdfkit";
import type { EvolutionReport, EvolutionInsight } from "@shared/schema";

interface PDFOptions {
  language: "en" | "ka";
  includeInsights?: boolean;
}

export async function generateReportPDF(
  report: EvolutionReport,
  insights: EvolutionInsight[],
  options: PDFOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: options.language === "ka" 
            ? `HIE კვლევის ანგარიში - ${report.reportDate}` 
            : `HIE Research Report - ${report.reportDate}`,
          Author: "HIE Parent Command Center",
          Subject: "Evolution Cycle Research Report",
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on("error", reject);

      const isGeorgian = options.language === "ka";

      doc.fontSize(20).font("Helvetica-Bold");
      doc.text(
        isGeorgian 
          ? "HIE კვლევის ანგარიში" 
          : "HIE Research Report",
        { align: "center" }
      );
      
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica");
      doc.text(
        isGeorgian 
          ? `თარიღი: ${new Date(report.reportDate).toLocaleDateString("ka-GE")}` 
          : `Date: ${new Date(report.reportDate).toLocaleDateString("en-US")}`,
        { align: "center" }
      );
      
      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(1);

      doc.fontSize(14).font("Helvetica-Bold");
      doc.text(
        isGeorgian ? "შემაჯამებელი მიმოხილვა" : "Executive Summary",
        { underline: true }
      );
      doc.moveDown(0.5);
      
      doc.fontSize(11).font("Helvetica");
      const summary = isGeorgian 
        ? (report.summaryKa || report.summaryEn || "N/A")
        : (report.summaryEn || "N/A");
      doc.text(summary, { align: "justify", lineGap: 2 });

      doc.moveDown(1.5);

      doc.fontSize(14).font("Helvetica-Bold");
      doc.text(
        isGeorgian ? "მთავარი აღმოჩენები" : "Key Findings",
        { underline: true }
      );
      doc.moveDown(0.5);
      
      const keyFindings = isGeorgian 
        ? (report.keyFindingsKa || report.keyFindingsEn || [])
        : (report.keyFindingsEn || []);
      
      if (keyFindings.length > 0) {
        doc.fontSize(11).font("Helvetica");
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
        doc.fontSize(11).font("Helvetica");
        doc.text(isGeorgian ? "აღმოჩენები არ არის" : "No findings available");
      }

      doc.moveDown(1.5);

      const hypotheses = report.hypothesesGenerated as Array<{
        hypothesis: string;
        confidence: number;
        evidence?: string[];
        disciplines?: string[];
      }> | null;

      if (hypotheses && Array.isArray(hypotheses) && hypotheses.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold");
        doc.text(
          isGeorgian ? "სინთეზირებული ჰიპოთეზები" : "Synthesized Hypotheses",
          { underline: true }
        );
        doc.moveDown(0.5);
        
        doc.fontSize(11).font("Helvetica");
        
        hypotheses.forEach((hypo, index) => {
          doc.font("Helvetica-Bold");
          doc.text(`${isGeorgian ? "ჰიპოთეზა" : "Hypothesis"} ${index + 1}:`, { continued: true });
          doc.font("Helvetica");
          doc.text(` ${hypo.hypothesis}`);
          
          doc.text(`  ${isGeorgian ? "სანდოობა" : "Confidence"}: ${hypo.confidence}%`);
          
          if (hypo.disciplines && hypo.disciplines.length > 0) {
            doc.text(`  ${isGeorgian ? "დისციპლინები" : "Disciplines"}: ${hypo.disciplines.join(", ")}`);
          }
          
          if (hypo.evidence && hypo.evidence.length > 0) {
            doc.text(`  ${isGeorgian ? "მტკიცებულებები" : "Evidence"}:`);
            hypo.evidence.slice(0, 3).forEach(ev => {
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
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: "A4",
        margins: { top: 50, bottom: 50, left: 50, right: 50 },
        info: {
          Title: options.language === "ka" 
            ? `HIE ციკლის შემაჯამებელი ანგარიში #${cycleId}` 
            : `HIE Cycle Summary Report #${cycleId}`,
          Author: "HIE Parent Command Center",
          Subject: "Evolution Cycle Summary",
        },
      });

      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));
      doc.on("end", () => {
        resolve(Buffer.concat(buffers));
      });
      doc.on("error", reject);

      const isGeorgian = options.language === "ka";

      doc.fontSize(22).font("Helvetica-Bold");
      doc.text(
        isGeorgian 
          ? `HIE ციკლის შემაჯამებელი ანგარიში` 
          : `HIE Cycle Summary Report`,
        { align: "center" }
      );
      
      doc.moveDown(0.5);
      doc.fontSize(14).font("Helvetica");
      doc.text(
        isGeorgian 
          ? `ციკლი #${cycleId}` 
          : `Cycle #${cycleId}`,
        { align: "center" }
      );
      
      doc.moveDown(0.3);
      doc.fontSize(11);
      doc.text(
        isGeorgian 
          ? `სულ ${reports.length} ანგარიში | ${allInsights.length} ინსაიტი`
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
        doc.fontSize(14).font("Helvetica-Bold");
        doc.text(
          isGeorgian ? "მთავარი აღმოჩენები ციკლიდან" : "Key Findings from Cycle",
          { underline: true }
        );
        doc.moveDown(0.5);
        
        doc.fontSize(11).font("Helvetica");
        uniqueFindings.forEach((finding, index) => {
          doc.text(`${index + 1}. ${finding}`, { 
            indent: 15,
            lineGap: 2,
          });
          doc.moveDown(0.3);
        });
      }

      doc.moveDown(1.5);

      const allHypotheses: Array<{
        hypothesis: string;
        confidence: number;
        evidence?: string[];
        disciplines?: string[];
      }> = [];
      
      reports.forEach(report => {
        const hypos = report.hypothesesGenerated as typeof allHypotheses | null;
        if (hypos && Array.isArray(hypos)) {
          allHypotheses.push(...hypos);
        }
      });

      const sortedHypotheses = allHypotheses
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 10);

      if (sortedHypotheses.length > 0) {
        doc.fontSize(14).font("Helvetica-Bold");
        doc.text(
          isGeorgian ? "ტოპ ჰიპოთეზები (სანდოობის მიხედვით)" : "Top Hypotheses (by confidence)",
          { underline: true }
        );
        doc.moveDown(0.5);
        
        doc.fontSize(11).font("Helvetica");
        sortedHypotheses.forEach((hypo, index) => {
          doc.font("Helvetica-Bold");
          doc.text(`${index + 1}. [${hypo.confidence}%] `, { continued: true });
          doc.font("Helvetica");
          
          const hypoText = hypo.hypothesis.length > 200 
            ? hypo.hypothesis.substring(0, 200) + "..." 
            : hypo.hypothesis;
          doc.text(hypoText);
          
          if (hypo.disciplines && hypo.disciplines.length > 0) {
            doc.fontSize(9).font("Helvetica-Oblique");
            doc.text(`   ${hypo.disciplines.join(", ")}`, { indent: 20 });
            doc.fontSize(11).font("Helvetica");
          }
          
          doc.moveDown(0.4);
        });
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
