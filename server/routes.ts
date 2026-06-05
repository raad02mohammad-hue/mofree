import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "node:http";
import { storage } from "./storage";
import { insertMessageSchema, insertEventSchema, insertTransactionSchema, insertHealthLogSchema } from "@shared/schema";
import { z } from "zod";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Track sessions that have completed onboarding (in-memory, resets on server restart = always show on fresh deploy)
const onboardedSessions = new Set<string>();

// Extend Express Request to carry userId
declare module "express-serve-static-core" {
  interface Request {
    userId?: number;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Unauthorized" });
  const token = auth.slice(7);
  const session = storage.getSession(token);
  if (!session) return res.status(401).json({ error: "Session expired" });
  req.userId = session.userId;
  next();
}

export async function registerRoutes(httpServer: Server, app: Express) {
  // ── Auth routes ──────────────────────────────────────────────────────────

  app.post("/api/auth/register", async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: "email, password, and name are required" });
    }
    if (typeof email !== "string" || typeof password !== "string" || typeof name !== "string") {
      return res.status(400).json({ error: "Invalid input types" });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = storage.getUserByEmail(email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = name.trim().split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

    const user = storage.createUser({
      email: email.toLowerCase().trim(),
      passwordHash,
      name: name.trim(),
      avatarInitials: initials,
      provider: "email",
    });

    storage.seedForUser(user.id);

    const session = storage.createSession(user.id);

    return res.json({ token: session.id, user: { id: user.id, email: user.email, name: user.name, avatarInitials: user.avatarInitials } });
  });

  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = storage.getUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    if (!user.passwordHash) {
      return res.status(401).json({ error: "This account uses a different sign-in method" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const session = storage.createSession(user.id);

    return res.json({ token: session.id, user: { id: user.id, email: user.email, name: user.name, avatarInitials: user.avatarInitials } });
  });

  app.post("/api/auth/logout", (req, res) => {
    const auth = req.headers.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      const token = auth.slice(7);
      storage.deleteSession(token);
    }
    return res.json({ ok: true });
  });

  app.get("/api/auth/me", (req, res) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith("Bearer ")) return res.status(401).json({ error: "Not authenticated" });
    const token = auth.slice(7);

    const session = storage.getSession(token);
    if (!session) return res.status(401).json({ error: "Session expired" });

    const user = storage.getUserById(session.userId);
    if (!user) return res.status(401).json({ error: "User not found" });

    return res.json({ user: { id: user.id, email: user.email, name: user.name, avatarInitials: user.avatarInitials } });
  });

  // ── Onboarding (no auth required) ────────────────────────────────────────

  app.get("/api/onboarding/status", (req, res) => {
    const sid = req.query.sid as string | undefined;
    if (!sid) return res.json({ show: true, sessionId: crypto.randomUUID() });
    return res.json({ show: !onboardedSessions.has(sid), sessionId: sid });
  });

  app.post("/api/onboarding/complete", (req, res) => {
    const { sessionId } = req.body;
    if (sessionId) onboardedSessions.add(sessionId);
    res.json({ ok: true });
  });

  // ── Contacts ──────────────────────────────────────────────────────────────

  app.get("/api/contacts", requireAuth, (req, res) => {
    res.json(storage.getContacts(req.userId!));
  });

  // ── Messages ──────────────────────────────────────────────────────────────

  app.get("/api/messages/:contactId", requireAuth, (req, res) => {
    const msgs = storage.getMessagesByContact(Number(req.params.contactId), req.userId!);
    res.json(msgs);
  });

  app.post("/api/messages", requireAuth, (req, res) => {
    const parsed = insertMessageSchema.safeParse({ ...req.body, userId: req.userId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    const msg = storage.createMessage(parsed.data);
    storage.updateContact(parsed.data.contactId, {
      lastMessage: parsed.data.content,
      lastMessageTime: "Just now",
      unread: 0,
    });
    res.json(msg);
  });

  // ── Events ────────────────────────────────────────────────────────────────

  app.get("/api/events", requireAuth, (req, res) => {
    res.json(storage.getEvents(req.userId!));
  });

  app.post("/api/events", requireAuth, (req, res) => {
    const parsed = insertEventSchema.safeParse({ ...req.body, userId: req.userId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createEvent(parsed.data));
  });

  app.delete("/api/events/:id", requireAuth, (req, res) => {
    storage.deleteEvent(Number(req.params.id));
    res.json({ success: true });
  });

  // ── Transactions ──────────────────────────────────────────────────────────

  app.get("/api/transactions", requireAuth, (req, res) => {
    res.json(storage.getTransactions(req.userId!));
  });

  app.post("/api/transactions", requireAuth, (req, res) => {
    const parsed = insertTransactionSchema.safeParse({ ...req.body, userId: req.userId });
    if (!parsed.success) return res.status(400).json({ error: parsed.error });
    res.json(storage.createTransaction(parsed.data));
  });

  app.delete("/api/transactions/:id", requireAuth, (req, res) => {
    storage.deleteTransaction(Number(req.params.id));
    res.json({ success: true });
  });

  // ── Health Logs ───────────────────────────────────────────────────────────

  app.get("/api/health/logs", requireAuth, (req, res) => {
    const limit = req.query.limit ? Number(req.query.limit) : 30;
    res.json(storage.getHealthLogs(req.userId!, limit));
  });

  app.get("/api/health/logs/:date", requireAuth, (req, res) => {
    const log = storage.getHealthLogByDate(req.params.date, req.userId!);
    if (!log) return res.status(404).json({ error: "Not found" });
    res.json(log);
  });

  app.post("/api/health/logs", requireAuth, (req, res) => {
    const { date, ...rest } = req.body;
    if (!date) return res.status(400).json({ error: "date required" });
    res.json(storage.upsertHealthLog(date, req.userId!, rest));
  });

  // ── Health Goals ──────────────────────────────────────────────────────────

  app.get("/api/health/goals", requireAuth, (req, res) => {
    res.json(storage.getHealthGoals(req.userId!));
  });

  app.post("/api/health/goals", requireAuth, (req, res) => {
    const { metric, target, unit } = req.body;
    if (!metric || target === undefined || !unit) {
      return res.status(400).json({ error: "metric, target, unit required" });
    }
    res.json(storage.upsertHealthGoal(metric, Number(target), unit, req.userId!));
  });

  // ── AI Chat ───────────────────────────────────────────────────────────────

  app.post("/api/ai/chat", requireAuth, async (req, res) => {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: "message required" });
    if (message.length > 2000) return res.status(400).json({ error: "message too long" });

    const userId = req.userId!;
    const recentLogs = storage.getHealthLogs(userId, 7);
    const transactions = storage.getTransactions(userId);
    const events = storage.getEvents(userId);
    const today = new Date().toISOString().split("T")[0];
    const todayLog = storage.getHealthLogByDate(today, userId);

    const totalBalance = transactions.reduce((s, t) => s + t.amount, 0);
    const upcomingEvents = events.filter(e => e.date >= today).slice(0, 3);

    const context = `You are Orion, the AI assistant inside mofree, the user's personal life management app. 
    Keep responses concise, friendly, and actionable. Use specific numbers from the user's data.
    
    Today's health: ${todayLog ? `${todayLog.steps || 0} steps, ${todayLog.sleepHours || 0}h sleep, heart rate ${todayLog.heartRateResting || 0} bpm, recovery ${todayLog.recoveryScore || 0}%` : "No data yet today"}
    Recent 7-day avg steps: ${recentLogs.length > 0 ? Math.round(recentLogs.reduce((s, l) => s + (l.steps || 0), 0) / recentLogs.length) : 0}
    Balance: $${totalBalance.toFixed(2)}
    Upcoming: ${upcomingEvents.map(e => e.title + " on " + e.date).join(", ")}`;

    try {
      const response = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.PPLX_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            { role: "system", content: context },
            { role: "user", content: message },
          ],
          max_tokens: 300,
        }),
      });
      const data = await response.json() as any;
      res.json({ reply: data.choices?.[0]?.message?.content || "I'm here to help! What would you like to know?" });
    } catch {
      res.json({ reply: "I'm Orion, your AI assistant. I'm having trouble connecting right now, but I can see your data and help you analyze it!" });
    }
  });
}
