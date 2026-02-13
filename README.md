# 퍼스트 크레딧 (First Credit)
https://first-credit.netlify.app/
> 어린이를 위한 신용·할부·대출 교육용 웹앱

아이들이 용돈 관리를 통해 **신용**, **할부**, **이자**, **대출**, **DSR** 같은 금융 개념을 자연스럽게 체험하고 배울 수 있는 모바일 퍼스트 웹 애플리케이션입니다.

![](/readme/img/img.png)
---

## 목차

- [프로젝트 개요](#프로젝트-개요)
- [기술 스택](#기술-스택)
- [프로젝트 구조](#프로젝트-구조)
- [데이터 모델](#데이터-모델)
- [비즈니스 로직](#비즈니스-로직)
- [컴포넌트 설명](#컴포넌트-설명)
- [교육 콘텐츠](#교육-콘텐츠)
- [시작하기](#시작하기)

---

## 프로젝트 개요

| 항목 | 내용 |
|------|------|
| **대상** | 초등학생 (8~13세) 및 학부모 |
| **목적** | 금융 개념(신용, 할부, 이자, DSR)을 게임처럼 체험 |
| **모드** | 자녀 모드 / 부모 모드 토글 전환 |
| **저장** | LocalStorage 기반 (서버 불필요) |
| **UI** | 모바일 퍼스트 (최대 430px), 한국어 |

### 핵심 흐름

```
자녀: 위시리스트 등록 → 잔액 부족 시 할부/대출 신청 (DSR 체크)
  ↓
부모: 요청 확인 → 승인 / 거절 / 보류 / 선물 (DSR 재검증)
  ↓
부모: [1주일 지나기] → 용돈 지급 + 할부금 자동 상환
  ↓
자녀: 알림 확인 + 상환 진행률 확인
```

---

## 기술 스택

| 범주 | 기술 | 버전 |
|------|------|------|
| **Runtime** | React | 19.2 |
| **Build** | Vite | 7.3 |
| **Styling** | Tailwind CSS (Vite Plugin) | 4.1 |
| **Persistence** | LocalStorage | - |
| **Lint** | ESLint + react-hooks + react-refresh | 9.39 |
| **Language** | JavaScript (JSX) | ES2020+ |

---

## 프로젝트 구조

```
first-credit/
├── public/
├── src/
│   ├── assets/
│   │   └── mascot.png              # 돼지 저금통 히어로 마스코트
│   ├── components/
│   │   ├── Header.jsx              # 헤더 (모드 토글 + 주차 표시)
│   │   ├── ChildView.jsx           # 자녀 모드 전체 화면
│   │   ├── ParentView.jsx          # 부모 모드 전체 화면
│   │   └── TermModal.jsx           # 금융 용어 설명 모달 (마스코트 포함)
│   ├── context/
│   │   ├── AppContext.jsx           # 전역 상태 Provider + Reducer
│   │   └── constants.js            # 금융 용어 사전 + 유틸리티 함수
│   ├── App.jsx                     # 루트 컴포넌트 (모드별 뷰 분기)
│   ├── main.jsx                    # 앱 엔트리포인트
│   └── index.css                   # 글로벌 스타일 + 테마 변수
├── index.html
├── package.json
├── vite.config.js
└── eslint.config.js
```

---

## 데이터 모델

### Global State

```javascript
{
  mode: 'child' | 'parent',     // 현재 UI 모드
  balance: Number,               // 자녀 현재 잔액 (원)
  weeklyAllowance: Number,       // 주간 용돈 금액
  currentWeek: Number,           // 현재 주차 (1부터 시작)

  items: Item[],                 // 위시리스트
  requests: Request[],           // 할부/대출 계약서 목록
  transactions: Transaction[],   // 거래 내역 로그

  // ── 아래는 파생 데이터 (Provider에서 계산) ──
  creditLimit: Number,           // 신용 한도 (weeklyAllowance × 4)
  futureDeductions: Number,      // 승인된 건들의 남은 상환 총액
}
```

### Item (위시리스트 상품)

```javascript
{
  id: String,           // 고유 ID (예: "item-1718000000000")
  name: String,         // 상품명
  price: Number,        // 가격 (원)
  emoji: String,        // 대표 이모지
  createdAt: Number,    // 생성 타임스탬프
}
```

### Request (할부 계약서)

```javascript
{
  id: String,                    // 고유 ID (예: "req-1718000000000")
  type: 'buy' | 'loan',         // 유형: 물건 구매 / 현금 대출
  targetId: String | null,       // buy일 때 Item.id 참조
  name: String,                  // 상품명 또는 대출 사유
  price: Number,                 // 원금
  totalRepayment: Number,        // 총 상환액 (원금 × 1.1)
  installmentWeeks: Number,      // 할부 기간 (1~8주)
  weeklyPrice: Number,           // 주당 상환액 (totalRepayment / installmentWeeks)
  repaidWeeks: Number,           // 현재까지 상환한 주수
  status: RequestStatus,         // 아래 상태 다이어그램 참조
  reason: String,                // 자녀가 작성한 요청 사유
  parentMessage: String,         // 부모 응답 메시지
  notificationRead: Boolean,     // 자녀 알림 읽음 여부
  createdAt: Number,             // 생성 타임스탬프
}
```


### Transaction (거래 내역)

```javascript
{
  id: String,
  type: 'allowance' | 'purchase' | 'advance' | 'deduction' | 'gift' | 'info',
  description: String,
  amount: Number,       // 양수: 입금, 음수: 출금, 0: 정보성
  date: Number,         // 타임스탬프
}
```

---

## 비즈니스 로직

### 1. 이자 계산

```
총 상환액 = Math.ceil(원금 × 1.1)     // 10% 고정 이자
주당 상환액 = Math.ceil(총 상환액 / 할부 주수)
```

### 2. DSR 50% 룰 (과도한 빚 방지)

```
(기존 승인건 주당 합계 + 신규 건 주당 상환액) > (주간 용돈 × 0.5) → 차단
```

- 자녀 요청 시점: UI에서 실시간 경고 + 제출 차단
- 부모 승인 시점: 이중 검증 (handleApprove + reducer 안전장치)

### 3. 신용 한도

```
신용 한도 = 주간 용돈 × 4
```

### 4. 주간 시뮬레이션 (`ADVANCE_WEEK`)

1. `currentWeek` +1
2. 승인된 모든 요청: `repaidWeeks` +1 → 완료 조건 충족 시 `completed`
3. 실지급액 = `max(0, weeklyAllowance - 이번 주 할부금 총액)`
4. 잔액에 실지급액 입금 + 거래 내역 기록

### 5. 부모 의사결정 (4가지)

| 옵션 | 동작 |
|------|------|
| **승인** | 할부 계약 시작. buy→물건 획득, loan→원금 입금 |
| **거절** | 사유와 함께 거절 처리 |
| **보류** | "조금 더 생각해보자" 상태. 자녀 취소 가능 |
| **선물** | 부모가 대신 결제. 자녀 용돈 미차감, 즉시 완료 |

---

## 컴포넌트 설명

### `Header.jsx`

- 앱 로고 + "퍼스트 크레딧" 타이틀
- 자녀/부모 모드 슬라이드 토글 버튼
- 현재 주차 표시 뱃지 (`📅 N주차`)
- 모드별 테마 색상 자동 적용 (자녀: 노란색, 부모: 파란색)

### `ChildView.jsx`

자녀 모드의 전체 화면을 담당합니다.

| 탭 | 기능 |
|----|------|
| **위시리스트** | 상품 등록/삭제, 즉시 구매, 할부 신청 |
| **빌린 목록** | 부모 응답 알림, 상환 진행률, 대기/보류 상태 표시, 요청 취소 |
| **내역** | 전체 거래 내역 조회 |

주요 기능:
- 잔액/신용한도/DSR 현황 대시보드
- 할부 기간 슬라이더 (1~8주) + 실시간 비용 미리보기
- DSR 초과 시 실시간 경고 + 제출 차단
- 대출(현금) 신청
- 요청 취소 확인 모달

### `ParentView.jsx`

부모 모드의 전체 화면을 담당합니다.

| 탭 | 기능 |
|----|------|
| **요청 관리** | 대기/보류 요청 확인, 4가지 의사결정 |
| **계약 현황** | 상환 진행 중 / 완료 / 거절 계약 목록 |
| **전체 내역** | 거래 내역 조회 |

주요 기능:
- 잔액/신용한도/DSR 현황 대시보드
- **[1주일 지나기]** 버튼 (용돈 지급 + 자동 상환 시뮬레이션)
- 4가지 의사결정 모달 (승인/거절/보류/선물 + 메시지)
- 자녀 사유 강조 표시
- 승인 시 DSR 한도 초과 경고 팝업
- 주간 용돈 금액 설정 / 직접 용돈 입금

### `TermModal.jsx`

금융 용어 설명을 위한 공유 컴포넌트입니다.

- 물음표(`?`) 버튼 클릭 시 화면 중앙에 모달 표시
- 돼지 저금통 히어로 마스코트 이미지 포함
- `variant` prop으로 자녀/부모 테마 색상 전환
- `constants.js`의 `FINANCIAL_TERMS` 데이터 활용

### `AppContext.jsx`

전역 상태 관리 Provider 입니다.

- `useReducer` + `appReducer`로 상태 관리
- `useEffect`로 상태 변경 시 자동 LocalStorage 저장
- 파생 데이터 (`creditLimit`, `futureDeductions`, `currentWeeklyRepayment`) 계산 후 Context에 주입
- 앱 시작 시 LocalStorage에서 기존 데이터 자동 복원

### `constants.js`

비즈니스 로직 순수 함수 + 교육 콘텐츠를 담당합니다.

| Export | 유형 | 설명 |
|--------|------|------|
| `FINANCIAL_TERMS` | 상수 | 6개 금융 용어의 제목 + 아동 친화적 설명 |
| `getCreditLimit()` | 함수 | 주간 용돈 × 4 |
| `getCurrentWeeklyRepayment()` | 함수 | 승인된 건들의 주당 상환액 합계 |
| `calcFutureDeductions()` | 함수 | 승인된 건들의 남은 총 상환액 |
| `checkDSRExceeded()` | 함수 | DSR 50% 초과 여부 판별 |

---

## 교육 콘텐츠

앱 곳곳에 배치된 `?` 버튼을 통해 6가지 금융 용어를 아동 친화적인 비유로 설명합니다.

| 용어 | 비유 | 핵심 메시지 |
|------|------|-------------|
| **신용** | 믿음 점수 | 약속을 잘 지키면 점수가 올라감 |
| **할부** | 피자 조각내기 | 큰 금액을 작게 쪼개서 갚기 |
| **이자** | 돈 사용료 (사탕) | 빌려줘서 고마운 마음의 표현 |
| **대출** | 미래 용돈 타임머신 | 미래 용돈을 지금 가져오기 |
| **신용 한도** | 믿음의 크기 | 빌릴 수 있는 최대 금액 |
| **DSR** | 갚을 수 있는 만큼만 | 용돈의 절반까지만 상환에 사용 |

---

## 시작하기

### 사전 요구사항

- Node.js 18+
- npm 또는 yarn

### 설치 및 실행

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

