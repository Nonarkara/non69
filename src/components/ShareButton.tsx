'use client';

import { useState } from 'react';

type SharePayload =
  | {
      kind: 'lab';
      mode: string;
      summary: string;
      scores?: { logic?: number; clarity?: number };
      nonism?: string;
    }
  | {
      kind: 'watch_signal';
      title: string;
      summary: string;
      geography: string;
      status: string;
      metricText?: string;
      trendText?: string;
      whatToDo: string;
    }
  | {
      kind: 'daily_brief';
      title: string;
      summary: string;
      geography: string;
      watchouts?: string[];
    };

interface ShareButtonProps {
  payload: SharePayload;
  label?: string;
  align?: 'left' | 'right';
}

export default function ShareButton({
  payload,
  label = 'Share',
  align = 'right',
}: ShareButtonProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function handleShare(platform: 'twitter' | 'linkedin' | 'copy') {
    try {
      setError('');
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || 'Share failed');
      }

      const data = await res.json();

      if (platform === 'copy') {
        await navigator.clipboard.writeText(data.shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        window.open(data.shareUrls[platform], '_blank', 'width=600,height=400');
      }
    } catch (err) {
      console.error('Share failed', err);
      setError(err instanceof Error ? err.message : 'Share failed');
    }

    setShowMenu(false);
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-xs text-neutral-500 hover:text-white transition-colors px-2 py-1 rounded border border-neutral-800 hover:border-neutral-600"
      >
        {label}
      </button>

      {showMenu && (
        <div
          className={`absolute bottom-full mb-2 bg-neutral-900 border border-neutral-800 rounded-lg py-1 min-w-[140px] z-10 ${
            align === 'left' ? 'left-0' : 'right-0'
          }`}
        >
          <button
            onClick={() => handleShare('twitter')}
            className="block w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Post on X
          </button>
          <button
            onClick={() => handleShare('linkedin')}
            className="block w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            Share on LinkedIn
          </button>
          <button
            onClick={() => handleShare('copy')}
            className="block w-full text-left px-3 py-2 text-sm text-neutral-300 hover:bg-neutral-800"
          >
            {copied ? 'Copied!' : 'Copy text'}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
