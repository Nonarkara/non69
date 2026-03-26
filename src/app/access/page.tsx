import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import AuthPanel from '@/components/AuthPanel';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Access',
  description:
    'Sign in to use the private DrNon lab: Think, Communicate, Reflect, and persistent profile memory.',
};

export default async function AccessPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;
  if (user) {
    redirect(params.next || '/cockpit');
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 py-16 sm:py-24 grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-start">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#d7d2c3]">Private lab access</p>
          <h1 className="mt-6 text-5xl sm:text-6xl font-semibold leading-[0.96] tracking-tight">
            Think harder. Write cleaner. Keep the receipts.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-neutral-300">
            The public side is for signal. The private side is for leverage. Sign in to use
            `Think`, `Communicate`, `Reflect`, `Daily Challenge`, `Arena`, and `Simulate`, and to
            save the work into your profile memory.
          </p>
        </div>

        <AuthPanel />
      </div>
    </main>
  );
}
