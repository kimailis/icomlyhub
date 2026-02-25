import { Dashboard } from './components/Dashboard';
import { getFeedServer, getTopCelebsServer } from '@/lib/server/api';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const [initialFeed, initialTopCelebs] = await Promise.all([
    getFeedServer(),
    getTopCelebsServer()
  ]);

  return <Dashboard initialFeed={initialFeed} initialTopCelebs={initialTopCelebs} />;
}