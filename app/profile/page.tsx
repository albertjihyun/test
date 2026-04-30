'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type Profile = {
  id: number;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
  created_at: string;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function loadProfile() {
    const response = await fetch('/api/auth/profile');

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.message || '내 정보 조회에 실패했습니다.');
      return;
    }

    setProfile(data.profile);
    setName(data.profile.name);
  }

  useEffect(function () {
    async function loadData() {
      try {
        setIsLoading(true);
        setMessage('');

        await loadProfile();
      } catch {
        setMessage('내 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim()) {
      alert('이름을 입력하세요.');
      return;
    }

    if (name.trim().length < 2) {
      alert('이름은 2자 이상 입력해야 합니다.');
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || '내 정보 수정에 실패했습니다.');
        return;
      }

      setMessage(data.message);
      await loadProfile();
    } catch {
      setMessage('내 정보 수정 요청 중 오류가 발생했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <main className="page">내 정보를 불러오는 중입니다.</main>;
  }

  if (!profile) {
    return (
      <main className="page">
        <section className="card">
          <p>{message || '내 정보가 없습니다.'}</p>
          <Link href="/dashboard">대시보드로 이동</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="card">
        <h1>내 정보</h1>
        <p>로그인한 사용자의 기본 정보를 확인하고 이름을 수정합니다.</p>

        <div className="profileInfo">
          <p>사용자 ID: {profile.id}</p>
          <p>이메일: {profile.email}</p>
          <p>권한: {profile.role}</p>
          <p>상태: {profile.status}</p>
          <p>가입일: {profile.created_at}</p>
        </div>

        <form className="form" onSubmit={handleSubmit}>
          <input
            placeholder="이름"
            value={name}
            onChange={function (event) {
              setName(event.target.value);
            }}
          />

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? '수정 중' : '내 정보 수정'}
          </button>
        </form>

        {message && <p>{message}</p>}

        <div className="buttonGroup">
          <Link href="/dashboard">대시보드로 이동</Link>
          <Link href="/password">비밀번호 변경</Link>
        </div>
      </section>
    </main>
  );
}
