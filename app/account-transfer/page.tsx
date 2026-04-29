'use client';

import { useEffect, useState } from 'react';

type Account = {
  id: number;
  account_number: string;
  account_name: string;
  balance: string;
  status: 'active' | 'closed';
};

type Transfer = {
  id: number;
  from_account_id: number;
  from_account_name: string;
  from_account_number: string;
  to_account_id: number;
  to_account_name: string;
  to_account_number: string;
  amount: string;
  memo: string | null;
  created_at: string;
};

export default function AccountTransferPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadAccounts() {
    const response = await fetch('/api/accounts');

    if (!response.ok) {
      setMessage('계좌 목록 조회에 실패했습니다.');
      return;
    }

    const data = await response.json();
    setAccounts(data.accounts || []);
  }

  async function loadTransfers() {
    const response = await fetch('/api/transfers');

    if (!response.ok) {
      setMessage('이체 내역 조회에 실패했습니다.');
      return;
    }

    const data = await response.json();
    setTransfers(data.transfers || []);
  }

  useEffect(function () {
    async function loadData() {
      try {
        await loadAccounts();
        await loadTransfers();
      } catch {
        setMessage('계좌이체 화면 데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!fromAccountId || !toAccountId) {
      alert('출금 계좌와 입금 계좌를 모두 선택하세요.');
      return;
    }

    if (fromAccountId === toAccountId) {
      alert('같은 계좌로는 이체할 수 없습니다.');
      return;
    }

    if (amount <= 0) {
      alert('이체 금액은 0보다 커야 합니다.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fromAccountId: Number(fromAccountId),
          toAccountId: Number(toAccountId),
          amount,
          memo
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || '계좌이체에 실패했습니다.');
        return;
      }

      setMessage(data.message);
      setAmount(0);
      setMemo('');

      await loadAccounts();
      await loadTransfers();
    } catch {
      setMessage('계좌이체 요청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <main className="page">계좌이체 화면을 불러오는 중입니다.</main>;
  }

  return (
    <main className="page">
      <section className="card">
        <h1>계좌이체</h1>
        <p>내 계좌 간 이체를 실행합니다.</p>

        <form className="form" onSubmit={handleSubmit}>
          <select
            value={fromAccountId}
            onChange={function (event) {
              setFromAccountId(event.target.value);
            }}
          >
            <option value="">출금 계좌 선택</option>
            {accounts.map(function (account) {
              return (
                <option key={account.id} value={account.id}>
                  {account.account_name} / {account.account_number} / 잔액{' '}
                  {Number(account.balance).toLocaleString()}원
                </option>
              );
            })}
          </select>

          <select
            value={toAccountId}
            onChange={function (event) {
              setToAccountId(event.target.value);
            }}
          >
            <option value="">입금 계좌 선택</option>
            {accounts.map(function (account) {
              return (
                <option key={account.id} value={account.id}>
                  {account.account_name} / {account.account_number} / 잔액{' '}
                  {Number(account.balance).toLocaleString()}원
                </option>
              );
            })}
          </select>

          <input
            type="number"
            placeholder="이체 금액"
            value={amount}
            onChange={function (event) {
              setAmount(Number(event.target.value));
            }}
          />

          <input
            placeholder="메모"
            value={memo}
            onChange={function (event) {
              setMemo(event.target.value);
            }}
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '이체 처리 중' : '계좌이체 실행'}
          </button>
        </form>

        {message && <p>{message}</p>}
      </section>

      <section className="card">
        <h2>계좌이체 내역</h2>

        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>출금 계좌</th>
              <th>입금 계좌</th>
              <th>금액</th>
              <th>메모</th>
              <th>이체일시</th>
            </tr>
          </thead>

          <tbody>
            {transfers.map(function (transfer) {
              return (
                <tr key={transfer.id}>
                  <td>{transfer.id}</td>
                  <td>
                    {transfer.from_account_name}
                    <br />
                    {transfer.from_account_number}
                  </td>
                  <td>
                    {transfer.to_account_name}
                    <br />
                    {transfer.to_account_number}
                  </td>
                  <td>{Number(transfer.amount).toLocaleString()}원</td>
                  <td>{transfer.memo || '-'}</td>
                  <td>{transfer.created_at}</td>
                </tr>
              );
            })}

            {transfers.length === 0 && (
              <tr>
                <td colSpan={6}>계좌이체 내역이 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
