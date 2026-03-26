'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface DebateTopic {
  id: string;
  topic: string;
  sideA: string;
  sideB: string;
  category: string;
}

const DEBATE_TOPICS: DebateTopic[] = [
  {
    id: 'debate-1',
    topic: 'Is social media a net positive for society?',
    sideA: 'Social media is fundamentally good for humanity',
    sideB: 'Social media is fundamentally harmful to humanity',
    category: 'Society',
  },
  {
    id: 'debate-2',
    topic: 'Should AI development be paused?',
    sideA: 'AI development should continue at full speed',
    sideB: 'AI development needs an immediate pause',
    category: 'Technology',
  },
  {
    id: 'debate-3',
    topic: 'Is meritocracy real?',
    sideA: 'Meritocracy works — success reflects effort and talent',
    sideB: 'Meritocracy is a myth — success mostly reflects privilege',
    category: 'Philosophy',
  },
  {
    id: 'debate-4',
    topic: 'Remote work vs. office work',
    sideA: 'Remote work is strictly better for productivity and wellbeing',
    sideB: 'In-office work is essential for collaboration and culture',
    category: 'Work',
  },
  {
    id: 'debate-5',
    topic: 'Should university be free?',
    sideA: 'University education should be free for everyone',
    sideB: 'People should pay for their own higher education',
    category: 'Education',
  },
];

type Phase = 'pick' | 'argue' | 'evaluating' | 'results';

interface DebateScores {
  userScore: {
    logic: number;
    clarity: number;
    persuasion: number;
    overall: number;
  };
  aiScore: {
    logic: number;
    clarity: number;
    persuasion: number;
    overall: number;
  };
  verdict: string;
  userStrengths: string[];
  userWeaknesses: string[];
  winner: 'user' | 'ai' | 'draw';
}

function ScoreCompare({ label, userScore, aiScore }: { label: string; userScore: number; aiScore: number }) {
  const uPct = Math.round(userScore * 100);
  const aPct = Math.round(aiScore * 100);
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs text-neutral-500 mb-1">
        <span>You: {uPct}</span>
        <span className="text-neutral-600">{label}</span>
        <span>AI: {aPct}</span>
      </div>
      <div className="flex gap-1 h-2">
        <div className="flex-1 bg-neutral-800 rounded-l-full overflow-hidden flex justify-end">
          <div className="bg-white rounded-l-full transition-all duration-700" style={{ width: `${uPct}%` }} />
        </div>
        <div className="flex-1 bg-neutral-800 rounded-r-full overflow-hidden">
          <div className="bg-neutral-500 rounded-r-full transition-all duration-700" style={{ width: `${aPct}%` }} />
        </div>
      </div>
    </div>
  );
}

