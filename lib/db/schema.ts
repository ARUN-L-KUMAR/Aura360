/**
 * Aura360 Database Schema - NeonDB + Drizzle ORM
 * 
 * Architecture:
 * - Multi-tenant: All tables include workspace_id
 * - Immutable wallet ledger pattern
 * - Comprehensive audit logging
 * - NextAuth integration
 */

import { relations, sql } from "drizzle-orm"
import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  decimal,
  integer,
  jsonb,
  index,
  uniqueIndex,
  date,
  varchar,
  pgEnum,
} from "drizzle-orm/pg-core"

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum("user_role", ["owner", "admin", "member", "viewer"])
export const transactionTypeEnum = pgEnum("transaction_type", ["income", "expense", "investment", "transfer"])
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "card", "upi", "bank_transfer", "other"])
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "cancelled", "expired", "pending"])
export const bookingStatusEnum = pgEnum("booking_status", ["pending", "confirmed", "completed", "cancelled"])
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"])
export const routineTimeEnum = pgEnum("routine_time", ["morning", "evening", "both"])
export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete", "login", "logout"])

// ============================================
// AUTHENTICATION & USERS
// ============================================

export const users = pgTable(
  "users",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    email: text("email").notNull().unique(),
    emailVerified: timestamp("email_verified", { mode: "date" }),
    name: text("name"),
    password: text("password"), // bcrypt hashed
    image: text("image"),
    phoneNumber: text("phone_number"),
    bio: text("bio"),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: uniqueIndex("users_email_idx").on(table.email),
  })
)

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    providerIdx: uniqueIndex("accounts_provider_idx").on(table.provider, table.providerAccountId),
    userIdIdx: index("accounts_user_id_idx").on(table.userId),
  })
)

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    sessionToken: text("session_token").notNull().unique(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    sessionTokenIdx: uniqueIndex("sessions_session_token_idx").on(table.sessionToken),
    userIdIdx: index("sessions_user_id_idx").on(table.userId),
  })
)

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull().unique(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => ({
    identifierTokenIdx: uniqueIndex("verification_tokens_identifier_token_idx").on(table.identifier, table.token),
  })
)

// ============================================
// WORKSPACES (MULTI-TENANCY)
// ============================================

export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    logo: text("logo"),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    settings: jsonb("settings").$type<{
      currency?: string
      timezone?: string
      dateFormat?: string
    }>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    slugIdx: uniqueIndex("workspaces_slug_idx").on(table.slug),
    ownerIdIdx: index("workspaces_owner_id_idx").on(table.ownerId),
  })
)

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: userRoleEnum("role").notNull().default("member"),
    invitedAt: timestamp("invited_at", { mode: "date" }).defaultNow().notNull(),
    joinedAt: timestamp("joined_at", { mode: "date" }),
  },
  (table) => ({
    workspaceUserIdx: uniqueIndex("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId),
    workspaceIdIdx: index("workspace_members_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("workspace_members_user_id_idx").on(table.userId),
  })
)

// ============================================
// WALLET & LEDGER (IMMUTABLE PATTERN)
// ============================================

export const walletLedger = pgTable(
  "wallet_ledger",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id"), // Optional: link to transactions table
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    balanceAfter: decimal("balance_after", { precision: 12, scale: 2 }).notNull(),
    type: transactionTypeEnum("type").notNull(),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    category: text("category"),
    description: text("description").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("wallet_ledger_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("wallet_ledger_user_id_idx").on(table.userId),
    createdAtIdx: index("wallet_ledger_created_at_idx").on(table.createdAt),
    transactionIdIdx: index("wallet_ledger_transaction_id_idx").on(table.transactionId),
  })
)

