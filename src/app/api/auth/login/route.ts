import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, verifyPassword } from '@/lib/auth/db';
import { signToken } from '@/lib/auth/token';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { email?: string; password?: string };
    const email    = (body.email ?? '').trim().toLowerCase();
    const password = body.password ?? '';

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 });
    }

    const user = getUserByEmail(email);

    if (!user || !user.is_active) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    const valid = verifyPassword(password, user.pwd_hash, user.pwd_salt);
    if (!valid) {
      return NextResponse.json({ message: 'Invalid credentials.' }, { status: 401 });
    }

    const token = signToken({ sub: user.id, name: user.name, email: user.email, role: user.role });

    return NextResponse.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    console.error('[POST /api/auth/login]', err);
    return NextResponse.json({ message: 'Internal server error.' }, { status: 500 });
  }
}
