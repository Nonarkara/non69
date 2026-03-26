import type { NewsItem } from '@/lib/news-feeds';

interface NewsFeedProps {
  items: NewsItem[];
}

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

export default function NewsFeed({ items }: NewsFeedProps) {
  return (
    <div className="cmd-panel p-3 flex flex-col overflow-hidden">
      <div className="text-[7px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}NEWS_FEED [{items.length}]
      </div>

      <div className="mt-2 flex-1 overflow-y-auto thin-scroll space-y-0">
        {items.map((item, i) => (
          <a
            key={`${item.link}-${i}`}
            href={item.link}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 px-1 py-1 transition-colors hover:bg-green-900/10 ${
              i % 2 === 0 ? 'bg-green-900/[0.03]' : ''
            }`}
          >
            <span className="text-[7px] tabular-nums text-green-900 shrink-0 w-[32px]">
              {formatTime(item.publishedAt)}
            </span>
            <span className="text-[6px] uppercase tracking-wider text-green-800 shrink-0 w-[44px] truncate">
              {item.source}
            </span>
            <span className="text-[8px] text-green-500/70 truncate leading-tight">
              {item.title}
            </span>
          </a>
        ))}

        {items.length === 0 && (
          <div className="text-[8px] text-green-900 py-4">
            // NO_DATA — feeds unavailable or cache empty
          </div>
        )}
      </div>

      <div className="mt-2 text-[6px] text-green-900 shrink-0">
        SRC://RSS · TTL:10M · {items.length} items
      </div>
    </div>
  );
}
