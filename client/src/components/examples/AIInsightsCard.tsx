import { AIInsightsCard } from "../dashboard/AIInsightsCard";

// todo: remove mock functionality
const mockInsights = [
  {
    id: "1",
    title: "New Clinical Trial Available",
    description: "A phase 2 trial for erythropoietin therapy matches your child's profile with 85% eligibility.",
    priority: "high" as const,
    actionLabel: "View Trial Details",
  },
  {
    id: "2",
    title: "Therapy Frequency Recommendation",
    description: "Based on recent progress notes, increasing physiotherapy to 3x/week may accelerate motor development.",
    priority: "medium" as const,
    actionLabel: "Learn More",
  },
  {
    id: "3",
    title: "Document Review Needed",
    description: "3 documents from last month haven't been reviewed yet.",
    priority: "low" as const,
    actionLabel: "Review Documents",
  },
];

export default function AIInsightsCardExample() {
  return (
    <div className="max-w-md p-4">
      <AIInsightsCard
        insights={mockInsights}
        onViewInsight={(id) => console.log("View insight:", id)}
      />
    </div>
  );
}
