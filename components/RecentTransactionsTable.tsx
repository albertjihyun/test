'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type RecentTransaction = {
  id: number;
  account_id: number;
  account_name: string;
  account_number: string;
  transaction_type: 'deposit' | 'withdraw';
  amount: string;
  memo: string | null;
  created_at: string;
};

type RecentTransactionsTableProps = {
  limit?: number;
  title?: string;
  showMoreLink?: boolean;
};

export default function RecentTransactionsTable({
  limit = 5,
  title = '최근 거래 내역',
  showMoreLink = true
}: RecentTransactionsTableProps) {
  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadRecentTransactions() {
    const response = await fetch(`/api/transactions/recent?limit=${limit}`);

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '최근 거래 내역 조회에 실패했습니다.');
      return;
    }

    setTransactions(data.transactions || []);
  }

  useEffect(function () {
    async function loadData() {
      try {
        setIsLoading(true);
        setMessage('');

        await loadRecentTransactions();
      } catch {
        setMessage('최근 거래 내역을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [limit]);

  if (isLoading) {
    return (
      <section className="card">
        <h2>{title}</h2>
        <p>최근 거래 내역을 불러오는 중입니다.</p>
      </section>
    );
  }

  if (message) {
    return (
      <section className="card">
        <h2>{title}</h2>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="sectionHeader">
        <h2>{title}</h2>

        {showMoreLink && (
          <Link href="/transactions">
            전체 거래 내역 보기
          </Link>
        )}
      </div>

      <table>
        <thead>
          <tr>
            <th>거래 ID</th>
            <th>계좌</th>
            <th>거래 유형</th>
            <th>금액</th>
            <th>메모</th>
            <th>거래일시</th>
          </tr>
        </thead>

        <tbody>
          {transactions.map(function (transaction) {
            return (
              <tr key={transaction.id}>
                <td>{transaction.id}</td>
                <td>
                  {transaction.account_name}
                  <br />
                  {transaction.account_number}
                </td>
                <td>
                  {transaction.transaction_type === 'deposit'
                    ? '입금'
                    : '출금'}
                </td>
                <td>{Number(transaction.amount).toLocaleString()}원</td>
                <td>{transaction.memo || '-'}</td>
                <td>{transaction.created_at}</td>
              </tr>
            );
          })}

          {transactions.length === 0 && (
            <tr>
              <td colSpan={6}>최근 거래 내역이 없습니다.</td>
            </tr>
          )}
        </tbody>
      </table>
    </section>
  );
}
