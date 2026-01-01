import { randomUUID } from "crypto";
import type { User, InsertUser, CulturalEvent, NewsItem, InsertEvent, InsertNews } from "@shared/schema";
import { 
  scrapeJeongeupNews, 
  scrapeJeongeupCulture, 
  scrapeRssFeed,
  fetchPublicDataEvents,
  defaultSources,
  type ExternalSource,
  type PublicDataApiConfig 
} from "./data-sync";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getEvents(): Promise<CulturalEvent[]>;
  getEventById(id: string): Promise<CulturalEvent | undefined>;
  getEventsByCategory(category: string): Promise<CulturalEvent[]>;
  createEvent(event: InsertEvent): Promise<CulturalEvent>;
  
  getNews(): Promise<NewsItem[]>;
  getNewsById(id: string): Promise<NewsItem | undefined>;
  createNews(news: InsertNews): Promise<NewsItem>;

  getSources(): Promise<ExternalSource[]>;
  updateSource(id: string, updates: Partial<ExternalSource>): Promise<ExternalSource | undefined>;
  syncExternalData(): Promise<{ events: number; news: number }>;
  getLastSyncTime(): Promise<string | null>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private events: Map<string, CulturalEvent>;
  private news: Map<string, NewsItem>;
  private sources: Map<string, ExternalSource>;
  private lastSyncTime: string | null = null;
  private publicDataApiKey: string | null = null;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.news = new Map();
    this.sources = new Map();
    this.seedData();
    this.initSources();
  }

  private initSources() {
    defaultSources.forEach((source) => this.sources.set(source.id, source));
  }

  private seedData() {
    const sampleEvents: CulturalEvent[] = [
      {
        id: randomUUID(),
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
        id: randomUUID(),
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
        id: randomUUID(),
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
        id: randomUUID(),
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
        id: randomUUID(),
        title: "전통문화 체험교실",
        description: "어린이와 가족을 위한 전통문화 체험 프로그램입니다. 한복 입기, 다도 체험 등 다양한 활동이 준비되어 있습니다.",
        category: "문화행사",
        imageUrl: "https://images.unsplash.com/photo-1604580864964-0462f5d5b1a8?w=800&h=450&fit=crop",
        startDate: "2026-01-15",
        endDate: "2026-12-31",
        location: "정읍전통문화관",
        isFeatured: false,
      },
      {
        id: randomUUID(),
        title: "정읍 벚꽃 마라톤 대회",
        description: "아름다운 벚꽃길을 따라 달리는 마라톤 대회입니다.",
        category: "문화행사",
        imageUrl: "https://images.unsplash.com/photo-1544717297-fa95b6ee9643?w=800&h=450&fit=crop",
        startDate: "2026-04-05",
        endDate: "2026-04-05",
        location: "내장산IC 일대",
        isFeatured: false,
      },
    ];

    const sampleNews: NewsItem[] = [
      {
        id: randomUUID(),
        title: "정읍시, 2026년 문화예술 지원 사업 공모 시작",
        summary: "지역 예술가와 문화단체를 위한 다양한 지원 프로그램이 올해도 진행됩니다.",
        category: "시정소식",
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop",
        publishedAt: "2026-01-15",
      },
      {
        id: randomUUID(),
        title: "내장산 케이블카 운행 시간 연장 안내",
        summary: "봄철 관광객 증가에 따라 케이블카 운행 시간이 연장됩니다.",
        category: "시정소식",
        imageUrl: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=120&h=120&fit=crop",
        publishedAt: "2026-01-12",
      },
      {
        id: randomUUID(),
        title: "정읍시문화회관 리모델링 공사 완료",
        summary: "최신 시설로 새롭게 단장한 문화회관이 시민들에게 다시 문을 엽니다.",
        category: "시정소식",
        imageUrl: "https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=120&h=120&fit=crop",
        publishedAt: "2026-01-10",
      },
      {
        id: randomUUID(),
        title: "설 연휴 문화시설 운영 안내",
        summary: "설 연휴 기간 동안의 주요 문화시설 운영 일정을 안내드립니다.",
        category: "시정소식",
        imageUrl: "https://images.unsplash.com/photo-1577563682708-4f022ec774fb?w=120&h=120&fit=crop",
        publishedAt: "2026-01-08",
      },
    ];

    sampleEvents.forEach((event) => this.events.set(event.id, event));
    sampleNews.forEach((news) => this.news.set(news.id, news));
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getEvents(): Promise<CulturalEvent[]> {
    return Array.from(this.events.values()).sort(
      (a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    );
  }

  async getEventById(id: string): Promise<CulturalEvent | undefined> {
    return this.events.get(id);
  }

  async getEventsByCategory(category: string): Promise<CulturalEvent[]> {
    return Array.from(this.events.values())
      .filter((event) => event.category === category)
      .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }

  async createEvent(insertEvent: InsertEvent): Promise<CulturalEvent> {
    const id = randomUUID();
    const event: CulturalEvent = { ...insertEvent, id };
    this.events.set(id, event);
    return event;
  }

  async getNews(): Promise<NewsItem[]> {
    return Array.from(this.news.values()).sort(
      (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    );
  }

  async getNewsById(id: string): Promise<NewsItem | undefined> {
    return this.news.get(id);
  }

  async createNews(insertNews: InsertNews): Promise<NewsItem> {
    const id = randomUUID();
    const news: NewsItem = { ...insertNews, id };
    this.news.set(id, news);
    return news;
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
    let newEventsCount = 0;
    let newNewsCount = 0;

    const enabledSources = Array.from(this.sources.values()).filter(s => s.enabled);

    for (const source of enabledSources) {
      try {
        if (source.type === "webpage") {
          if (source.id === "jeongeup-news") {
            const newsItems = await scrapeJeongeupNews();
            newsItems.forEach((item) => {
              if (!Array.from(this.news.values()).some(n => n.title === item.title)) {
                this.news.set(item.id, item);
                newNewsCount++;
              }
            });
          } else if (source.id === "jeongeup-culture") {
            const events = await scrapeJeongeupCulture();
            events.forEach((event) => {
              if (!Array.from(this.events.values()).some(e => e.title === event.title)) {
                this.events.set(event.id, event);
                newEventsCount++;
              }
            });
          }
        } else if (source.type === "rss" && source.url) {
          const newsItems = await scrapeRssFeed(source.url);
          newsItems.forEach((item) => {
            if (!Array.from(this.news.values()).some(n => n.title === item.title)) {
              this.news.set(item.id, item);
              newNewsCount++;
            }
          });
        } else if (source.type === "api" && source.apiKey) {
          const events = await fetchPublicDataEvents({ apiKey: source.apiKey });
          events.forEach((event) => {
            if (!Array.from(this.events.values()).some(e => e.title === event.title)) {
              this.events.set(event.id, event);
              newEventsCount++;
            }
          });
        }

        source.lastSync = new Date().toISOString();
        this.sources.set(source.id, source);
      } catch (error) {
        console.error(`Error syncing source ${source.name}:`, error);
      }
    }

    this.lastSyncTime = new Date().toISOString();

    return { events: newEventsCount, news: newNewsCount };
  }

  async getLastSyncTime(): Promise<string | null> {
    return this.lastSyncTime;
  }
}

export const storage = new MemStorage();
