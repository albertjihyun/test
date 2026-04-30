import { NextRequest } from 'next/server';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { badRequest, ok, unauthorized } from '@/lib/responses';

type ProfileRow = RowDataPacket & {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
  created_at: string;
};

type UpdateProfileBody = {
  name: string;
};

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return unauthorized();
  }

  const [rows] = await pool.query<ProfileRow[]>(
    `
    SELECT
      id,
      name,
      email,
      role,
      status,
      created_at
    FROM users
    WHERE id = ?
    `,
    [user.userId]
  );

  const profile = rows[0];

  if (!profile) {
    return unauthorized();
  }

  return ok({
    profile
  });
}

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return unauthorized();
  }

  const body = (await request.json()) as UpdateProfileBody;

  if (!body.name) {
    return badRequest('이름은 필수입니다.');
  }

  if (body.name.trim().length < 2) {
    return badRequest('이름은 2자 이상 입력해야 합니다.');
  }

  await pool.query<ResultSetHeader>(
    `
    UPDATE users
    SET name = ?
    WHERE id = ?
    `,
    [body.name.trim(), user.userId]
  );

  return ok({
    message: '내 정보가 수정되었습니다.'
  });
}
