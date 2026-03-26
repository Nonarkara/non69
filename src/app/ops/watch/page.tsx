import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import WatchPublisher from '@/components/WatchPublisher';
import { getCurrentUser, isAdminUser } from '@/lib/auth';
import { getWatchBundle, listWatchRevisions } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Watch Publisher',
  description: 'Admin publishing surface for the Thailand Watch brief and signal pack.',
};

export const dynamic = 'force-dynamic';

export default async function WatchPublisherPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/access?next=/ops/watch');
  }

  if (!isAdminUser(user)) {
    notFound();
  }

  const bundle = await getWatchBundle('th');
  const revisions = await listWatchRevisions('th');
  if (!bundle) {
    notFound();
  }

  return (
    <main className="flex-1">
      <div className="max-w-6xl mx-auto px-4 py-14">
        <WatchPublisher initialBundle={bundle} initialRevisions={revisions} />
      </div>
    </main>
  );
}
