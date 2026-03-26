'use client';

import Link from 'next/link';
import { useState } from 'react';
import WatchFreshnessPanel from './WatchFreshnessPanel';

interface WatchSource {
  label: string;
  url: string;
  note: string;
}

interface WatchSignal {
  slug: string;
  title: string;
  status: string;
  summary: string;
  whyItMatters: string;
  whatToDo: string;
  updatedAt: string;
  sources: WatchSource[];
  metricText: string;
  trendText: string;
}

interface WatchBundle {
  geography: string;
  generatedAt: string;
  brief: {
    headline: string;
    summary: string;
    watchouts: string[];
    updatedAt: string;
  };
  signals: WatchSignal[];
}

interface WatchStatusSummary {
  worstStatus: string;
  counts: Record<string, number>;
}

interface WatchRevisionSummary {
  id: number;
  geography: string;
  version: number;
  action: 'publish' | 'rollback';
  headline: string;
  statusSummary: WatchStatusSummary;
  actor: {
    id: number;
    displayName: string;
  } | null;
  restoredFromRevisionId: number | null;
  restoredFromRevisionVersion: number | null;
  createdAt: string;
}

interface WatchMutationResult {
  bundle: WatchBundle;
  revision: WatchRevisionSummary;
}

interface EditableSignal extends WatchSignal {
  sourcesText: string;
}

interface EditableBundle {
  geography: string;
  generatedAt: string;
  brief: {
    headline: string;
    summary: string;
    watchoutsText: string;
    updatedAt: string;
  };
  signals: EditableSignal[];
}

interface WatchPublisherProps {
  initialBundle: WatchBundle;
  initialRevisions: WatchRevisionSummary[];
}

const STATUS_OPTIONS = ['high', 'elevated', 'watch', 'mixed', 'active'] as const;
const STATUS_ORDER: Record<string, number> = {
  high: 0,
  elevated: 1,
  active: 2,
  watch: 3,
  mixed: 4,
};
const STATUS_STYLES: Record<string, string> = {
  high: 'border-red-500/30 bg-red-500/15 text-red-300',
  elevated: 'border-amber-500/30 bg-amber-500/15 text-amber-300',
  watch: 'border-sky-500/30 bg-sky-500/15 text-sky-300',
  mixed: 'border-neutral-600 bg-neutral-700/30 text-neutral-300',
  active: 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300',
};

function formatSources(sources: WatchSource[]) {
  return sources.map(source => `${source.label} | ${source.url} | ${source.note}`).join('\n');
}

function toEditableBundle(bundle: WatchBundle): EditableBundle {
  return {
    geography: bundle.geography,
    generatedAt: bundle.generatedAt,
    brief: {
      headline: bundle.brief.headline,
      summary: bundle.brief.summary,
      watchoutsText: bundle.brief.watchouts.join('\n'),
      updatedAt: bundle.brief.updatedAt,
    },
    signals: bundle.signals.map(signal => ({
      ...signal,
      sourcesText: formatSources(signal.sources),
    })),
  };
}

function parseWatchouts(text: string) {
  return text
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);
}

function parseSources(text: string, title: string): WatchSource[] {
  const lines = text
    .split('\n')
    .map(item => item.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    throw new Error(`${title} needs at least one source.`);
  }

  return lines.map(line => {
    const parts = line.split('|').map(item => item.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) {
      throw new Error(`${title} has an invalid source line: ${line}`);
    }

    return {
      label: parts[0],
      url: parts[1],
      note: parts.slice(2).join(' | '),
    };
  });
}

function sortStatusCounts(counts: Record<string, number>) {
  return Object.entries(counts).sort(
    ([left], [right]) => (STATUS_ORDER[left] ?? 99) - (STATUS_ORDER[right] ?? 99)
  );
}

