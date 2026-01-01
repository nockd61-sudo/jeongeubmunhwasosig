import { randomUUID } from "crypto";
import type { User, InsertUser, CulturalEvent, NewsItem, InsertEvent, InsertNews, Product, InsertProduct } from "@shared/schema";
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

  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;

  getSources(): Promise<ExternalSource[]>;
  updateSource(id: string, updates: Partial<ExternalSource>): Promise<ExternalSource | undefined>;
  syncExternalData(): Promise<{ events: number; news: number }>;
  getLastSyncTime(): Promise<string | null>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private events: Map<string, CulturalEvent>;
  private news: Map<string, NewsItem>;
  private products: Map<string, Product>;
  private sources: Map<string, ExternalSource>;
  private lastSyncTime: string | null = null;
  private publicDataApiKey: string | null = null;

  constructor() {
    this.users = new Map();
    this.events = new Map();
    this.news = new Map();
    this.products = new Map();
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

    const sampleProducts: Product[] = [
      {
        id: randomUUID(),
        name: "정읍 쌍화차 선물세트",
        description: "전통 방식으로 우려낸 정읍의 명물 쌍화차입니다. 건강과 따뜻함을 선물하세요.",
        price: 25000,
        originalPrice: 30000,
        imageUrl: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=300&h=300&fit=crop",
        category: "식품",
        inStock: true,
        seller: "정읍전통차마을",
      },
      {
        id: randomUUID(),
        name: "내장산 천연 벌꿀",
        description: "내장산 자락에서 채취한 100% 천연 벌꿀. 건강한 단맛을 느껴보세요.",
        price: 35000,
        imageUrl: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=300&h=300&fit=crop",
        category: "식품",
        inStock: true,
        seller: "내장산양봉농장",
      },
      {
        id: randomUUID(),
        name: "정읍사 한지 공예품",
        description: "전통 한지로 만든 수공예 작품입니다. 정읍의 문화유산을 집에서 느껴보세요.",
        price: 45000,
        originalPrice: 55000,
        imageUrl: "https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&h=300&fit=crop",
        category: "공예품",
        inStock: true,
        seller: "정읍한지공방",
      },
      {
        id: randomUUID(),
        name: "정읍 특산 복분자 와인",
        description: "정읍 지역 특산물인 복분자로 만든 프리미엄 와인입니다.",
        price: 28000,
        imageUrl: "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=300&h=300&fit=crop",
        category: "음료",
        inStock: true,
        seller: "정읍복분자농원",
      },
      {
        id: randomUUID(),
        name: "내장산 단풍 엽서 세트",
        description: "내장산의 아름다운 단풍을 담은 수채화 엽서 10장 세트입니다.",
        price: 12000,
        imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop",
        category: "기념품",
        inStock: true,
        seller: "정읍문화상점",
      },
      {
        id: randomUUID(),
        name: "정읍 전통 고추장",
        description: "3년 이상 숙성시킨 전통 방식의 고추장입니다. 깊은 맛이 일품입니다.",
        price: 18000,
        originalPrice: 22000,
        imageUrl: "https://images.unsplash.com/photo-1635321593217-40050ad13c74?w=300&h=300&fit=crop",
        category: "식품",
        inStock: true,
        seller: "정읍장류마을",
      },
    ];

    sampleEvents.forEach((event) => this.events.set(event.id, event));
    sampleNews.forEach((news) => this.news.set(news.id, news));
    sampleProducts.forEach((product) => this.products.set(product.id, product));
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

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductById(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = { ...insertProduct, id };
    this.products.set(id, product);
    return product;
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
