'use client';

import { useEffect, useState } from 'react';

type LoginLog = {
  id: number;
  user_id: number | null;
  user_name: string | null;
  email: string;
  success: 0 | 1 | boolean;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
};

type Pagination = {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
};

type SearchForm = {
  email: string;
  success: string;
  keyword: string;
  startDate: string;
  endDate: string;
};

export default function AdminLoginLogsPage() {
  const [logs, setLogs] = useState<LoginLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    totalCount: 0,
    totalPages: 0
  });

  const [searchForm, setSearchForm] = useState<SearchForm>({
    email: '',
    success: '',
    keyword: '',
    startDate: '',
    endDate: ''
  });

  const [appliedSearch, setAppliedSearch] = useState<SearchForm>({
    email: '',
    success: '',
    keyword: '',
    startDate: '',
    endDate: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadLogs(pageNumber: number, filters: SearchForm) {
    const params = new URLSearchParams();

    params.set('page', String(pageNumber));
    params.set('limit', '10');

    if (filters.email) {
      params.set('email', filters.email);
    }

    if (filters.success) {
      params.set('success', filters.success);
    }

    if (filters.keyword) {
      params.set('keyword', filters.keyword);
    }

    if (filters.startDate) {
      params.set('startDate', filters.startDate);
    }

    if (filters.endDate) {
      params.set('endDate', filters.endDate);
    }

    const response = await fetch(`/api/admin/login-logs?${params.toString()}`);

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '접속 로그 조회에 실패했습니다.');
      return;
    }

    setLogs(data.logs || []);
    setPagination(data.pagination);
  }

  useEffect(function () {
    async function loadData() {
      try {
        setIsLoading(true);
        setMessage('');

        await loadLogs(currentPage, appliedSearch);
      } catch {
        setMessage('접속 로그를 불러오는 중 오류가 발생했습니다.');
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
      email: '',
      success: '',
      keyword: '',
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
    return <main className="page">접속 로그를 불러오는 중입니다.</main>;
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
        <h1>관리자 접속 로그 조회</h1>
        <p>사용자별 로그인 성공 및 실패 이력을 조회합니다.</p>

        <form className="filterGrid" onSubmit={handleSearch}>
          <input
            placeholder="이메일 검색"
            value={searchForm.email}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                email: event.target.value
              });
            }}
          />

          <select
            value={searchForm.success}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                success: event.target.value
              });
            }}
          >
            <option value="">전체 결과</option>
            <option value="true">성공</option>
            <option value="false">실패</option>
          </select>

          <input
            placeholder="사유, IP, User-Agent 검색"
            value={searchForm.keyword}
            onChange={function (event) {
              setSearchForm({
                ...searchForm,
                keyword: event.target.value
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
        <h2>접속 로그 목록</h2>

        <p>
          전체 로그 수: {pagination.totalCount}건 / 현재 페이지:{' '}
          {pagination.page} / {pagination.totalPages}
        </p>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>사용자</th>
              <th>이메일</th>
              <th>결과</th>
              <th>사유</th>
              <th>IP</th>
              <th>User-Agent</th>
              <th>시도일시</th>
            </tr>
          </thead>

          <tbody>
            {logs.map(function (log) {
              return (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{log.user_name || '-'}</td>
                  <td>{log.email}</td>
                  <td>{Boolean(log.success) ? '성공' : '실패'}</td>
                  <td>{log.reason || '-'}</td>
                  <td>{log.ip_address || '-'}</td>
                  <td>{log.user_agent || '-'}</td>
                  <td>{log.created_at}</td>
                </tr>
              );
            })}

            {logs.length === 0 && (
              <tr>
                <td colSpan={8}>접속 로그가 없습니다.</td>
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
