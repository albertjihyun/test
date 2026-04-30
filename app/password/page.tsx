'use client';

import Link from 'next/link';
import { useState } from 'react';

export default function PasswordPage() {
  const [form, setForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      alert('현재 비밀번호, 새 비밀번호, 새 비밀번호 확인을 모두 입력하세요.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      alert('새 비밀번호와 새 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || '비밀번호 변경에 실패했습니다.');
        return;
      }

      setMessage(data.message);

      setForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch {
      setMessage('비밀번호 변경 요청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page">
      <section className="card">
        <h1>비밀번호 변경</h1>
        <p>현재 비밀번호를 확인한 뒤 새 비밀번호로 변경합니다.</p>

        <form className="form" onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="현재 비밀번호"
            value={form.currentPassword}
            onChange={function (event) {
              setForm({
                ...form,
                currentPassword: event.target.value
              });
            }}
          />

          <input
            type="password"
            placeholder="새 비밀번호"
            value={form.newPassword}
            onChange={function (event) {
              setForm({
                ...form,
                newPassword: event.target.value
              });
            }}
          />

          <input
            type="password"
            placeholder="새 비밀번호 확인"
            value={form.confirmPassword}
            onChange={function (event) {
              setForm({
                ...form,
                confirmPassword: event.target.value
              });
            }}
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '변경 중' : '비밀번호 변경'}
          </button>
        </form>

        {message && <p>{message}</p>}

        <div className="buttonGroup">
          <Link href="/dashboard">대시보드로 이동</Link>
        </div>
      </section>
    </main>
  );
}
