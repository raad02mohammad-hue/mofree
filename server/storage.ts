import { db } from "./db";
import {
  messages, contacts, events, transactions, healthLogs, healthGoals, users, sessions,
  type Message, type Contact, type Event, type Transaction, type HealthLog, type HealthGoal,
  type User,
  type InsertMessage, type InsertContact, type InsertEvent, type InsertTransaction,
  type InsertHealthLog, type InsertHealthGoal,
} from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// Session shape (not stored as a full DB type, just what we return)
export type Session = { id: string; userId: number; expiresAt: string };

export interface IStorage {
  // Auth
  getUserByEmail(email: string): User | undefined;
  getUserById(id: number): User | undefined;
  createUser(data: { email: string; passwordHash?: string; name: string; avatarInitials: string; provider: string; providerId?: string }): User;
  createSession(userId: number): Session;
  getSession(id: string): Session | undefined;
  deleteSession(id: string): void;
  seedForUser(userId: number): void;

  // Contacts
  getContacts(userId: number): Contact[];
  getContact(id: number): Contact | undefined;
  createContact(data: InsertContact): Contact;
  updateContact(id: number, data: Partial<Contact>): Contact | undefined;

  // Messages
  getMessagesByContact(contactId: number, userId: number): Message[];
  createMessage(data: InsertMessage): Message;

  // Events
  getEvents(userId: number): Event[];
  getEventsByDate(date: string, userId: number): Event[];
  createEvent(data: InsertEvent): Event;
  deleteEvent(id: number): void;

  // Transactions
  getTransactions(userId: number): Transaction[];
  createTransaction(data: InsertTransaction): Transaction;
  deleteTransaction(id: number): void;

  // Health logs
  getHealthLogs(userId: number, limit?: number): HealthLog[];
  getHealthLogByDate(date: string, userId: number): HealthLog | undefined;
  upsertHealthLog(date: string, userId: number, data: Partial<InsertHealthLog>): HealthLog;
  getHealthLogRange(startDate: string, endDate: string, userId: number): HealthLog[];

  // Health goals
  getHealthGoals(userId: number): HealthGoal[];
  upsertHealthGoal(metric: string, target: number, unit: string, userId: number): HealthGoal;
}

export class DatabaseStorage implements IStorage {
  // ── Auth ──────────────────────────────────────────────────────────────────

  getUserByEmail(email: string): User | undefined {
    return db.select().from(users).where(eq(users.email, email)).get();
  }

  getUserById(id: number): User | undefined {
    return db.select().from(users).where(eq(users.id, id)).get();
  }

  createUser(data: { email: string; passwordHash?: string; name: string; avatarInitials: string; provider: string; providerId?: string }): User {
    const now = new Date().toISOString();
    return db.insert(users).values({
      email: data.email,
      passwordHash: data.passwordHash ?? null,
      name: data.name,
      avatarInitials: data.avatarInitials,
      provider: data.provider,
      providerId: data.providerId ?? null,
      createdAt: now,
    }).returning().get();
  }

  createSession(userId: number): Session {
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    db.insert(sessions).values({ id, userId, createdAt: now, expiresAt }).run();
    return { id, userId, expiresAt };
  }

  getSession(id: string): Session | undefined {
    const row = db.select().from(sessions).where(eq(sessions.id, id)).get();
    if (!row) return undefined;
    // Check expiry
    if (new Date(row.expiresAt) < new Date()) {
      db.delete(sessions).where(eq(sessions.id, id)).run();
      return undefined;
    }
    return { id: row.id, userId: row.userId, expiresAt: row.expiresAt };
  }

  deleteSession(id: string): void {
    db.delete(sessions).where(eq(sessions.id, id)).run();
  }

