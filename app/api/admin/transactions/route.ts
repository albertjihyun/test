import { NextRequest } from 'next/server';
import { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { forbidden, ok, unauthorized } from '@/lib/responses';

type CountRow = RowDataPacket & {
  totalCount: number;
};

export async function GET(request: NextRequest) {
  const admin = await getSessionUser();

  if (!admin) {
    return unauthorized();
  }

  if (admin.role !== 'admin') {
    return forbidden();
  }

  const searchParams = request.nextUrl.searchParams;

  const page = Number(searchParams.get('page') || 1);
  const limit = Number(searchParams.get('limit') || 10);
  const type = searchParams.get('type') || '';
  const keyword = searchParams.get('keyword') || '';
  const minAmount = searchParams.get('minAmount') || '';
  const maxAmount = searchParams.get('maxAmount') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? limit : 10;
  const offset = (safePage - 1) * safeLimit;

  const whereConditions: string[] = [];
  const whereValues: unknown[] = [];

  if (type === 'deposit' || type === 'withdraw') {
    whereConditions.push('t.transaction_type = ?');
    whereValues.push(type);
  }

  if (keyword) {
    whereConditions.push(
      `(
        u.email LIKE ?
        OR u.name LIKE ?
        OR a.account_number LIKE ?
        OR a.account_name LIKE ?
        OR t.memo LIKE ?
      )`
    );

    whereValues.push(
      `%${keyword}%`,
      `%${keyword}%`,
      `%${keyword}%`,
      `%${keyword}%`,
      `%${keyword}%`
    );
  }

  if (minAmount) {
    whereConditions.push('t.amount >= ?');
    whereValues.push(Number(minAmount));
  }

  if (maxAmount) {
    whereConditions.push('t.amount <= ?');
    whereValues.push(Number(maxAmount));
  }

  if (startDate) {
    whereConditions.push('DATE(t.created_at) >= ?');
    whereValues.push(startDate);
  }

  if (endDate) {
    whereConditions.push('DATE(t.created_at) <= ?');
    whereValues.push(endDate);
  }

  const whereSql =
    whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

  const [countRows] = await pool.query<CountRow[]>(
    `
    SELECT COUNT(*) AS totalCount
    FROM account_transactions t
    JOIN users u ON t.user_id = u.id
    JOIN accounts a ON t.account_id = a.id
    ${whereSql}
    `,
    whereValues
  );

  const totalCount = Number(countRows[0]?.totalCount || 0);
  const totalPages = Math.ceil(totalCount / safeLimit);

  const [rows] = await pool.query(
    `
    SELECT
      t.id,
      t.user_id,
      u.name AS user_name,
      u.email AS user_email,
      t.account_id,
      a.account_number,
      a.account_name,
      t.transaction_type,
      t.amount,
      t.memo,
      t.created_at
    FROM account_transactions t
    JOIN users u ON t.user_id = u.id
    JOIN accounts a ON t.account_id = a.id
    ${whereSql}
    ORDER BY t.id DESC
    LIMIT ? OFFSET ?
    `,
    [...whereValues, safeLimit, offset]
  );

  return ok({
    transactions: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalCount,
      totalPages
    },
    filters: {
      type,
      keyword,
      minAmount,
      maxAmount,
      startDate,
      endDate
    }
  });
}
