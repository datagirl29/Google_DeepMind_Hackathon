import { NewsItem } from '../types';

// Fallback data to ensure the app never crashes during a demo if proxies fail
const FALLBACK_NEWS: NewsItem[] = [
    {
        title: "Global Climate Summit Reaches Historic Net-Zero Agreement",
        link: "#",
        pubDate: new Date().toUTCString(),
        source: "Global Wire",
        guid: "demo-1",
        snippet: "World leaders have unanimously agreed to accelerate the transition to renewable energy, targeting a 50% reduction in carbon emissions by 2030. The agreement includes funding for developing nations."
    },
    {
        title: "Breakthrough AI Model Predicts Weather Patterns with 99% Accuracy",
        link: "#",
        pubDate: new Date().toUTCString(),
        source: "Tech Daily",
        guid: "demo-2",
        snippet: "Scientists have unveiled a new machine learning system capable of forecasting extreme weather events weeks in advance, potentially saving thousands of lives and billions in damages."
    },
    {
        title: "Markets Rally as Inflation Data Shows Unexpected Cooling",
        link: "#",
        pubDate: new Date().toUTCString(),
        source: "Finance Post",
        guid: "demo-3",
        snippet: "Global stock markets hit record highs today after the latest consumer price index revealed inflation has dropped faster than anticipated, signaling relief for consumers worldwide."
    }
];

// Helper to parse XML string into NewsItem[]
const parseXml = (xmlString: string): NewsItem[] => {
  try {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    const items = Array.from(xmlDoc.querySelectorAll("item"));
    
    // LIMIT TO TOP 15 ITEMS FOR PERFORMANCE IN DEMO
    return items.slice(0, 15).map(item => {
        // Extract plain text snippet if description contains HTML
        const descriptionHtml = item.querySelector("description")?.textContent || "";
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = descriptionHtml;
        const snippet = tempDiv.textContent || "";
        
        // Google News often puts the source in <source> tag
        const source = item.querySelector("source")?.textContent || "News";

        return {
          title: item.querySelector("title")?.textContent || "No Title",
          link: item.querySelector("link")?.textContent || "#",
          pubDate: item.querySelector("pubDate")?.textContent || "",
          source: source,
          guid: item.querySelector("guid")?.textContent || Math.random().toString(),
          snippet: snippet.slice(0, 200) + (snippet.length > 200 ? "..." : "")
        };
    });
  } catch (error) {
    console.error("Failed to parse news XML:", error);
    return [];
  }
};

const fetchWithTimeout = async (url: string, timeout = 5000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e) {
        clearTimeout(id);
        throw e;
    }
};

export const fetchNews = async (rssUrl: string): Promise<NewsItem[]> => {
  
  // Strategy 1: allorigins.win (Reliable, returns JSON wrapped XML)
  // Moved to #1 because rss2json has strict rate limits that might be hit during testing
  try {
    const response = await fetchWithTimeout(`https://api.allorigins.win/get?url=${encodeURIComponent(rssUrl)}`);
    if (response.ok) {
      const data = await response.json();
      // allorigins returns { contents: "string..." }
      if (data.contents) {
          const items = parseXml(data.contents);
          if (items.length > 0) return items;
      }
    }
  } catch (e) {
    console.warn("Strategy 1 (allorigins) failed", e);
  }

  // Strategy 2: rss2json (Good parser, but rate limited)
  try {
      const response = await fetchWithTimeout(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`);
      if (response.ok) {
          const data = await response.json();
          if (data.status === 'ok') {
              return data.items.slice(0, 15).map((item: any) => ({
                  title: item.title,
                  link: item.link,
                  pubDate: item.pubDate,
                  source: "News", 
                  guid: item.guid,
                  snippet: item.description?.replace(/<[^>]*>?/gm, '').slice(0, 200) || ""
              }));
          }
      }
  } catch (e) {
      console.warn("Strategy 2 (rss2json) failed", e);
  }

  // Strategy 3: codetabs (Fallback proxy)
  try {
      const response = await fetchWithTimeout(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(rssUrl)}`);
       if (response.ok) {
          const xmlString = await response.text();
          const items = parseXml(xmlString);
          if (items.length > 0) return items;
       }
  } catch (e) {
      console.warn("Strategy 3 (codetabs) failed", e);
  }

  console.error("All proxies failed. Serving fallback data.");
  // Return fallback data so the app is usable in demo even if offline/blocked
  return FALLBACK_NEWS;
};

export const CATEGORIES = [
  { id: 'WORLD', label: 'World', rssUrl: 'https://news.google.com/rss/headlines/section/topic/WORLD' },
  { id: 'NATION', label: 'Politics', rssUrl: 'https://news.google.com/rss/headlines/section/topic/NATION' },
  { id: 'BUSINESS', label: 'Economy', rssUrl: 'https://news.google.com/rss/headlines/section/topic/BUSINESS' },
  { id: 'TECHNOLOGY', label: 'Sci/Tech', rssUrl: 'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY' },
  { id: 'EDUCATION', label: 'Education', rssUrl: 'https://news.google.com/rss/search?q=Education+News&hl=en-US&gl=US&ceid=US:en' },
  { id: 'HEALTH', label: 'Health', rssUrl: 'https://news.google.com/rss/headlines/section/topic/HEALTH' },
  { id: 'SCIENCE', label: 'Environment', rssUrl: 'https://news.google.com/rss/headlines/section/topic/SCIENCE' }, 
  { id: 'ENTERTAINMENT', label: 'Culture', rssUrl: 'https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT' },
  { id: 'SPORTS', label: 'Sports', rssUrl: 'https://news.google.com/rss/headlines/section/topic/SPORTS' },
];