import { NextRequest } from 'next/server';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { ok, unauthorized } from '@/lib/responses';

export async function GET(request: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return unauthorized();
  }

  const searchParams = request.nextUrl.searchParams;
  const limit = Number(searchParams.get('limit') || 5);
  const safeLimit = limit > 0 && limit <= 20 ? limit : 5;

  const [rows] = await pool.query(
    `
    SELECT
      t.id,
      t.account_id,
      a.account_name,
      a.account_number,
      t.transaction_type,
      t.amount,
      t.memo,
      t.created_at
    FROM account_transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE t.user_id = ?
    ORDER BY t.id DESC
    LIMIT ?
    `,
    [user.userId, safeLimit]
  );

  return ok({
    transactions: rows
  });
}
