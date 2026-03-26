import type { Metadata } from 'next';
import Link from 'next/link';
import ContactForm from '@/components/ContactForm';
import WatchFreshnessPanel from '@/components/WatchFreshnessPanel';
import WatchSignalCard from '@/components/WatchSignalCard';
import { getWatchBundle } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Policy Without Product Is Theater',
  description:
    'DrNon is a public intelligence lab built for people who want signal, receipts, and systems that make civic life more legible.',
  openGraph: {
    title: 'DrNon | Policy Without Product Is Theater',
    description:
      'A manifesto with receipts, plus Thailand Watch: public intelligence for daily urban life.',
  },
};

const receipts = [
  {
    title: 'Built the SLIC index in four hours',
    body: 'Because the usual rankings were prestige cosplay. Product first. Theory later.',
  },
  {
    title: '1.5M THB in one day',
    body: 'Not from a 100-slide deck. From showing a working dashboard once.',
  },
  {
    title: 'European mayors started emailing',
    body: 'Because good civic products travel faster than local excuses.',
  },
  {
    title: '74 AI systems running at home',
    body: 'The point is not hype. The point is to never bet on one horse.',
  },
];

export default async function HomePage() {
  const bundle = getWatchBundle('th');
  const previewSignals = bundle?.signals.slice(0, 4) ?? [];

  return (
    <main className="flex-1">
      <section className="border-b border-neutral-900">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24">
          <div className="max-w-4xl">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">
              DrNon public intelligence lab
            </p>
            <h1 className="mt-6 text-5xl sm:text-7xl font-semibold leading-[0.95] tracking-tight">
              Policy without product is theater.
            </h1>
            <p className="mt-8 max-w-3xl text-lg sm:text-2xl text-neutral-300 leading-8">
              Most civic talk is prestige theater for people who mistake meetings for progress.
              DrNon exists to build sharper systems, clearer thinking, and public tools people
              actually come back to because they help with real life.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href="/watch"
                className="rounded-full bg-[#d7d2c3] px-5 py-3 text-sm font-semibold text-black hover:bg-[#e4decf] transition-colors"
              >
                Open Thailand Watch
              </Link>
              <Link
                href="/philosophy"
                className="rounded-full border border-neutral-700 px-5 py-3 text-sm text-neutral-200 hover:border-neutral-500 hover:text-white transition-colors"
              >
                Read the philosophy
              </Link>
              <Link
                href="/access"
                className="rounded-full border border-neutral-700 px-5 py-3 text-sm text-neutral-200 hover:border-neutral-500 hover:text-white transition-colors"
              >
                Enter the private lab
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-900">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Receipts</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-semibold">If it does not ship, it does not count.</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-neutral-400">
              Not manifesto as decoration. Manifesto plus evidence that the thing works.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {receipts.map(receipt => (
              <article
                key={receipt.title}
                className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6"
              >
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3]">Receipt</div>
                <h3 className="mt-4 text-xl font-semibold">{receipt.title}</h3>
                <p className="mt-3 text-sm leading-7 text-neutral-400">{receipt.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-neutral-900">
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Thailand Watch preview</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-semibold">
                A civic dashboard people return to because it matters.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-neutral-400">
              Curated first. Automated later. The point is usable public intelligence, not fake
              real-time theater.
            </p>
          </div>

          {bundle && (
            <div className="mt-8 rounded-[28px] border border-[#d7d2c3]/20 bg-[#d7d2c3]/6 p-6 sm:p-8">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="max-w-3xl">
                <div className="text-[11px] uppercase tracking-[0.18em] text-[#d7d2c3]">Daily brief</div>
                <h3 className="mt-4 text-2xl sm:text-3xl font-semibold">{bundle.brief.headline}</h3>
                <p className="mt-4 text-sm sm:text-base leading-7 text-neutral-200">{bundle.brief.summary}</p>
                <div className="mt-5 max-w-xl">
                  <WatchFreshnessPanel generatedAt={bundle.generatedAt} mode="compact" />
                </div>
              </div>
              <div className="rounded-2xl border border-[#d7d2c3]/20 bg-black/30 p-4 max-w-md">
                <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Watch next</div>
                  <ul className="mt-3 space-y-2 text-sm text-neutral-300">
                    {bundle.brief.watchouts.map(item => (
                      <li key={item}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            {previewSignals.map(signal => (
              <WatchSignalCard key={signal.slug} signal={signal} compact />
            ))}
          </div>
        </div>
      </section>

      <section>
        <div className="max-w-6xl mx-auto px-4 py-14">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Work with DrNon</p>
              <h2 className="mt-3 text-3xl sm:text-4xl font-semibold">
                Need a dashboard, a public intelligence system, or a civic product that actually works?
              </h2>
              <p className="mt-5 max-w-2xl text-base leading-8 text-neutral-300">
                This is for mayors, operators, journalists, civic teams, and builders who are done
                with prestige theater. Say what needs to be made more legible, more useful, or more
                powerful in public life.
              </p>
            </div>

            <div className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
