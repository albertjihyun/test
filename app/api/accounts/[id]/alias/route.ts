import { NextRequest } from 'next/server';
import { ResultSetHeader } from 'mysql2';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { badRequest, ok, unauthorized } from '@/lib/responses';

type UpdateAliasBody = {
  accountName: string;
};

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();

  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const accountId = Number(id);

  if (!accountId) {
    return badRequest('계좌 ID가 올바르지 않습니다.');
  }

  const body = (await request.json()) as UpdateAliasBody;

  if (!body.accountName) {
    return badRequest('계좌명은 필수입니다.');
  }

  if (body.accountName.trim().length < 2) {
    return badRequest('계좌명은 2자 이상 입력해야 합니다.');
  }

  const [result] = await pool.query<ResultSetHeader>(
    `
    UPDATE accounts
    SET account_name = ?
    WHERE id = ? AND user_id = ?
    `,
    [body.accountName.trim(), accountId, user.userId]
  );

  if (result.affectedRows === 0) {
    return badRequest('수정 가능한 계좌가 없습니다.');
  }

  return ok({
    message: '계좌 별칭이 변경되었습니다.'
  });
}
