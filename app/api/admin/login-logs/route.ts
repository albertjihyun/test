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
  const email = searchParams.get('email') || '';
  const success = searchParams.get('success') || '';
  const keyword = searchParams.get('keyword') || '';
  const startDate = searchParams.get('startDate') || '';
  const endDate = searchParams.get('endDate') || '';

  const safePage = page > 0 ? page : 1;
  const safeLimit = limit > 0 ? limit : 10;
  const offset = (safePage - 1) * safeLimit;

  const whereConditions: string[] = [];
  const whereValues: unknown[] = [];

  if (email) {
    whereConditions.push('l.email LIKE ?');
    whereValues.push(`%${email}%`);
  }

  if (success === 'true') {
    whereConditions.push('l.success = ?');
    whereValues.push(true);
  }

  if (success === 'false') {
    whereConditions.push('l.success = ?');
    whereValues.push(false);
  }

  if (keyword) {
    whereConditions.push(
      `(l.reason LIKE ? OR l.ip_address LIKE ? OR l.user_agent LIKE ?)`
    );
    whereValues.push(`%${keyword}%`, `%${keyword}%`, `%${keyword}%`);
  }

  if (startDate) {
    whereConditions.push('DATE(l.created_at) >= ?');
    whereValues.push(startDate);
  }

  if (endDate) {
    whereConditions.push('DATE(l.created_at) <= ?');
    whereValues.push(endDate);
  }

  const whereSql =
    whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

  const [countRows] = await pool.query<CountRow[]>(
    `
    SELECT COUNT(*) AS totalCount
    FROM login_logs l
    LEFT JOIN users u ON l.user_id = u.id
    ${whereSql}
    `,
    whereValues
  );

  const totalCount = Number(countRows[0]?.totalCount || 0);
  const totalPages = Math.ceil(totalCount / safeLimit);

  const [rows] = await pool.query(
    `
    SELECT
      l.id,
      l.user_id,
      u.name AS user_name,
      l.email,
      l.success,
      l.reason,
      l.ip_address,
      l.user_agent,
      l.created_at
    FROM login_logs l
    LEFT JOIN users u ON l.user_id = u.id
    ${whereSql}
    ORDER BY l.id DESC
    LIMIT ? OFFSET ?
    `,
    [...whereValues, safeLimit, offset]
  );

  return ok({
    logs: rows,
    pagination: {
      page: safePage,
      limit: safeLimit,
      totalCount,
      totalPages
    },
    filters: {
      email,
      success,
      keyword,
      startDate,
      endDate
    }
  });
}
