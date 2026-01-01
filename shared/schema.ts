import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer } from "drizzle-orm/pg-core";
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

export type EventCategory = "문화행사" | "축제" | "전시" | "공연" | "시정소식";

export interface CulturalEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  imageUrl: string;
  startDate: string;
  endDate: string;
  location: string;
  isFeatured: boolean;
}

export interface NewsItem {
  id: string;
  title: string;
  summary: string;
  category: EventCategory;
  imageUrl: string;
  publishedAt: string;
}

export interface QuickLink {
  id: string;
  title: string;
  icon: string;
  url: string;
}

export const insertEventSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  category: z.enum(["문화행사", "축제", "전시", "공연", "시정소식"]),
  imageUrl: z.string().url(),
  startDate: z.string(),
  endDate: z.string(),
  location: z.string(),
  isFeatured: z.boolean().default(false),
});

export type InsertEvent = z.infer<typeof insertEventSchema>;

export const insertNewsSchema = z.object({
  title: z.string().min(1),
  summary: z.string().min(1),
  category: z.enum(["문화행사", "축제", "전시", "공연", "시정소식"]),
  imageUrl: z.string().url(),
  publishedAt: z.string(),
});

export type InsertNews = z.infer<typeof insertNewsSchema>;
