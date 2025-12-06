import { DocumentCard } from "../dashboard/DocumentCard";

export default function DocumentCardExample() {
  return (
    <div className="max-w-lg p-4 space-y-4">
      <DocumentCard
        id="1"
        fileName="brain_mri_scan_2025.pdf"
        fileType="application/pdf"
        documentType="mri"
        documentDate="Nov 15, 2025"
        sourceClinic="Tbilisi Medical Center"
        status="analyzed"
        aiSummary="MRI shows improvement in white matter integrity compared to previous scan. No new lesions detected."
        onClick={() => console.log("View document")}
        onDownload={() => console.log("Download document")}
      />
      <DocumentCard
        id="2"
        fileName="eeg_report.pdf"
        fileType="application/pdf"
        documentType="eeg"
        documentDate="Oct 20, 2025"
        sourceClinic="Iashvili Hospital"
        status="pending"
        onClick={() => console.log("View document")}
        onDownload={() => console.log("Download document")}
        onAnalyze={() => console.log("Analyze document")}
      />
    </div>
  );
}
