'use client';

import { useEffect, useState } from 'react';

type AdminAccount = {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  account_number: string;
  account_name: string;
  balance: string;
  status: 'active' | 'closed';
  created_at: string;
};

type Pagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

type SearchForm = {
  keyword: string;
  status: string;
};

export default function AdminAccountsPage() {
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });

  const [searchForm, setSearchForm] = useState<SearchForm>({
    keyword: '',
    status: ''
  });

  const [appliedSearch, setAppliedSearch] = useState<SearchForm>({
    keyword: '',
    status: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadAccounts(pageNumber: number, filters: SearchForm) {
    const params = new URLSearchParams();

    params.set('page', String(pageNumber));
    params.set('limit', '10');

    if (filters.keyword) {
      params.set('keyword', filters.keyword);
    }

    if (filters.status) {
      params.set('status', filters.status);
    }

    const response = await fetch(`/api/admin/accounts?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '관리자 계좌 목록 조회에 실패했습니다.');
      return;
    }

    setAccounts(data.accounts || []);
    setPagination(data.pagination);
  }

  useEffect(function () {
    async function loadData() {
      try {
        setIsLoading(true);
        setMessage('');

        await loadAccounts(currentPage, appliedSearch);
      } catch {
        setMessage('관리자 계좌 목록을 불러오는 중 오류가 발생했습니다.');
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
      keyword: '',
      status: ''
    };

    setSearchForm(emptySearch);
    setAppliedSearch(emptySearch);
    setCurrentPage(1);
  }

  async function handleChangeStatus(
    accountId: number,
    status: 'active' | 'closed'
  ) {
    const response = await fetch(`/api/admin/accounts/${accountId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        status
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || '계좌 상태 변경에 실패했습니다.');
      return;
    }

    setMessage(data.message);
    await loadAccounts(currentPage, appliedSearch);
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
    return <main className="page">관리자 계좌 목록을 불러오는 중입니다.</main>;
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
        <h1>관리자 계좌 관리</h1>
        <p>전체 사용자 계좌를 조회하고 계좌 상태를 변경합니다.</p>

        <form className="filterGrid" onSubmit={handleSearch}>
          <input
            placeholder="사용자명, 이메일, 계좌번호, 계좌명 검색"
            value={searchForm.keyword}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                keyword: event.target.value
              });
            }}
          />

          <select
            value={searchForm.status}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                status: event.target.value
              });
            }}
          >
            <option value="">전체 상태</option>
            <option value="active">활성</option>
            <option value="closed">해지</option>
          </select>

          <button type="submit">검색</button>

          <button type="button" onClick={handleReset}>
            초기화
          </button>
        </form>

        {message && <p>{message}</p>}
      </section>

      <section className="card">
        <h2>전체 계좌 목록</h2>

        <p>
          전체 계좌 수: {pagination.totalCount}개 / 현재 페이지:{' '}
          {pagination.page} / {pagination.totalPages}
        </p>

        <table>
          <thead>
            <tr>
              <th>계좌 ID</th>
              <th>사용자</th>
              <th>계좌번호</th>
              <th>계좌명</th>
              <th>잔액</th>
              <th>상태</th>
              <th>생성일</th>
            </tr>
          </thead>

          <tbody>
            {accounts.map(function (account) {
              return (
                <tr key={account.id}>
                  <td>{account.id}</td>
                  <td>
                    {account.user_name}
                    <br />
                    {account.user_email}
                  </td>
                  <td>{account.account_number}</td>
                  <td>{account.account_name}</td>
                  <td>{Number(account.balance).toLocaleString()}원</td>
                  <td>
                    <select
                      value={account.status}
                      onChange={function (event) {
                        handleChangeStatus(
                          account.id,
                          event.target.value as 'active' | 'closed'
                        );
                      }}
                    >
                      <option value="active">활성</option>
                      <option value="closed">해지</option>
                    </select>
                  </td>
                  <td>{account.created_at}</td>
                </tr>
              );
            })}

            {accounts.length === 0 && (
              <tr>
                <td colSpan={7}>조회된 계좌가 없습니다.</td>
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
