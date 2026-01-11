import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import { 
  users, events, news, guestPosts, siteSettings,
  type User, type InsertUser, 
  type CulturalEvent, type InsertEvent,
  type NewsItem, type InsertNews,
  type GuestPost, type InsertGuestPost,
  type PostStatus
} from "@shared/schema";
import type { Product, InsertProduct } from "@shared/schema";
import { 
  defaultSources,
  type ExternalSource 
} from "./data-sync";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getEvents(): Promise<CulturalEvent[]>;
  getEventById(id: string): Promise<CulturalEvent | undefined>;
  getEventsByCategory(category: string): Promise<CulturalEvent[]>;
  createEvent(event: InsertEvent): Promise<CulturalEvent>;
  updateEvent(id: string, updates: Partial<InsertEvent>): Promise<CulturalEvent | undefined>;
  deleteEvent(id: string): Promise<boolean>;
  
  getNews(): Promise<NewsItem[]>;
  getNewsById(id: string): Promise<NewsItem | undefined>;
  createNews(news: InsertNews): Promise<NewsItem>;
  deleteNews(id: string): Promise<boolean>;

  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  getGuestPosts(status?: PostStatus): Promise<GuestPost[]>;
  getGuestPostById(id: string): Promise<GuestPost | undefined>;
  createGuestPost(post: InsertGuestPost): Promise<GuestPost>;
  updateGuestPostStatus(id: string, status: PostStatus): Promise<GuestPost | undefined>;
  getApprovedGuestPosts(): Promise<GuestPost[]>;

  getSources(): Promise<ExternalSource[]>;
  updateSource(id: string, updates: Partial<ExternalSource>): Promise<ExternalSource | undefined>;
  syncExternalData(): Promise<{ events: number; news: number }>;
  getLastSyncTime(): Promise<string | null>;

  getVisitorCount(): Promise<number>;
  incrementVisitorCount(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  private sources: Map<string, ExternalSource>;
  private products: Map<string, Product>;
  private lastSyncTime: string | null = null;

  constructor() {
    this.sources = new Map();
    this.products = new Map();
    this.initSources();
    this.initData();
  }

  private initSources() {
    defaultSources.forEach((source) => this.sources.set(source.id, source));
  }

  private async initData() {
    const existingEvents = await db.select().from(events);
    if (existingEvents.length === 0) {
      await this.seedEvents();
    }

    const existingNews = await db.select().from(news);
    if (existingNews.length === 0) {
      await this.seedNews();
    }

    const visitorSetting = await db.select().from(siteSettings).where(eq(siteSettings.key, "visitorCount"));
    if (visitorSetting.length === 0) {
      await db.insert(siteSettings).values({ key: "visitorCount", value: "1247" });
    }
  }

  private async seedEvents() {
    const sampleEvents: InsertEvent[] = [
      {
        title: "정읍사 문화제 2026",
        description: "백제시대부터 이어져 온 정읍사의 정취를 느낄 수 있는 전통문화축제입니다. 다양한 공연과 체험 프로그램이 준비되어 있습니다.",
        category: "축제",
        imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=450&fit=crop",
        startDate: "2026-04-15",
        endDate: "2026-04-20",
        location: "정읍사공원",
        isFeatured: true,
      },
      {
        title: "내장산 단풍축제",
        description: "대한민국 최고의 단풍 명소 내장산에서 펼쳐지는 가을 축제입니다.",
        category: "축제",
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=450&fit=crop",
        startDate: "2026-10-20",
        endDate: "2026-11-15",
        location: "내장산국립공원",
        isFeatured: false,
      },
      {
        title: "정읍 벚꽃 마라톤 대회",
        description: "아름다운 벚꽃길을 따라 달리는 마라톤 대회입니다.",
        category: "문화행사",
        imageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&h=450&fit=crop",
        startDate: "2026-04-05",
        endDate: "2026-04-05",
        location: "내장산IC 일대",
        isFeatured: false,
      },
      {
        title: "정읍시립미술관 기획전시",
        description: "지역 예술가들의 작품을 한자리에서 감상할 수 있는 특별 전시회입니다.",
        category: "전시",
        imageUrl: "https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=800&h=450&fit=crop",
        startDate: "2026-03-01",
        endDate: "2026-05-31",
        location: "정읍시립미술관",
        isFeatured: false,
      },
      {
        title: "클래식 음악의 밤",
        description: "정읍시립교향악단과 함께하는 클래식 음악 공연입니다.",
        category: "공연",
        imageUrl: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=800&h=450&fit=crop",
        startDate: "2026-02-14",
        endDate: "2026-02-14",
        location: "정읍시문화회관",
        isFeatured: false,
      },
      {
        title: "전통문화 체험교실",
        description: "어린이와 가족을 위한 전통문화 체험 프로그램입니다. 한복 입기, 다도 체험 등 다양한 활동이 준비되어 있습니다.",
        category: "문화행사",
        imageUrl: "https://images.unsplash.com/photo-1604580864964-0462f5d5b1a8?w=800&h=450&fit=crop",
        startDate: "2026-01-15",
        endDate: "2026-12-31",
        location: "정읍전통문화관",
        isFeatured: false,
      },
    ];

    for (const event of sampleEvents) {
      await db.insert(events).values(event);
    }
  }

  private async seedNews() {
    const sampleNews: InsertNews[] = [
      {
        title: "정읍시, 2026년 문화예술 지원 사업 공모 시작",
        summary: "지역 예술가와 문화단체를 위한 다양한 지원 프로그램이 올해도 진행됩니다.",
        category: "기타소식",
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
        publishedAt: "2026-01-15",
      },
      {
        title: "내장산 케이블카 운행 시간 연장 안내",
        summary: "봄철 관광객 증가에 따라 케이블카 운행 시간이 연장됩니다.",
        category: "기타소식",
        imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=120&h=120&fit=crop",
        publishedAt: "2026-01-12",
      },
      {
        title: "정읍시문화회관 리모델링 공사 완료",
        summary: "최신 시설로 새롭게 단장한 문화회관이 시민들에게 다시 문을 엽니다.",
        category: "기타소식",
        imageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=120&h=120&fit=crop",
        publishedAt: "2026-01-10",
      },
      {
        title: "설 연휴 문화시설 운영 안내",
        summary: "설 연휴 기간 동안의 주요 문화시설 운영 일정을 안내드립니다.",
        category: "기타소식",
        imageUrl: "https://images.unsplash.com/photo-1577563682708-4f022ec774fb?w=120&h=120&fit=crop",
        publishedAt: "2026-01-08",
      },
    ];

    for (const item of sampleNews) {
      await db.insert(news).values(item);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getEvents(): Promise<CulturalEvent[]> {
    return await db.select().from(events).orderBy(desc(events.startDate));
  }

  async getEventById(id: string): Promise<CulturalEvent | undefined> {
    const result = await db.select().from(events).where(eq(events.id, id));
    return result[0];
  }

  async getEventsByCategory(category: string): Promise<CulturalEvent[]> {
    return await db.select().from(events)
      .where(eq(events.category, category))
      .orderBy(desc(events.startDate));
  }

  async createEvent(event: InsertEvent): Promise<CulturalEvent> {
    const result = await db.insert(events).values(event).returning();
    return result[0];
  }

  async updateEvent(id: string, updates: Partial<InsertEvent>): Promise<CulturalEvent | undefined> {
    const result = await db.update(events).set(updates).where(eq(events.id, id)).returning();
    return result[0];
  }

  async deleteEvent(id: string): Promise<boolean> {
    const result = await db.delete(events).where(eq(events.id, id)).returning();
    return result.length > 0;
  }

  async getNews(): Promise<NewsItem[]> {
    return await db.select().from(news).orderBy(desc(news.publishedAt));
  }

  async getNewsById(id: string): Promise<NewsItem | undefined> {
    const result = await db.select().from(news).where(eq(news.id, id));
    return result[0];
  }

  async createNews(newsItem: InsertNews): Promise<NewsItem> {
    const result = await db.insert(news).values(newsItem).returning();
    return result[0];
  }

  async deleteNews(id: string): Promise<boolean> {
    const result = await db.delete(news).where(eq(news.id, id)).returning();
    return result.length > 0;
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const id = crypto.randomUUID();
    const newProduct: Product = { ...product, id };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async getGuestPosts(status?: PostStatus): Promise<GuestPost[]> {
    if (status) {
      return await db.select().from(guestPosts)
        .where(eq(guestPosts.status, status))
        .orderBy(desc(guestPosts.createdAt));
    }
    return await db.select().from(guestPosts).orderBy(desc(guestPosts.createdAt));
  }

  async getGuestPostById(id: string): Promise<GuestPost | undefined> {
    const result = await db.select().from(guestPosts).where(eq(guestPosts.id, id));
    return result[0];
  }

  async createGuestPost(post: InsertGuestPost): Promise<GuestPost> {
    const result = await db.insert(guestPosts).values({
      ...post,
      status: "pending",
    }).returning();
    return result[0];
  }

  async updateGuestPostStatus(id: string, status: PostStatus): Promise<GuestPost | undefined> {
    const updates: any = { status };
    if (status === "approved") {
      updates.approvedAt = new Date();
    }
    const result = await db.update(guestPosts)
      .set(updates)
      .where(eq(guestPosts.id, id))
      .returning();
    return result[0];
  }

  async getApprovedGuestPosts(): Promise<GuestPost[]> {
    return await db.select().from(guestPosts)
      .where(eq(guestPosts.status, "approved"))
      .orderBy(desc(guestPosts.createdAt));
  }

  async getSources(): Promise<ExternalSource[]> {
    return Array.from(this.sources.values());
  }

  async updateSource(id: string, updates: Partial<ExternalSource>): Promise<ExternalSource | undefined> {
    const source = this.sources.get(id);
    if (!source) return undefined;
    const updated = { ...source, ...updates };
    this.sources.set(id, updated);
    return updated;
  }

  async syncExternalData(): Promise<{ events: number; news: number }> {
    this.lastSyncTime = new Date().toISOString();
    return { events: 0, news: 0 };
  }

  async getLastSyncTime(): Promise<string | null> {
    return this.lastSyncTime;
  }

  async getVisitorCount(): Promise<number> {
    const result = await db.select().from(siteSettings).where(eq(siteSettings.key, "visitorCount"));
    if (result.length > 0) {
      return parseInt(result[0].value, 10);
    }
    return 1247;
  }

  async incrementVisitorCount(): Promise<number> {
    const current = await this.getVisitorCount();
    const newCount = current + 1;
    await db.update(siteSettings)
      .set({ value: newCount.toString(), updatedAt: new Date() })
      .where(eq(siteSettings.key, "visitorCount"));
    return newCount;
  }
}

export const storage = new DatabaseStorage();
