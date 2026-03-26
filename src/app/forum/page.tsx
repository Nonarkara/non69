'use client';

import { useState } from 'react';

interface Post {
  id: number;
  title: string;
  content: string;
  category: string;
  author: string;
  logic_score: number | null;
  clarity_score: number | null;
  created_at: string;
  reply_count: number;
}

// Demo data for now — will be replaced with real DB queries
const DEMO_POSTS: Post[] = [
  {
    id: 1,
    title: 'Is democracy the most logical form of governance?',
    content: 'I argue that democracy, while imperfect, is the most logically sound system because it distributes decision-making power, reducing single points of failure...',
    category: 'Logic',
    author: 'Thinker_01',
    logic_score: 0.72,
    clarity_score: 0.85,
    created_at: '2 hours ago',
    reply_count: 3,
  },
  {
    id: 2,
    title: 'Why most startup pitches fail at communication, not ideas',
    content: 'After reviewing 200+ pitch decks, I noticed the problem is rarely the idea itself — it\'s that founders can\'t bridge the gap between their vision and the words on the slide...',
    category: 'Communication',
    author: 'Non',
    logic_score: 0.88,
    clarity_score: 0.91,
    created_at: '5 hours ago',
    reply_count: 7,
  },
  {
    id: 3,
    title: 'Stream of consciousness: What I realized about fear at 3am',
    content: 'It hit me that fear isn\'t the opposite of courage. Fear is the prerequisite. You can\'t be courageous about something that doesn\'t scare you...',
    category: 'Life',
    author: 'NightOwl',
    logic_score: 0.65,
    clarity_score: 0.78,
    created_at: '1 day ago',
    reply_count: 12,
  },
];

const CATEGORIES = ['All', 'Logic', 'Communication', 'Philosophy', 'Design Thinking', 'Life'];

function ScoreBar({ score, label }: { score: number | null; label: string }) {
  if (score === null) return null;
  const pct = Math.round(score * 100);
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-neutral-500 w-14">{label}</span>
      <div className="w-20 h-1.5 bg-neutral-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${pct >= 70 ? 'bg-green-500' : pct >= 40 ? 'bg-yellow-500' : 'bg-red-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-neutral-600">{pct}</span>
    </div>
  );
}

export default function ForumPage() {
  const [activeCategory, setActiveCategory] = useState('All');

  const filtered = activeCategory === 'All'
    ? DEMO_POSTS
    : DEMO_POSTS.filter(p => p.category === activeCategory);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Forum</h1>
          <p className="text-neutral-500 text-sm mt-1">A place of ideas. Every post is analyzed for logic and clarity.</p>
        </div>
        <button className="bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-neutral-200 transition-colors">
          New Post
        </button>
      </div>

      {/* Categories */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap transition-colors ${
              activeCategory === cat
                ? 'bg-white text-black'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {filtered.map(post => (
          <article
            key={post.id}
            className="border border-neutral-800 rounded-xl p-5 hover:border-neutral-700 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs bg-neutral-900 text-neutral-400 px-2 py-0.5 rounded">
                    {post.category}
                  </span>
                  <span className="text-xs text-neutral-600">{post.author}</span>
                  <span className="text-xs text-neutral-700">{post.created_at}</span>
                </div>
                <h2 className="text-lg font-semibold mb-2 text-white">{post.title}</h2>
                <p className="text-sm text-neutral-400 line-clamp-2">{post.content}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-4 pt-3 border-t border-neutral-900">
              <div className="flex gap-4">
                <ScoreBar score={post.logic_score} label="Logic" />
                <ScoreBar score={post.clarity_score} label="Clarity" />
              </div>
              <span className="text-xs text-neutral-600">{post.reply_count} replies</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
