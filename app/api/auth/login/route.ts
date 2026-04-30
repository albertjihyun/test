import { NextRequest, NextResponse } from 'next/server';
import { RowDataPacket, ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { comparePassword } from '@/lib/password';
import { badRequest, unauthorized } from '@/lib/responses';

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  password_hash: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
};

type LoginBody = {
  email: string;
  password: string;
};

type FailedLoginCountRow = RowDataPacket & {
  failedCount: number;
};

const MAX_FAILED_ATTEMPTS = 5;
const LOCK_WINDOW_MINUTES = 10;

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'unknown';
}

async function writeLoginLog(input: {
  userId: number | null;
  email: string;
  success: boolean;
  reason: string;
  ipAddress: string;
  userAgent: string;
}) {
  await pool.query<ResultSetHeader>(
    `
    INSERT INTO login_logs
      (user_id, email, success, reason, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      input.userId,
      input.email,
      input.success,
      input.reason,
      input.ipAddress,
      input.userAgent
    ]
  );
}

async function getRecentFailedLoginCount(email: string) {
  const [rows] = await pool.query<FailedLoginCountRow[]>(
    `
    SELECT COUNT(*) AS failedCount
    FROM login_logs
    WHERE email = ?
      AND success = false
      AND created_at >= DATE_SUB(NOW(), INTERVAL ? MINUTE)
    `,
    [email, LOCK_WINDOW_MINUTES]
  );

  return Number(rows[0]?.failedCount || 0);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as LoginBody;

  const ipAddress = getClientIp(request);
  const userAgent = request.headers.get('user-agent') || 'unknown';

  if (!body.email || !body.password) {
    await writeLoginLog({
      userId: null,
      email: body.email || '',
      success: false,
      reason: '이메일 또는 비밀번호 누락',
      ipAddress,
      userAgent
    });

    return badRequest('이메일과 비밀번호는 필수입니다.');
  }

  const failedCount = await getRecentFailedLoginCount(body.email);

  if (failedCount >= MAX_FAILED_ATTEMPTS) {
    await writeLoginLog({
      userId: null,
      email: body.email,
      success: false,
      reason: '로그인 실패 횟수 초과',
      ipAddress,
      userAgent
    });

    return unauthorized('로그인 실패 횟수가 많습니다. 잠시 후 다시 시도하세요.');
  }

  const [rows] = await pool.query<UserRow[]>(
    `
    SELECT id, email, password_hash, role, status
    FROM users
    WHERE email = ?
    `,
    [body.email]
  );

  const user = rows[0];

  if (!user) {
    await writeLoginLog({
      userId: null,
      email: body.email,
      success: false,
      reason: '이메일 또는 비밀번호 오류',
      ipAddress,
      userAgent
    });

    return unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  if (user.status !== 'active') {
    await writeLoginLog({
      userId: user.id,
      email: user.email,
      success: false,
      reason: '비활성화된 사용자',
      ipAddress,
      userAgent
    });

    return unauthorized('비활성화된 사용자입니다.');
  }

  const isValid = await comparePassword(body.password, user.password_hash);

  if (!isValid) {
    await writeLoginLog({
      userId: user.id,
      email: user.email,
      success: false,
      reason: '이메일 또는 비밀번호 오류',
      ipAddress,
      userAgent
    });

    return unauthorized('이메일 또는 비밀번호가 올바르지 않습니다.');
  }

  const token = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });

  await writeLoginLog({
    userId: user.id,
    email: user.email,
    success: true,
    reason: '로그인 성공',
    ipAddress,
    userAgent
  });

  const response = NextResponse.json({
    message: '로그인 성공',
    user: {
      id: user.id,
      email: user.email,
      role: user.role
    }
  });

  response.cookies.set(process.env.TOKEN_COOKIE_NAME || 'token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60
  });

  return response;
}
