import { StatCard } from "../dashboard/StatCard";
import { FileText, Users, Calendar, Activity } from "lucide-react";

export default function StatCardExample() {
  return (
    <div className="grid grid-cols-2 gap-4 p-4">
      <StatCard
        title="Total Documents"
        value={24}
        description="Across all children"
        icon={FileText}
        trend={{ value: 12, isPositive: true }}
      />
      <StatCard
        title="Active Therapies"
        value={5}
        description="This month"
        icon={Activity}
      />
      <StatCard
        title="Appointments"
        value={3}
        description="Upcoming this week"
        icon={Calendar}
      />
      <StatCard
        title="Children"
        value={2}
        icon={Users}
      />
    </div>
  );
}
