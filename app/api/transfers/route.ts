import { NextRequest } from 'next/server';
import { ResultSetHeader, RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { badRequest, created, ok, unauthorized } from '@/lib/responses';

type TransferBody = {
  fromAccountId: number;
  toAccountId: number;
  amount: number;
  memo?: string;
};

type AccountRow = RowDataPacket & {
  id: number;
  balance: string;
};

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return unauthorized();
  }

  const [rows] = await pool.query(
    `
    SELECT
      tr.id,
      tr.from_account_id,
      fa.account_name AS from_account_name,
      fa.account_number AS from_account_number,
      tr.to_account_id,
      ta.account_name AS to_account_name,
      ta.account_number AS to_account_number,
      tr.amount,
      tr.memo,
      tr.created_at
    FROM account_transfers tr
    JOIN accounts fa ON tr.from_account_id = fa.id
    JOIN accounts ta ON tr.to_account_id = ta.id
    WHERE tr.user_id = ?
    ORDER BY tr.id DESC
    `,
    [user.userId]
  );

  return ok({
    transfers: rows
  });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser();

  if (!user) {
    return unauthorized();
  }

  const body = (await request.json()) as TransferBody;

  if (!body.fromAccountId || !body.toAccountId || !body.amount) {
    return badRequest('출금 계좌, 입금 계좌, 이체 금액은 필수입니다.');
  }

  if (body.fromAccountId === body.toAccountId) {
    return badRequest('같은 계좌로는 이체할 수 없습니다.');
  }

  if (body.amount <= 0) {
    return badRequest('이체 금액은 0보다 커야 합니다.');
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const firstLockId = Math.min(body.fromAccountId, body.toAccountId);
    const secondLockId = Math.max(body.fromAccountId, body.toAccountId);

    const [firstRows] = await connection.query<AccountRow[]>(
      `
      SELECT id, balance
      FROM accounts
      WHERE id = ? AND user_id = ? AND status = 'active'
      FOR UPDATE
      `,
      [firstLockId, user.userId]
    );

    const [secondRows] = await connection.query<AccountRow[]>(
      `
      SELECT id, balance
      FROM accounts
      WHERE id = ? AND user_id = ? AND status = 'active'
      FOR UPDATE
      `,
      [secondLockId, user.userId]
    );

    const lockedAccounts = [...firstRows, ...secondRows];

    const fromAccount = lockedAccounts.find(function (account) {
      return account.id === body.fromAccountId;
    });

    const toAccount = lockedAccounts.find(function (account) {
      return account.id === body.toAccountId;
    });

    if (!fromAccount || !toAccount) {
      await connection.rollback();
      return badRequest('사용 가능한 이체 계좌가 없습니다.');
    }

    const fromBalance = Number(fromAccount.balance);
    const toBalance = Number(toAccount.balance);

    if (fromBalance < body.amount) {
      await connection.rollback();
      return badRequest('출금 계좌의 잔액이 부족합니다.');
    }

    const nextFromBalance = fromBalance - body.amount;
    const nextToBalance = toBalance + body.amount;

    await connection.query<ResultSetHeader>(
      `
      UPDATE accounts
      SET balance = ?
      WHERE id = ? AND user_id = ?
      `,
      [nextFromBalance, body.fromAccountId, user.userId]
    );

    await connection.query<ResultSetHeader>(
      `
      UPDATE accounts
      SET balance = ?
      WHERE id = ? AND user_id = ?
      `,
      [nextToBalance, body.toAccountId, user.userId]
    );

    await connection.query<ResultSetHeader>(
      `
      INSERT INTO account_transactions
        (account_id, user_id, transaction_type, amount, memo)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        body.fromAccountId,
        user.userId,
        'withdraw',
        body.amount,
        body.memo || '계좌이체 출금'
      ]
    );

    await connection.query<ResultSetHeader>(
      `
      INSERT INTO account_transactions
        (account_id, user_id, transaction_type, amount, memo)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        body.toAccountId,
        user.userId,
        'deposit',
        body.amount,
        body.memo || '계좌이체 입금'
      ]
    );

    await connection.query<ResultSetHeader>(
      `
      INSERT INTO account_transfers
        (from_account_id, to_account_id, user_id, amount, memo)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        body.fromAccountId,
        body.toAccountId,
        user.userId,
        body.amount,
        body.memo || null
      ]
    );

    await connection.commit();

    return created({
      message: '계좌이체가 완료되었습니다.',
      fromAccountBalance: nextFromBalance,
      toAccountBalance: nextToBalance
    });
  } catch {
    await connection.rollback();
    return badRequest('계좌이체 처리 중 오류가 발생했습니다.');
  } finally {
    connection.release();
  }
}
