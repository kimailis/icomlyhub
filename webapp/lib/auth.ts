import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET is required');

export async function getTokenFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get('auth_token')?.value;
}

export function verifyTokenSync(token: string | null) {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch (e) {
    return null;
  }
}

export async function verifyToken(req: Request) {
  let token: string | null = null;
  
  // Try Authorization header first
  const authHeader = req.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  }

  // Fallback to cookies (for SSR and standard requests)
  if (!token) {
    token = await getTokenFromCookies();
  }

  // Fallback to query parameter (useful for SSE)
  if (!token) {
    const url = new URL(req.url);
    token = url.searchParams.get('token');
  }

  return verifyTokenSync(token);
}
