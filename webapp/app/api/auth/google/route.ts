import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { emailService } from '@/lib/services/email.service';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { credential } = body;
    
    if (!credential) {
      console.warn('[Google Auth] Missing credential');
      return NextResponse.json({ message: 'Missing Google credential' }, { status: 400 });
    }

    // Verify Google ID Token
    console.log('[Google Auth] Verifying ID token...');
    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      console.warn('[Google Auth] Invalid payload or missing email');
      return NextResponse.json({ message: 'Invalid Google token payload' }, { status: 400 });
    }

    const { email, name, picture } = payload;
    console.log(`[Google Auth] Payload verified for: ${email}`);

    // Find or create user
    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log(`[Google Auth] User not found, creating: ${email}`);
      // Create user with a random password as it's required in schema
      const randomPassword = crypto.randomBytes(32).toString('hex');
      
      try {
          console.log(`[Google Auth] Hashing password for: ${email}`);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);
          
          console.log(`[Google Auth] Executing prisma.user.create for: ${email}`);
          user = await prisma.user.create({
            data: {
              email,
              name: name || email.split('@')[0],
              password: hashedPassword,
              role: 'free',
              profilePath: picture,
            },
          });
          console.log(`[Google Auth] User created: ${user.id}`);
      } catch (createError: any) {
          console.error('[Google Auth] Error during user creation:', createError);
          return NextResponse.json({ message: 'Failed to create user', error: createError.message }, { status: 500 });
      }
    } else {
        console.log(`[Google Auth] Existing user found: ${user.id}`);
    }

    console.log(`[Google Auth] Generating JWT for: ${email}`);
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    // Sync with Email Service (SMTP microservice)
    try {
      const prefs = user.notificationSettings ? JSON.parse(user.notificationSettings) : {};
      await emailService.subscribe(user.email, user.name || user.email.split('@')[0], {
        weekly_digest: prefs.weeklyDigest !== false,
        gossip_updates: prefs.gossipUpdates !== false,
        notifications: prefs.notifications !== false
      });
    } catch (syncError) {
      console.error('[Google Auth API] Failed to sync with Email Service:', syncError);
    }

    // Return user without password
    const { password: _, role, ...userWithoutPassword } = user;
    
    console.log(`[Google Auth] Authentication successful for: ${email}`);
    return NextResponse.json({
        token,
        user: {
            ...userWithoutPassword,
            plan: role,
            following: [], // Could be fetched from DB if needed
            notificationSettings: user.notificationSettings ? JSON.parse(user.notificationSettings) : {}
        }
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Google authentication failed';
    console.error('[Google Auth] Fatal error:', message);
    if (error instanceof Error && error.stack) {
        console.error(error.stack);
    }
    return NextResponse.json({ message: 'Google authentication failed', error: message }, { status: 500 });
  }
}
