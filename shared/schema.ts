import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type EventCategory = "문화행사" | "축제" | "전시" | "공연" | "기타소식";

export const events = pgTable("events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  location: text("location").notNull(),
  isFeatured: boolean("is_featured").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "제목을 입력해주세요"),
  description: z.string().min(1, "설명을 입력해주세요"),
  category: z.enum(["문화행사", "축제", "전시", "공연", "기타소식"]),
  imageUrl: z.string().optional().or(z.literal("")).transform(v => v || ""),
  startDate: z.string().min(1, "시작일을 입력해주세요"),
  endDate: z.string().min(1, "종료일을 입력해주세요"),
  location: z.string().min(1, "장소를 입력해주세요"),
  isFeatured: z.boolean().default(false),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;
export type CulturalEvent = typeof events.$inferSelect;

export const news = pgTable("news", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url").notNull().default(""),
  publishedAt: text("published_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNewsSchema = createInsertSchema(news).omit({
  id: true,
  createdAt: true,
}).extend({
  title: z.string().min(1, "제목을 입력해주세요"),
  summary: z.string().min(1, "내용을 입력해주세요"),
  category: z.enum(["문화행사", "축제", "전시", "공연", "기타소식"]),
  imageUrl: z.string().optional().or(z.literal("")).transform(v => v || ""),
  publishedAt: z.string().min(1),
});

export type InsertNews = z.infer<typeof insertNewsSchema>;
export type NewsItem = typeof news.$inferSelect;

export const guestPosts = pgTable("guest_posts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  type: text("type").notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category"),
  authorName: text("author_name").notNull(),
  authorContact: text("author_contact"),
  imageUrl: text("image_url"),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  approvedAt: timestamp("approved_at"),
});

export const insertGuestPostSchema = createInsertSchema(guestPosts).omit({
  id: true,
  status: true,
  createdAt: true,
  approvedAt: true,
}).extend({
  type: z.enum(["event", "news", "general", "inquiry"]),
  title: z.string().min(1, "제목을 입력해주세요").max(200),
  content: z.string().min(1, "내용을 입력해주세요").max(5000),
  category: z.string().max(50).optional(),
  authorName: z.string().min(1, "이름을 입력해주세요").max(50),
  authorContact: z.string().max(100).optional(),
  imageUrl: z.string().optional().or(z.literal("")).transform(v => v || undefined),
});

export type InsertGuestPost = z.infer<typeof insertGuestPostSchema>;
export type GuestPost = typeof guestPosts.$inferSelect;

export type PostStatus = "pending" | "approved" | "rejected";
export type PostType = "event" | "news" | "general" | "inquiry";

export const postStatusSchema = z.enum(["pending", "approved", "rejected"]);

export const siteSettings = pgTable("site_settings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export interface QuickLink {
  id: string;
  title: string;
  icon: string;
  url: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number;
  imageUrl: string;
  category: string;
  inStock: boolean;
  seller: string;
}

export const insertProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  originalPrice: z.number().positive().optional(),
  imageUrl: z.string().url(),
  category: z.string().min(1),
  inStock: z.boolean().default(true),
  seller: z.string().min(1),
});

export type InsertProduct = z.infer<typeof insertProductSchema>;
