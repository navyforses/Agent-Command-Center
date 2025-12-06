import { UpcomingAppointments } from "../dashboard/UpcomingAppointments";

// todo: remove mock functionality
const mockAppointments = [
  {
    id: "1",
    title: "Physiotherapy Session",
    provider: "Dr. Natia Gabisonia",
    location: "Tbilisi Rehabilitation Center",
    date: "Dec 10, 2025",
    time: "10:00 AM",
    type: "therapy" as const,
  },
  {
    id: "2",
    title: "Neurology Follow-up",
    provider: "Dr. Giorgi Khabeishvili",
    location: "Iashvili Children's Hospital",
    date: "Dec 15, 2025",
    time: "2:30 PM",
    type: "medical" as const,
  },
  {
    id: "3",
    title: "Speech Therapy Evaluation",
    provider: "Maia Lomidze",
    location: "Center for Child Development",
    date: "Dec 18, 2025",
    time: "11:00 AM",
    type: "consultation" as const,
  },
];

export default function UpcomingAppointmentsExample() {
  return (
    <div className="max-w-md p-4">
      <UpcomingAppointments
        appointments={mockAppointments}
        onAddAppointment={() => console.log("Add appointment clicked")}
      />
    </div>
  );
}
