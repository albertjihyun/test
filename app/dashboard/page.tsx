'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import LogoutButton from '@/components/LogoutButton';
import RecentTransactionsTable from '@/components/RecentTransactionsTable';

type User = {
  userId: number;
  email: string;
  role: 'user' | 'admin';
};

type Summary = {
  totalAccounts: number;
  totalBalance: number;
  totalDeposit: number;
  totalWithdraw: number;
  recentTransactionCount: number;
};

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary>({
    totalAccounts: 0,
    totalBalance: 0,
    totalDeposit: 0,
    totalWithdraw: 0,
    recentTransactionCount: 0
  });
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  async function loadMe() {
    const response = await fetch('/api/auth/me');

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '사용자 정보를 불러오지 못했습니다.');
      return;
    }

    setUser(data.user);
  }

  async function loadSummary() {
    const response = await fetch('/api/dashboard/summary');

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '대시보드 요약 정보를 불러오지 못했습니다.');
      return;
    }

    setSummary(data.summary);
  }

  useEffect(function () {
    async function loadData() {
      try {
        setIsLoading(true);
        setMessage('');

        await loadMe();
        await loadSummary();
      } catch {
        setMessage('대시보드 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  if (isLoading) {
    return <main className="page">대시보드를 불러오는 중입니다.</main>;
  }

  if (message) {
    return (
      <main className="page">
        <section className="card">
          <p>{message}</p>
          <Link href="/login">로그인 페이지로 이동</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card">
        <h1>금융 대시보드</h1>
        <p>{user?.email}님이 로그인했습니다.</p>

        <div className="dashboardSummaryGrid">
          <div className="summaryBox">
            <span>총 계좌 수</span>
            <strong>{summary.totalAccounts}개</strong>
          </div>

          <div className="summaryBox">
            <span>총 잔액</span>
            <strong>{summary.totalBalance.toLocaleString()}원</strong>
          </div>

          <div className="summaryBox">
            <span>최근 30일 입금 합계</span>
            <strong>{summary.totalDeposit.toLocaleString()}원</strong>
          </div>

          <div className="summaryBox">
            <span>최근 30일 출금 합계</span>
            <strong>{summary.totalWithdraw.toLocaleString()}원</strong>
          </div>

          <div className="summaryBox">
            <span>최근 30일 거래 건수</span>
            <strong>{summary.recentTransactionCount}건</strong>
          </div>
        </div>

        <div className="buttonGroup">
          <Link href="/accounts">계좌 관리</Link>
          <Link href="/transfer">입금/출금</Link>
          <Link href="/account-transfer">계좌이체</Link>
          <Link href="/transactions">거래 내역</Link>
          <Link href="/admin/users">관리자 사용자 관리</Link>
          <Link href="/admin/accounts">관리자 계좌 관리</Link>
          <Link href="/admin/transactions">관리자 거래 내역</Link>
          <Link href="/admin/login-logs">관리자 접속 로그</Link>
	  <Link href="/password">비밀번호 변경</Link>
	  <Link href="/profile">내 정보</Link>
          <LogoutButton />
        </div>
      </section>

      <RecentTransactionsTable
        limit={5}
        title="최근 거래 내역"
        showMoreLink={true}
      />
    </main>
  );
}
