'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

type Account = {
  id: number;
  account_number: string;
  account_name: string;
  balance: string;
  status: 'active' | 'closed';
  created_at: string;
};

type Transaction = {
  id: number;
  account_id: number;
  transaction_type: 'deposit' | 'withdraw';
  amount: string;
  memo: string | null;
  created_at: string;
};

type Pagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

export default function AccountDetailPage() {
  const params = useParams();
  const accountId = params.id as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadAccount() {
    const response = await fetch(`/api/accounts/${accountId}`);

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '계좌 상세 조회에 실패했습니다.');
      return;
    }

    setAccount(data.account);
  }

  async function loadTransactions(pageNumber: number) {
    const response = await fetch(
      `/api/accounts/${accountId}/transactions?page=${pageNumber}&limit=10`
    );

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '계좌 거래 내역 조회에 실패했습니다.');
      return;
    }

    setTransactions(data.transactions || []);
    setPagination(data.pagination);
  }

  useEffect(function () {
    async function loadData() {
      try {
        setIsLoading(true);
        setMessage('');

        await loadAccount();
        await loadTransactions(currentPage);
      } catch {
        setMessage('계좌 상세 화면을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    if (accountId) {
      loadData();
    }
  }, [accountId, currentPage]);

  function handlePrevPage() {
    if (currentPage <= 1) {
      return;
    }

    setCurrentPage(currentPage - 1);
  }

  function handleNextPage() {
    if (currentPage >= pagination.totalPages) {
      return;
    }

    setCurrentPage(currentPage + 1);
  }

  function handlePageClick(pageNumber: number) {
    setCurrentPage(pageNumber);
  }

  if (isLoading) {
    return <main className="page">계좌 상세 정보를 불러오는 중입니다.</main>;
  }

  if (message) {
    return (
      <main className="page">
        <section className="card">
          <p>{message}</p>
          <Link href="/accounts">계좌 목록으로 이동</Link>
        </section>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="page">
        <section className="card">
          <p>계좌 정보가 없습니다.</p>
          <Link href="/accounts">계좌 목록으로 이동</Link>
        </section>
      </main>
    );
  }

  const pageNumbers = Array.from(
    { length: pagination.totalPages },
    function (_, index) {
      return index + 1;
    }
  );

  return (
    <main className="page">
      <section className="card">
        <h1>계좌 상세 정보</h1>

        <p>계좌번호: {account.account_number}</p>
        <p>계좌명: {account.account_name}</p>
        <p>잔액: {Number(account.balance).toLocaleString()}원</p>
        <p>상태: {account.status}</p>
        <p>생성일: {account.created_at}</p>

        <div className="buttonGroup">
          <Link href="/accounts">계좌 목록</Link>
          <Link href="/transactions">전체 거래 내역</Link>
        </div>
      </section>

      <section className="card">
        <h2>이 계좌의 거래 내역</h2>

        <p>
          전체 거래 건수: {pagination.totalCount}건 / 현재 페이지:{' '}
          {pagination.page} / {pagination.totalPages}
        </p>

        <table>
          <thead>
            <tr>
              <th>거래 ID</th>
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
                <td colSpan={5}>이 계좌의 거래 내역이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="pagination">
          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
          >
            이전
          </button>

          {pageNumbers.map(function (pageNumber) {
            return (
              <button
                key={pageNumber}
                type="button"
                className={currentPage === pageNumber ? 'activePage' : ''}
                onClick={function () {
                  handlePageClick(pageNumber);
                }}
              >
                {pageNumber}
              </button>
            );
          })}

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= pagination.totalPages}
          >
            다음
          </button>
        </div>
      </section>
    </main>
  );
}
