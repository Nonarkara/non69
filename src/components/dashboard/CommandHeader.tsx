'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface CommandHeaderProps {
  worstStatus: string;
  headline: string;
  scene: string;
  generatedAt: string;
}

const statusGlow: Record<string, string> = {
  high: 'neon-text-green',
  elevated: 'text-yellow-400',
  active: 'text-green-400',
  watch: 'text-green-600',
  mixed: 'text-green-800',
};

const statusBorder: Record<string, string> = {
  high: 'border-red-700/40 bg-red-900/10',
  elevated: 'border-yellow-700/30 bg-yellow-900/10',
  active: 'border-green-700/30 bg-green-900/10',
  watch: 'border-green-800/20 bg-green-950/10',
  mixed: 'border-green-900/20 bg-black',
};

function BangkokClock() {
  const [time, setTime] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setDate(
        now.toLocaleString('en-US', {
          timeZone: 'Asia/Bangkok',
          month: 'short',
          day: 'numeric',
        })
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
      <div className="text-right">
        <div className="text-2xl font-bold tabular-nums tracking-tight neon-text-green">
          {time || '--:--:--'}
        </div>
        <div className="text-[7px] uppercase tracking-[0.3em] text-green-800">
          {date} {'//'} BKK UTC+7
        </div>
      </div>
  );
}

export default function CommandHeader({ worstStatus, headline, scene }: CommandHeaderProps) {
  const glow = statusGlow[worstStatus] || 'text-green-500';
  const border = statusBorder[worstStatus] || statusBorder.mixed;

  return (
    <header className="sticky top-0 z-50 border-b border-green-900/20 bg-black/95">
      <div className="h-px bg-gradient-to-r from-transparent via-green-500/30 to-transparent" />

      <div className="mx-auto flex h-12 max-w-none items-center gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3 shrink-0">
          <Link href="/watch" className="text-[10px] uppercase tracking-[0.3em] neon-text-green hover:text-white transition-colors">
            {'>'} TH://WATCH
          </Link>
          <span className="text-green-900">|</span>
          <div className={`border px-2.5 py-0.5 text-[10px] font-black uppercase tracking-[0.15em] ${border} ${glow}`}>
            {worstStatus}
          </div>
          <div className="h-1.5 w-1.5 rounded-full bg-green-400 signal-pulse" />
        </div>

        <div className="flex-1 min-w-0 hidden md:block">
          <p className="text-[10px] text-green-700/60 line-clamp-1 tracking-wide">
            {'// '} {headline}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex text-[9px] uppercase tracking-[0.2em]">
            <Link
              href="/watch?scene=briefing"
              className={`border px-2.5 py-1 transition-all ${
                scene === 'briefing'
                  ? 'border-green-600/30 bg-green-900/15 text-green-400'
                  : 'border-green-900/15 text-green-800 hover:text-green-400'
              }`}
            >
              [CMD]
            </Link>
            <Link
              href="/watch?scene=ambient"
              className={`border border-l-0 px-2.5 py-1 transition-all ${
                scene === 'ambient'
                  ? 'border-green-600/30 bg-green-900/15 text-green-400'
                  : 'border-green-900/15 text-green-800 hover:text-green-400'
              }`}
            >
              [WALL]
            </Link>
          </div>
          <span className="text-green-900 hidden sm:block">|</span>
          <div className="hidden sm:block">
            <BangkokClock />
          </div>
        </div>
      </div>
    </header>
  );
}
