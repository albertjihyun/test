import { NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { badRequest, ok, unauthorized } from '@/lib/responses';

type CountRow = RowDataPacket & {
  totalCount: number;
};

export async function GET(
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

  const searchParams = request.nextUrl.searchParams;

  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 10);

  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? limit : 10;
  const offset = (safePage - 1) * safeLimit;

  const [accountRows] = await pool.query<RowDataPacket[]>(
    `
    SELECT id
    FROM accounts
    WHERE id = ? AND user_id = ?
    `,
    [accountId, user.userId]
  );

  if (accountRows.length === 0) {
    return badRequest('조회 가능한 계좌가 없습니다.');
  }

  const [countRows] = await pool.query<CountRow[]>(
    `
    SELECT COUNT(*) AS totalCount
    FROM account_transactions
    WHERE account_id = ? AND user_id = ?
    `,
    [accountId, user.userId]
  );

  const totalCount = Number(countRows[0]?.totalCount || 0);
  const totalPages = Math.ceil(totalCount / safeLimit);

  const [rows] = await pool.query(
    `
    SELECT
      id,
      account_id,
      transaction_type,
      amount,
      memo,
      created_at
    FROM account_transactions
    WHERE account_id = ? AND user_id = ?
    ORDER BY id DESC
    LIMIT ? OFFSET ?
    `,
    [accountId, user.userId, safeLimit, offset]
  );

  return ok({
    transactions: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalCount,
      totalPages
    }
  });
}
