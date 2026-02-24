import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    console.log(`[Login] Attempt for: ${email}`);
    
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      console.log(`[Login] User not found: ${email}`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`[Login] Password mismatch for: ${email}`);
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    console.log(`[Login] Success for: ${email}`);
    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    
    // Return user without password, mapping role to plan
    const { password: _, role, ...userWithoutPassword } = user;
    
    return NextResponse.json({
        token,
        user: {
            ...userWithoutPassword,
            plan: role,
            following: [], 
            notificationSettings: user.notificationSettings ? JSON.parse(user.notificationSettings) : {}
        }
    });
  } catch (error) {
    return NextResponse.json({ message: 'Login failed', error }, { status: 500 });
  }
}