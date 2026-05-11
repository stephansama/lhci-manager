import { pgTable, text, timestamp, boolean, uuid, jsonb, integer } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const user = pgTable("user", {
	id: text("id").primaryKey(),
	name: text("name").notNull(),
	email: text("email").notNull().unique(),
	emailVerified: boolean("email_verified").notNull(),
	image: text("image"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const session = pgTable("session", {
	id: text("id").primaryKey(),
	expiresAt: timestamp("expires_at").notNull(),
	token: text("token").notNull().unique(),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
	ipAddress: text("ip_address"),
	userAgent: text("user_agent"),
	userId: text("user_id").notNull().references(() => user.id),
});

export const account = pgTable("account", {
	id: text("id").primaryKey(),
	accountId: text("account_id").notNull(),
	providerId: text("provider_id").notNull(),
	userId: text("user_id").notNull().references(() => user.id),
	accessToken: text("access_token"),
	refreshToken: text("refresh_token"),
	idToken: text("id_token"),
	accessTokenExpiresAt: timestamp("access_token_expires_at"),
	refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
	scope: text("scope"),
	password: text("password"),
	createdAt: timestamp("created_at").notNull(),
	updatedAt: timestamp("updated_at").notNull(),
});

export const verification = pgTable("verification", {
	id: text("id").primaryKey(),
	identifier: text("identifier").notNull(),
	value: text("value").notNull(),
	expiresAt: timestamp("expires_at").notNull(),
	createdAt: timestamp("created_at"),
	updatedAt: timestamp("updated_at"),
});

export const website = pgTable("website", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").notNull().references(() => user.id),
    name: text("name").notNull(),
    url: text("url").notNull(),
    faviconUrl: text("favicon_url"),
    ogImageUrl: text("og_image_url"),
    formFactor: text("form_factor", { enum: ["mobile", "desktop"] }).default("mobile").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const websiteRelations = relations(website, ({ many }) => ({
    runs: many(run),
}));

export const run = pgTable("run", {
    id: uuid("id").defaultRandom().primaryKey(),
    websiteId: uuid("website_id").notNull().references(() => website.id),
    status: text("status", { enum: ["pending", "running", "completed", "failed"] }).default("pending").notNull(),
    performanceScore: integer("performance_score"),
    accessibilityScore: integer("accessibility_score"),
    bestPracticesScore: integer("best_practices_score"),
    seoScore: integer("seo_score"),
    pwaScore: integer("pwa_score"),
    fullReportJson: jsonb("full_report_json").$type<Record<string, unknown>>(),
    thumbnailDataUrl: text("thumbnail_data_url"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    completedAt: timestamp("completed_at"),
});

export const runRelations = relations(run, ({ one }) => ({
    website: one(website, {
        fields: [run.websiteId],
        references: [website.id],
    }),
}));
