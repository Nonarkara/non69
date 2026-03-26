import { redirect } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import { getCurrentUser } from '@/lib/auth';

export default async function ThinkPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/access?next=/think');
  }

  return (
    <ChatInterface
      mode="think"
      title="Think Mode"
      subtitle="Present your argument, idea, or decision. The Socratic Engine will stress-test your logic, find hidden assumptions, and push you to think deeper."
      placeholder="Share an argument, belief, or decision you want to stress-test..."
    />
  );
}