  seedForUser(userId: number): void {
    const today = new Date();
    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

    // Seed contacts
    const c1 = db.insert(contacts).values({ userId, name: "Alex Chen", avatar: "AC", lastMessage: "Hey! Are you free this weekend?", lastMessageTime: "2m ago", unread: 2 }).returning().get();
    const c2 = db.insert(contacts).values({ userId, name: "Jordan Lee", avatar: "JL", lastMessage: "That sounds awesome!", lastMessageTime: "1h ago", unread: 0 }).returning().get();
    const c3 = db.insert(contacts).values({ userId, name: "Maya Patel", avatar: "MP", lastMessage: "Did you see the game last night?", lastMessageTime: "3h ago", unread: 1 }).returning().get();
    const c4 = db.insert(contacts).values({ userId, name: "Tyler Brooks", avatar: "TB", lastMessage: "Let's grab lunch soon 🍜", lastMessageTime: "Yesterday", unread: 0 }).returning().get();

    // Seed messages
    db.insert(messages).values([
      { userId, contactId: c1.id, content: "Hey! Are you free this weekend?", sender: "them", timestamp: "2:30 PM" },
      { userId, contactId: c1.id, content: "I was thinking we could check out that new place downtown", sender: "them", timestamp: "2:31 PM" },
      { userId, contactId: c2.id, content: "That sounds awesome!", sender: "them", timestamp: "1:15 PM" },
      { userId, contactId: c2.id, content: "Can't wait!", sender: "me", timestamp: "1:20 PM" },
      { userId, contactId: c3.id, content: "Did you see the game last night?", sender: "them", timestamp: "10:00 AM" },
      { userId, contactId: c4.id, content: "Let's grab lunch soon 🍜", sender: "them", timestamp: "Yesterday" },
    ]).run();

    // Seed events
    db.insert(events).values([
      { userId, title: "Team Standup", date: fmt(today), time: "9:00 AM", category: "work", color: "#6366f1" },
      { userId, title: "Gym Session", date: fmt(today), time: "6:00 PM", category: "health", color: "#10b981" },
      { userId, title: "Dentist", date: fmt(addDays(today, 2)), time: "2:00 PM", category: "health", color: "#f59e0b" },
      { userId, title: "Dinner with Alex", date: fmt(addDays(today, 3)), time: "7:30 PM", category: "social", color: "#ec4899" },
      { userId, title: "Project Deadline", date: fmt(addDays(today, 5)), time: "11:59 PM", category: "work", color: "#ef4444" },
    ]).run();

    // Seed transactions
    db.insert(transactions).values([
      { userId, description: "Salary", amount: 3200, type: "income", category: "Income", date: fmt(today) },
      { userId, description: "Rent", amount: -950, type: "expense", category: "Housing", date: fmt(today) },
      { userId, description: "Grocery Store", amount: -87.50, type: "expense", category: "Food", date: fmt(addDays(today, -1)) },
      { userId, description: "Netflix", amount: -15.99, type: "expense", category: "Entertainment", date: fmt(addDays(today, -2)) },
      { userId, description: "Gym Membership", amount: -40, type: "expense", category: "Health", date: fmt(addDays(today, -3)) },
      { userId, description: "Freelance Payment", amount: 500, type: "income", category: "Income", date: fmt(addDays(today, -4)) },
      { userId, description: "Gas Station", amount: -65, type: "expense", category: "Transport", date: fmt(addDays(today, -5)) },
      { userId, description: "Restaurant", amount: -42.80, type: "expense", category: "Food", date: fmt(addDays(today, -6)) },
    ]).run();

    // Seed health logs (last 7 days)
    const workoutTypes = ["Running", "Lifting", "Cycling", "HIIT", "Yoga", "Walk", "Rest"];
    for (let i = 6; i >= 0; i--) {
      const d = fmt(addDays(today, -i));
      db.insert(healthLogs).values({
        userId,
        date: d,
        steps: 7000 + Math.floor(Math.random() * 5000),
        activeCalories: 350 + Math.floor(Math.random() * 250),
        workoutMinutes: 30 + Math.floor(Math.random() * 30),
        workoutType: workoutTypes[i % 7],
        distanceKm: parseFloat((3 + Math.random() * 5).toFixed(1)),
        sleepHours: parseFloat((6.5 + Math.random() * 2).toFixed(1)),
        sleepDeep: parseFloat((1 + Math.random() * 0.8).toFixed(1)),
        sleepRem: parseFloat((1.2 + Math.random() * 0.8).toFixed(1)),
        sleepLight: parseFloat((3 + Math.random() * 1).toFixed(1)),
        sleepScore: 70 + Math.floor(Math.random() * 25),
        heartRateResting: 58 + Math.floor(Math.random() * 12),
        heartRateMax: 150 + Math.floor(Math.random() * 30),
        hrv: 45 + Math.floor(Math.random() * 30),
        bloodOxygen: parseFloat((97 + Math.random() * 2).toFixed(1)),
        weight: parseFloat((175 + Math.random() * 3 - 1.5).toFixed(1)),
        bodyFat: parseFloat((18 + Math.random() * 4 - 2).toFixed(1)),
        hydrationLiters: parseFloat((1.5 + Math.random() * 1.5).toFixed(1)),
        calories: 1800 + Math.floor(Math.random() * 600),
        protein: parseFloat((120 + Math.random() * 60).toFixed(0)),
        carbs: parseFloat((180 + Math.random() * 80).toFixed(0)),
        fat: parseFloat((60 + Math.random() * 30).toFixed(0)),
        moodScore: 5 + Math.floor(Math.random() * 5),
        stressLevel: 2 + Math.floor(Math.random() * 5),
        mindfulMinutes: Math.floor(Math.random() * 20),
        recoveryScore: 60 + Math.floor(Math.random() * 35),
        strainScore: parseFloat((8 + Math.random() * 8).toFixed(1)),
        readinessScore: 65 + Math.floor(Math.random() * 30),
        source: "manual",
      }).run();
    }

    // Seed health goals
    db.insert(healthGoals).values([
      { userId, metric: "steps", target: 10000, unit: "steps" },
      { userId, metric: "sleepHours", target: 8, unit: "hrs" },
      { userId, metric: "calories", target: 2200, unit: "kcal" },
      { userId, metric: "hydrationLiters", target: 2.5, unit: "L" },
      { userId, metric: "protein", target: 150, unit: "g" },
      { userId, metric: "workoutMinutes", target: 45, unit: "min" },
    ]).run();
  }

