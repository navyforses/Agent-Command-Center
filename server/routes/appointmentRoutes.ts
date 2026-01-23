/**
 * Appointment Routes - ვიზიტების მართვის API
 * ==========================================
 * CRUD operations for medical appointments
 */

import { Router } from "express";
import { isEmailAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import { insertAppointmentSchema } from "@shared/schema";

const router = Router();

// GET /api/appointments - List all appointments for user
router.get("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const appointments = await storage.getAppointments(userId);
    res.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ message: "Failed to fetch appointments" });
  }
});

// POST /api/appointments - Create a new appointment
router.post("/", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const parseResult = insertAppointmentSchema.safeParse({ ...req.body, userId });
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid appointment data", errors: parseResult.error.errors });
    }
    const appointment = await storage.createAppointment(parseResult.data);
    res.status(201).json(appointment);
  } catch (error) {
    console.error("Error creating appointment:", error);
    res.status(500).json({ message: "Failed to create appointment" });
  }
});

// GET /api/appointments/:id - Get a specific appointment
router.get("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }
    const appointment = await storage.getAppointment(id, userId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json(appointment);
  } catch (error) {
    console.error("Error fetching appointment:", error);
    res.status(500).json({ message: "Failed to fetch appointment" });
  }
});

// PATCH /api/appointments/:id - Update an appointment
router.patch("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }
    const { userId: _, ...bodyWithoutUserId } = req.body;
    const parseResult = insertAppointmentSchema.partial().safeParse(bodyWithoutUserId);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid appointment data", errors: parseResult.error.errors });
    }
    const appointment = await storage.updateAppointment(id, userId, parseResult.data);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json(appointment);
  } catch (error) {
    console.error("Error updating appointment:", error);
    res.status(500).json({ message: "Failed to update appointment" });
  }
});

// DELETE /api/appointments/:id - Delete an appointment
router.delete("/:id", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ message: "Invalid appointment ID" });
    }
    const deleted = await storage.deleteAppointment(id, userId);
    if (!deleted) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.json({ message: "Appointment deleted successfully" });
  } catch (error) {
    console.error("Error deleting appointment:", error);
    res.status(500).json({ message: "Failed to delete appointment" });
  }
});

export default router;
