import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── Users ─────────────────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"), // null for OAuth-only users
  name: text("name").notNull(),
  avatarInitials: text("avatar_initials").notNull(),
  provider: text("provider").notNull().default("email"), // "email" | "google" | "apple"
  providerId: text("provider_id"),  // OAuth provider user ID
  createdAt: text("created_at").notNull(),
});

// ── Sessions ──────────────────────────────────────────────────────────────
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull(),
  createdAt: text("created_at").notNull(),
  expiresAt: text("expires_at").notNull(),
});

// ── Messages ──────────────────────────────────────────────────────────────
export const messages = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  contactId: integer("contact_id").notNull(),
  content: text("content").notNull(),
  sender: text("sender").notNull(),
  timestamp: text("timestamp").notNull(),
});

// ── Contacts ──────────────────────────────────────────────────────────────
export const contacts = sqliteTable("contacts", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  avatar: text("avatar").notNull(),
  lastMessage: text("last_message"),
  lastMessageTime: text("last_message_time"),
  unread: integer("unread").default(0),
});

// ── Events ────────────────────────────────────────────────────────────────
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  time: text("time"),
  category: text("category").notNull().default("personal"),
  color: text("color").notNull().default("#6366f1"),
  description: text("description"),
});

// ── Transactions ──────────────────────────────────────────────────────────
export const transactions = sqliteTable("transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  description: text("description").notNull(),
  amount: real("amount").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull(),
  date: text("date").notNull(),
});

// ── Health logs ───────────────────────────────────────────────────────────
export const healthLogs = sqliteTable("health_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  date: text("date").notNull(),
  steps: integer("steps"),
  activeCalories: integer("active_calories"),
  workoutMinutes: integer("workout_minutes"),
  workoutType: text("workout_type"),
  distanceKm: real("distance_km"),
  sleepHours: real("sleep_hours"),
  sleepDeep: real("sleep_deep"),
  sleepRem: real("sleep_rem"),
  sleepLight: real("sleep_light"),
  sleepScore: integer("sleep_score"),
  heartRateResting: integer("heart_rate_resting"),
  heartRateMax: integer("heart_rate_max"),
  hrv: integer("hrv"),
  bloodOxygen: real("blood_oxygen"),
  weight: real("weight"),
  bodyFat: real("body_fat"),
  hydrationLiters: real("hydration_liters"),
  calories: integer("calories"),
  protein: real("protein"),
  carbs: real("carbs"),
  fat: real("fat"),
  moodScore: integer("mood_score"),
  stressLevel: integer("stress_level"),
  mindfulMinutes: integer("mindful_minutes"),
  recoveryScore: integer("recovery_score"),
  strainScore: real("strain_score"),
  readinessScore: integer("readiness_score"),
  source: text("source").default("manual"),
  notes: text("notes"),
});

// ── Health goals ──────────────────────────────────────────────────────────
export const healthGoals = sqliteTable("health_goals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull(),
  metric: text("metric").notNull(),
  target: real("target").notNull(),
  unit: text("unit").notNull(),
});

// ── Insert schemas ────────────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({ id: true });
export const insertContactSchema = createInsertSchema(contacts).omit({ id: true });
export const insertEventSchema = createInsertSchema(events).omit({ id: true });
export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export const insertHealthLogSchema = createInsertSchema(healthLogs).omit({ id: true });
export const insertHealthGoalSchema = createInsertSchema(healthGoals).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type HealthLog = typeof healthLogs.$inferSelect;
export type InsertHealthLog = z.infer<typeof insertHealthLogSchema>;
export type HealthGoal = typeof healthGoals.$inferSelect;
export type InsertHealthGoal = z.infer<typeof insertHealthGoalSchema>;
