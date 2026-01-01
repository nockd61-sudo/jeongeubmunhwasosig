import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/events", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      let events;
      
      if (category && category !== "전체") {
        events = await storage.getEventsByCategory(category);
      } else {
        events = await storage.getEvents();
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

  return httpServer;
}
