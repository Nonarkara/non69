'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface Challenge {
  id: string;
  category: 'logic' | 'communication' | 'reflection';
  title: string;
  prompt: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  timeLimit: number;
}

interface Scores {
  logic_score: number;
  clarity_score: number;
  depth_score: number;
  courage_score: number;
  overall_score: number;
  feedback: string;
  strengths: string[];
  growth_areas: string[];
}

const CATEGORY_ICONS: Record<string, string> = {
  logic: '\u25C6',
  communication: '\u25CA',
  reflection: '\u25EF',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: 'text-green-400',
  intermediate: 'text-yellow-400',
  advanced: 'text-red-400',
};

function ScoreDial({ label, score }: { label: string; score: number }) {
  const pct = Math.round(score * 100);
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <svg width="88" height="88" className="-rotate-90">
        <circle cx="44" cy="44" r="36" fill="none" stroke="#262626" strokeWidth="6" />
        <circle
          cx="44" cy="44" r="36" fill="none" stroke="white" strokeWidth="6"
          strokeDasharray={circumference} strokeDashoffset={offset}
          strokeLinecap="round" className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute mt-6 text-lg font-bold">{pct}</div>
      <div className="text-xs text-neutral-500 mt-1">{label}</div>
    </div>
  );
}

export default function ChallengePage() {
  const router = useRouter();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [response, setResponse] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [scores, setScores] = useState<Scores | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [started, setStarted] = useState(false);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch daily challenge
  useEffect(() => {
    fetch('/api/challenge')
      .then(async r => {
        if (r.status === 401) {
          router.push('/access?next=/challenge');
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data?.challenge) return;
        setChallenge(data.challenge);
        setTimeLeft(data.challenge.timeLimit * 60);
        setStreak(data.streak ?? 0);
      })
      .catch(() => {});
  }, [router]);

  // Timer
  useEffect(() => {
    if (started && timeLeft > 0 && !submitted) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [started, submitted, timeLeft]);

  function startChallenge() {
    setStarted(true);
    textareaRef.current?.focus();
  }

  async function submitResponse() {
    if (!response.trim() || !challenge) return;
    setSubmitted(true);
    setEvaluating(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          challengeId: challenge.id,
          response: response.trim(),
          timeUsed: (challenge.timeLimit * 60) - timeLeft,
        }),
      });
      if (res.status === 401) {
        router.push('/access?next=/challenge');
        return;
      }
      const data = await res.json();
      setScores(data.scores);
      setStreak(data.streak ?? streak);
    } catch {
      setScores({
        logic_score: 0, clarity_score: 0, depth_score: 0, courage_score: 0,
        overall_score: 0, feedback: 'Evaluation failed. Try again.', strengths: [], growth_areas: [],
      });
    } finally {
      setEvaluating(false);
    }
  }

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  if (!challenge) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
        <div className="text-neutral-500">Loading today&apos;s challenge...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Daily Challenge</h1>
          <p className="text-neutral-500 text-sm">5 minutes a day to sharpen your mind</p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold">{streak}</div>
          <div className="text-xs text-neutral-500">day streak</div>
        </div>
      </div>

      {/* Challenge Card */}
      <div className="border border-neutral-800 rounded-2xl p-6 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">{CATEGORY_ICONS[challenge.category]}</span>
          <span className="text-xs bg-neutral-900 px-2 py-0.5 rounded capitalize">{challenge.category}</span>
          <span className={`text-xs capitalize ${DIFFICULTY_COLORS[challenge.difficulty]}`}>
            {challenge.difficulty}
          </span>
          <span className="text-xs text-neutral-600 ml-auto">{challenge.timeLimit} min</span>
        </div>

        <h2 className="text-xl font-semibold mb-3">{challenge.title}</h2>
        <p className="text-neutral-300 leading-relaxed">{challenge.prompt}</p>
      </div>

      {!started && !submitted && (
        <button
          onClick={startChallenge}
          className="w-full bg-white text-black font-semibold py-3 rounded-xl hover:bg-neutral-200 transition-colors text-lg"
        >
          Start Challenge
        </button>
      )}

      {started && !submitted && (
        <>
          {/* Timer */}
          <div className={`text-center mb-4 text-2xl font-mono ${timeLeft < 60 ? 'text-red-400' : 'text-neutral-400'}`}>
            {minutes}:{seconds.toString().padStart(2, '0')}
          </div>

          {/* Response area */}
          <textarea
            ref={textareaRef}
            value={response}
            onChange={e => setResponse(e.target.value)}
            placeholder="Write your response here..."
            className="w-full bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 resize-none focus:outline-none focus:border-neutral-500 text-[15px] min-h-[200px] mb-4"
          />

          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-600">{response.split(/\s+/).filter(Boolean).length} words</span>
            <button
              onClick={submitResponse}
              disabled={!response.trim()}
              className="bg-white text-black font-medium px-6 py-2.5 rounded-xl hover:bg-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Submit
            </button>
          </div>
        </>
      )}

      {/* Results */}
      {submitted && (
        <div className="border border-neutral-800 rounded-2xl p-6">
          {evaluating ? (
            <div className="text-center py-8">
              <div className="inline-block w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-neutral-400">DrNon is evaluating your thinking...</p>
            </div>
          ) : scores ? (
            <>
              <h3 className="text-lg font-semibold mb-6">Your Results</h3>

              {/* Score dials */}
              <div className="grid grid-cols-4 gap-4 mb-6 relative">
                <ScoreDial label="Logic" score={scores.logic_score} />
                <ScoreDial label="Clarity" score={scores.clarity_score} />
                <ScoreDial label="Depth" score={scores.depth_score} />
                <ScoreDial label="Courage" score={scores.courage_score} />
              </div>

              {/* Overall */}
              <div className="text-center mb-6 pb-6 border-b border-neutral-800">
                <div className="text-3xl font-bold">{Math.round(scores.overall_score * 100)}</div>
                <div className="text-sm text-neutral-500">Overall Score</div>
              </div>

              {/* Feedback */}
              <p className="text-neutral-300 mb-4">{scores.feedback}</p>

              {scores.strengths.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs text-neutral-500 mb-1">STRENGTHS</div>
                  {scores.strengths.map((s, i) => (
                    <p key={i} className="text-sm text-green-400">+ {s}</p>
                  ))}
                </div>
              )}

              {scores.growth_areas.length > 0 && (
                <div className="mb-4">
                  <div className="text-xs text-neutral-500 mb-1">GROW HERE</div>
                  {scores.growth_areas.map((g, i) => (
                    <p key={i} className="text-sm text-yellow-400">~ {g}</p>
                  ))}
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setSubmitted(false);
                    setStarted(false);
                    setResponse('');
                    setScores(null);
                    setTimeLeft(challenge.timeLimit * 60);
                  }}
                  className="flex-1 border border-neutral-700 text-white py-2.5 rounded-xl hover:bg-neutral-900 transition-colors text-sm"
                >
                  Try Again
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="flex-1 bg-white text-black py-2.5 rounded-xl hover:bg-neutral-200 transition-colors text-sm font-medium"
                >
                  Reload
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