export const walletBalances = pgTable(
  "wallet_balances",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    paymentMethod: paymentMethodEnum("payment_method").notNull(),
    // Derived from ledger - DO NOT UPDATE DIRECTLY
    currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).notNull().default("0"),
    lastRecalculatedAt: timestamp("last_recalculated_at", { mode: "date" }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceUserPaymentIdx: uniqueIndex("wallet_balances_workspace_user_payment_idx").on(
      table.workspaceId,
      table.userId,
      table.paymentMethod
    ),
    workspaceIdIdx: index("wallet_balances_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("wallet_balances_user_id_idx").on(table.userId),
  })
)

// ============================================
// TRANSACTIONS (FINANCE MODULE)
// ============================================

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    type: transactionTypeEnum("type").notNull(),
    category: text("category").notNull(),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    description: text("description").notNull(),
    paymentMethod: paymentMethodEnum("payment_method"),
    notes: text("notes"),
    needsReview: boolean("needs_review").default(false),
    tags: text("tags").array(),
    attachments: text("attachments").array(),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("transactions_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("transactions_user_id_idx").on(table.userId),
    dateIdx: index("transactions_date_idx").on(table.date),
    typeIdx: index("transactions_type_idx").on(table.type),
    categoryIdx: index("transactions_category_idx").on(table.category),
    workspaceUserDateIdx: index("transactions_workspace_user_date_idx").on(table.workspaceId, table.userId, table.date),
  })
)

// ============================================
// SUBSCRIPTIONS
// ============================================

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("USD"),
    billingCycle: text("billing_cycle").notNull(), // monthly, yearly, etc.
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    nextBillingDate: date("next_billing_date"),
    status: subscriptionStatusEnum("status").notNull().default("active"),
    paymentMethod: paymentMethodEnum("payment_method"),
    category: text("category"),
    reminderDays: integer("reminder_days").default(7),
    autoRenew: boolean("auto_renew").default(true),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("subscriptions_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("subscriptions_user_id_idx").on(table.userId),
    statusIdx: index("subscriptions_status_idx").on(table.status),
    nextBillingDateIdx: index("subscriptions_next_billing_date_idx").on(table.nextBillingDate),
  })
)

// ============================================
// BOOKINGS
// ============================================

export const bookings = pgTable(
  "bookings",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    startTime: timestamp("start_time", { mode: "date" }).notNull(),
    endTime: timestamp("end_time", { mode: "date" }).notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    attendees: text("attendees").array(),
    cost: decimal("cost", { precision: 10, scale: 2 }),
    paymentMethod: paymentMethodEnum("payment_method"),
    reminderMinutes: integer("reminder_minutes").default(30),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("bookings_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("bookings_user_id_idx").on(table.userId),
    startTimeIdx: index("bookings_start_time_idx").on(table.startTime),
    statusIdx: index("bookings_status_idx").on(table.status),
  })
)

// ============================================
// FASHION MODULE
// ============================================

export const fashionItems = pgTable(
  "fashion_items",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    category: text("category").notNull(), // shirt, pants, shoes, etc.
    subcategory: text("subcategory"),
    brand: text("brand"),
    color: text("color"),
    size: text("size"),
    price: decimal("price", { precision: 10, scale: 2 }),
    purchaseDate: date("purchase_date"),
    imageUrl: text("image_url"),
    images: text("images").array(),
    status: text("status").notNull().default("wardrobe"), // wardrobe, wishlist, sold, donated
    wearCount: integer("wear_count").default(0),
    lastWornDate: date("last_worn_date"),
    tags: text("tags").array(),
    isFavorite: boolean("is_favorite").default(false),
    notes: text("notes"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("fashion_items_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("fashion_items_user_id_idx").on(table.userId),
    categoryIdx: index("fashion_items_category_idx").on(table.category),
    statusIdx: index("fashion_items_status_idx").on(table.status),
  })
)

// ============================================
// FITNESS MODULE
// ============================================

