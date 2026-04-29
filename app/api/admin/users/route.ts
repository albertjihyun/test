import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { forbidden, ok, unauthorized } from '@/lib/responses';

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return unauthorized();
  }

  if (user.role !== 'admin') {
    return forbidden();
  }

  const [rows] = await pool.query(
    `
    SELECT id, name, email, role, status, created_at
    FROM users
    ORDER BY id DESC
    `
  );

  return ok({ users: rows });
}