export default function WatchPublisher({
  initialBundle,
  initialRevisions,
}: WatchPublisherProps) {
  const [bundle, setBundle] = useState<EditableBundle>(() => toEditableBundle(initialBundle));
  const [revisions, setRevisions] = useState(initialRevisions);
  const [isSaving, setIsSaving] = useState(false);
  const [workingRevisionId, setWorkingRevisionId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  function updateBrief(field: 'headline' | 'summary' | 'watchoutsText', value: string) {
    setBundle(prev => ({
      ...prev,
      brief: {
        ...prev.brief,
        [field]: value,
      },
    }));
  }

  function updateSignal(
    slug: string,
    field:
      | 'status'
      | 'summary'
      | 'whyItMatters'
      | 'whatToDo'
      | 'metricText'
      | 'trendText'
      | 'sourcesText',
    value: string
  ) {
    setBundle(prev => ({
      ...prev,
      signals: prev.signals.map(signal =>
        signal.slug === slug ? { ...signal, [field]: value } : signal
      ),
    }));
  }

  function applyMutationResult(result: WatchMutationResult, nextMessage: string) {
    setBundle(toEditableBundle(result.bundle));
    setRevisions(prev => [result.revision, ...prev.filter(revision => revision.id !== result.revision.id)]);
    setSuccess(nextMessage);
    setError('');
  }

  async function handlePublish() {
    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const watchouts = parseWatchouts(bundle.brief.watchoutsText);
      if (watchouts.length === 0) {
        throw new Error('Daily brief needs at least one watchout.');
      }

      const payload = {
        geography: bundle.geography,
        brief: {
          headline: bundle.brief.headline.trim(),
          summary: bundle.brief.summary.trim(),
          watchouts,
        },
        signals: bundle.signals.map(signal => ({
          slug: signal.slug,
          status: signal.status,
          summary: signal.summary.trim(),
          whyItMatters: signal.whyItMatters.trim(),
          whatToDo: signal.whatToDo.trim(),
          metricText: signal.metricText.trim(),
          trendText: signal.trendText.trim(),
          sources: parseSources(signal.sourcesText, signal.title),
        })),
      };

      if (!payload.brief.headline || !payload.brief.summary) {
        throw new Error('Daily brief headline and summary are required.');
      }

      const response = await fetch('/api/watch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => null);

      if (!response) {
        throw new Error('Could not reach the watch publishing endpoint.');
      }

      const data = (await response.json().catch(() => null)) as WatchMutationResult | { error?: string } | null;
      if (!response.ok || !data || !('bundle' in data) || !('revision' in data)) {
        throw new Error((data && 'error' in data && data.error) || 'Could not publish Thailand Watch.');
      }

      applyMutationResult(data, `Published Thailand Watch as v${data.revision.version}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not publish Thailand Watch.');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRestore(revision: WatchRevisionSummary) {
    if (isSaving || workingRevisionId === revision.id) {
      return;
    }

    const confirmed = window.confirm(
      `Restore v${revision.version}?\n\n"${revision.headline}"\n\nThis will republish that snapshot as a new current revision.`
    );
    if (!confirmed) {
      return;
    }

    setWorkingRevisionId(revision.id);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/watch/revisions/${revision.id}/restore`, {
        method: 'POST',
      }).catch(() => null);

      if (!response) {
        throw new Error('Could not reach the watch restore endpoint.');
      }

      const data = (await response.json().catch(() => null)) as WatchMutationResult | { error?: string } | null;
      if (!response.ok || !data || !('bundle' in data) || !('revision' in data)) {
        throw new Error((data && 'error' in data && data.error) || 'Could not restore watch revision.');
      }

      applyMutationResult(
        data,
        `Restored v${revision.version} as current v${data.revision.version}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore watch revision.');
    } finally {
      setWorkingRevisionId(null);
    }
  }

  const currentRevision = revisions[0] ?? null;

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-[#d7d2c3]/20 bg-[#d7d2c3]/6 p-6 sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">Watch publisher</p>
            <h1 className="mt-4 text-4xl sm:text-5xl font-semibold leading-[0.96] tracking-tight">
              Publish the daily brief and the six signals from one place.
            </h1>
            <p className="mt-5 text-base leading-8 text-neutral-200">
              This is the control surface. Update the brief, adjust status posture, tighten the
              action guidance, and publish without touching the database directly.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/ops"
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
            >
              Back to ops
            </Link>
            <Link
              href="/watch"
              className="rounded-full border border-neutral-700 px-4 py-2 text-sm text-neutral-300 hover:text-white hover:border-neutral-500 transition-colors"
            >
              Open public watch
            </Link>
            <button
              type="button"
              onClick={handlePublish}
              disabled={isSaving}
              className="rounded-full bg-[#d7d2c3] px-5 py-2 text-sm font-semibold text-black hover:bg-[#e4decf] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? 'Publishing...' : 'Publish Thailand Watch'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-neutral-500">
          <span>Geography {bundle.geography.toUpperCase()}</span>
          {currentRevision && <span>Current version v{currentRevision.version}</span>}
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <div className="mt-5">
          <WatchFreshnessPanel
            generatedAt={bundle.generatedAt}
            currentVersion={currentRevision?.version ?? null}
            revisionCount={revisions.length}
            mode="ops"
          />
        </div>
      </section>

      <section className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Daily brief</p>
        <div className="mt-6 grid gap-5">
          <div>
            <label className="block text-xs uppercase tracking-[0.18em] text-neutral-500">
              Headline
            </label>
            <input
              value={bundle.brief.headline}
              onChange={event => updateBrief('headline', event.target.value)}
              className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.18em] text-neutral-500">
              Summary
            </label>
            <textarea
              value={bundle.brief.summary}
              onChange={event => updateBrief('summary', event.target.value)}
              rows={5}
              className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
            />
          </div>
          <div>
            <label className="block text-xs uppercase tracking-[0.18em] text-neutral-500">
              Watch next
            </label>
            <textarea
              value={bundle.brief.watchoutsText}
              onChange={event => updateBrief('watchoutsText', event.target.value)}
              rows={4}
              className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
            />
            <p className="mt-2 text-xs text-neutral-500">One watchout per line.</p>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Signal pack</p>
          <h2 className="mt-3 text-2xl font-semibold">Six signals. Keep them sharp.</h2>
        </div>

        {bundle.signals.map(signal => (
          <article
            key={signal.slug}
            className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8"
          >
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">
                  {signal.slug}
                </div>
                <h3 className="mt-3 text-2xl font-semibold">{signal.title}</h3>
              </div>

              <label className="text-sm text-neutral-400">
                Status
                <select
                  value={signal.status}
                  onChange={event => updateSignal(signal.slug, 'status', event.target.value)}
                  className="mt-2 block rounded-xl border border-neutral-800 bg-black px-3 py-2 text-white focus:outline-none focus:border-[#d7d2c3]"
                >
                  {STATUS_OPTIONS.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-2">
              <div className="lg:col-span-2">
                <label className="block text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Summary
                </label>
                <textarea
                  value={signal.summary}
                  onChange={event => updateSignal(signal.slug, 'summary', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Why it matters
                </label>
                <textarea
                  value={signal.whyItMatters}
                  onChange={event => updateSignal(signal.slug, 'whyItMatters', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.18em] text-neutral-500">
                  What to do
                </label>
                <textarea
                  value={signal.whatToDo}
                  onChange={event => updateSignal(signal.slug, 'whatToDo', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Metric text
                </label>
                <textarea
                  value={signal.metricText}
                  onChange={event => updateSignal(signal.slug, 'metricText', event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Trend text
                </label>
                <textarea
                  value={signal.trendText}
                  onChange={event => updateSignal(signal.slug, 'trendText', event.target.value)}
                  rows={3}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
                />
              </div>
              <div className="lg:col-span-2">
                <label className="block text-xs uppercase tracking-[0.18em] text-neutral-500">
                  Sources
                </label>
                <textarea
                  value={signal.sourcesText}
                  onChange={event => updateSignal(signal.slug, 'sourcesText', event.target.value)}
                  rows={4}
                  className="mt-2 w-full rounded-2xl border border-neutral-800 bg-black px-4 py-3 text-white focus:outline-none focus:border-[#d7d2c3]"
                />
                <p className="mt-2 text-xs text-neutral-500">
                  One source per line, using `Label | URL | Note`.
                </p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-neutral-600">Revision history</p>
            <h2 className="mt-3 text-2xl font-semibold">Immutable publish and rollback trail</h2>
          </div>
          <div className="text-xs uppercase tracking-[0.18em] text-neutral-600">
            {revisions.length} revision{revisions.length === 1 ? '' : 's'}
          </div>
        </div>

        {revisions.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-neutral-800 p-6 text-sm text-neutral-400">
            No revisions yet. Publish the current watch once to create the baseline history.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {revisions.map((revision, index) => {
              const current = index === 0;
              const worstStyle =
                STATUS_STYLES[revision.statusSummary.worstStatus] || STATUS_STYLES.mixed;

              return (
                <article key={revision.id} className="rounded-2xl border border-neutral-900 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-neutral-800 bg-neutral-900 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-300">
                          v{revision.version}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${
                            revision.action === 'rollback'
                              ? 'border-sky-500/30 bg-sky-500/15 text-sky-300'
                              : 'border-[#d7d2c3]/30 bg-[#d7d2c3]/10 text-[#d7d2c3]'
                          }`}
                        >
                          {revision.action}
                        </span>
                        {current && (
                          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-emerald-300">
                            Current
                          </span>
                        )}
                      </div>

                      <h3 className="mt-4 text-lg font-semibold">{revision.headline}</h3>

                      <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-neutral-400">
                        <span>
                          {new Date(revision.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                        <span>{revision.actor?.displayName ?? 'Unknown admin'}</span>
                        {revision.restoredFromRevisionVersion && (
                          <span>Restored from v{revision.restoredFromRevisionVersion}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <a
                        href={`/api/watch/revisions/${revision.id}/export`}
                        className="rounded-full border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:border-neutral-600 transition-colors"
                      >
                        Export JSON
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRestore(revision)}
                        disabled={current || workingRevisionId === revision.id}
                        className="rounded-full border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 hover:text-white hover:border-neutral-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        {current
                          ? 'Current'
                          : workingRevisionId === revision.id
                            ? 'Restoring...'
                            : 'Restore'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <div className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${worstStyle}`}>
                      {revision.statusSummary.worstStatus}
                    </div>
                    {sortStatusCounts(revision.statusSummary.counts).map(([status, count]) => {
                      const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.mixed;

                      return (
                        <div
                          key={status}
                          className={`rounded-full border px-3 py-1 text-xs uppercase tracking-[0.18em] ${statusStyle}`}
                        >
                          {status} {count}
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