export const fitness = pgTable(
  "fitness",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    type: text("type").notNull(), // workout, measurement, goal
    workoutType: text("workout_type"), // cardio, strength, yoga, etc.
    duration: integer("duration"), // minutes
    caloriesBurned: integer("calories_burned"),
    distance: decimal("distance", { precision: 10, scale: 2 }), // km
    intensity: text("intensity"), // low, medium, high
    measurementType: text("measurement_type"), // weight, body_fat, etc.
    measurementValue: decimal("measurement_value", { precision: 10, scale: 2 }),
    measurementUnit: text("measurement_unit"),
    exercises: jsonb("exercises").$type<Array<{
      name: string
      sets?: number
      reps?: number
      weight?: number
    }>>(),
    notes: text("notes"),
    mood: text("mood"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("fitness_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("fitness_user_id_idx").on(table.userId),
    dateIdx: index("fitness_date_idx").on(table.date),
    typeIdx: index("fitness_type_idx").on(table.type),
  })
)

// ============================================
// FOOD MODULE
// ============================================

export const food = pgTable(
  "food",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    mealType: mealTypeEnum("meal_type").notNull(),
    foodName: text("food_name").notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }),
    unit: text("unit"),
    calories: integer("calories"),
    protein: decimal("protein", { precision: 10, scale: 2 }),
    carbs: decimal("carbs", { precision: 10, scale: 2 }),
    fats: decimal("fats", { precision: 10, scale: 2 }),
    fiber: decimal("fiber", { precision: 10, scale: 2 }),
    sugar: decimal("sugar", { precision: 10, scale: 2 }),
    imageUrl: text("image_url"),
    notes: text("notes"),
    tags: text("tags").array(),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("food_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("food_user_id_idx").on(table.userId),
    dateIdx: index("food_date_idx").on(table.date),
    mealTypeIdx: index("food_meal_type_idx").on(table.mealType),
  })
)

// ============================================
// NOTES MODULE
// ============================================

export const notes = pgTable(
  "notes",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: text("content"),
    category: text("category"),
    tags: text("tags").array(),
    isPinned: boolean("is_pinned").default(false),
    isArchived: boolean("is_archived").default(false),
    color: text("color"),
    attachments: text("attachments").array(),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("notes_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("notes_user_id_idx").on(table.userId),
    isPinnedIdx: index("notes_is_pinned_idx").on(table.isPinned),
    categoryIdx: index("notes_category_idx").on(table.category),
  })
)

// ============================================
// TIME LOGS MODULE
// ============================================

export const timeLogs = pgTable(
  "time_logs",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    activity: text("activity").notNull(),
    category: text("category"),
    duration: integer("duration").notNull(), // minutes
    startTime: timestamp("start_time", { mode: "date" }),
    endTime: timestamp("end_time", { mode: "date" }),
    description: text("description"),
    tags: text("tags").array(),
    productivityScore: integer("productivity_score"), // 1-10
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("time_logs_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("time_logs_user_id_idx").on(table.userId),
    dateIdx: index("time_logs_date_idx").on(table.date),
    categoryIdx: index("time_logs_category_idx").on(table.category),
  })
)

// ============================================
// SAVED ITEMS MODULE
// ============================================

export const savedItems = pgTable(
  "saved_items",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // article, video, product, recipe, other
    title: text("title").notNull(),
    url: text("url"),
    description: text("description"),
    imageUrl: text("image_url"),
    tags: text("tags").array(),
    isFavorite: boolean("is_favorite").default(false),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("saved_items_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("saved_items_user_id_idx").on(table.userId),
    typeIdx: index("saved_items_type_idx").on(table.type),
    isFavoriteIdx: index("saved_items_is_favorite_idx").on(table.isFavorite),
  })
)

// ============================================
// SKINCARE MODULE
// ============================================

export const skincare = pgTable(
  "skincare",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    productName: text("product_name").notNull(),
    brand: text("brand"),
    category: text("category").notNull(), // cleanser, moisturizer, serum, etc.
    routineTime: routineTimeEnum("routine_time"),
    frequency: text("frequency"), // daily, weekly, etc.
    purchaseDate: date("purchase_date"),
    expiryDate: date("expiry_date"),
    price: decimal("price", { precision: 10, scale: 2 }),
    rating: integer("rating"), // 1-5
    notes: text("notes"),
    imageUrl: text("image_url"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("skincare_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("skincare_user_id_idx").on(table.userId),
    categoryIdx: index("skincare_category_idx").on(table.category),
    routineTimeIdx: index("skincare_routine_time_idx").on(table.routineTime),
  })
)

