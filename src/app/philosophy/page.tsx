import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Philosophy',
  description:
    'The DrNon philosophy: cities for people, incentives over theater, and product as the argument.',
  openGraph: {
    title: 'DrNon | Philosophy',
    description:
      'Cities are for people, not prestige. Build the thing first, then let the thing argue.',
  },
};

const sections = [
  {
    title: 'Cities are for people, not prestige.',
    body:
      'GDP per capita is a nice party trick until rent, stress, heat, dirty air, and broken mobility eat your actual life. A serious city product starts with lived friction, not vanity metrics.',
  },
  {
    title: 'Policy without product is theater.',
    body:
      'If you need 64 signatures before anyone can feel the benefit, the system is designed to kill innovation. Build a working thing. Let the thing expose the bureaucratic absurdity by existing.',
  },
  {
    title: 'Incentives drive everything.',
    body:
      'Mayors want reelection. Staff want promotions. Citizens want dignity and responsiveness. Good systems stop moralizing and align those incentives with visible outcomes.',
  },
  {
    title: 'Open source or shut up.',
    body:
      'If a public-interest system cannot be rebuilt after a breach, procurement disaster, or political tantrum, it is not serious. Every important system should have a path back from failure.',
  },
];

export default function PhilosophyPage() {
  return (
    <main className="flex-1">
      <section className="border-b border-neutral-900">
        <div className="max-w-5xl mx-auto px-4 py-16 sm:py-24">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">Manifesto plus receipts</p>
          <h1 className="mt-6 text-5xl sm:text-7xl font-semibold leading-[0.95] tracking-tight">
            Build first. Ask forgiveness later.
          </h1>
          <p className="mt-8 max-w-3xl text-lg sm:text-2xl text-neutral-300 leading-8">
            DrNon is not trying to become another polite civic consultancy. The entire point is to
            make public systems more legible, more responsive, and more useful by shipping products
            that force reality into the room.
          </p>
        </div>
      </section>

      <section className="border-b border-neutral-900">
        <div className="max-w-5xl mx-auto px-4 py-14 grid gap-5">
          {sections.map(section => (
            <article
              key={section.title}
              className="rounded-[28px] border border-neutral-800 bg-neutral-950 p-6 sm:p-8"
            >
              <h2 className="text-2xl font-semibold">{section.title}</h2>
              <p className="mt-4 text-base leading-8 text-neutral-300">{section.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section>
        <div className="max-w-5xl mx-auto px-4 py-14">
          <div className="rounded-[28px] border border-[#d7d2c3]/20 bg-[#d7d2c3]/6 p-6 sm:p-8">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">Now prove it</p>
            <h2 className="mt-3 text-3xl font-semibold">A worldview is cheap. A working system is expensive.</h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-neutral-200">
              Thailand Watch is the first public proof surface in this MVP. The private lab is the
              second. One makes public life more legible. The other sharpens the people doing the work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/watch"
                className="rounded-full bg-[#d7d2c3] px-5 py-3 text-sm font-semibold text-black hover:bg-[#e4decf] transition-colors"
              >
                Open Thailand Watch
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
    </main>
  );
}
