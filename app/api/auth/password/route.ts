import { NextRequest } from 'next/server';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { comparePassword, hashPassword } from '@/lib/password';
import { badRequest, ok, unauthorized } from '@/lib/responses';

type UserPasswordRow = RowDataPacket & {
  id: number;
  password_hash: string;
};

type ChangePasswordBody = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export async function PUT(request: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return unauthorized();
  }

  const body = (await request.json()) as ChangePasswordBody;

  if (!body.currentPassword || !body.newPassword || !body.confirmPassword) {
    return badRequest('현재 비밀번호, 새 비밀번호, 새 비밀번호 확인은 필수입니다.');
  }

  if (body.newPassword !== body.confirmPassword) {
    return badRequest('새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.');
  }

  if (body.newPassword.length < 4) {
    return badRequest('새 비밀번호는 4자 이상이어야 합니다.');
  }

  if (body.currentPassword === body.newPassword) {
    return badRequest('새 비밀번호는 현재 비밀번호와 달라야 합니다.');
  }

  const [rows] = await pool.query<UserPasswordRow[]>(
    `
    SELECT id, password_hash
    FROM users
    WHERE id = ?
    `,
    [user.userId]
  );

  const currentUser = rows[0];

  if (!currentUser) {
    return unauthorized();
  }

  const isCurrentPasswordValid = await comparePassword(
    body.currentPassword,
    currentUser.password_hash
  );

  if (!isCurrentPasswordValid) {
    return badRequest('현재 비밀번호가 올바르지 않습니다.');
  }

  const newPasswordHash = await hashPassword(body.newPassword);

  await pool.query<ResultSetHeader>(
    `
    UPDATE users
    SET password_hash = ?
    WHERE id = ?
    `,
    [newPasswordHash, user.userId]
  );

  return ok({
    message: '비밀번호가 변경되었습니다.'
  });
}
