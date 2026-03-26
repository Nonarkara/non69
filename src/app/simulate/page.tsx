'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Scenario {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  aiRole: string;
  category: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'salary',
    title: 'Negotiate a Raise',
    description: 'You\'ve been at your company for 2 years and want a 20% raise. Your manager is budget-conscious.',
    difficulty: 'intermediate',
    aiRole: 'Your direct manager who likes you but has tight budget constraints',
    category: 'Career',
  },
  {
    id: 'conflict',
    title: 'Resolve a Team Conflict',
    description: 'Two team members are in a heated disagreement that\'s affecting productivity. You need to mediate.',
    difficulty: 'advanced',
    aiRole: 'The more difficult team member who feels they\'re right and isn\'t backing down',
    category: 'Leadership',
  },
  {
    id: 'breakup',
    title: 'End a Relationship Kindly',
    description: 'You need to end a 6-month relationship. The other person is more invested than you.',
    difficulty: 'advanced',
    aiRole: 'Your partner who loves you and doesn\'t see this coming',
    category: 'Personal',
  },
  {
    id: 'pitch',
    title: 'Pitch to a Skeptical Investor',
    description: 'You have 3 minutes to convince an investor who\'s seen 100 pitches this week.',
    difficulty: 'intermediate',
    aiRole: 'A tired, skeptical but fair venture capitalist',
    category: 'Business',
  },
  {
    id: 'boundary',
    title: 'Set a Boundary with a Friend',
    description: 'Your close friend keeps asking for money. You need to say no without destroying the friendship.',
    difficulty: 'intermediate',
    aiRole: 'Your close friend who genuinely needs help but has been asking too often',
    category: 'Personal',
  },
  {
    id: 'feedback',
    title: 'Give Tough Feedback',
    description: 'Your direct report\'s work quality has dropped significantly. You need to address it.',
    difficulty: 'intermediate',
    aiRole: 'An employee who is going through personal issues but hasn\'t told anyone at work',
    category: 'Leadership',
  },
  {
    id: 'apology',
    title: 'Apologize for a Mistake',
    description: 'You made a significant error at work that affected the team. You need to own it.',
    difficulty: 'beginner',
    aiRole: 'Your upset colleague whose work was directly impacted by your mistake',
    category: 'Career',
  },
  {
    id: 'disagree-boss',
    title: 'Disagree with Your Boss',
    description: 'Your boss is making a decision you believe is wrong. You need to push back respectfully.',
    difficulty: 'advanced',
    aiRole: 'A competent but sometimes stubborn boss who doesn\'t like being challenged publicly',
    category: 'Career',
  },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface SimulationResult {
  communication_score: number;
  empathy_score: number;
  assertiveness_score: number;
  outcome_score: number;
  overall_score: number;
  feedback: string;
  what_worked: string[];
  what_to_improve: string[];
}

