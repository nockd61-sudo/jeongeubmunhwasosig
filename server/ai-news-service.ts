import OpenAI from "openai";
import * as cheerio from "cheerio";
import { randomUUID } from "crypto";
import type { NewsItem, EventCategory } from "@shared/schema";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface RssSource {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
}

export const defaultRssSources: RssSource[] = [
  {
    id: "jeonbuk-ilbo",
    name: "전북일보",
    url: "https://www.jjan.kr/rss/allArticle.xml",
    enabled: true,
  },
  {
    id: "jeongeup-news",
    name: "정읍신문",
    url: "http://www.jnewsk.com/rss/allArticle.xml",
    enabled: true,
  },
];

async function fetchWithTimeout(url: string, timeout = 15000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; JeongeupBot/1.0)",
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
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

interface RawNewsItem {
  title: string;
  description: string;
  link: string;
  pubDate: string;
}

async function parseRssFeed(feedUrl: string): Promise<RawNewsItem[]> {
  const xml = await fetchWithTimeout(feedUrl);
  if (!xml) return [];

  try {
    const $ = cheerio.load(xml, { xmlMode: true });
    const items: RawNewsItem[] = [];

    $("item").each((index, element) => {
      const $item = $(element);
      const title = $item.find("title").text().trim();
      const description = $item.find("description").text().trim();
      const link = $item.find("link").text().trim();
      const pubDate = $item.find("pubDate").text().trim();
      
      if (title && title.length > 5) {
        items.push({ title, description, link, pubDate });
      }
    });

    return items.slice(0, 10);
  } catch (error) {
    console.error("Error parsing RSS feed:", error);
    return [];
  }
}

function isJeongeupRelated(text: string): boolean {
  const keywords = ["정읍", "내장산", "정읍시", "전북", "전라북도"];
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword));
}

async function summarizeWithAI(title: string, content: string): Promise<string> {
  try {
    const cleanContent = content.replace(/<[^>]*>/g, "").trim();
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "당신은 정읍시 지역 뉴스를 요약하는 전문가입니다. 뉴스 내용을 한국어로 간결하게 1-2문장으로 요약해주세요. 핵심 내용만 포함하고, 객관적이고 명확하게 작성해주세요."
        },
        {
          role: "user",
          content: `제목: ${title}\n\n내용: ${cleanContent || title}\n\n위 뉴스를 1-2문장으로 요약해주세요.`
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content?.trim() || cleanContent.substring(0, 80);
  } catch (error) {
    console.error("AI summarization error:", error);
    const cleanContent = content.replace(/<[^>]*>/g, "").trim();
    return cleanContent.substring(0, 80) || title.substring(0, 80);
  }
}

export interface AiSyncResult {
  totalFetched: number;
  jeongeupRelated: number;
  summarized: number;
  newsItems: NewsItem[];
  errors: string[];
}

export async function fetchAndSummarizeNews(sources?: RssSource[]): Promise<AiSyncResult> {
  const activeSources = sources || defaultRssSources.filter(s => s.enabled);
  const result: AiSyncResult = {
    totalFetched: 0,
    jeongeupRelated: 0,
    summarized: 0,
    newsItems: [],
    errors: [],
  };

  for (const source of activeSources) {
    try {
      console.log(`Fetching RSS from ${source.name}...`);
      const rawItems = await parseRssFeed(source.url);
      result.totalFetched += rawItems.length;

      const jeongeupItems = rawItems.filter(item => 
        isJeongeupRelated(item.title) || isJeongeupRelated(item.description)
      );
      result.jeongeupRelated += jeongeupItems.length;

      for (const item of jeongeupItems.slice(0, 5)) {
        try {
          const summary = await summarizeWithAI(item.title, item.description);
          
          let publishedAt = new Date().toISOString().split("T")[0];
          try {
            if (item.pubDate) {
              publishedAt = new Date(item.pubDate).toISOString().split("T")[0];
            }
          } catch {}

          const newsItem: NewsItem = {
            id: randomUUID(),
            title: item.title.substring(0, 100),
            summary: summary.substring(0, 200),
            category: "기타소식" as EventCategory,
            imageUrl: "https://images.unsplash.com/photo-1495020689067-958852a7765e?w=120&h=120&fit=crop",
            publishedAt,
          };

          result.newsItems.push(newsItem);
          result.summarized++;
        } catch (itemError) {
          console.error(`Error processing item ${item.title}:`, itemError);
          result.errors.push(`${source.name}: ${item.title} 처리 실패`);
        }
      }
    } catch (sourceError) {
      console.error(`Error processing source ${source.name}:`, sourceError);
      result.errors.push(`${source.name} 피드 처리 실패`);
    }
  }

  return result;
}

export async function testAiConnection(): Promise<boolean> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "안녕하세요" }],
      max_tokens: 10,
    });
    return !!response.choices[0]?.message?.content;
  } catch (error) {
    console.error("AI connection test failed:", error);
    return false;
  }
}
