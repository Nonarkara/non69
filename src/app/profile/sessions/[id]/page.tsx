import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ShareButton from '@/components/ShareButton';
import { getCurrentUser } from '@/lib/auth';
import { getConversationByIdForUser } from '@/lib/db';

export const metadata: Metadata = {
  title: 'Session',
  description: 'A saved DrNon lab session with full transcript and resume controls.',
};

const modeLabels = {
  think: 'Think',
  communicate: 'Communicate',
  reflect: 'Reflect',
} as const;

export const dynamic = 'force-dynamic';

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/access?next=/profile');
  }

  const { id } = await params;
  const conversationId = Number(id);

  if (!Number.isInteger(conversationId) || conversationId <= 0) {
    notFound();
  }

  const conversation = getConversationByIdForUser(user.id, conversationId);
  if (!conversation) {
    notFound();
  }

  const lastAssistantMessage = [...conversation.messages]
    .reverse()
    .find(message => message.role === 'assistant');

  return (
    <main className="flex-1">
      <div className="max-w-4xl mx-auto px-4 py-14">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Link
              href="/profile"
              className="text-sm text-neutral-500 hover:text-white transition-colors"
            >
              Back to profile
            </Link>
            <div className="mt-4 inline-flex rounded-full border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs uppercase tracking-[0.18em] text-neutral-400">
              {modeLabels[conversation.mode]}
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-semibold leading-tight">
              {conversation.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-neutral-400">
              Full transcript, with the option to jump back into the lab and keep pushing the same
              line of thought instead of starting from scratch like an amateur.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/${conversation.mode}?session=${conversation.id}`}
              className="rounded-full bg-[#d7d2c3] px-4 py-2 text-sm font-medium text-black hover:bg-[#e4decf] transition-colors"
            >
              Resume session
            </Link>
            {lastAssistantMessage && (
              <ShareButton
                payload={{
                  kind: 'lab',
                  mode: conversation.mode,
                  summary: lastAssistantMessage.content.slice(0, 480),
                }}
              />
            )}
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-neutral-800 bg-neutral-950 p-5 sm:p-6">
          <div className="flex flex-wrap items-center gap-4 text-xs uppercase tracking-[0.18em] text-neutral-600">
            <span>{conversation.messages.length} messages</span>
            <span>
              Created{' '}
              {new Date(conversation.createdAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
            <span>
              Updated{' '}
              {new Date(conversation.updatedAt).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {conversation.messages.map((message, index) => (
            <article
              key={`${message.role}-${index}`}
              className={`rounded-[28px] border p-5 sm:p-6 ${
                message.role === 'user'
                  ? 'border-neutral-700 bg-white text-black'
                  : 'border-neutral-800 bg-neutral-950 text-white'
              }`}
            >
              <div
                className={`text-[11px] uppercase tracking-[0.18em] ${
                  message.role === 'user' ? 'text-black/55' : 'text-neutral-500'
                }`}
              >
                {message.role === 'user' ? 'You' : 'DrNon'}
              </div>
              <div className="mt-3 whitespace-pre-wrap text-[15px] leading-8">
                {message.content}
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
