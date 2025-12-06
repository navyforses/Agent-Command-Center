import { RecentActivity } from "../dashboard/RecentActivity";

// todo: remove mock functionality
const mockActivities = [
  {
    id: "1",
    type: "document" as const,
    title: "MRI Report Uploaded",
    description: "Brain MRI scan from Tbilisi Medical Center",
    timestamp: "2 hours ago",
    status: "success" as const,
  },
  {
    id: "2",
    type: "ai_analysis" as const,
    title: "AI Analysis Complete",
    description: "Document analysis for EEG report finished",
    timestamp: "5 hours ago",
    status: "success" as const,
  },
  {
    id: "3",
    type: "therapy" as const,
    title: "Therapy Session Logged",
    description: "Physiotherapy session with Dr. Natia",
    timestamp: "Yesterday",
    status: "info" as const,
  },
  {
    id: "4",
    type: "email" as const,
    title: "Email Sent",
    description: "Inquiry to Boston Children's Hospital",
    timestamp: "2 days ago",
    status: "pending" as const,
  },
  {
    id: "5",
    type: "appointment" as const,
    title: "Appointment Scheduled",
    description: "Follow-up with neurologist",
    timestamp: "3 days ago",
    status: "info" as const,
  },
];

export default function RecentActivityExample() {
  return (
    <div className="max-w-md p-4">
      <RecentActivity activities={mockActivities} />
    </div>
  );
}
