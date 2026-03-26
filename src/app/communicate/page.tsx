import { redirect } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import { getCurrentUser } from '@/lib/auth';

export default async function CommunicatePage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/access?next=/communicate');
  }

  return (
    <ChatInterface
      mode="communicate"
      title="Communicate Mode"
      subtitle="Write what you want to express — a message, pitch, email, argument. The engine will analyze the gap between your intent and your words, and coach you toward precision."
      placeholder="Paste or write something you want to communicate more clearly..."
    />
  );
}
