import { ChildCard } from "../dashboard/ChildCard";

export default function ChildCardExample() {
  return (
    <div className="max-w-md p-4">
      <ChildCard
        firstName="Luka"
        lastName="Beridze"
        dateOfBirth="2022-03-15"
        diagnosis="HIE"
        severity="moderate"
        gmfcsLevel={2}
        nextAppointment="Dec 10, 2025 at 10:00 AM"
        documentsCount={12}
        therapiesCount={3}
        onClick={() => console.log("Child card clicked")}
      />
    </div>
  );
}
