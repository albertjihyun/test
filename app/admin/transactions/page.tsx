'use client';

import { useEffect, useState } from 'react';

type AdminTransaction = {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  account_id: number;
  account_number: string;
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

type SearchForm = {
  type: string;
  keyword: string;
  minAmount: string;
  maxAmount: string;
  startDate: string;
  endDate: string;
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<AdminTransaction[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });

  const [searchForm, setSearchForm] = useState<SearchForm>({
    type: '',
    keyword: '',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: ''
  });

  const [appliedSearch, setAppliedSearch] = useState<SearchForm>({
    type: '',
    keyword: '',
    minAmount: '',
    maxAmount: '',
    startDate: '',
    endDate: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadTransactions(pageNumber: number, filters: SearchForm) {
    const params = new URLSearchParams();

    params.set('page', String(pageNumber));
    params.set('limit', '10');

    if (filters.type) {
      params.set('type', filters.type);
    }

    if (filters.keyword) {
      params.set('keyword', filters.keyword);
    }

    if (filters.minAmount) {
      params.set('minAmount', filters.minAmount);
    }

    if (filters.maxAmount) {
      params.set('maxAmount', filters.maxAmount);
    }

    if (filters.startDate) {
      params.set('startDate', filters.startDate);
    }

    if (filters.endDate) {
      params.set('endDate', filters.endDate);
    }

    const response = await fetch(`/api/admin/transactions?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '관리자 거래 내역 조회에 실패했습니다.');
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

        await loadTransactions(currentPage, appliedSearch);
      } catch {
        setMessage('관리자 거래 내역을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [currentPage, appliedSearch]);

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setCurrentPage(1);
    setAppliedSearch(searchForm);
  }

  function handleReset() {
    const emptySearch = {
      type: '',
      keyword: '',
      minAmount: '',
      maxAmount: '',
      startDate: '',
      endDate: ''
    };

    setSearchForm(emptySearch);
    setAppliedSearch(emptySearch);
    setCurrentPage(1);
  }

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
    return <main className="page">관리자 거래 내역을 불러오는 중입니다.</main>;
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
        <h1>관리자 거래 내역 조회</h1>
        <p>전체 사용자의 입금 및 출금 거래 내역을 조회합니다.</p>

        <form className="filterGrid" onSubmit={handleSearch}>
          <select
            value={searchForm.type}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                type: event.target.value
              });
            }}
          >
            <option value="">전체 거래 유형</option>
            <option value="deposit">입금</option>
            <option value="withdraw">출금</option>
          </select>

          <input
            placeholder="사용자명, 이메일, 계좌번호, 계좌명, 메모 검색"
            value={searchForm.keyword}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                keyword: event.target.value
              });
            }}
          />

          <input
            type="number"
            placeholder="최소 금액"
            value={searchForm.minAmount}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                minAmount: event.target.value
              });
            }}
          />

          <input
            type="number"
            placeholder="최대 금액"
            value={searchForm.maxAmount}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                maxAmount: event.target.value
              });
            }}
          />

          <input
            type="date"
            value={searchForm.startDate}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                startDate: event.target.value
              });
            }}
          />

          <input
            type="date"
            value={searchForm.endDate}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                endDate: event.target.value
              });
            }}
          />

          <button type="submit">검색</button>

          <button type="button" onClick={handleReset}>
            초기화
          </button>
        </form>

        {message && <p>{message}</p>}
      </section>

      <section className="card">
        <h2>전체 거래 내역</h2>

        <p>
          전체 거래 수: {pagination.totalCount}건 / 현재 페이지:{' '}
          {pagination.page} / {pagination.totalPages}
        </p>

        <table>
          <thead>
            <tr>
              <th>거래 ID</th>
              <th>사용자</th>
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
                    {transaction.user_name}
                    <br />
                    {transaction.user_email}
                  </td>
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
                <td colSpan={7}>조회된 거래 내역이 없습니다.</td>
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
