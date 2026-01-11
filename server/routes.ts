import type { Express } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { insertGuestPostSchema, insertEventSchema, insertNewsSchema } from "@shared/schema";
import { fetchAndSummarizeNews, testAiConnection, defaultRssSources } from "./ai-news-service";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

const updateStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  registerObjectStorageRoutes(app);

  app.get("/api/visitors", async (req, res) => {
    try {
      const total = await storage.getVisitorCount();
      const today = await storage.getTodayVisitorCount();
      res.json({ total, today });
    } catch (error) {
      res.status(500).json({ error: "Failed to get visitor count" });
    }
  });

  app.post("/api/visitors/increment", async (req, res) => {
    try {
      const result = await storage.incrementVisitorCount();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: "Failed to increment visitor count" });
    }
  });

  app.get("/api/events", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const status = req.query.status as string | undefined;
      let events;
      
      if (category && category !== "전체") {
        events = await storage.getEventsByCategory(category);
      } else {
        events = await storage.getEvents();
      }
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (status === "upcoming") {
        events = events.filter(e => new Date(e.endDate) >= today);
      } else if (status === "past") {
        events = events.filter(e => new Date(e.endDate) < today);
      }
      
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", async (req, res) => {
    try {
      const event = await storage.getEventById(req.params.id);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch event" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const parsed = insertEventSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid event data", details: parsed.error.errors });
      }
      const event = await storage.createEvent(parsed.data);
      res.status(201).json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      const success = await storage.deleteEvent(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const parsed = insertEventSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid event data", details: parsed.error.errors });
      }
      const event = await storage.updateEvent(req.params.id, parsed.data);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.get("/api/news", async (req, res) => {
    try {
      const news = await storage.getNews();
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.get("/api/news/:id", async (req, res) => {
    try {
      const news = await storage.getNewsById(req.params.id);
      if (!news) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json(news);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

  app.post("/api/news", async (req, res) => {
    try {
      const parsed = insertNewsSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid news data", details: parsed.error.errors });
      }
      const newsItem = await storage.createNews(parsed.data);
      res.status(201).json(newsItem);
    } catch (error) {
      res.status(500).json({ error: "Failed to create news" });
    }
  });

  app.delete("/api/news/:id", async (req, res) => {
    try {
      const success = await storage.deleteNews(req.params.id);
      if (!success) {
        return res.status(404).json({ error: "News not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete news" });
    }
  });

  app.get("/api/sources", async (req, res) => {
    try {
      const sources = await storage.getSources();
      const lastSync = await storage.getLastSyncTime();
      const safeSources = sources.map(source => ({
        ...source,
        apiKey: source.apiKey ? "***설정됨***" : undefined,
      }));
      res.json({ sources: safeSources, lastSync });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch sources" });
    }
  });

  app.patch("/api/sources/:id", async (req, res) => {
    try {
      const { enabled, apiKey } = req.body;
      
      const updates: { enabled?: boolean; apiKey?: string } = {};
      if (typeof enabled === "boolean") {
        updates.enabled = enabled;
      }
      if (typeof apiKey === "string" && apiKey.length > 0 && apiKey.length < 500) {
        updates.apiKey = apiKey;
      }
      
      const source = await storage.updateSource(req.params.id, updates);
      if (!source) {
        return res.status(404).json({ error: "Source not found" });
      }
      
      const safeSource = {
        ...source,
        apiKey: source.apiKey ? "***설정됨***" : undefined,
      };
      res.json(safeSource);
    } catch (error) {
      res.status(500).json({ error: "Failed to update source" });
    }
  });

  app.post("/api/sync", async (req, res) => {
    try {
      const result = await storage.syncExternalData();
      const lastSync = await storage.getLastSyncTime();
      res.json({ 
        success: true, 
        message: `동기화 완료: 행사 ${result.events}건, 소식 ${result.news}건 추가됨`,
        ...result,
        lastSync
      });
    } catch (error) {
      console.error("Sync error:", error);
      res.status(500).json({ error: "동기화 중 오류가 발생했습니다" });
    }
  });

  app.get("/api/guest-posts", async (req, res) => {
    try {
      const statusParam = req.query.status as string | undefined;
      const validStatuses = ["pending", "approved", "rejected"];
      const status = statusParam && validStatuses.includes(statusParam) 
        ? statusParam as "pending" | "approved" | "rejected"
        : undefined;
      const posts = status 
        ? await storage.getGuestPosts(status)
        : await storage.getGuestPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch guest posts" });
    }
  });

  app.get("/api/guest-posts/approved", async (req, res) => {
    try {
      const posts = await storage.getApprovedGuestPosts();
      res.json(posts);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch approved posts" });
    }
  });

  app.post("/api/guest-posts", async (req, res) => {
    try {
      const parsed = insertGuestPostSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "잘못된 입력입니다", details: parsed.error.errors });
      }
      const post = await storage.createGuestPost(parsed.data);
      res.status(201).json({ success: true, post, message: "게시글이 등록되었습니다. 관리자 승인 후 공개됩니다." });
    } catch (error) {
      res.status(500).json({ error: "게시글 등록에 실패했습니다" });
    }
  });

  app.patch("/api/guest-posts/:id/status", async (req, res) => {
    try {
      const parsed = updateStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "잘못된 상태값입니다" });
      }
      const post = await storage.updateGuestPostStatus(req.params.id, parsed.data.status);
      if (!post) {
        return res.status(404).json({ error: "게시글을 찾을 수 없습니다" });
      }
      res.json({ success: true, post });
    } catch (error) {
      res.status(500).json({ error: "상태 변경에 실패했습니다" });
    }
  });

  app.get("/api/ai-news/sources", async (req, res) => {
    try {
      res.json({ sources: defaultRssSources });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch AI news sources" });
    }
  });

  app.get("/api/ai-news/test", async (req, res) => {
    try {
      const isConnected = await testAiConnection();
      res.json({ connected: isConnected });
    } catch (error) {
      res.status(500).json({ connected: false, error: "AI 연결 테스트 실패" });
    }
  });

  app.post("/api/ai-news/sync", async (req, res) => {
    try {
      console.log("Starting AI news sync...");
      const result = await fetchAndSummarizeNews();
      
      const existingNews = await storage.getNews();
      const existingTitles = new Set(existingNews.map(n => n.title));
      
      let addedCount = 0;
      for (const newsItem of result.newsItems) {
        if (!existingTitles.has(newsItem.title)) {
          try {
            await storage.createNews({
              title: newsItem.title,
              summary: newsItem.summary,
              category: newsItem.category as "문화행사" | "축제" | "전시" | "공연" | "기타소식",
              imageUrl: newsItem.imageUrl,
              publishedAt: newsItem.publishedAt,
            });
            existingTitles.add(newsItem.title);
            addedCount++;
          } catch (createError) {
            console.error("Error creating news item:", createError);
          }
        }
      }

      res.json({
        success: true,
        message: `AI 뉴스 수집 완료: ${result.totalFetched}개 수집, ${result.jeongeupRelated}개 정읍 관련, ${addedCount}개 추가됨`,
        totalFetched: result.totalFetched,
        jeongeupRelated: result.jeongeupRelated,
        summarized: result.summarized,
        added: addedCount,
        errors: result.errors,
      });
    } catch (error) {
      console.error("AI news sync error:", error);
      res.status(500).json({ error: "AI 뉴스 수집 중 오류가 발생했습니다" });
    }
  });

  return httpServer;
}
