'use client';

import { startTransition, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type AuthMode = 'login' | 'register';

const INITIAL_FORM = {
  email: '',
  password: '',
  displayName: '',
};

export default function AuthPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams.get('next') || '/cockpit', [searchParams]);
  const [mode, setMode] = useState<AuthMode>('login');
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    setError('');
    setIsSubmitting(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : {
              email: form.email,
              password: form.password,
              displayName: form.displayName,
            };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Authentication failed.');
      }

      startTransition(() => {
        router.push(next);
        router.refresh();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="border border-neutral-800 bg-neutral-950 rounded-[28px] p-6 sm:p-8 shadow-[0_0_0_1px_rgba(255,255,255,0.02)]">
      <div className="flex gap-2 mb-6">
        {(['login', 'register'] as AuthMode[]).map(value => (
          <button
            key={value}
            onClick={() => {
              setMode(value);
              setError('');
            }}
            className={`px-4 py-2 rounded-full text-sm transition-colors ${
              mode === value
                ? 'bg-[#d7d2c3] text-black'
                : 'bg-neutral-900 text-neutral-400 hover:text-white'
            }`}
          >
            {value === 'login' ? 'Sign in' : 'Create account'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label htmlFor="displayName" className="block text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">
              Display name
            </label>
            <input
              id="displayName"
              value={form.displayName}
              onChange={event => setForm(prev => ({ ...prev, displayName: event.target.value }))}
              className="w-full rounded-2xl bg-black border border-neutral-800 px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
              placeholder="How your name should show up"
              required={mode === 'register'}
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
            className="w-full rounded-2xl bg-black border border-neutral-800 px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
            placeholder="you@domain.com"
            required
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-xs uppercase tracking-[0.18em] text-neutral-500 mb-2">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={form.password}
            onChange={event => setForm(prev => ({ ...prev, password: event.target.value }))}
            className="w-full rounded-2xl bg-black border border-neutral-800 px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
            placeholder="A password you can actually remember"
            required
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-2xl bg-[#d7d2c3] px-4 py-3 text-black font-semibold hover:bg-[#e4decf] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Working...' : mode === 'login' ? 'Enter the lab' : 'Unlock DrNon'}
        </button>
      </form>
    </div>
  );
}
