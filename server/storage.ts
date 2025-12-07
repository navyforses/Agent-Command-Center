import {
  users,
  children,
  documents,
  therapies,
  therapySessions,
  appointments,
  emails,
  conversations,
  chatMessages,
  testimonials,
  type User,
  type UpsertUser,
  type Child,
  type InsertChild,
  type Document,
  type InsertDocument,
  type Therapy,
  type InsertTherapy,
  type TherapySession,
  type InsertTherapySession,
  type Appointment,
  type InsertAppointment,
  type Email,
  type InsertEmail,
  type Conversation,
  type InsertConversation,
  type ChatMessage,
  type InsertChatMessage,
  type Testimonial,
  type InsertTestimonial,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  getChildren(userId: string): Promise<Child[]>;
  getChild(id: number, userId: string): Promise<Child | undefined>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: number, userId: string, child: Partial<InsertChild>): Promise<Child | undefined>;
  deleteChild(id: number, userId: string): Promise<boolean>;

  getDocuments(userId: string): Promise<Document[]>;
  getDocumentsByChild(childId: number, userId: string): Promise<Document[]>;
  getDocument(id: number, userId: string): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: number, userId: string, doc: Partial<InsertDocument>): Promise<Document | undefined>;
  deleteDocument(id: number, userId: string): Promise<boolean>;

  getTherapies(userId: string): Promise<Therapy[]>;
  getTherapiesByChild(childId: number, userId: string): Promise<Therapy[]>;
  getTherapy(id: number, userId: string): Promise<Therapy | undefined>;
  createTherapy(therapy: InsertTherapy): Promise<Therapy>;
  updateTherapy(id: number, userId: string, therapy: Partial<InsertTherapy>): Promise<Therapy | undefined>;
  deleteTherapy(id: number, userId: string): Promise<boolean>;

  getTherapySessions(therapyId: number, userId: string): Promise<TherapySession[]>;
  getTherapySession(id: number, userId: string): Promise<TherapySession | undefined>;
  createTherapySession(session: InsertTherapySession, userId: string): Promise<TherapySession | null>;
  updateTherapySession(id: number, userId: string, session: Partial<InsertTherapySession>): Promise<TherapySession | undefined>;
  deleteTherapySession(id: number, userId: string): Promise<boolean>;

  getAppointments(userId: string): Promise<Appointment[]>;
  getAppointmentsByChild(childId: number, userId: string): Promise<Appointment[]>;
  getAppointment(id: number, userId: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: number, userId: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: number, userId: string): Promise<boolean>;

  getEmails(userId: string): Promise<Email[]>;
  getEmail(id: number, userId: string): Promise<Email | undefined>;
  createEmail(email: InsertEmail): Promise<Email>;
  updateEmail(id: number, userId: string, email: Partial<InsertEmail>): Promise<Email | undefined>;
  deleteEmail(id: number, userId: string): Promise<boolean>;

  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: number, userId: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: number, userId: string, conversation: Partial<InsertConversation>): Promise<Conversation | undefined>;
  deleteConversation(id: number, userId: string): Promise<boolean>;

  getChatMessages(userId: string): Promise<ChatMessage[]>;
  getChatMessagesByConversation(conversationId: number, userId: string): Promise<ChatMessage[]>;
  getChatMessage(id: number, userId: string): Promise<ChatMessage | undefined>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  updateChatMessage(id: number, userId: string, message: Partial<InsertChatMessage>): Promise<ChatMessage | undefined>;
  clearChatMessages(userId: string): Promise<boolean>;
  clearConversationMessages(conversationId: number, userId: string): Promise<boolean>;

  getApprovedTestimonials(): Promise<Testimonial[]>;
  getUserTestimonial(userId: string): Promise<Testimonial | undefined>;
  createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial>;
  updateTestimonial(id: number, userId: string, testimonial: Partial<InsertTestimonial>): Promise<Testimonial | undefined>;
  deleteTestimonial(id: number, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getChildren(userId: string): Promise<Child[]> {
    return db.select().from(children).where(eq(children.userId, userId));
  }

  async getChild(id: number, userId: string): Promise<Child | undefined> {
    const [child] = await db.select().from(children)
      .where(and(eq(children.id, id), eq(children.userId, userId)));
    return child;
  }

  async createChild(child: InsertChild): Promise<Child> {
    const [newChild] = await db.insert(children).values(child).returning();
    return newChild;
  }

  async updateChild(id: number, userId: string, child: Partial<InsertChild>): Promise<Child | undefined> {
    const [updatedChild] = await db
      .update(children)
      .set(child)
      .where(and(eq(children.id, id), eq(children.userId, userId)))
      .returning();
    return updatedChild;
  }

  async deleteChild(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(children)
      .where(and(eq(children.id, id), eq(children.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getDocuments(userId: string): Promise<Document[]> {
    return db.select().from(documents).where(eq(documents.userId, userId));
  }

  async getDocumentsByChild(childId: number, userId: string): Promise<Document[]> {
    return db.select().from(documents)
      .where(and(eq(documents.childId, childId), eq(documents.userId, userId)));
  }

  async getDocument(id: number, userId: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)));
    return doc;
  }

  async createDocument(doc: InsertDocument): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async updateDocument(id: number, userId: string, doc: Partial<InsertDocument>): Promise<Document | undefined> {
    const [updatedDoc] = await db
      .update(documents)
      .set(doc)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();
    return updatedDoc;
  }

  async deleteDocument(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(documents)
      .where(and(eq(documents.id, id), eq(documents.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getTherapies(userId: string): Promise<Therapy[]> {
    return db.select().from(therapies).where(eq(therapies.userId, userId));
  }

  async getTherapiesByChild(childId: number, userId: string): Promise<Therapy[]> {
    return db.select().from(therapies)
      .where(and(eq(therapies.childId, childId), eq(therapies.userId, userId)));
  }

  async getTherapy(id: number, userId: string): Promise<Therapy | undefined> {
    const [therapy] = await db.select().from(therapies)
      .where(and(eq(therapies.id, id), eq(therapies.userId, userId)));
    return therapy;
  }

  async createTherapy(therapy: InsertTherapy): Promise<Therapy> {
    const [newTherapy] = await db.insert(therapies).values(therapy).returning();
    return newTherapy;
  }

  async updateTherapy(id: number, userId: string, therapy: Partial<InsertTherapy>): Promise<Therapy | undefined> {
    const [updatedTherapy] = await db
      .update(therapies)
      .set(therapy)
      .where(and(eq(therapies.id, id), eq(therapies.userId, userId)))
      .returning();
    return updatedTherapy;
  }

  async deleteTherapy(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(therapies)
      .where(and(eq(therapies.id, id), eq(therapies.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getTherapySessions(therapyId: number, userId: string): Promise<TherapySession[]> {
    const therapy = await this.getTherapy(therapyId, userId);
    if (!therapy) return [];
    return db.select().from(therapySessions).where(eq(therapySessions.therapyId, therapyId));
  }

  async getTherapySession(id: number, userId: string): Promise<TherapySession | undefined> {
    const [session] = await db.select().from(therapySessions)
      .where(eq(therapySessions.id, id));
    if (!session || !session.therapyId) return undefined;
    
    const therapy = await this.getTherapy(session.therapyId, userId);
    if (!therapy) return undefined;
    
    return session;
  }

  async createTherapySession(session: InsertTherapySession, userId: string): Promise<TherapySession | null> {
    if (!session.therapyId) return null;
    
    const therapy = await this.getTherapy(session.therapyId, userId);
    if (!therapy) return null;
    
    const [newSession] = await db.insert(therapySessions).values(session).returning();
    return newSession;
  }

  async updateTherapySession(id: number, userId: string, session: Partial<InsertTherapySession>): Promise<TherapySession | undefined> {
    const [existingSession] = await db.select().from(therapySessions)
      .where(eq(therapySessions.id, id));
    if (!existingSession) return undefined;
    
    const existingTherapyId = existingSession.therapyId;
    if (!existingTherapyId) return undefined;
    
    const therapy = await this.getTherapy(existingTherapyId, userId);
    if (!therapy) return undefined;
    
    const { therapyId: _, ...safeUpdate } = session;
    const [updatedSession] = await db
      .update(therapySessions)
      .set(safeUpdate)
      .where(eq(therapySessions.id, id))
      .returning();
    return updatedSession;
  }

  async deleteTherapySession(id: number, userId: string): Promise<boolean> {
    const [existingSession] = await db.select().from(therapySessions)
      .where(eq(therapySessions.id, id));
    if (!existingSession) return false;
    
    const existingTherapyId = existingSession.therapyId;
    if (!existingTherapyId) return false;
    
    const therapy = await this.getTherapy(existingTherapyId, userId);
    if (!therapy) return false;
    
    const result = await db.delete(therapySessions)
      .where(eq(therapySessions.id, id))
      .returning();
    return result.length > 0;
  }

  async getAppointments(userId: string): Promise<Appointment[]> {
    return db.select().from(appointments).where(eq(appointments.userId, userId));
  }

  async getAppointmentsByChild(childId: number, userId: string): Promise<Appointment[]> {
    return db.select().from(appointments)
      .where(and(eq(appointments.childId, childId), eq(appointments.userId, userId)));
  }

  async getAppointment(id: number, userId: string): Promise<Appointment | undefined> {
    const [appointment] = await db.select().from(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.userId, userId)));
    return appointment;
  }

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const [newAppointment] = await db.insert(appointments).values(appointment).returning();
    return newAppointment;
  }

  async updateAppointment(id: number, userId: string, appointment: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const [updatedAppointment] = await db
      .update(appointments)
      .set(appointment)
      .where(and(eq(appointments.id, id), eq(appointments.userId, userId)))
      .returning();
    return updatedAppointment;
  }

  async deleteAppointment(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(appointments)
      .where(and(eq(appointments.id, id), eq(appointments.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getEmails(userId: string): Promise<Email[]> {
    return db.select().from(emails).where(eq(emails.userId, userId));
  }

  async getEmail(id: number, userId: string): Promise<Email | undefined> {
    const [email] = await db.select().from(emails)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)));
    return email;
  }

  async createEmail(email: InsertEmail): Promise<Email> {
    const [newEmail] = await db.insert(emails).values(email).returning();
    return newEmail;
  }

  async updateEmail(id: number, userId: string, email: Partial<InsertEmail>): Promise<Email | undefined> {
    const [updatedEmail] = await db
      .update(emails)
      .set(email)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .returning();
    return updatedEmail;
  }

  async deleteEmail(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(emails)
      .where(and(eq(emails.id, id), eq(emails.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return db.select().from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: number, userId: string): Promise<Conversation | undefined> {
    const [conversation] = await db.select().from(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)));
    return conversation;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations).values(conversation).returning();
    return newConversation;
  }

  async updateConversation(id: number, userId: string, conversation: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const [updatedConversation] = await db
      .update(conversations)
      .set({ ...conversation, updatedAt: new Date() })
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return updatedConversation;
  }

  async deleteConversation(id: number, userId: string): Promise<boolean> {
    await db.delete(chatMessages)
      .where(and(eq(chatMessages.conversationId, id), eq(chatMessages.userId, userId)));
    const result = await db.delete(conversations)
      .where(and(eq(conversations.id, id), eq(conversations.userId, userId)))
      .returning();
    return result.length > 0;
  }

  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages).where(eq(chatMessages.userId, userId));
  }

  async getChatMessagesByConversation(conversationId: number, userId: string): Promise<ChatMessage[]> {
    return db.select().from(chatMessages)
      .where(and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.userId, userId)))
      .orderBy(chatMessages.createdAt);
  }

  async getChatMessage(id: number, userId: string): Promise<ChatMessage | undefined> {
    const [message] = await db.select().from(chatMessages)
      .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId)));
    return message;
  }

  async createChatMessage(message: InsertChatMessage): Promise<ChatMessage> {
    const [newMessage] = await db.insert(chatMessages).values(message).returning();
    return newMessage;
  }

  async updateChatMessage(id: number, userId: string, message: Partial<InsertChatMessage>): Promise<ChatMessage | undefined> {
    const [updatedMessage] = await db
      .update(chatMessages)
      .set(message)
      .where(and(eq(chatMessages.id, id), eq(chatMessages.userId, userId)))
      .returning();
    return updatedMessage;
  }

  async clearChatMessages(userId: string): Promise<boolean> {
    const result = await db.delete(chatMessages)
      .where(eq(chatMessages.userId, userId))
      .returning();
    return result.length >= 0;
  }

  async clearConversationMessages(conversationId: number, userId: string): Promise<boolean> {
    const conversation = await this.getConversation(conversationId, userId);
    if (!conversation) return false;
    const result = await db.delete(chatMessages)
      .where(and(eq(chatMessages.conversationId, conversationId), eq(chatMessages.userId, userId)))
      .returning();
    return result.length >= 0;
  }

  async getApprovedTestimonials(): Promise<Testimonial[]> {
    return db.select().from(testimonials)
      .where(eq(testimonials.isApproved, true))
      .orderBy(desc(testimonials.createdAt));
  }

  async getUserTestimonial(userId: string): Promise<Testimonial | undefined> {
    const [testimonial] = await db.select().from(testimonials)
      .where(eq(testimonials.userId, userId));
    return testimonial;
  }

  async createTestimonial(testimonial: InsertTestimonial): Promise<Testimonial> {
    const [newTestimonial] = await db.insert(testimonials).values(testimonial).returning();
    return newTestimonial;
  }

  async updateTestimonial(id: number, userId: string, testimonial: Partial<InsertTestimonial>): Promise<Testimonial | undefined> {
    const [updatedTestimonial] = await db
      .update(testimonials)
      .set(testimonial)
      .where(and(eq(testimonials.id, id), eq(testimonials.userId, userId)))
      .returning();
    return updatedTestimonial;
  }

  async deleteTestimonial(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(testimonials)
      .where(and(eq(testimonials.id, id), eq(testimonials.userId, userId)))
      .returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
