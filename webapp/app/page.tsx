import { Dashboard } from './components/Dashboard';
import { getFeedServer, getTopCelebsServer } from '@/lib/server/api';
import { Suspense } from 'react';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const cookieStore = await cookies();
  const plan = cookieStore.get('plan')?.value || 'free';

  const [initialFeed, initialTopCelebs] = await Promise.all([
    getFeedServer(plan),
    getTopCelebsServer(plan)
  ]);

  return (
    <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-gray-400 space-y-4">
            <div className="animate-spin h-10 w-10 border-t-2 border-primary rounded-full"></div>
            <p className="text-sm font-mono tracking-widest uppercase animate-pulse">Initializing Dashboard...</p>
        </div>
    }>
        <Dashboard initialFeed={initialFeed} initialTopCelebs={initialTopCelebs} />
    </Suspense>
  );
}