'use client';

import { useEffect, useState } from 'react';

type Account = {
  id: number;
  account_number: string;
  account_name: string;
  balance: string;
  status: 'active' | 'closed';
};

export default function TransferPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [transactionType, setTransactionType] = useState<'deposit' | 'withdraw'>('deposit');
  const [amount, setAmount] = useState(0);
  const [memo, setMemo] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(function () {
    async function loadAccounts() {
      try {
        const response = await fetch('/api/accounts');

        if (!response.ok) {
          setMessage('계좌 목록 조회에 실패했습니다.');
          return;
        }

        const data = await response.json();
        setAccounts(data.accounts || []);
      } catch {
        setMessage('계좌 목록 조회 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadAccounts();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accountId) {
      alert('거래할 계좌를 선택하세요.');
      return;
    }

    if (amount <= 0) {
      alert('거래 금액은 0보다 커야 합니다.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: Number(accountId),
          transactionType,
          amount,
          memo
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || '거래 등록에 실패했습니다.');
        return;
      }

      setMessage(data.message);
      setAmount(0);
      setMemo('');
    } catch {
      setMessage('거래 등록 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <main className="page">계좌 목록을 불러오는 중입니다.</main>;
  }

  return (
    <main className="page">
      <section className="card">
        <h1>입금/출금 거래 등록</h1>
        <p>내 계좌를 선택한 뒤 입금 또는 출금 거래를 등록합니다.</p>

        <form className="form" onSubmit={handleSubmit}>
          <select
            value={accountId}
            onChange={function (event) {
              setAccountId(event.target.value);
            }}
          >
            <option value="">거래 계좌 선택</option>
            {accounts.map(function (account) {
              return (
                <option key={account.id} value={account.id}>
                  {account.account_name} / {account.account_number} / 잔액 {Number(account.balance).toLocaleString()}원
                </option>
              );
            })}
          </select>

          <select
            value={transactionType}
            onChange={function (event) {
              setTransactionType(event.target.value as 'deposit' | 'withdraw');
            }}
          >
            <option value="deposit">입금</option>
            <option value="withdraw">출금</option>
          </select>

          <input
            type="number"
            placeholder="거래 금액"
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
            {isSubmitting ? '처리 중' : '거래 등록'}
          </button>
        </form>

        {message && <p>{message}</p>}
      </section>
    </main>
  );
}
