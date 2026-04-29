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
  const keyword = searchParams.get('keyword') || '';
  const status = searchParams.get('status') || '';

  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? limit : 10;
  const offset = (safePage - 1) * safeLimit;

  const whereConditions: string[] = [];
  const whereValues: unknown[] = [];

  if (keyword) {
    whereConditions.push(
      `(u.email LIKE ? OR u.name LIKE ? OR a.account_number LIKE ? OR a.account_name LIKE ?)`
    );
    whereValues.push(
      `%${keyword}%`,
      `%${keyword}%`,
      `%${keyword}%`,
      `%${keyword}%`
    );
  }

  if (status === 'active' || status === 'closed') {
    whereConditions.push('a.status = ?');
    whereValues.push(status);
  }

  const whereSql =
    whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

  const [countRows] = await pool.query<CountRow[]>(
    `
    SELECT COUNT(*) AS totalCount
    FROM accounts a
    JOIN users u ON a.user_id = u.id
    ${whereSql}
    `,
    whereValues
  );

  const totalCount = Number(countRows[0]?.totalCount || 0);
  const totalPages = Math.ceil(totalCount / safeLimit);

  const [rows] = await pool.query(
    `
    SELECT
      a.id,
      a.user_id,
      u.name AS user_name,
      u.email AS user_email,
      a.account_number,
      a.account_name,
      a.balance,
      a.status,
      a.created_at
    FROM accounts a
    JOIN users u ON a.user_id = u.id
    ${whereSql}
    ORDER BY a.id DESC
    LIMIT ? OFFSET ?
    `,
    [...whereValues, safeLimit, offset]
  );

  return ok({
    accounts: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalCount,
      totalPages
    },
    filters: {
      keyword,
      status
    }
  });
}
