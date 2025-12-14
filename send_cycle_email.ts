import { storage } from "./server/storage";
import { generateCycleSummaryPDF } from "./server/pdfGenerator";
import { sendEmailWithAttachments } from "./server/resend";

async function sendCycleEmail(cycleId: number) {
  const EMAIL_RECIPIENT = "jincharadzeshako@gmail.com";
  
  console.log(`Generating PDF reports for cycle ${cycleId}...`);
  
  const dailyRuns = await storage.getEvolutionDailyRuns(cycleId);
  const reports: any[] = [];
  let allInsights: any[] = [];
  
  for (const run of dailyRuns) {
    const report = await storage.getEvolutionReportByDailyRun(run.id);
    if (report) reports.push(report);
    const insights = await storage.getEvolutionInsights(run.id);
    allInsights = allInsights.concat(insights);
  }

  console.log(`Found ${reports.length} reports and ${allInsights.length} insights`);

  const [pdfEn, pdfKa] = await Promise.all([
    generateCycleSummaryPDF(cycleId, reports, allInsights, { language: "en" }),
    generateCycleSummaryPDF(cycleId, reports, allInsights, { language: "ka" }),
  ]);

  console.log(`PDF generated: EN=${pdfEn.length} bytes, KA=${pdfKa.length} bytes`);

  const dateStr = new Date().toISOString().split("T")[0];
  const cycle = await storage.getEvolutionCycleById(cycleId);
  let childName = "";
  if (cycle?.childId && cycle?.userId) {
    const child = await storage.getChild(cycle.childId, cycle.userId);
    childName = child ? `${child.firstName} ${child.lastName}`.trim() : "";
  }

  const bodyKa = `ძვირფასო მშობელო,

HIE მშობლის სარდლობის ცენტრმა შეაგროვა ციკლი #${cycleId}-ის შედეგები.

ამ კვლევის ციკლის განმავლობაში, ჩვენმა AI აგენტებმა:
- გაანალიზეს ${allInsights.length} კვლევითი ინსაიტი
- მოძებნეს სხვადასხვა სამედიცინო დისციპლინაში
- შექმნეს ჰიპოთეზები და რეკომენდაციები

გთხოვთ იხილოთ თანდართული ანგარიშები ინგლისურ და ქართულ ენებზე.

პატივისცემით,
HIE მშობლის სარდლობის ცენტრი`;

  const bodyEn = `Dear Parent,

HIE Parent Command Center has compiled results from Cycle #${cycleId}.

During this research cycle, our AI agents have:
- Analyzed ${allInsights.length} research insights
- Searched across multiple medical disciplines
- Generated hypotheses and recommendations

Please find attached the reports in English and Georgian.

Best regards,
HIE Parent Command Center`;

  const result = await sendEmailWithAttachments({
    to: EMAIL_RECIPIENT,
    subject: `HIE ციკლი #${cycleId} / HIE Cycle #${cycleId} - ${childName || "Report"}`,
    body: `${bodyKa}\n\n---\n\n${bodyEn}`,
    attachments: [
      { filename: `HIE_Cycle_${cycleId}_EN_${dateStr}.pdf`, content: pdfEn, contentType: "application/pdf" },
      { filename: `HIE_Cycle_${cycleId}_KA_${dateStr}.pdf`, content: pdfKa, contentType: "application/pdf" },
    ],
  });

  console.log("Email result:", result);
  process.exit(result.success ? 0 : 1);
}

sendCycleEmail(2);
