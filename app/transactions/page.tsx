'use client';

import { useEffect, useState } from 'react';

type Transaction = {
  id: number;
  account_id: number;
  account_name: string;
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

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(function () {
    async function loadTransactions() {
      try {
        setIsLoading(true);
        setErrorMessage('');

        const response = await fetch(
          `/api/transactions?page=${currentPage}&limit=10`
        );

        if (!response.ok) {
          setErrorMessage('거래 내역 조회에 실패했습니다.');
          return;
        }

        const data = await response.json();

        setTransactions(data.transactions || []);
        setPagination(data.pagination);
      } catch {
        setErrorMessage('거래 내역 조회 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadTransactions();
  }, [currentPage]);

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
    return <main className="page">거래 내역을 불러오는 중입니다.</main>;
  }

  if (errorMessage) {
    return <main className="page">{errorMessage}</main>;
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
        <h1>거래 내역</h1>
        <p>내 계좌에서 발생한 입금과 출금 내역을 페이지 단위로 확인합니다.</p>

        <p>
          전체 거래 건수: {pagination.totalCount}건 / 현재 페이지:{' '}
          {pagination.page} / {pagination.totalPages}
        </p>

        <table>
          <thead>
            <tr>
              <th>거래 ID</th>
              <th>계좌명</th>
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
                  <td>{transaction.account_name}</td>
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
                <td colSpan={6}>거래 내역이 없습니다.</td>
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
