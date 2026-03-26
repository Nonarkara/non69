'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';

interface SaveWatchButtonProps {
  geography: string;
  itemKind: 'signal' | 'brief';
  itemSlug: string;
  defaultSaved?: boolean;
}

export default function SaveWatchButton({
  geography,
  itemKind,
  itemSlug,
  defaultSaved = false,
}: SaveWatchButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [saved, setSaved] = useState(defaultSaved);
  const [isWorking, setIsWorking] = useState(false);
  const [error, setError] = useState('');

  async function toggleSaved() {
    if (isWorking) return;
    setIsWorking(true);
    setError('');

    try {
      const response = await fetch('/api/watch/pins', {
        method: saved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ geography, itemKind, itemSlug }),
      });

      if (response.status === 401) {
        router.push(`/access?next=${encodeURIComponent(pathname)}`);
        return;
      }

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Could not update saved state.');
      }

      setSaved(prev => !prev);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update saved state.');
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        onClick={toggleSaved}
        disabled={isWorking}
        className={`text-xs px-2 py-1 rounded border transition-colors ${
          saved
            ? 'border-[#d7d2c3] text-[#d7d2c3]'
            : 'border-neutral-800 text-neutral-500 hover:text-white hover:border-neutral-600'
        }`}
      >
        {saved ? 'Pinned' : 'Pin'}
      </button>
      {error && <span className="text-[11px] text-red-400">{error}</span>}
    </div>
  );
}