  // ── Contacts ──────────────────────────────────────────────────────────────

  getContacts(userId: number): Contact[] {
    return db.select().from(contacts).where(eq(contacts.userId, userId)).orderBy(contacts.id).all();
  }

  getContact(id: number): Contact | undefined {
    return db.select().from(contacts).where(eq(contacts.id, id)).get();
  }

  createContact(data: InsertContact): Contact {
    return db.insert(contacts).values(data).returning().get();
  }

  updateContact(id: number, data: Partial<Contact>): Contact | undefined {
    return db.update(contacts).set(data).where(eq(contacts.id, id)).returning().get();
  }

  // ── Messages ──────────────────────────────────────────────────────────────

  getMessagesByContact(contactId: number, userId: number): Message[] {
    return db.select().from(messages)
      .where(and(eq(messages.contactId, contactId), eq(messages.userId, userId)))
      .all();
  }

  createMessage(data: InsertMessage): Message {
    return db.insert(messages).values(data).returning().get();
  }

  // ── Events ────────────────────────────────────────────────────────────────

  getEvents(userId: number): Event[] {
    return db.select().from(events).where(eq(events.userId, userId)).orderBy(events.date).all();
  }

  getEventsByDate(date: string, userId: number): Event[] {
    return db.select().from(events)
      .where(and(eq(events.date, date), eq(events.userId, userId)))
      .all();
  }

  createEvent(data: InsertEvent): Event {
    return db.insert(events).values(data).returning().get();
  }

  deleteEvent(id: number): void {
    db.delete(events).where(eq(events.id, id)).run();
  }

  // ── Transactions ──────────────────────────────────────────────────────────

  getTransactions(userId: number): Transaction[] {
    return db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date))
      .all();
  }

  createTransaction(data: InsertTransaction): Transaction {
    return db.insert(transactions).values(data).returning().get();
  }

  deleteTransaction(id: number): void {
    db.delete(transactions).where(eq(transactions.id, id)).run();
  }

  // ── Health logs ───────────────────────────────────────────────────────────

  getHealthLogs(userId: number, limit = 30): HealthLog[] {
    return db.select().from(healthLogs)
      .where(eq(healthLogs.userId, userId))
      .orderBy(desc(healthLogs.date))
      .limit(limit)
      .all();
  }

  getHealthLogByDate(date: string, userId: number): HealthLog | undefined {
    return db.select().from(healthLogs)
      .where(and(eq(healthLogs.date, date), eq(healthLogs.userId, userId)))
      .get();
  }

  upsertHealthLog(date: string, userId: number, data: Partial<InsertHealthLog>): HealthLog {
    const existing = this.getHealthLogByDate(date, userId);
    if (existing) {
      return db.update(healthLogs)
        .set({ ...data, date, userId })
        .where(and(eq(healthLogs.date, date), eq(healthLogs.userId, userId)))
        .returning()
        .get()!;
    }
    return db.insert(healthLogs).values({ date, userId, ...data }).returning().get();
  }

  getHealthLogRange(startDate: string, endDate: string, userId: number): HealthLog[] {
    return db.select().from(healthLogs)
      .where(eq(healthLogs.userId, userId))
      .orderBy(healthLogs.date)
      .all()
      .filter(l => l.date >= startDate && l.date <= endDate);
  }

  // ── Health goals ──────────────────────────────────────────────────────────

  getHealthGoals(userId: number): HealthGoal[] {
    return db.select().from(healthGoals).where(eq(healthGoals.userId, userId)).all();
  }

  upsertHealthGoal(metric: string, target: number, unit: string, userId: number): HealthGoal {
    const existing = db.select().from(healthGoals)
      .where(and(eq(healthGoals.metric, metric), eq(healthGoals.userId, userId)))
      .get();
    if (existing) {
      return db.update(healthGoals)
        .set({ target, unit })
        .where(and(eq(healthGoals.metric, metric), eq(healthGoals.userId, userId)))
        .returning()
        .get()!;
    }
    return db.insert(healthGoals).values({ metric, target, unit, userId }).returning().get();
  }
}

export const storage = new DatabaseStorage();
