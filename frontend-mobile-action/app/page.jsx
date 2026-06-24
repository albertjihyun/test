"use client";

import { useState } from "react";
import { useAccount, useInboundMutation, useBankMutation, useLogin, useTransactions } from "./hooks/useBankQueries";
import { useAuthStore } from "./store/authStore";

function money(value) {
  return Number(value || 0).toLocaleString("ko-KR") + "원";
}

function errorOf(...items) {
  return items.find((item) => item?.error)?.error?.message || "";
}

function TxType({ type }) {
  const label = {
    DEPOSIT: "입고",
    WITHDRAW: "출고",
    TRANSFER_OUT: "이동(출)",
    TRANSFER_IN: "이동(입)"
  }[type] || type;
  return <span className="type-pill">{label}</span>;
}

export default function MobileActionPage() {
  const auth = useAuthStore();
  const [loginForm, setLoginForm] = useState({ username: "user1", password: "1234" });
  const [amount, setAmount] = useState(10000);
  const [to, setTo] = useState("110-100-000002");
  const [memo, setMemo] = useState("신선마켓 입고");
  const [expiryDate, setExpiryDate] = useState("");

  const account = useAccount();
  const tx = useTransactions();
  const login = useLogin();
  const inbound = useInboundMutation();
  const withdraw = useBankMutation("/bank/withdraw");
  const transfer = useBankMutation("/bank/transfer");
  const multi = useBankMutation("/bank/multi-transfer");

  const result = inbound.data || withdraw.data || transfer.data || multi.data;
  const isBusy = inbound.isPending || withdraw.isPending || transfer.isPending || multi.isPending;

  if (!auth.token) {
    return (
      <main className="mobile-shell action-shell">
        <section className="device-card login-card">
          <div className="appbar compact-appbar">
            <a className="back-link" href="/">‹</a>
            <div>
              <p>신선마켓</p>
              <h1>입출고 인증</h1>
            </div>
            <span className="server-chip">3003</span>
          </div>

          <section className="signin-hero">
            <div className="google-dot">신</div>
            <p className="eyebrow">FRESH MARKET LOGISTICS</p>
            <h2>입고·출고·이동은<br />로그인 후 진행합니다</h2>
            <p>
              신선마켓 물류 관리 서버에서 JWT 세션 기반 인증을 처리합니다.
              조회 서버와 같은 Redis 저장소를 공유합니다.
            </p>
          </section>

          <section className="form-card">
            <label>아이디</label>
            <input value={loginForm.username} onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })} />
            <label>비밀번호</label>
            <input type="password" value={loginForm.password} onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} />
            <button className="primary-btn full" onClick={() => login.mutate(loginForm)} disabled={login.isPending}>
              {login.isPending ? "확인 중" : "로그인"}
            </button>
            <a className="subtle-link" href="/">조회 화면으로 이동</a>
            <p className="error-text">{errorOf(login)}</p>
          </section>
        </section>
      </main>
    );
  }

  return (
    <main className="mobile-shell action-shell">
      <section className="device-card">
        <div className="appbar">
          <a className="back-link" href="/">‹</a>
          <div>
            <p>신선마켓 입출고</p>
            <h1>{auth.profile?.name || auth.profile?.username}님</h1>
          </div>
          <button className="logout-btn" onClick={auth.logout}>종료</button>
        </div>

        <section className="account-card google-blue-card">
          <div className="card-row">
            <span>신선마켓 창고 잔여 수량</span>
            <strong>{account.data?.status || "조회 중"}</strong>
          </div>
          <h2>{account.data ? money(account.data.balance) : "재고 조회 중"}</h2>
          <p>{account.data?.accountNumber || "창고 정보를 불러오고 있습니다"}</p>
        </section>

        <section className="form-card transfer-card">
          <div className="section-title">
            <div>
              <p>신선마켓 입출고 대시보드</p>
              <h2>수량과 유통기한 입력</h2>
            </div>
            <button className="ghost-btn" onClick={() => { account.refetch(); tx.refetch(); }}>새로고침</button>
          </div>

          <label>수량 (원 단위)</label>
          <div className="money-input">
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <span>원</span>
          </div>

          <div className="preset-grid">
            {[10000, 30000, 50000, 100000].map((value) => (
              <button key={value} onClick={() => setAmount(value)}>{value.toLocaleString()}</button>
            ))}
          </div>

          <label>유통기한 (expiryDate) *</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
          />

          <label>이동 대상 창고번호</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} placeholder="110-100-000002" />

          <label>메모</label>
          <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="메모" />

          <div className="action-buttons">
            <button
              className="secondary-btn"
              disabled={isBusy}
              onClick={() => inbound.mutate({ amount: Number(amount), memo: memo || "입고", expiryDate: expiryDate || null })}
            >
              입고
            </button>
            <button className="secondary-btn" disabled={isBusy} onClick={() => withdraw.mutate({ amount: Number(amount), memo: memo || "출고" })}>출고</button>
            <button className="primary-btn span2" disabled={isBusy} onClick={() => transfer.mutate({ toAccountNumber: to, amount: Number(amount), memo: memo || "창고 이동" })}>창고 이동</button>
            <button className="dark-btn span2" disabled={isBusy} onClick={() => multi.mutate({ memo: "다중이동", targets: [{ toAccountNumber: "110-100-000002", amount: 1000 }, { toAccountNumber: "110-100-000003", amount: 2000 }] })}>여러 창고로 이동</button>
          </div>

          <p className="error-text">{errorOf(inbound, withdraw, transfer, multi)}</p>
        </section>

        {result && (
          <section className="result-card">
            <span>처리 완료</span>
            <h2>{result.message}</h2>
            <p>현재 재고 {money(result.account?.balance)}</p>
          </section>
        )}

        <section className="list-card">
          <div className="section-title">
            <div>
              <p>최근 입출고 이력</p>
              <h2>입출고 내역</h2>
            </div>
            <span className="server-chip">Redis 세션</span>
          </div>
          <div className="tx-list">
            {(tx.data || []).slice(0, 6).map((item) => (
              <div className="tx-item" key={item.id}>
                <div>
                  <TxType type={item.type} />
                  <strong>{item.memo || "입출고"}</strong>
                  <p>{item.expiryDate ? `유통기한: ${item.expiryDate}` : ""} {item.createdAt}</p>
                </div>
                <b>{money(item.amount)}</b>
              </div>
            ))}
            {!(tx.data || []).length && <p className="empty">입출고 내역이 없습니다.</p>}
          </div>
        </section>

        <nav className="bottom-nav">
          <a href="/">홈</a>
          <span className="active">입출고</span>
          <a href="/">내역</a>
          <button onClick={auth.logout}>설정</button>
        </nav>
      </section>
    </main>
  );
}
