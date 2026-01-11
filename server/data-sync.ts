import * as cheerio from "cheerio";
import { randomUUID } from "crypto";
import type { CulturalEvent, NewsItem, EventCategory } from "@shared/schema";

const JEONGEUP_BASE_URL = "https://www.jeongeup.go.kr";
const JEONGEUP_NEWS_URL = `${JEONGEUP_BASE_URL}/index.jeongeup?menuCd=DOM_000000102001000000`;
const JEONGEUP_CULTURE_URL = `${JEONGEUP_BASE_URL}/index.jeongeup?menuCd=DOM_000000601003000000`;

async function fetchWithTimeout(url: string, timeout = 10000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
      },
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return null;
    }
    
    return await response.text();
  } catch (error) {
    console.error(`Error fetching ${url}:`, error);
    return null;
  }
}

export async function scrapeJeongeupNews(): Promise<NewsItem[]> {
  const html = await fetchWithTimeout(JEONGEUP_NEWS_URL);
  if (!html) return [];

  const $ = cheerio.load(html);
  const newsItems: NewsItem[] = [];

  $(".board_list tbody tr, .bbs_list tbody tr, .list_wrap li, .news_list li").each((index, element) => {
    try {
      const $el = $(element);
      const title = $el.find("a").first().text().trim() || 
                   $el.find(".title").text().trim() || 
                   $el.find("td:nth-child(2)").text().trim();
      
      if (!title || title.length < 5) return;

      const dateText = $el.find(".date").text().trim() || 
                      $el.find("td:last-child").text().trim() ||
                      new Date().toISOString().split("T")[0];
      
      const dateMatch = dateText.match(/\d{4}[-./]\d{2}[-./]\d{2}/);
      const publishedAt = dateMatch ? dateMatch[0].replace(/[./]/g, "-") : new Date().toISOString().split("T")[0];

      newsItems.push({
        id: randomUUID(),
        title: title.substring(0, 100),
        summary: title.substring(0, 80) + (title.length > 80 ? "..." : ""),
        category: "기타소식",
        imageUrl: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=120&h=120&fit=crop",
        publishedAt,
      });
    } catch (err) {
      console.error("Error parsing news item:", err);
    }
  });

  return newsItems.slice(0, 10);
}

export async function scrapeJeongeupCulture(): Promise<CulturalEvent[]> {
  const html = await fetchWithTimeout(JEONGEUP_CULTURE_URL);
  if (!html) return [];

  const $ = cheerio.load(html);
  const events: CulturalEvent[] = [];

  $(".tour_list li, .gallery_list li, .photo_list li, .list_wrap li").each((index, element) => {
    try {
      const $el = $(element);
      const title = $el.find("a").first().text().trim() || 
                   $el.find(".title").text().trim();
      
      if (!title || title.length < 3) return;

      const imgSrc = $el.find("img").attr("src");
      let imageUrl = "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=450&fit=crop";
      
      if (imgSrc) {
        imageUrl = imgSrc.startsWith("http") ? imgSrc : `${JEONGEUP_BASE_URL}${imgSrc}`;
      }

      const description = $el.find(".desc, .content, p").text().trim() || title;

      events.push({
        id: randomUUID(),
        title: title.substring(0, 50),
        description: description.substring(0, 200),
        category: "문화행사" as EventCategory,
        imageUrl,
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        location: "정읍시",
        isFeatured: index === 0,
      });
    } catch (err) {
      console.error("Error parsing culture item:", err);
    }
  });

  return events.slice(0, 10);
}

export interface PublicDataApiConfig {
  apiKey: string;
  region?: string;
}

export async function fetchPublicDataEvents(config: PublicDataApiConfig): Promise<CulturalEvent[]> {
  if (!config.apiKey) {
    console.log("No API key provided for public data");
    return [];
  }

  const url = `http://api.data.go.kr/openapi/tn_pubr_public_cltur_fstvl_api?serviceKey=${encodeURIComponent(config.apiKey)}&pageNo=1&numOfRows=20&type=json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error("Public data API error:", response.status);
      return [];
    }

    const data = await response.json();
    const items = data?.response?.body?.items || [];

    return items
      .filter((item: any) => {
        const address = item.rdnmadr || item.lnmadr || "";
        return address.includes("정읍") || address.includes("전북");
      })
      .map((item: any) => ({
        id: randomUUID(),
        title: item.fstvlNm || "축제",
        description: item.fstvlCo || item.fstvlNm || "",
        category: "축제" as EventCategory,
        imageUrl: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=800&h=450&fit=crop",
        startDate: item.fstvlStartDate || new Date().toISOString().split("T")[0],
        endDate: item.fstvlEndDate || new Date().toISOString().split("T")[0],
        location: item.opar || item.rdnmadr || "정읍시",
        isFeatured: false,
      }));
  } catch (error) {
    console.error("Error fetching public data:", error);
    return [];
  }
}

export async function scrapeRssFeed(feedUrl: string): Promise<NewsItem[]> {
  const xml = await fetchWithTimeout(feedUrl);
  if (!xml) return [];

  try {
    const $ = cheerio.load(xml, { xmlMode: true });
    const newsItems: NewsItem[] = [];

    $("item").each((index, element) => {
      const $item = $(element);
      const title = $item.find("title").text().trim();
      const description = $item.find("description").text().trim();
      const pubDate = $item.find("pubDate").text().trim();
      
      if (!title) return;

      let publishedAt = new Date().toISOString().split("T")[0];
      try {
        if (pubDate) {
          publishedAt = new Date(pubDate).toISOString().split("T")[0];
        }
      } catch {}

      newsItems.push({
        id: randomUUID(),
        title: title.substring(0, 100),
        summary: description.replace(/<[^>]*>/g, "").substring(0, 80),
        category: "기타소식",
        imageUrl: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=120&h=120&fit=crop",
        publishedAt,
      });
    });

    return newsItems.slice(0, 10);
  } catch (error) {
    console.error("Error parsing RSS feed:", error);
    return [];
  }
}

export interface ExternalSource {
  id: string;
  name: string;
  type: "webpage" | "rss" | "api";
  url: string;
  apiKey?: string;
  enabled: boolean;
  lastSync?: string;
}

export const defaultSources: ExternalSource[] = [
  {
    id: "jeongeup-news",
    name: "정읍시청 공지사항",
    type: "webpage",
    url: JEONGEUP_NEWS_URL,
    enabled: true,
  },
  {
    id: "jeongeup-culture",
    name: "정읍 관광정보",
    type: "webpage",
    url: JEONGEUP_CULTURE_URL,
    enabled: true,
  },
  {
    id: "jeongeup-news-local",
    name: "정읍신문 RSS",
    type: "rss",
    url: "http://www.jnewsk.com/rss/allArticle.xml",
    enabled: false,
  },
];
