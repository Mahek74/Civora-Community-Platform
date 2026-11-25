import { integer, varchar, pgTable, serial, text, timestamp, jsonb, boolean, index } from "drizzle-orm/pg-core";

// Users table
export const Users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: varchar("role", { length: 20 }).notNull().default("citizen"), // 'citizen' | 'worker' | 'volunteer' | 'admin'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  // Retained for compatibility with existing database rows.
  emailVerified: boolean("email_verified").notNull().default(true),
  verificationTokenHash: varchar("verification_token_hash", { length: 255 }),
  verificationTokenExpiresAt: timestamp("verification_token_expires_at"),
  verificationTokenSentAt: timestamp("verification_token_sent_at"),
});

// Reports table
export const Reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  location: text("location").notNull(),
  wasteType: varchar("waste_type", { length: 255 }).notNull(),
  amount: varchar("amount", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  verificationResult: jsonb("verification_result"),
  status: varchar("status", { length: 255 }).notNull().default("pending"),
  complaintId: varchar("complaint_id", { length: 50 }).unique(),
  complaintStatus: varchar("complaint_status", { length: 50 }).default("filed"),
  escalatedAt: timestamp("escalated_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  collectorId: integer("collector_id").references(() => Users.id),
  // Extended fields for 17-module expansion
  latitude: text("latitude"),
  longitude: text("longitude"),
  ward: varchar("ward", { length: 100 }),
  severity: varchar("severity", { length: 50 }),
  verified: boolean("verified").notNull().default(false),
  assignedWorker: varchar("assigned_worker", { length: 255 }),
  resolvedAt: timestamp("resolved_at"),
  supportCount: integer("support_count").notNull().default(1),
  beforeImageUrl: text("before_image_url"),
  afterImageUrl: text("after_image_url"),
  qrCode: text("qr_code"),
}, (table) => ({
  statusIdx: index("reports_status_idx").on(table.status),
  userIdIdx: index("reports_user_id_idx").on(table.userId),
  createdAtIdx: index("reports_created_at_idx").on(table.createdAt),
  severityIdx: index("reports_severity_idx").on(table.severity),
}));

// Rewards table
export const Rewards = pgTable("rewards", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id),
  points: integer("points").notNull().default(0),
  level: integer("level").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  isAvailable: boolean("is_available").notNull().default(true),
  description: text("description"),
  name: varchar("name", { length: 255 }).notNull(),
  collectionInfo: text("collection_info").notNull(),
});

// CollectedWastes table
export const CollectedWastes = pgTable("collected_wastes", {
  id: serial("id").primaryKey(),
  reportId: integer("report_id").references(() => Reports.id).notNull(),
  collectorId: integer("collector_id").references(() => Users.id).notNull(),
  collectionDate: timestamp("collection_date").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("collected"),
});

// Notifications table
export const Notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  message: text("message").notNull(),
  type: varchar("type", { length: 50 }).notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// New Transactions table
export const Transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  type: varchar("type", { length: 20 }).notNull(), // 'earned' or 'redeemed'
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  referenceKey: varchar("reference_key", { length: 255 }).unique(),
  date: timestamp("date").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("transactions_user_id_idx").on(table.userId),
  referenceKeyIdx: index("transactions_reference_key_idx").on(table.referenceKey),
}));

// Emergency Civic Reports table
export const EmergencyReports = pgTable("emergency_reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => Users.id).notNull(),
  hazardType: varchar("hazard_type", { length: 100 }).notNull(), // 'manhole' | 'electric' | 'water' | 'fire' | 'accident' | 'stray'
  severity: varchar("severity", { length: 50 }).notNull().default("high"), // 'low' | 'medium' | 'high' | 'critical'
  latitude: text("latitude"),
  longitude: text("longitude"),
  location: text("location").notNull(),
  photoUrl: text("photo_url"),
  description: text("description"),
  status: varchar("status", { length: 50 }).notNull().default("reported"), // 'reported' | 'high_priority' | 'assigned' | 'in_progress' | 'resolved'
  assignedTo: varchar("assigned_to", { length: 255 }),
  reportedAt: timestamp("reported_at").defaultNow().notNull(),
  resolvedAt: timestamp("resolved_at"),
});