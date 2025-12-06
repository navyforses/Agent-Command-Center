import { ClinicalTrialCard } from "../dashboard/ClinicalTrialCard";

export default function ClinicalTrialCardExample() {
  return (
    <div className="max-w-md p-4">
      <ClinicalTrialCard
        id="1"
        title="Erythropoietin for Neuroprotection in Neonatal HIE"
        sponsor="National Institutes of Health"
        status="recruiting"
        phase="Phase 2"
        location="Boston Children's Hospital, USA"
        distance="8,500 km"
        eligibilityScore={85}
        matchedCriteria={[
          "Age 0-3 years with HIE diagnosis",
          "GMFCS Level I-III",
          "No active seizures in past 30 days",
        ]}
        unmatchedCriteria={[
          "Must be able to travel to study site",
        ]}
        enrollmentDeadline="March 2026"
        isSaved={false}
        onSave={() => console.log("Save trial")}
        onContact={() => console.log("Contact trial")}
        onViewDetails={() => console.log("View details")}
      />
    </div>
  );
}
