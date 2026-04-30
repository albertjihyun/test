import { RowDataPacket } from 'mysql2';
import pool from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { ok, unauthorized } from '@/lib/responses';

type AccountSummaryRow = RowDataPacket & {
  totalAccounts: number;
  totalBalance: string | null;
};

type TransactionSummaryRow = RowDataPacket & {
  totalDeposit: string | null;
  totalWithdraw: string | null;
  recentTransactionCount: number;
};

export async function GET() {
  const user = await getSessionUser();

  if (!user) {
    return unauthorized();
  }

  const [accountRows] = await pool.query<AccountSummaryRow[]>(
    `
    SELECT
      COUNT(*) AS totalAccounts,
      COALESCE(SUM(balance), 0) AS totalBalance
    FROM accounts
    WHERE user_id = ?
      AND status = 'active'
    `,
    [user.userId]
  );

  const [transactionRows] = await pool.query<TransactionSummaryRow[]>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN transaction_type = 'deposit' THEN amount ELSE 0 END), 0) AS totalDeposit,
      COALESCE(SUM(CASE WHEN transaction_type = 'withdraw' THEN amount ELSE 0 END), 0) AS totalWithdraw,
      COUNT(*) AS recentTransactionCount
    FROM account_transactions
    WHERE user_id = ?
      AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `,
    [user.userId]
  );

  const [recentTransactions] = await pool.query(
    `
    SELECT
      t.id,
      t.account_id,
      a.account_name,
      t.transaction_type,
      t.amount,
      t.memo,
      t.created_at
    FROM account_transactions t
    JOIN accounts a ON t.account_id = a.id
    WHERE t.user_id = ?
    ORDER BY t.id DESC
    LIMIT 5
    `,
    [user.userId]
  );

  const accountSummary = accountRows[0];
  const transactionSummary = transactionRows[0];

  return ok({
    summary: {
      totalAccounts: Number(accountSummary.totalAccounts || 0),
      totalBalance: Number(accountSummary.totalBalance || 0),
      totalDeposit: Number(transactionSummary.totalDeposit || 0),
      totalWithdraw: Number(transactionSummary.totalWithdraw || 0),
      recentTransactionCount: Number(
        transactionSummary.recentTransactionCount || 0
      )
    },
    recentTransactions
  });
}
