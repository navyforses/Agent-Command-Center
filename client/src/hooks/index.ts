/**
 * Hooks Index
 * ============
 * Central export for all custom hooks
 */

// Authentication
export { useAuth } from "./useAuth";

// Data hooks
export { useAppointments, type Appointment, type CreateAppointmentData, type ExtractedAppointment } from "./useAppointments";
export { useChildren, useChild, type Child, type CreateChildData } from "./useChildren";
export { useResearchAlerts, type ResearchMonitor, type ResearchFinding, type CreateMonitorData } from "./useResearchAlerts";

// UI hooks
export { useNotifications, type Notification, type NotificationType } from "./useNotifications";
export { useToast } from "./use-toast";
export { useIsMobile } from "./use-mobile";
