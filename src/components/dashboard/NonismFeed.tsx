interface NonismFeedProps {
  nonisms: Array<{ text: string; category: string }>;
}

export default function NonismFeed({ nonisms }: NonismFeedProps) {
  return (
    <div className="cmd-panel p-3 flex flex-col overflow-hidden">
      <div className="text-[7px] uppercase tracking-[0.3em] text-green-700 shrink-0">
        {'// '}NONISM_FEED [PHILOSOPHY]
      </div>

      <div className="mt-2 flex-1 overflow-y-auto thin-scroll space-y-2">
        {nonisms.map((n, i) => (
          <div key={i} className="border-l border-green-900/20 pl-2">
            <p className="text-[8px] leading-4 text-green-400/70 italic">
              &quot;{n.text}&quot;
            </p>
            <span className="text-[6px] uppercase tracking-widest text-green-900">
              // {n.category}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-2 text-[6px] text-green-900 shrink-0">
        SRC://NONISMS_DB · RANDOM_SAMPLE
      </div>
    </div>
  );
}
