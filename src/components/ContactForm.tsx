'use client';

import { useState } from 'react';

const INITIAL_FORM = {
  name: '',
  email: '',
  organization: '',
  useCase: '',
};

export default function ContactForm() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.error || 'Could not submit request.');
      }

      setMessage('Request received. DrNon now knows you are serious.');
      setForm(INITIAL_FORM);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={event => setForm(prev => ({ ...prev, name: event.target.value }))}
          placeholder="Name"
          className="rounded-2xl bg-black border border-neutral-800 px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
          required
        />
        <input
          type="email"
          value={form.email}
          onChange={event => setForm(prev => ({ ...prev, email: event.target.value }))}
          placeholder="Email"
          className="rounded-2xl bg-black border border-neutral-800 px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
          required
        />
      </div>

      <input
        value={form.organization}
        onChange={event => setForm(prev => ({ ...prev, organization: event.target.value }))}
        placeholder="Organization / city / team"
        className="w-full rounded-2xl bg-black border border-neutral-800 px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
      />

      <textarea
        value={form.useCase}
        onChange={event => setForm(prev => ({ ...prev, useCase: event.target.value }))}
        placeholder="What do you need built, fixed, or made visible?"
        rows={5}
        className="w-full rounded-2xl bg-black border border-neutral-800 px-4 py-3 text-white resize-y focus:outline-none focus:border-[#d7d2c3]"
        required
      />

      {message && <p className="text-sm text-emerald-400">{message}</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-2xl bg-[#d7d2c3] px-5 py-3 text-black font-semibold hover:bg-[#e4decf] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? 'Sending...' : 'Request a briefing'}
      </button>
    </form>
  );
}
