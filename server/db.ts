import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "@shared/schema";
import path from "path";

const dbPath = process.env.NODE_ENV === "production"
  ? path.join(process.cwd(), "data.db")
  : path.join(process.cwd(), "data.db");

const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

// Create tables if they don't exist
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    avatar TEXT NOT NULL,
    last_message TEXT,
    last_message_time TEXT,
    unread INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    sender TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT,
    category TEXT NOT NULL DEFAULT 'personal',
    color TEXT NOT NULL DEFAULT '#6366f1',
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    description TEXT NOT NULL,
    amount REAL NOT NULL,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS health_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    steps INTEGER,
    active_calories INTEGER,
    workout_minutes INTEGER,
    workout_type TEXT,
    distance_km REAL,
    sleep_hours REAL,
    sleep_deep REAL,
    sleep_rem REAL,
    sleep_light REAL,
    sleep_score INTEGER,
    heart_rate_resting INTEGER,
    heart_rate_max INTEGER,
    hrv INTEGER,
    blood_oxygen REAL,
    weight REAL,
    body_fat REAL,
    hydration_liters REAL,
    calories INTEGER,
    protein REAL,
    carbs REAL,
    fat REAL,
    mood_score INTEGER,
    stress_level INTEGER,
    mindful_minutes INTEGER,
    recovery_score INTEGER,
    strain_score REAL,
    readiness_score INTEGER,
    source TEXT DEFAULT 'manual',
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS health_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric TEXT NOT NULL UNIQUE,
    target REAL NOT NULL,
    unit TEXT NOT NULL
  );
`);
