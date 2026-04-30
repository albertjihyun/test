'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAccounts } from '@/hooks/useAccounts';

type Account = {
  id: number;
  account_number: string;
  account_name: string;
  balance: string;
  status: 'active' | 'closed';
};

export default function AccountsPage() {
  const {
    accountsQuery,
    createMutation,
    deleteMutation
  } = useAccounts();

  const [form, setForm] = useState({
    accountNumber: '',
    accountName: '',
    balance: 0
  });

  const [aliasInputs, setAliasInputs] = useState<Record<number, string>>({});
  const [message, setMessage] = useState('');

  if (accountsQuery.isLoading) {
    return <main className="page">계좌 목록을 불러오는 중입니다.</main>;
  }

  if (accountsQuery.isError) {
    return <main className="page">계좌 목록 조회 중 오류가 발생했습니다.</main>;
  }

  const accounts: Account[] = accountsQuery.data?.accounts || [];

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await createMutation.mutateAsync(form);

    setForm({
      accountNumber: '',
      accountName: '',
      balance: 0
    });
  }

  async function handleUpdateAlias(accountId: number) {
    const accountName = aliasInputs[accountId];

    if (!accountName || accountName.trim().length < 2) {
      alert('계좌명은 2자 이상 입력해야 합니다.');
      return;
    }

    const response = await fetch(`/api/accounts/${accountId}/alias`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        accountName
      })
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '계좌 별칭 변경에 실패했습니다.');
      return;
    }

    setMessage(data.message);

    setAliasInputs({
      ...aliasInputs,
      [accountId]: ''
    });

    await accountsQuery.refetch();
  }

  return (
    <main className="page">
      <section className="card">
        <h1>계좌 관리</h1>

        <form className="formGrid" onSubmit={handleCreate}>
          <input
            placeholder="계좌번호"
            value={form.accountNumber}
            onChange={function (event) {
              setForm({ ...form, accountNumber: event.target.value });
            }}
          />

          <input
            placeholder="계좌명"
            value={form.accountName}
            onChange={function (event) {
              setForm({ ...form, accountName: event.target.value });
            }}
          />

          <input
            type="number"
            placeholder="초기 잔액"
            value={form.balance}
            onChange={function (event) {
              setForm({ ...form, balance: Number(event.target.value) });
            }}
          />

          <button type="submit">계좌 등록</button>
        </form>

        {message && <p>{message}</p>}
      </section>

      <section className="card">
        <h2>내 계좌 목록</h2>

        <table>
          <thead>
            <tr>
              <th>계좌번호</th>
              <th>계좌명</th>
              <th>잔액</th>
              <th>상태</th>
              <th>별칭 변경</th>
              <th>관리</th>
            </tr>
          </thead>

          <tbody>
            {accounts.map(function (account) {
              return (
                <tr key={account.id}>
                  <td>{account.account_number}</td>
                  <td>{account.account_name}</td>
                  <td>{Number(account.balance).toLocaleString()}원</td>
                  <td>{account.status}</td>

                  <td>
                    <input
                      placeholder="새 계좌명"
                      value={aliasInputs[account.id] || ''}
                      onChange={function (event) {
                        setAliasInputs({
                          ...aliasInputs,
                          [account.id]: event.target.value
                        });
                      }}
                    />

                    <button
                      type="button"
                      onClick={function () {
                        handleUpdateAlias(account.id);
                      }}
                    >
                      별칭 변경
                    </button>
                  </td>

                  <td>
                    <Link href={`/accounts/${account.id}`}>
                      상세
                    </Link>

                    <button
                      type="button"
                      onClick={async function () {
                        await deleteMutation.mutateAsync(account.id);
                      }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              );
            })}

            {accounts.length === 0 && (
              <tr>
                <td colSpan={6}>등록된 계좌가 없습니다.</td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  );
}
