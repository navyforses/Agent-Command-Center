import {
  users,
  children,
  documents,
  type User,
  type UpsertUser,
  type Child,
  type InsertChild,
  type Document,
  type InsertDocument,
} from "@shared/schema";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