// ============================================
// NOTIFICATIONS
// ============================================

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    message: text("message").notNull(),
    type: text("type").notNull(), // info, warning, error, success
    actionUrl: text("action_url"),
    isRead: boolean("is_read").default(false),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    createdAt: timestamp("created_at", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("notifications_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("notifications_user_id_idx").on(table.userId),
    isReadIdx: index("notifications_is_read_idx").on(table.isRead),
    createdAtIdx: index("notifications_created_at_idx").on(table.createdAt),
  })
)

// ============================================
// ANALYTICS
// ============================================

export const analytics = pgTable(
  "analytics",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    eventType: text("event_type").notNull(), // page_view, action, feature_usage
    eventName: text("event_name").notNull(),
    properties: jsonb("properties").$type<Record<string, any>>(),
    timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("analytics_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("analytics_user_id_idx").on(table.userId),
    eventTypeIdx: index("analytics_event_type_idx").on(table.eventType),
    timestampIdx: index("analytics_timestamp_idx").on(table.timestamp),
  })
)

// ============================================
// AUDIT LOGS (COMPREHENSIVE TRACKING)
// ============================================

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").default(sql`gen_random_uuid()`).primaryKey(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: auditActionEnum("action").notNull(),
    entityType: text("entity_type").notNull(), // transaction, fashion_item, etc.
    entityId: uuid("entity_id").notNull(),
    beforeState: jsonb("before_state").$type<Record<string, any>>(),
    afterState: jsonb("after_state").$type<Record<string, any>>(),
    changes: jsonb("changes").$type<Record<string, { old: any; new: any }>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, any>>(),
    timestamp: timestamp("timestamp", { mode: "date" }).defaultNow().notNull(),
  },
  (table) => ({
    workspaceIdIdx: index("audit_logs_workspace_id_idx").on(table.workspaceId),
    userIdIdx: index("audit_logs_user_id_idx").on(table.userId),
    entityTypeIdx: index("audit_logs_entity_type_idx").on(table.entityType),
    entityIdIdx: index("audit_logs_entity_id_idx").on(table.entityId),
    timestampIdx: index("audit_logs_timestamp_idx").on(table.timestamp),
  })
)

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  workspaces: many(workspaces),
  workspaceMembers: many(workspaceMembers),
  transactions: many(transactions),
  walletLedger: many(walletLedger),
  walletBalances: many(walletBalances),
  fashionItems: many(fashionItems),
  fitness: many(fitness),
  food: many(food),
  notes: many(notes),
  timeLogs: many(timeLogs),
  savedItems: many(savedItems),
  skincare: many(skincare),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}))

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, {
    fields: [workspaces.ownerId],
    references: [users.id],
  }),
  members: many(workspaceMembers),
  transactions: many(transactions),
  walletLedger: many(walletLedger),
  walletBalances: many(walletBalances),
  fashionItems: many(fashionItems),
  fitness: many(fitness),
  food: many(food),
  notes: many(notes),
  timeLogs: many(timeLogs),
  savedItems: many(savedItems),
  skincare: many(skincare),
  notifications: many(notifications),
  auditLogs: many(auditLogs),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [workspaceMembers.userId],
    references: [users.id],
  }),
}))

export const transactionsRelations = relations(transactions, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [transactions.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [transactions.userId],
    references: [users.id],
  }),
}))

export const walletLedgerRelations = relations(walletLedger, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [walletLedger.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [walletLedger.userId],
    references: [users.id],
  }),
}))

export const walletBalancesRelations = relations(walletBalances, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [walletBalances.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, {
    fields: [walletBalances.userId],
    references: [users.id],
  }),
}))

