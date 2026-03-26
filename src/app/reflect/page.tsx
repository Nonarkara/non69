import { redirect } from 'next/navigation';
import ChatInterface from '@/components/ChatInterface';
import { getCurrentUser } from '@/lib/auth';

export default async function ReflectPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/access?next=/reflect');
  }

  return (
    <ChatInterface
      mode="reflect"
      title="Reflect Mode"
      subtitle="Write freely — stream of consciousness, journal entry, whatever comes to mind. The AI mirror will reflect back patterns, insights, and questions you may not see yourself."
      placeholder="Start writing... let your thoughts flow without judgment..."
    />
  );
}
