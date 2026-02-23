import { NextRequest } from 'next/server';
import { createClient } from 'redis';
import { verifyToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const userId = verifyToken(req);
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const responseStream = new TransformStream();
  const writer = responseStream.writable.getWriter();
  const encoder = new TextEncoder();

  // New Redis client for subscription (must be separate from main client)
  const subscriber = createClient({
    url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`
  });

  await subscriber.connect();

  const channel = `notifications:${userId}`;

  // Keep-alive interval
  const keepAlive = setInterval(() => {
    writer.write(encoder.encode(': keep-alive\n\n'));
  }, 30000);

  subscriber.subscribe(channel, (message) => {
    writer.write(encoder.encode(`data: ${message}

`));
  });

  req.signal.addEventListener('abort', () => {
    clearInterval(keepAlive);
    subscriber.unsubscribe(channel);
    subscriber.quit();
    writer.close();
  });

  return new Response(responseStream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
