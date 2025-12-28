import {
  users,
  userPreferences,
  children,
  documents,
  therapies,
  therapySessions,
  appointments,
  emails,
  conversations,
  chatMessages,
  testimonials,
  nexusAiAgents,
  nexusResearchQueries,
  nexusFindings,
  nexusAiAnalyses,
  nexusDisciplinaryAnalyses,
  nexusKnowledgeNodes,
  nexusKnowledgeEdges,
  nexusHypotheses,
  nexusDebates,
  nexusActionItems,
  evolutionCycles,
  evolutionDailyRuns,
  evolutionInsights,
  evolutionReports,
  evolutionReportMessages,
  accumulatedKnowledge,
  type User,
  type UpsertUser,
  type UserPreferences,
  type InsertUserPreferences,
  type UpdateUserPreferences,
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
  type NexusAiAgent,
  type InsertNexusAiAgent,
  type NexusResearchQuery,
  type InsertNexusResearchQuery,
  type NexusFinding,
  type InsertNexusFinding,
  type NexusAiAnalysis,
  type InsertNexusAiAnalysis,
  type NexusDisciplinaryAnalysis,
  type InsertNexusDisciplinaryAnalysis,
  type NexusKnowledgeNode,
  type InsertNexusKnowledgeNode,
  type NexusKnowledgeEdge,
  type InsertNexusKnowledgeEdge,
  type NexusHypothesis,
  type InsertNexusHypothesis,
  type NexusDebate,
  type InsertNexusDebate,
  type NexusActionItem,
  type InsertNexusActionItem,
  type EvolutionCycle,
  type InsertEvolutionCycle,
  type EvolutionDailyRun,
  type InsertEvolutionDailyRun,
  type EvolutionInsight,
  type InsertEvolutionInsight,
  type EvolutionReport,
  type InsertEvolutionReport,
  type EvolutionReportMessage,
  type InsertEvolutionReportMessage,
  type AccumulatedKnowledge,
  type InsertAccumulatedKnowledge,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, isNull, or } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string }): Promise<User | undefined>;

  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences>;
  updateUserPreferences(userId: string, prefs: UpdateUserPreferences): Promise<UserPreferences | undefined>;

  getChildren(userId: string): Promise<Child[]>;
  getChild(id: number, userId: string): Promise<Child | undefined>;
  findChildByName(userId: string, firstName: string, lastName: string): Promise<Child | undefined>;
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

  // NEXUS OMEGA - Multi-AI Research Platform Storage
  getNexusAiAgents(): Promise<NexusAiAgent[]>;
  getNexusAiAgent(id: string): Promise<NexusAiAgent | undefined>;
  createNexusAiAgent(agent: InsertNexusAiAgent): Promise<NexusAiAgent>;
  
  getNexusResearchQueries(userId: string): Promise<NexusResearchQuery[]>;
  getNexusResearchQuery(id: number, userId: string): Promise<NexusResearchQuery | undefined>;
  createNexusResearchQuery(query: InsertNexusResearchQuery): Promise<NexusResearchQuery>;
  updateNexusResearchQuery(id: number, userId: string, query: Partial<InsertNexusResearchQuery> & { completedAt?: Date }): Promise<NexusResearchQuery | undefined>;
  
  getNexusFindings(userId: string, queryId?: number): Promise<NexusFinding[]>;
  getNexusFinding(id: number, userId: string): Promise<NexusFinding | undefined>;
  getNexusConsensusFindingsOnly(userId: string): Promise<NexusFinding[]>;
  createNexusFinding(finding: InsertNexusFinding): Promise<NexusFinding>;
  
  getNexusAiAnalyses(findingId: number, userId: string): Promise<NexusAiAnalysis[]>;
  createNexusAiAnalysis(analysis: InsertNexusAiAnalysis): Promise<NexusAiAnalysis>;
  
  getNexusDisciplinaryAnalyses(findingId: number, userId: string): Promise<NexusDisciplinaryAnalysis[]>;
  createNexusDisciplinaryAnalysis(analysis: InsertNexusDisciplinaryAnalysis): Promise<NexusDisciplinaryAnalysis>;
  
  getNexusKnowledgeNodes(userId: string): Promise<NexusKnowledgeNode[]>;
  getNexusKnowledgeNode(id: number, userId: string): Promise<NexusKnowledgeNode | undefined>;
  createNexusKnowledgeNode(node: InsertNexusKnowledgeNode): Promise<NexusKnowledgeNode>;
  
  getNexusKnowledgeEdges(userId: string): Promise<NexusKnowledgeEdge[]>;
  createNexusKnowledgeEdge(edge: InsertNexusKnowledgeEdge): Promise<NexusKnowledgeEdge>;
  
  getNexusHypotheses(userId: string): Promise<NexusHypothesis[]>;
  getNexusHypothesis(id: number, userId: string): Promise<NexusHypothesis | undefined>;
  createNexusHypothesis(hypothesis: InsertNexusHypothesis): Promise<NexusHypothesis>;
  updateNexusHypothesis(id: number, userId: string, hypothesis: Partial<InsertNexusHypothesis>): Promise<NexusHypothesis | undefined>;
  
  getNexusDebates(userId: string): Promise<NexusDebate[]>;
  getNexusDebate(id: number, userId: string): Promise<NexusDebate | undefined>;
  createNexusDebate(debate: InsertNexusDebate): Promise<NexusDebate>;
  
  getNexusActionItems(userId: string): Promise<NexusActionItem[]>;
  getNexusActionItem(id: number, userId: string): Promise<NexusActionItem | undefined>;
  createNexusActionItem(action: InsertNexusActionItem): Promise<NexusActionItem>;
  updateNexusActionItem(id: number, userId: string, action: Partial<InsertNexusActionItem>): Promise<NexusActionItem | undefined>;

  // Evolution Cycle - Autonomous 24-Hour Research Cycles
  getEvolutionCycles(userId: string): Promise<EvolutionCycle[]>;
  getAllActiveEvolutionCycles(): Promise<EvolutionCycle[]>;
  getEvolutionCycle(id: number, userId: string): Promise<EvolutionCycle | undefined>;
  getEvolutionCycleById(id: number): Promise<EvolutionCycle | undefined>;
  getActiveEvolutionCycle(userId: string): Promise<EvolutionCycle | undefined>;
  createEvolutionCycle(cycle: InsertEvolutionCycle): Promise<EvolutionCycle>;
  updateEvolutionCycle(id: number, userId: string, cycle: Partial<InsertEvolutionCycle>): Promise<EvolutionCycle | undefined>;

  getEvolutionDailyRuns(cycleId: number): Promise<EvolutionDailyRun[]>;
  getEvolutionDailyRun(id: number): Promise<EvolutionDailyRun | undefined>;
  getTodaysDailyRun(cycleId: number): Promise<EvolutionDailyRun | undefined>;
  createEvolutionDailyRun(run: InsertEvolutionDailyRun): Promise<EvolutionDailyRun>;
  updateEvolutionDailyRun(id: number, run: Partial<InsertEvolutionDailyRun> & { completedAt?: Date }): Promise<EvolutionDailyRun | undefined>;

  getEvolutionInsights(dailyRunId: number): Promise<EvolutionInsight[]>;
  getEvolutionInsightsByPhase(dailyRunId: number, phase: string): Promise<EvolutionInsight[]>;
  createEvolutionInsight(insight: InsertEvolutionInsight): Promise<EvolutionInsight>;
  getPreviousCycleSynthesizedInsights(userId: string, currentCycleId: number): Promise<EvolutionInsight[]>;

  getEvolutionReports(userId: string): Promise<EvolutionReport[]>;
  getEvolutionReport(id: number, userId: string): Promise<EvolutionReport | undefined>;
  getEvolutionReportByDailyRun(dailyRunId: number): Promise<EvolutionReport | undefined>;
  createEvolutionReport(report: InsertEvolutionReport): Promise<EvolutionReport>;
  updateEvolutionReport(id: number, report: Partial<InsertEvolutionReport>): Promise<EvolutionReport | undefined>;
  deleteEvolutionReport(id: number): Promise<boolean>;

  getEvolutionReportMessages(reportId: number): Promise<EvolutionReportMessage[]>;
  createEvolutionReportMessage(message: InsertEvolutionReportMessage): Promise<EvolutionReportMessage>;

  // Accumulated Knowledge - Persistent insights across cycles
  getAccumulatedKnowledge(userId: string): Promise<AccumulatedKnowledge[]>;
  getAccumulatedKnowledgeByChild(userId: string, childId: number): Promise<AccumulatedKnowledge[]>;
  getAccumulatedKnowledgeItem(id: number, userId: string): Promise<AccumulatedKnowledge | undefined>;
  createAccumulatedKnowledge(knowledge: InsertAccumulatedKnowledge): Promise<AccumulatedKnowledge>;
  updateAccumulatedKnowledge(id: number, userId: string, knowledge: Partial<InsertAccumulatedKnowledge>): Promise<AccumulatedKnowledge | undefined>;
  getActiveAccumulatedKnowledge(userId: string): Promise<AccumulatedKnowledge[]>;

  // Public endpoints - no auth required
  getAllPublicReports(): Promise<EvolutionReport[]>;
  getAllPublicKnowledge(): Promise<AccumulatedKnowledge[]>;
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

  async updateUserProfile(userId: string, data: { firstName?: string; lastName?: string; email?: string }): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    const [prefs] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
    return prefs;
  }

  async createUserPreferences(prefs: InsertUserPreferences): Promise<UserPreferences> {
    const [newPrefs] = await db.insert(userPreferences).values(prefs).returning();
    return newPrefs;
  }

  async updateUserPreferences(userId: string, prefs: UpdateUserPreferences): Promise<UserPreferences | undefined> {
    // Try to update existing preferences
    const [existing] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));

    if (existing) {
      const [updated] = await db
        .update(userPreferences)
        .set({
          ...prefs,
          updatedAt: new Date(),
        })
        .where(eq(userPreferences.userId, userId))
        .returning();
      return updated;
    } else {
      // Create new preferences if they don't exist
      const [newPrefs] = await db
        .insert(userPreferences)
        .values({
          userId,
          ...prefs,
        })
        .returning();
      return newPrefs;
    }
  }

  async getChildren(userId: string): Promise<Child[]> {
    return db.select().from(children).where(eq(children.userId, userId));
  }

  async getChild(id: number, userId: string): Promise<Child | undefined> {
    const [child] = await db.select().from(children)
      .where(and(eq(children.id, id), eq(children.userId, userId)));
    return child;
  }

  async findChildByName(userId: string, firstName: string, lastName: string): Promise<Child | undefined> {
    const normalizedFirst = firstName.toLowerCase().trim();
    const normalizedLast = lastName.toLowerCase().trim();
    const allChildren = await db.select().from(children).where(eq(children.userId, userId));
    return allChildren.find(child => 
      child.firstName.toLowerCase().trim() === normalizedFirst &&
      child.lastName.toLowerCase().trim() === normalizedLast
    );
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

  async getNexusAiAgents(): Promise<NexusAiAgent[]> {
    return db.select().from(nexusAiAgents);
  }

  async getNexusAiAgent(id: string): Promise<NexusAiAgent | undefined> {
    const [agent] = await db.select().from(nexusAiAgents).where(eq(nexusAiAgents.id, id));
    return agent;
  }

  async createNexusAiAgent(agent: InsertNexusAiAgent): Promise<NexusAiAgent> {
    const [newAgent] = await db.insert(nexusAiAgents).values(agent).returning();
    return newAgent;
  }

  async getNexusResearchQueries(userId: string): Promise<NexusResearchQuery[]> {
    return db.select().from(nexusResearchQueries)
      .where(eq(nexusResearchQueries.userId, userId))
      .orderBy(desc(nexusResearchQueries.createdAt));
  }

  async getNexusResearchQuery(id: number, userId: string): Promise<NexusResearchQuery | undefined> {
    const [query] = await db.select().from(nexusResearchQueries)
      .where(and(eq(nexusResearchQueries.id, id), eq(nexusResearchQueries.userId, userId)));
    return query;
  }

  async createNexusResearchQuery(query: InsertNexusResearchQuery): Promise<NexusResearchQuery> {
    const [newQuery] = await db.insert(nexusResearchQueries).values(query).returning();
    return newQuery;
  }

  async updateNexusResearchQuery(id: number, userId: string, query: Partial<InsertNexusResearchQuery> & { completedAt?: Date }): Promise<NexusResearchQuery | undefined> {
    const [updatedQuery] = await db
      .update(nexusResearchQueries)
      .set(query)
      .where(and(eq(nexusResearchQueries.id, id), eq(nexusResearchQueries.userId, userId)))
      .returning();
    return updatedQuery;
  }

  async getNexusFindings(userId: string, queryId?: number): Promise<NexusFinding[]> {
    if (queryId) {
      const query = await this.getNexusResearchQuery(queryId, userId);
      if (!query) return [];
      return db.select().from(nexusFindings)
        .where(eq(nexusFindings.queryId, queryId))
        .orderBy(desc(nexusFindings.createdAt));
    }
    const userQueries = await this.getNexusResearchQueries(userId);
    const queryIds = userQueries.map(q => q.id);
    if (queryIds.length === 0) return [];
    const allFindings = await db.select().from(nexusFindings).orderBy(desc(nexusFindings.createdAt));
    return allFindings.filter(f => f.queryId && queryIds.includes(f.queryId));
  }

  async getNexusFinding(id: number, userId: string): Promise<NexusFinding | undefined> {
    const [finding] = await db.select().from(nexusFindings).where(eq(nexusFindings.id, id));
    if (!finding || !finding.queryId) return undefined;
    const query = await this.getNexusResearchQuery(finding.queryId, userId);
    if (!query) return undefined;
    return finding;
  }

  async getNexusConsensusFindingsOnly(userId: string): Promise<NexusFinding[]> {
    const userQueries = await this.getNexusResearchQueries(userId);
    const queryIds = userQueries.map(q => q.id);
    if (queryIds.length === 0) return [];
    const allFindings = await db.select().from(nexusFindings)
      .where(or(eq(nexusFindings.consensusLevel, 'high'), eq(nexusFindings.consensusLevel, 'unanimous')))
      .orderBy(desc(nexusFindings.createdAt));
    return allFindings.filter(f => f.queryId && queryIds.includes(f.queryId));
  }

  async createNexusFinding(finding: InsertNexusFinding): Promise<NexusFinding> {
    const [newFinding] = await db.insert(nexusFindings).values(finding).returning();
    return newFinding;
  }

  async getNexusAiAnalyses(findingId: number, userId: string): Promise<NexusAiAnalysis[]> {
    const finding = await this.getNexusFinding(findingId, userId);
    if (!finding) return [];
    return db.select().from(nexusAiAnalyses).where(eq(nexusAiAnalyses.findingId, findingId));
  }

  async createNexusAiAnalysis(analysis: InsertNexusAiAnalysis): Promise<NexusAiAnalysis> {
    const [newAnalysis] = await db.insert(nexusAiAnalyses).values(analysis).returning();
    return newAnalysis;
  }

  async getNexusDisciplinaryAnalyses(findingId: number, userId: string): Promise<NexusDisciplinaryAnalysis[]> {
    const finding = await this.getNexusFinding(findingId, userId);
    if (!finding) return [];
    return db.select().from(nexusDisciplinaryAnalyses)
      .where(eq(nexusDisciplinaryAnalyses.findingId, findingId));
  }

  async createNexusDisciplinaryAnalysis(analysis: InsertNexusDisciplinaryAnalysis): Promise<NexusDisciplinaryAnalysis> {
    const [newAnalysis] = await db.insert(nexusDisciplinaryAnalyses).values(analysis).returning();
    return newAnalysis;
  }

  async getNexusKnowledgeNodes(userId: string): Promise<NexusKnowledgeNode[]> {
    return db.select().from(nexusKnowledgeNodes).where(eq(nexusKnowledgeNodes.userId, userId));
  }

  async getNexusKnowledgeNode(id: number, userId: string): Promise<NexusKnowledgeNode | undefined> {
    const [node] = await db.select().from(nexusKnowledgeNodes)
      .where(and(eq(nexusKnowledgeNodes.id, id), eq(nexusKnowledgeNodes.userId, userId)));
    return node;
  }

  async createNexusKnowledgeNode(node: InsertNexusKnowledgeNode): Promise<NexusKnowledgeNode> {
    const [newNode] = await db.insert(nexusKnowledgeNodes).values(node).returning();
    return newNode;
  }

  async getNexusKnowledgeEdges(userId: string): Promise<NexusKnowledgeEdge[]> {
    return db.select().from(nexusKnowledgeEdges).where(eq(nexusKnowledgeEdges.userId, userId));
  }

  async createNexusKnowledgeEdge(edge: InsertNexusKnowledgeEdge): Promise<NexusKnowledgeEdge> {
    const [newEdge] = await db.insert(nexusKnowledgeEdges).values(edge).returning();
    return newEdge;
  }

  async getNexusHypotheses(userId: string): Promise<NexusHypothesis[]> {
    return db.select().from(nexusHypotheses)
      .where(eq(nexusHypotheses.userId, userId))
      .orderBy(desc(nexusHypotheses.createdAt));
  }

  async getNexusHypothesis(id: number, userId: string): Promise<NexusHypothesis | undefined> {
    const [hypothesis] = await db.select().from(nexusHypotheses)
      .where(and(eq(nexusHypotheses.id, id), eq(nexusHypotheses.userId, userId)));
    return hypothesis;
  }

  async createNexusHypothesis(hypothesis: InsertNexusHypothesis): Promise<NexusHypothesis> {
    const [newHypothesis] = await db.insert(nexusHypotheses).values(hypothesis).returning();
    return newHypothesis;
  }

  async updateNexusHypothesis(id: number, userId: string, hypothesis: Partial<InsertNexusHypothesis>): Promise<NexusHypothesis | undefined> {
    const [updatedHypothesis] = await db
      .update(nexusHypotheses)
      .set({ ...hypothesis, updatedAt: new Date() })
      .where(and(eq(nexusHypotheses.id, id), eq(nexusHypotheses.userId, userId)))
      .returning();
    return updatedHypothesis;
  }

  async getNexusDebates(userId: string): Promise<NexusDebate[]> {
    return db.select().from(nexusDebates)
      .where(eq(nexusDebates.userId, userId))
      .orderBy(desc(nexusDebates.createdAt));
  }

  async getNexusDebate(id: number, userId: string): Promise<NexusDebate | undefined> {
    const [debate] = await db.select().from(nexusDebates)
      .where(and(eq(nexusDebates.id, id), eq(nexusDebates.userId, userId)));
    return debate;
  }

  async createNexusDebate(debate: InsertNexusDebate): Promise<NexusDebate> {
    const [newDebate] = await db.insert(nexusDebates).values(debate).returning();
    return newDebate;
  }

  async getNexusActionItems(userId: string): Promise<NexusActionItem[]> {
    return db.select().from(nexusActionItems)
      .where(eq(nexusActionItems.userId, userId))
      .orderBy(desc(nexusActionItems.createdAt));
  }

  async getNexusActionItem(id: number, userId: string): Promise<NexusActionItem | undefined> {
    const [action] = await db.select().from(nexusActionItems)
      .where(and(eq(nexusActionItems.id, id), eq(nexusActionItems.userId, userId)));
    return action;
  }

  async createNexusActionItem(action: InsertNexusActionItem): Promise<NexusActionItem> {
    const [newAction] = await db.insert(nexusActionItems).values(action).returning();
    return newAction;
  }

  async updateNexusActionItem(id: number, userId: string, action: Partial<InsertNexusActionItem>): Promise<NexusActionItem | undefined> {
    const [updatedAction] = await db
      .update(nexusActionItems)
      .set(action)
      .where(and(eq(nexusActionItems.id, id), eq(nexusActionItems.userId, userId)))
      .returning();
    return updatedAction;
  }

  // Evolution Cycle Methods
  async getEvolutionCycles(userId: string): Promise<EvolutionCycle[]> {
    return db.select().from(evolutionCycles)
      .where(eq(evolutionCycles.userId, userId))
      .orderBy(desc(evolutionCycles.createdAt));
  }

  async getAllActiveEvolutionCycles(): Promise<EvolutionCycle[]> {
    return db.select().from(evolutionCycles)
      .where(eq(evolutionCycles.status, "active"))
      .orderBy(desc(evolutionCycles.createdAt));
  }

  async getEvolutionCycle(id: number, userId: string): Promise<EvolutionCycle | undefined> {
    const [cycle] = await db.select().from(evolutionCycles)
      .where(and(eq(evolutionCycles.id, id), eq(evolutionCycles.userId, userId)));
    return cycle;
  }

  async getEvolutionCycleById(id: number): Promise<EvolutionCycle | undefined> {
    const [cycle] = await db.select().from(evolutionCycles)
      .where(eq(evolutionCycles.id, id));
    return cycle;
  }

  async getActiveEvolutionCycle(userId: string): Promise<EvolutionCycle | undefined> {
    const [cycle] = await db.select().from(evolutionCycles)
      .where(and(eq(evolutionCycles.userId, userId), eq(evolutionCycles.status, "active")));
    return cycle;
  }

  async createEvolutionCycle(cycle: InsertEvolutionCycle): Promise<EvolutionCycle> {
    const [newCycle] = await db.insert(evolutionCycles).values(cycle).returning();
    return newCycle;
  }

  async updateEvolutionCycle(id: number, userId: string, cycle: Partial<InsertEvolutionCycle>): Promise<EvolutionCycle | undefined> {
    const [updated] = await db.update(evolutionCycles)
      .set(cycle)
      .where(and(eq(evolutionCycles.id, id), eq(evolutionCycles.userId, userId)))
      .returning();
    return updated;
  }

  async getEvolutionDailyRuns(cycleId: number): Promise<EvolutionDailyRun[]> {
    return db.select().from(evolutionDailyRuns)
      .where(eq(evolutionDailyRuns.cycleId, cycleId))
      .orderBy(desc(evolutionDailyRuns.runDate));
  }

  async getEvolutionDailyRun(id: number): Promise<EvolutionDailyRun | undefined> {
    const [run] = await db.select().from(evolutionDailyRuns)
      .where(eq(evolutionDailyRuns.id, id));
    return run;
  }

  async getTodaysDailyRun(cycleId: number): Promise<EvolutionDailyRun | undefined> {
    const today = new Date().toISOString().split('T')[0];
    const [run] = await db.select().from(evolutionDailyRuns)
      .where(and(eq(evolutionDailyRuns.cycleId, cycleId), eq(evolutionDailyRuns.runDate, today)));
    return run;
  }

  async createEvolutionDailyRun(run: InsertEvolutionDailyRun): Promise<EvolutionDailyRun> {
    const [newRun] = await db.insert(evolutionDailyRuns).values(run).returning();
    return newRun;
  }

  async updateEvolutionDailyRun(id: number, run: Partial<InsertEvolutionDailyRun> & { completedAt?: Date }): Promise<EvolutionDailyRun | undefined> {
    const [updated] = await db.update(evolutionDailyRuns)
      .set(run)
      .where(eq(evolutionDailyRuns.id, id))
      .returning();
    return updated;
  }

  async getEvolutionInsights(dailyRunId: number): Promise<EvolutionInsight[]> {
    return db.select().from(evolutionInsights)
      .where(eq(evolutionInsights.dailyRunId, dailyRunId))
      .orderBy(evolutionInsights.createdAt);
  }

  async getEvolutionInsightsByPhase(dailyRunId: number, phase: string): Promise<EvolutionInsight[]> {
    return db.select().from(evolutionInsights)
      .where(and(eq(evolutionInsights.dailyRunId, dailyRunId), eq(evolutionInsights.phase, phase)));
  }

  async createEvolutionInsight(insight: InsertEvolutionInsight): Promise<EvolutionInsight> {
    const [newInsight] = await db.insert(evolutionInsights).values(insight).returning();
    return newInsight;
  }

  async getPreviousCycleSynthesizedInsights(userId: string, currentCycleId: number): Promise<EvolutionInsight[]> {
    const userCycles = await this.getEvolutionCycles(userId);
    const previousCompletedCycles = userCycles
      .filter(c => c.id !== currentCycleId && c.status === "completed")
      .sort((a, b) => {
        const dateA = a.endDate ? new Date(a.endDate).getTime() : 0;
        const dateB = b.endDate ? new Date(b.endDate).getTime() : 0;
        return dateB - dateA;
      });
    
    if (previousCompletedCycles.length === 0) {
      return [];
    }

    const mostRecentCycle = previousCompletedCycles[0];
    const dailyRuns = await this.getEvolutionDailyRuns(mostRecentCycle.id);
    
    const allSynthesizedInsights: EvolutionInsight[] = [];
    for (const run of dailyRuns) {
      const synthesizeInsights = await this.getEvolutionInsightsByPhase(run.id, "synthesize");
      allSynthesizedInsights.push(...synthesizeInsights);
    }

    return allSynthesizedInsights;
  }

  async getEvolutionReports(userId: string): Promise<EvolutionReport[]> {
    const cycles = await this.getEvolutionCycles(userId);
    if (cycles.length === 0) return [];
    const cycleIds = cycles.map(c => c.id);
    const runs = await db.select().from(evolutionDailyRuns);
    const validRunIds = runs.filter(r => r.cycleId && cycleIds.includes(r.cycleId)).map(r => r.id);
    if (validRunIds.length === 0) return [];
    const reports = await db.select().from(evolutionReports).orderBy(desc(evolutionReports.reportDate));
    return reports.filter(r => r.dailyRunId && validRunIds.includes(r.dailyRunId));
  }

  async getEvolutionReport(id: number, userId: string): Promise<EvolutionReport | undefined> {
    const [report] = await db.select().from(evolutionReports).where(eq(evolutionReports.id, id));
    if (!report || !report.dailyRunId) return undefined;
    const run = await this.getEvolutionDailyRun(report.dailyRunId);
    if (!run || !run.cycleId) return undefined;
    const cycles = await this.getEvolutionCycles(userId);
    if (!cycles.some(c => c.id === run.cycleId)) return undefined;
    return report;
  }

  async getEvolutionReportByDailyRun(dailyRunId: number): Promise<EvolutionReport | undefined> {
    const [report] = await db.select().from(evolutionReports)
      .where(eq(evolutionReports.dailyRunId, dailyRunId));
    return report;
  }

  async createEvolutionReport(report: InsertEvolutionReport): Promise<EvolutionReport> {
    const [newReport] = await db.insert(evolutionReports).values(report).returning();
    return newReport;
  }

  async updateEvolutionReport(id: number, report: Partial<InsertEvolutionReport>): Promise<EvolutionReport | undefined> {
    const [updated] = await db.update(evolutionReports)
      .set(report)
      .where(eq(evolutionReports.id, id))
      .returning();
    return updated;
  }

  async deleteEvolutionReport(id: number): Promise<boolean> {
    // First delete any associated messages
    await db.delete(evolutionReportMessages).where(eq(evolutionReportMessages.reportId, id));
    // Then delete the report
    const result = await db.delete(evolutionReports).where(eq(evolutionReports.id, id)).returning();
    return result.length > 0;
  }

  async getEvolutionReportMessages(reportId: number): Promise<EvolutionReportMessage[]> {
    return db.select().from(evolutionReportMessages)
      .where(eq(evolutionReportMessages.reportId, reportId))
      .orderBy(evolutionReportMessages.createdAt);
  }

  async createEvolutionReportMessage(message: InsertEvolutionReportMessage): Promise<EvolutionReportMessage> {
    const [newMsg] = await db.insert(evolutionReportMessages).values(message).returning();
    return newMsg;
  }

  // Accumulated Knowledge - Persistent insights across cycles
  async getAccumulatedKnowledge(userId: string): Promise<AccumulatedKnowledge[]> {
    return db.select().from(accumulatedKnowledge)
      .where(eq(accumulatedKnowledge.userId, userId))
      .orderBy(desc(accumulatedKnowledge.updatedAt));
  }

  async getAccumulatedKnowledgeByChild(userId: string, childId: number): Promise<AccumulatedKnowledge[]> {
    return db.select().from(accumulatedKnowledge)
      .where(and(
        eq(accumulatedKnowledge.userId, userId),
        eq(accumulatedKnowledge.childId, childId)
      ))
      .orderBy(desc(accumulatedKnowledge.updatedAt));
  }

  async getAccumulatedKnowledgeItem(id: number, userId: string): Promise<AccumulatedKnowledge | undefined> {
    const [item] = await db.select().from(accumulatedKnowledge)
      .where(and(eq(accumulatedKnowledge.id, id), eq(accumulatedKnowledge.userId, userId)));
    return item;
  }

  async createAccumulatedKnowledge(knowledge: InsertAccumulatedKnowledge): Promise<AccumulatedKnowledge> {
    const [newKnowledge] = await db.insert(accumulatedKnowledge).values(knowledge).returning();
    return newKnowledge;
  }

  async updateAccumulatedKnowledge(id: number, userId: string, knowledge: Partial<InsertAccumulatedKnowledge>): Promise<AccumulatedKnowledge | undefined> {
    const [updated] = await db.update(accumulatedKnowledge)
      .set({ ...knowledge, updatedAt: new Date() })
      .where(and(eq(accumulatedKnowledge.id, id), eq(accumulatedKnowledge.userId, userId)))
      .returning();
    return updated;
  }

  async getActiveAccumulatedKnowledge(userId: string): Promise<AccumulatedKnowledge[]> {
    return db.select().from(accumulatedKnowledge)
      .where(and(
        eq(accumulatedKnowledge.userId, userId),
        or(
          eq(accumulatedKnowledge.status, "active"),
          eq(accumulatedKnowledge.status, "validated"),
          eq(accumulatedKnowledge.status, "emerging")
        )
      ))
      .orderBy(desc(accumulatedKnowledge.confidence));
  }

  // Public methods - return all data without user filtering
  async getAllPublicReports(): Promise<EvolutionReport[]> {
    return db.select().from(evolutionReports)
      .orderBy(desc(evolutionReports.reportDate))
      .limit(10);
  }

  async getAllPublicKnowledge(): Promise<AccumulatedKnowledge[]> {
    return db.select().from(accumulatedKnowledge)
      .where(or(
        eq(accumulatedKnowledge.status, "active"),
        eq(accumulatedKnowledge.status, "validated")
      ))
      .orderBy(desc(accumulatedKnowledge.updatedAt))
      .limit(20);
  }
}

export const storage = new DatabaseStorage();
