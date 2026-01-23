/**
 * Routes Index - მოდულური routes სტრუქტურა
 * ==========================================
 *
 * ეს ფაილი აერთიანებს ყველა route მოდულს.
 *
 * მიგრაციის გეგმა routes.ts-დან:
 * =============================
 *
 * ✅ დასრულებული:
 * - childrenRoutes.ts - ბავშვების CRUD
 * - trialRoutes.ts - კლინიკური კვლევები (უკვე არსებობდა)
 * - patientProfileRoutes.ts - პაციენტის პროფილი (უკვე არსებობდა)
 *
 * 📋 გასაკეთებელი (routes.ts-დან ამოსაღები):
 * - documentRoutes.ts - დოკუმენტების მართვა (lines 365-466)
 * - therapyRoutes.ts - თერაპიები და სესიები (lines 467-648)
 * - appointmentRoutes.ts - ვიზიტები (lines 649-734)
 * - emailRoutes.ts - ელ.ფოსტა (lines 735-837)
 * - chatRoutes.ts - ჩატი და საუბრები (lines 838-1214)
 * - storageRoutes.ts - Object Storage (lines 1297-1411)
 * - testimonialRoutes.ts - გამოხმაურებები (lines 1412-3038)
 * - medicalDataRoutes.ts - ClinicalTrials, PubMed, FDA (lines 3039-3346)
 * - prometheusRoutes.ts - Prometheus AI (lines 3347-5038)
 *
 * გამოყენება routes.ts-ში:
 * ========================
 *
 * import childrenRoutes from "./routes/childrenRoutes";
 * app.use("/api/children", childrenRoutes);
 */

import { Router } from "express";
import childrenRoutes from "./childrenRoutes";

// Export all route modules
export {
  childrenRoutes,
};

// Helper function to register all modular routes
export function registerModularRoutes(app: any) {
  // Children management
  app.use("/api/children", childrenRoutes);

  // Add more routes as they are extracted from routes.ts
  // app.use("/api/documents", documentRoutes);
  // app.use("/api/therapies", therapyRoutes);
  // etc.
}

export default {
  childrenRoutes,
};
