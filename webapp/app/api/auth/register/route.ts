import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { emailService } from '@/lib/services/email.service';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json({ message: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        role: 'free'
      }
    });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    // Sync with Email Service (SMTP microservice)
    try {
      await emailService.subscribe(user.email, user.name || user.email.split('@')[0], {
        weekly_digest: true,
        gossip_updates: true,
        notifications: true
      });
      
      // Also send a welcome email
      await emailService.sendWelcomeEmail(user.email, user.name || user.email.split('@')[0]);
    } catch (syncError) {
      console.error('[Register API] Failed to sync with Email Service:', syncError);
    }

    // Return user without password, mapping role to plan
    const { password: _, role, ...userWithoutPassword } = user;
    
    return NextResponse.json({
        token,
        user: {
            ...userWithoutPassword,
            plan: role,
            following: [],
            notificationSettings: {}
        }
    }, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ message: 'Registration failed', error }, { status: 500 });
  }
}
