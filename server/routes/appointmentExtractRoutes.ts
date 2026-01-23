/**
 * Appointment Extraction Routes
 * ==============================
 * P2 Feature: AI-powered appointment extraction from emails
 * Extracts appointments from email text and creates calendar entries
 */

import { Router } from "express";
import { isEmailAuthenticated } from "../emailAuth";
import { storage } from "../storage";
import {
  extractAppointmentsFromEmail,
  validateAppointment,
  type ExtractedAppointment,
} from "../services/appointmentExtractor";
import { z } from "zod";

const router = Router();

// Schema for extraction request
const extractRequestSchema = z.object({
  emailText: z.string().min(1, "Email text is required"),
  emailSubject: z.string().optional(),
  childId: z.number().optional(),
});

// Schema for confirm appointment request
const confirmAppointmentSchema = z.object({
  appointment: z.object({
    title: z.string(),
    description: z.string().optional(),
    location: z.string().optional(),
    appointmentDate: z.string(),
    endDate: z.string().optional(),
  }),
  childId: z.number().optional(),
});

/**
 * POST /api/appointments/extract
 * Extract appointments from email text using AI
 */
router.post("/extract", isEmailAuthenticated, async (req: any, res) => {
  try {
    const parseResult = extractRequestSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid request data",
        errors: parseResult.error.errors,
      });
    }

    const { emailText, emailSubject } = parseResult.data;
    const result = await extractAppointmentsFromEmail(emailText, emailSubject);

    if (!result.success) {
      return res.status(500).json({
        message: "Failed to extract appointments",
        error: result.error,
      });
    }

    // Validate each extracted appointment
    const validatedAppointments = result.appointments.map((apt) => ({
      ...apt,
      validation: validateAppointment(apt),
    }));

    res.json({
      success: true,
      appointments: validatedAppointments,
      count: validatedAppointments.length,
    });
  } catch (error) {
    console.error("Appointment extraction error:", error);
    res.status(500).json({ message: "Failed to extract appointments" });
  }
});

/**
 * POST /api/appointments/extract/confirm
 * Confirm and save an extracted appointment to calendar
 */
router.post("/extract/confirm", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const parseResult = confirmAppointmentSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        message: "Invalid appointment data",
        errors: parseResult.error.errors,
      });
    }

    const { appointment, childId } = parseResult.data;

    // Validate the appointment
    const validation = validateAppointment({
      ...appointment,
      confidence: 1, // User confirmed
    });

    if (!validation.valid) {
      return res.status(400).json({
        message: "Invalid appointment data",
        errors: validation.errors,
      });
    }

    // Create the appointment
    const newAppointment = await storage.createAppointment({
      userId,
      childId: childId || null,
      title: appointment.title,
      description: appointment.description || null,
      location: appointment.location || null,
      appointmentDate: new Date(appointment.appointmentDate),
      endDate: appointment.endDate ? new Date(appointment.endDate) : null,
      status: "confirmed",
      reminderSent: false,
    });

    res.status(201).json({
      success: true,
      appointment: newAppointment,
    });
  } catch (error) {
    console.error("Appointment confirmation error:", error);
    res.status(500).json({ message: "Failed to save appointment" });
  }
});

/**
 * POST /api/appointments/extract/bulk
 * Extract appointments from multiple emails
 */
router.post("/extract/bulk", isEmailAuthenticated, async (req: any, res) => {
  try {
    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({
        message: "Please provide an array of emails",
      });
    }

    if (emails.length > 10) {
      return res.status(400).json({
        message: "Maximum 10 emails can be processed at once",
      });
    }

    const allAppointments: ExtractedAppointment[] = [];

    for (const email of emails) {
      const result = await extractAppointmentsFromEmail(
        email.text || email.body,
        email.subject
      );
      if (result.success) {
        allAppointments.push(...result.appointments);
      }
    }

    res.json({
      success: true,
      appointments: allAppointments,
      count: allAppointments.length,
    });
  } catch (error) {
    console.error("Bulk extraction error:", error);
    res.status(500).json({ message: "Failed to extract appointments" });
  }
});

/**
 * POST /api/appointments/extract/confirm-all
 * Confirm and save multiple extracted appointments
 */
router.post("/extract/confirm-all", isEmailAuthenticated, async (req: any, res) => {
  try {
    const userId = req.user.claims.sub;
    const { appointments, childId } = req.body;

    if (!Array.isArray(appointments) || appointments.length === 0) {
      return res.status(400).json({
        message: "Please provide an array of appointments",
      });
    }

    const savedAppointments = [];
    const errors = [];

    for (const apt of appointments) {
      try {
        const validation = validateAppointment({
          ...apt,
          confidence: 1,
        });

        if (!validation.valid) {
          errors.push({ appointment: apt, errors: validation.errors });
          continue;
        }

        const newAppointment = await storage.createAppointment({
          userId,
          childId: childId || null,
          title: apt.title,
          description: apt.description || null,
          location: apt.location || null,
          appointmentDate: new Date(apt.appointmentDate),
          endDate: apt.endDate ? new Date(apt.endDate) : null,
          status: "confirmed",
          reminderSent: false,
        });

        savedAppointments.push(newAppointment);
      } catch (err) {
        errors.push({ appointment: apt, error: "Failed to save" });
      }
    }

    res.status(201).json({
      success: true,
      saved: savedAppointments,
      savedCount: savedAppointments.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("Bulk confirmation error:", error);
    res.status(500).json({ message: "Failed to save appointments" });
  }
});

export default router;