export default function ArenaPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('pick');
  const [topic, setTopic] = useState<DebateTopic | null>(null);
  const [userSide, setUserSide] = useState<'A' | 'B'>('A');
  const [userArgument, setUserArgument] = useState('');
  const [aiArgument, setAiArgument] = useState('');
  const [scores, setScores] = useState<DebateScores | null>(null);
  const [round, setRound] = useState(1);

  async function startDebate() {
    if (!topic || !userArgument.trim()) return;
    setPhase('evaluating');

    try {
      const res = await fetch('/api/arena', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topicId: topic.id,
          topic: topic.topic,
          userSide: userSide === 'A' ? topic.sideA : topic.sideB,
          aiSide: userSide === 'A' ? topic.sideB : topic.sideA,
          userArgument: userArgument.trim(),
          round,
        }),
      });
      if (res.status === 401) {
        router.push('/access?next=/arena');
        return;
      }
      const data = await res.json();
      setAiArgument(data.aiArgument);
      setScores(data.scores);
      setPhase('results');
    } catch {
      setPhase('argue');
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Debate Arena</h1>
        <p className="text-neutral-500 text-sm">Argue your position. AI argues the opposite. Logic wins.</p>
      </div>

      {phase === 'pick' && (
        <div className="space-y-3">
          <p className="text-neutral-400 text-sm mb-4">Pick a topic to debate:</p>
          {DEBATE_TOPICS.map(t => (
            <button
              key={t.id}
              onClick={() => setTopic(t)}
              className={`w-full text-left border rounded-xl p-4 transition-colors ${
                topic?.id === t.id
                  ? 'border-white bg-neutral-900'
                  : 'border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-neutral-800 px-2 py-0.5 rounded">{t.category}</span>
              </div>
              <p className="font-medium">{t.topic}</p>
            </button>
          ))}

          {topic && (
            <div className="mt-6 border border-neutral-800 rounded-xl p-5">
              <p className="text-sm text-neutral-400 mb-3">Pick your side:</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUserSide('A')}
                  className={`p-3 rounded-lg text-sm text-left transition-colors ${
                    userSide === 'A' ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {topic.sideA}
                </button>
                <button
                  onClick={() => setUserSide('B')}
                  className={`p-3 rounded-lg text-sm text-left transition-colors ${
                    userSide === 'B' ? 'bg-white text-black' : 'bg-neutral-900 text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {topic.sideB}
                </button>
              </div>
              <button
                onClick={() => setPhase('argue')}
                className="mt-4 w-full bg-white text-black font-medium py-2.5 rounded-xl hover:bg-neutral-200 transition-colors"
              >
                Enter the Arena
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'argue' && topic && (
        <div>
          <div className="border border-neutral-800 rounded-xl p-4 mb-4 bg-neutral-950">
            <div className="text-xs text-neutral-500 mb-1">ROUND {round} &mdash; YOUR POSITION</div>
            <p className="text-neutral-300">
              {userSide === 'A' ? topic.sideA : topic.sideB}
            </p>
          </div>

          <textarea
            value={userArgument}
            onChange={e => setUserArgument(e.target.value)}
            placeholder="Make your argument... Be logical, clear, and persuasive."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-neutral-500 text-[15px] min-h-[180px] mb-3"
            autoFocus
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">
              {userArgument.split(/\s+/).filter(Boolean).length} words
            </span>
            <button
              onClick={startDebate}
              disabled={!userArgument.trim()}
              className="bg-white text-black font-medium px-6 py-2.5 rounded-xl hover:bg-neutral-200 disabled:opacity-30 transition-colors"
            >
              Submit Argument
            </button>
          </div>
        </div>
      )}

      {phase === 'evaluating' && (
        <div className="text-center py-16">
          <div className="inline-block w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-neutral-400">The AI is crafting its counter-argument...</p>
          <p className="text-neutral-600 text-sm mt-1">And a judge is scoring both sides.</p>
        </div>
      )}

      {phase === 'results' && scores && topic && (
        <div>
          {/* AI's argument */}
          <div className="border border-neutral-800 rounded-xl p-5 mb-6 bg-neutral-950">
            <div className="text-xs text-neutral-500 mb-2">AI&apos;S COUNTER-ARGUMENT</div>
            <p className="text-neutral-300 text-sm leading-relaxed whitespace-pre-wrap">{aiArgument}</p>
          </div>

          {/* Verdict */}
          <div className="text-center mb-6">
            <div className={`text-3xl font-bold mb-2 ${
              scores.winner === 'user' ? 'text-green-400' : scores.winner === 'draw' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {scores.winner === 'user' ? 'YOU WIN' : scores.winner === 'draw' ? 'DRAW' : 'AI WINS'}
            </div>
            <p className="text-neutral-400 text-sm">{scores.verdict}</p>
          </div>

          {/* Score comparison */}
          <div className="border border-neutral-800 rounded-xl p-5 mb-6">
            <ScoreCompare label="Logic" userScore={scores.userScore.logic} aiScore={scores.aiScore.logic} />
            <ScoreCompare label="Clarity" userScore={scores.userScore.clarity} aiScore={scores.aiScore.clarity} />
            <ScoreCompare label="Persuasion" userScore={scores.userScore.persuasion} aiScore={scores.aiScore.persuasion} />
          </div>

          {/* Feedback */}
          {scores.userStrengths.length > 0 && (
            <div className="mb-3">
              {scores.userStrengths.map((s, i) => (
                <p key={i} className="text-sm text-green-400">+ {s}</p>
              ))}
            </div>
          )}
          {scores.userWeaknesses.length > 0 && (
            <div className="mb-6">
              {scores.userWeaknesses.map((w, i) => (
                <p key={i} className="text-sm text-yellow-400">~ {w}</p>
              ))}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => {
                setPhase('argue');
                setUserArgument('');
                setRound(r => r + 1);
              }}
              className="flex-1 border border-neutral-700 text-white py-2.5 rounded-xl hover:bg-neutral-900 transition-colors text-sm"
            >
              Round {round + 1}
            </button>
            <button
              onClick={() => {
                setPhase('pick');
                setTopic(null);
                setUserArgument('');
                setAiArgument('');
                setScores(null);
                setRound(1);
              }}
              className="flex-1 bg-white text-black py-2.5 rounded-xl hover:bg-neutral-200 transition-colors text-sm font-medium"
            >
              New Debate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
