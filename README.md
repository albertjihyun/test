# 신선마켓 물류 관리 서비스 (mobile-bank 심화 자기화)

GCP VM 단일 서버에서 실행하는 **신선마켓 식품 물류 분산 시스템** 실습 프로젝트입니다.
기존 충정은행 뱅킹 시스템을 신선마켓 입출고 관리 시스템으로 커스텀하였습니다.

## 서버 구성

| 포트 | 역할 |
|------|------|
| 3000 | Nginx — PC/모바일/입출고화면/API 라우팅 |
| 3001 | Next Admin — PC 관리자 입출고 대시보드 |
| 3002 | Next Mobile View — 모바일 재고 조회 화면 |
| 3003 | Next Mobile Action — 모바일 입출고 거래 화면 |
| 3004 | Spring Boot API — 인증/창고/입출고/관리자 API |
| 3306 | MariaDB — 영속 데이터 |
| 6379 | Redis — 세션/캐시/감사 로그/최근 이동 창고 |

Cloudflared: `localhost:3000`만 외부 공개. Maven 미사용, Gradle만 사용.

---

## 신선마켓 유통기한 검증 아키텍처

### 핵심 추가 기능: expiryDate (유통기한) 필드

| 계층 | 파일 | 변경 내용 |
|------|------|-----------|
| Entity | `TransactionRecord.java` | `@Column(name="expiry_date") LocalDate expiryDate` 추가 |
| DTO | `BankDtos.java` | `MoneyRequest`, `TransactionResponse`에 `LocalDate expiryDate` 추가 |
| Service | `BankService.java` | `deposit()` 내 유통기한 검증 로직 추가 |
| Admin | `AdminService.java` | 대시보드 거래 목록에 `expiryDate` 포함 |
| Frontend | `page.jsx` (mobile-action) | 유통기한 date 입력 필드 및 입출고 내역 컬럼 추가 |
| Frontend | `page.jsx` (admin) | 신선마켓 브랜딩, 입출고 테이블 유통기한 컬럼 표시 |
| Frontend | `page.jsx` (mobile-view) | 신선마켓 브랜딩, 유통기한 조회 표시 |
| Hooks | `useBankQueries.js` | `useInboundMutation` 훅 추가 (expiryDate 포함 POST) |

### 유통기한 검증 비즈니스 로직

```java
// BankService.java - deposit() 메서드
if (r.expiryDate() != null && !r.expiryDate().isAfter(LocalDate.now())) {
    throw new IllegalArgumentException("유통기한이 지난 상품은 입고할 수 없습니다.");
}
```

- 유통기한이 **오늘 이하**(오늘 포함 + 과거)인 상품 → `400 Bad Request`
- 유통기한이 **내일 이후**인 상품만 입고 허용
- `expiryDate`가 null이면 검증 생략 (유통기한 없는 상품)

### SecurityConfig 대응

`/api/bank/deposit`은 기존과 동일하게 JWT 인증 필요 상태를 유지합니다.
`webSecurityCustomizer`로 공개된 경로(`/api/auth/**`, `/api/health`)와 충돌 없음.
Nginx도 `/api/` → port 3004 프록시 규칙 그대로 유지됩니다.

### DB 스키마 자동 반영

`spring.jpa.hibernate.ddl-auto=update` 설정으로 서버 재시작 시
`transaction_records` 테이블에 `expiry_date DATE` 컬럼이 자동 추가됩니다.