export default function SimulatePage() {
  const router = useRouter();
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<SimulationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startSimulation(s: Scenario) {
    setScenario(s);
    setMessages([]);

    // Get AI's opening line
    setIsStreaming(true);
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', scenario: s }),
      });
      if (res.status === 401) {
        router.push('/access?next=/simulate');
        return;
      }
      const data = await res.json();
      setMessages([{ role: 'assistant', content: data.message }]);
    } catch {
      setMessages([{ role: 'assistant', content: 'The simulation engine is not available. Please configure your API key.' }]);
    } finally {
      setIsStreaming(false);
    }
  }

  async function sendMessage() {
    if (!input.trim() || !scenario || isStreaming) return;

    const userMsg: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsStreaming(true);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'respond',
          scenario,
          messages: newMessages,
        }),
      });
      if (res.status === 401) {
        router.push('/access?next=/simulate');
        return;
      }
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection lost. Try again.' }]);
    } finally {
      setIsStreaming(false);
    }
  }

  async function endSimulation() {
    if (!scenario) return;
    setEvaluating(true);
    setShowResults(true);

    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'evaluate',
          scenario,
          messages,
        }),
      });
      if (res.status === 401) {
        router.push('/access?next=/simulate');
        return;
      }
      const data = await res.json();
      setResults(data.results);
    } catch {
      setResults({
        communication_score: 0.5, empathy_score: 0.5, assertiveness_score: 0.5,
        outcome_score: 0.5, overall_score: 0.5,
        feedback: 'Evaluation unavailable.',
        what_worked: [], what_to_improve: [],
      });
    } finally {
      setEvaluating(false);
    }
  }

  // Scenario picker
  if (!scenario) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Conversation Simulator</h1>
          <p className="text-neutral-500 text-sm">Practice the conversations that matter most. AI plays the other person.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {SCENARIOS.map(s => (
            <button
              key={s.id}
              onClick={() => startSimulation(s)}
              className="text-left border border-neutral-800 rounded-xl p-4 hover:border-neutral-600 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs bg-neutral-900 px-2 py-0.5 rounded">{s.category}</span>
                <span className={`text-xs ${
                  s.difficulty === 'beginner' ? 'text-green-400' :
                  s.difficulty === 'intermediate' ? 'text-yellow-400' : 'text-red-400'
                }`}>{s.difficulty}</span>
              </div>
              <h3 className="font-semibold mb-1">{s.title}</h3>
              <p className="text-xs text-neutral-500">{s.description}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Results view
  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-bold mb-2">Simulation Complete</h2>
        <p className="text-neutral-500 text-sm mb-6">{scenario.title}</p>

        {evaluating ? (
          <div className="text-center py-16">
            <div className="inline-block w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-neutral-400">Analyzing your communication...</p>
          </div>
        ) : results ? (
          <div>
            {/* Score grid */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {[
                { label: 'Communication', score: results.communication_score },
                { label: 'Empathy', score: results.empathy_score },
                { label: 'Assertiveness', score: results.assertiveness_score },
                { label: 'Outcome', score: results.outcome_score },
              ].map(({ label, score }) => (
                <div key={label} className="border border-neutral-800 rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold">{Math.round(score * 100)}</div>
                  <div className="text-xs text-neutral-500 mt-1">{label}</div>
                </div>
              ))}
            </div>

            <div className="border border-neutral-800 rounded-xl p-5 mb-6">
              <div className="text-center mb-4">
                <div className="text-4xl font-bold">{Math.round(results.overall_score * 100)}</div>
                <div className="text-sm text-neutral-500">Overall Score</div>
              </div>
              <p className="text-neutral-300 text-sm">{results.feedback}</p>
            </div>

            {results.what_worked.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-neutral-500 mb-1">WHAT WORKED</div>
                {results.what_worked.map((s, i) => (
                  <p key={i} className="text-sm text-green-400">+ {s}</p>
                ))}
              </div>
            )}

            {results.what_to_improve.length > 0 && (
              <div className="mb-6">
                <div className="text-xs text-neutral-500 mb-1">IMPROVE NEXT TIME</div>
                {results.what_to_improve.map((w, i) => (
                  <p key={i} className="text-sm text-yellow-400">~ {w}</p>
                ))}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { startSimulation(scenario); setShowResults(false); setResults(null); }}
                className="flex-1 border border-neutral-700 text-white py-2.5 rounded-xl hover:bg-neutral-900 transition-colors text-sm"
              >
                Try Again
              </button>
              <button
                onClick={() => { setScenario(null); setMessages([]); setShowResults(false); setResults(null); }}
                className="flex-1 bg-white text-black py-2.5 rounded-xl hover:bg-neutral-200 transition-colors text-sm font-medium"
              >
                New Scenario
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  // Conversation view
  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Scenario banner */}
      <div className="border-b border-neutral-800 bg-neutral-950 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">{scenario.title}</div>
            <div className="text-xs text-neutral-500">They are: {scenario.aiRole}</div>
          </div>
          <button
            onClick={endSimulation}
            className="text-xs bg-neutral-800 text-neutral-300 px-3 py-1.5 rounded-lg hover:bg-neutral-700 transition-colors"
          >
            End &amp; Score
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto py-4 px-4 space-y-4">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user'
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 text-neutral-100 border border-neutral-800'
                }`}
              >
                <div className="whitespace-pre-wrap text-[15px] leading-relaxed">{msg.content}</div>
              </div>
            </div>
          ))}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="bg-neutral-900 border border-neutral-800 rounded-2xl px-4 py-3">
                <span className="inline-block w-2 h-4 bg-neutral-500 animate-pulse" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-neutral-800 bg-black p-4">
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(); }}
          className="max-w-2xl mx-auto flex gap-3"
        >
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="What do you say?"
            className="flex-1 bg-neutral-900 border border-neutral-700 rounded-xl px-4 py-3 text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-500 text-[15px]"
            disabled={isStreaming}
            autoFocus
          />
          <button
            type="submit"
            disabled={!input.trim() || isStreaming}
            className="bg-white text-black font-medium px-5 py-3 rounded-xl hover:bg-neutral-200 disabled:opacity-30 transition-colors"
          >
            Say
          </button>
        </form>
      </div>
    </div>
  );
}
