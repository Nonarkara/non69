import { getCachedSignalRecord, isCacheFresh, upsertCachedSignalRecord } from './live-signals';

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
}

const NEWS_CACHE_TTL_MS = 10 * 60 * 1000;

const FEEDS: Array<{ url: string; source: string }> = [
  { url: 'https://www.bangkokpost.com/rss/data/topstories.xml', source: 'BKK Post' },
  { url: 'https://news.google.com/rss/search?q=thailand+OR+bangkok+when:1d&hl=en', source: 'Google' },
  { url: 'https://www.thaipbsworld.com/feed/', source: 'ThaiPBS' },
];

function parseRssItems(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/gi;
  let match;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = block.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i)?.[1]?.trim();
    const link = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1]?.trim()
      || block.match(/<link[^>]*href="([^"]+)"/i)?.[1];
    const pubDate = block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1]?.trim();

    if (title && link) {
      items.push({
        title: title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&quot;/g, '"'),
        link,
        source,
        publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
      });
    }
  }

  return items;
}

async function fetchAllFeeds(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const res = await fetch(feed.url, {
        next: { revalidate: 0 },
        headers: { Accept: 'application/xml, text/xml, application/rss+xml' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`${feed.source}: ${res.status}`);
      const xml = await res.text();
      return parseRssItems(xml, feed.source);
    })
  );

  const allItems: NewsItem[] = [];
  for (const result of results) {
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
    }
  }

  return allItems
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 20);
}

export async function getLiveNewsFeed(): Promise<NewsItem[]> {
  const cached = getCachedSignalRecord<NewsItem[]>('news-feed', 'global');
  if (cached && isCacheFresh(cached.fetchedAt, NEWS_CACHE_TTL_MS)) {
    return cached.payload;
  }

  try {
    const items = await fetchAllFeeds();
    if (items.length > 0) {
      upsertCachedSignalRecord<NewsItem[]>({
        slug: 'news-feed',
        area: 'global',
        payload: items,
        sourceLabel: 'RSS Feeds',
        sourceUpdatedAt: items[0]?.publishedAt ?? null,
        fetchedAt: new Date().toISOString(),
        status: 'fresh',
      });
    }
    return items;
  } catch {
    return cached?.payload ?? [];
  }
}
