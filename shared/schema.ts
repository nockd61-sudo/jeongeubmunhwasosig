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

export type EventCategory = "문화행사" | "축제" | "전시" | "공연" | "기타소식";

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
  category: z.enum(["문화행사", "축제", "전시", "공연", "기타소식"]),
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
  category: z.enum(["문화행사", "축제", "전시", "공연", "기타소식"]),
  imageUrl: z.string().url(),
  publishedAt: z.string(),
});

export type InsertNews = z.infer<typeof insertNewsSchema>;

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

export type PostStatus = "pending" | "approved" | "rejected";
export type PostType = "event" | "news" | "product" | "general";

export interface GuestPost {
  id: string;
  type: PostType;
  title: string;
  content: string;
  category?: string;
  authorName: string;
  authorContact?: string;
  imageUrl?: string;
  status: PostStatus;
  createdAt: string;
  approvedAt?: string;
}

export const insertGuestPostSchema = z.object({
  type: z.enum(["event", "news", "product", "general"]),
  title: z.string().min(1, "제목을 입력해주세요").max(200),
  content: z.string().min(1, "내용을 입력해주세요").max(5000),
  category: z.string().max(50).optional(),
  authorName: z.string().min(1, "이름을 입력해주세요").max(50),
  authorContact: z.string().max(100).optional(),
  imageUrl: z.string().url().optional().or(z.literal("")).transform(v => v || undefined),
});

export type InsertGuestPost = z.infer<typeof insertGuestPostSchema>;

export const postStatusSchema = z.enum(["pending", "approved", "rejected"]);
