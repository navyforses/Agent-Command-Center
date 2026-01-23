/**
 * Routes Index - მოდულური routes სტრუქტურა
 * ==========================================
 *
 * ეს ფაილი აერთიანებს ყველა route მოდულს.
 * გამოიყენეთ registerModularRoutes() ფუნქცია routes.ts-ში.
 *
 * სტატუსი:
 * ========
 * ✅ childrenRoutes.ts - ბავშვების CRUD
 * ✅ documentRoutes.ts - დოკუმენტების CRUD
 * ✅ therapyRoutes.ts - თერაპიები და სესიები
 * ✅ appointmentRoutes.ts - ვიზიტები
 * ✅ emailRoutes.ts - ელ.ფოსტა
 * ✅ trialRoutes.ts - კლინიკური კვლევები (უკვე არსებობდა)
 * ✅ patientProfileRoutes.ts - პაციენტის პროფილი (უკვე არსებობდა)
 *
 * 📋 დარჩენილი routes.ts-ში:
 * - User Profile/Preferences (~90 ხაზი)
 * - Translation (~60 ხაზი)
 * - Conversations/Chat (~400 ხაზი)
 * - Object Storage (~115 ხაზი)
 * - Testimonials (~120 ხაზი)
 * - Medical Data APIs (~300 ხაზი)
 * - Prometheus AI (~1700 ხაზი)
 */

import { Express } from "express";
import { isEmailAuthenticated } from "../emailAuth";

// Import all route modules
import childrenRoutes from "./childrenRoutes";
import documentRoutes, { childDocumentsHandler } from "./documentRoutes";
import therapyRoutes, { childTherapiesHandler, therapySessionRoutes } from "./therapyRoutes";
import appointmentRoutes from "./appointmentRoutes";
import emailRoutes from "./emailRoutes";

// Export individual routes for selective use
export {
  childrenRoutes,
  documentRoutes,
  therapyRoutes,
  appointmentRoutes,
  emailRoutes,
};

/**
 * Register all modular routes on the Express app
 * გამოძახეთ ეს ფუნქცია routes.ts-ში registerRoutes-ში
 */
export function registerModularRoutes(app: Express) {
  // Children management
  app.use("/api/children", childrenRoutes);

  // Documents management
  app.use("/api/documents", documentRoutes);
  app.get("/api/children/:childId/documents", isEmailAuthenticated, childDocumentsHandler);

  // Therapies and sessions
  app.use("/api/therapies", therapyRoutes);
  app.use("/api/therapy-sessions", therapySessionRoutes);
  app.get("/api/children/:childId/therapies", isEmailAuthenticated, childTherapiesHandler);

  // Appointments
  app.use("/api/appointments", appointmentRoutes);

  // Emails
  app.use("/api/emails", emailRoutes);

  console.log("[Routes] Modular routes registered successfully");
}

export default {
  childrenRoutes,
  documentRoutes,
  therapyRoutes,
  appointmentRoutes,
  emailRoutes,
  registerModularRoutes,
};
