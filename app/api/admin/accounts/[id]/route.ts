import { NextRequest } from 'next/server';
import { ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { badRequest, forbidden, ok, unauthorized } from '@/lib/responses';

type UpdateAccountStatusBody = {
  status: 'active' | 'closed';
};

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const admin = await getSessionUser();

  if (!admin) {
    return unauthorized();
  }

  if (admin.role !== 'admin') {
    return forbidden();
  }

  const { id } = await context.params;
  const accountId = Number(id);

  if (!accountId) {
    return badRequest('계좌 ID가 올바르지 않습니다.');
  }

  const body = (await request.json()) as UpdateAccountStatusBody;

  if (body.status !== 'active' && body.status !== 'closed') {
    return badRequest('계좌 상태 값이 올바르지 않습니다.');
  }

  await pool.query<ResultSetHeader>(
    `
    UPDATE accounts
    SET status = ?
    WHERE id = ?
    `,
    [body.status, accountId]
  );

  return ok({
    message: '계좌 상태가 변경되었습니다.'
  });
}
