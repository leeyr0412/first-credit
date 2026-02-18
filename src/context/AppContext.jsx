import { createContext, useContext, useReducer, useEffect } from 'react';
import {
  getCreditLimit,
  getCurrentWeeklyRepayment,
  calcFutureDeductions,
  checkDSRExceeded,
} from './constants.js';

const AppContext = createContext();

// localStorage 키
const STORAGE_KEY = 'first-credit-data';

// ────────────────────────────────────────
// 초기 데이터
// ────────────────────────────────────────
const defaultState = {
  mode: 'child',            // 'child' | 'parent'
  balance: 50000,           // 자녀 현재 잔액
  weeklyAllowance: 10000,   // 주간 용돈
  currentWeek: 1,           // 현재 주차

  // items (위시리스트) — 기존 더미 데이터 유지
  items: [
    { id: '1', name: '레고 닌자고 세트', price: 45000, emoji: '🧱', createdAt: Date.now() - 86400000 },
    { id: '2', name: '포켓몬 카드팩', price: 8000, emoji: '🃏', createdAt: Date.now() - 43200000 },
    { id: '3', name: '아이스크림 케이크', price: 25000, emoji: '🍰', createdAt: Date.now() },
  ],

  // requests — 할부 계약서 배열 (새 구조)
  requests: [],

  // transactions — 거래 내역 (기존 더미 데이터 유지)
  transactions: [
    { id: 't1', type: 'allowance', description: '주간 용돈 입금', amount: 10000, date: Date.now() - 604800000 },
    { id: 't2', type: 'purchase', description: '문구 세트 구매', amount: -5000, date: Date.now() - 259200000 },
    { id: 't3', type: 'allowance', description: '주간 용돈 입금', amount: 10000, date: Date.now() - 86400000 },
  ],
};

// ────────────────────────────────────────
// localStorage 저장 / 로드
// ────────────────────────────────────────
function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return {
        ...defaultState,
        ...parsed,
        currentWeek: parsed.currentWeek ?? defaultState.currentWeek,
      };
    }
  } catch (e) {
    console.error('localStorage 로드 실패:', e);
  }
  return defaultState;
}

function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('localStorage 저장 실패:', e);
  }
}

// ────────────────────────────────────────
// 리듀서
// ────────────────────────────────────────
function appReducer(state, action) {
  switch (action.type) {

    // ─── 모드 전환 ───
    case 'TOGGLE_MODE':
      return { ...state, mode: state.mode === 'child' ? 'parent' : 'child' };

    case 'SET_MODE':
      return { ...state, mode: action.payload };

    // ─── 위시리스트 관리 ───
    case 'ADD_ITEM': {
      const newItem = {
        id: `item-${Date.now()}`,
        name: action.payload.name,
        price: action.payload.price,
        emoji: action.payload.emoji || '🛒',
        createdAt: Date.now(),
      };
      return { ...state, items: [newItem, ...state.items] };
    }

    case 'DELETE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };

    // ─── 즉시 구매 (잔액 충분 시) ───
    case 'PURCHASE_ITEM': {
      const item = state.items.find(i => i.id === action.payload);
      if (!item || state.balance < item.price) return state;
      const tx = {
        id: `t-${Date.now()}`,
        type: 'purchase',
        description: `${item.name} 구매`,
        amount: -item.price,
        date: Date.now(),
      };
      return {
        ...state,
        balance: state.balance - item.price,
        items: state.items.filter(i => i.id !== action.payload),
        transactions: [tx, ...state.transactions],
      };
    }

    // ─── 신규 요청 (buy / loan) ───
    case 'CREATE_REQUEST': {
      const { type, targetId, name, price, installmentWeeks, reason } = action.payload;
      const totalRepayment = Math.ceil(price * 1.1); // 이자 10%
      const weeklyPrice = Math.ceil(totalRepayment / installmentWeeks);

      // DSR 체크
      if (checkDSRExceeded(state.requests, state.weeklyAllowance, weeklyPrice)) {
        return state;
      }

      const newReq = {
        id: `req-${Date.now()}`,
        type,
        targetId: targetId || null,
        name,
        price,
        totalRepayment,
        installmentWeeks,
        weeklyPrice,
        repaidWeeks: 0,
        status: 'pending',
        reason: reason || '',
        parentMessage: '',
        createdAt: Date.now(),
      };

      return { ...state, requests: [newReq, ...state.requests] };
    }

    // ─── 부모: 승인 ───
    case 'APPROVE_REQUEST': {
      const { requestId, message } = action.payload;
      const req = state.requests.find(r => r.id === requestId);
      if (!req || (req.status !== 'pending' && req.status !== 'hold')) return state;

      // DSR 재검증 (안전장치)
      if (checkDSRExceeded(state.requests, state.weeklyAllowance, req.weeklyPrice)) {
        return state;
      }

      let newBalance = state.balance;
      const newTxs = [];

      if (req.type === 'loan') {
        newBalance += req.price;
        newTxs.push({
          id: `t-${Date.now()}`,
          type: 'advance',
          description: `[대출 승인] ${req.name}`,
          amount: req.price,
          date: Date.now(),
        });
      } else {
        newTxs.push({
          id: `t-${Date.now()}`,
          type: 'advance',
          description: `[할부 구매 승인] ${req.name}`,
          amount: 0,
          date: Date.now(),
        });
      }

      return {
        ...state,
        balance: newBalance,
        items: req.targetId
          ? state.items.filter(i => i.id !== req.targetId)
          : state.items,
        requests: state.requests.map(r =>
          r.id === requestId
            ? { ...r, status: 'approved', parentMessage: message || '' }
            : r
        ),
        transactions: [...newTxs, ...state.transactions],
      };
    }

    // ─── 부모: 거절 ───
    case 'REJECT_REQUEST': {
      const { requestId, message } = action.payload;
      return {
        ...state,
        requests: state.requests.map(r =>
          r.id === requestId
            ? { ...r, status: 'rejected', parentMessage: message || '' }
            : r
        ),
      };
    }

    // ─── 부모: 보류 ───
    case 'HOLD_REQUEST': {
      const { requestId, message } = action.payload;
      return {
        ...state,
        requests: state.requests.map(r =>
          r.id === requestId
            ? { ...r, status: 'hold', parentMessage: message || '' }
            : r
        ),
      };
    }

    // ─── 자녀: 요청 취소 ───
    case 'CANCEL_REQUEST': {
      const cancelId = action.payload;
      const cancelReq = state.requests.find(r => r.id === cancelId);
      if (!cancelReq || (cancelReq.status !== 'pending' && cancelReq.status !== 'hold')) return state;
      return {
        ...state,
        requests: state.requests.map(r =>
          r.id === cancelId ? { ...r, status: 'cancelled' } : r
        ),
      };
    }

    // ─── 자녀: 알림 확인 (읽음 처리) ───
    case 'DISMISS_NOTIFICATION': {
      const dismissId = action.payload;
      return {
        ...state,
        requests: state.requests.map(r =>
          r.id === dismissId ? { ...r, notificationRead: true } : r
        ),
      };
    }

    // ─── 부모: 선물 ───
    case 'GIFT_REQUEST': {
      const { requestId, message } = action.payload;
      const req = state.requests.find(r => r.id === requestId);
      if (!req || (req.status !== 'pending' && req.status !== 'hold')) return state;

      const giftTx = {
        id: `t-${Date.now()}`,
        type: 'gift',
        description: `[선물] ${req.name} — 부모님이 사주셨어요!`,
        amount: 0,
        date: Date.now(),
      };

      return {
        ...state,
        items: req.targetId
          ? state.items.filter(i => i.id !== req.targetId)
          : state.items,
        requests: state.requests.map(r =>
          r.id === requestId
            ? { ...r, status: 'completed', repaidWeeks: r.installmentWeeks, parentMessage: message || '사랑하는 우리 아이에게 선물!' }
            : r
        ),
        transactions: [giftTx, ...state.transactions],
      };
    }

    // ─── 1주일 지나기 (시간 흐름) ───
    case 'ADVANCE_WEEK': {
      const nextWeek = state.currentWeek + 1;

      // 이번 주 갚아야 할 할부금 총액 (상환 전 기준, approved인 것만)
      const weeklyDeduction = state.requests
        .filter(r => r.status === 'approved')
        .reduce((sum, r) => sum + r.weeklyPrice, 0);

      // 자동 상환 처리
      const updatedRequests = state.requests.map(r => {
        if (r.status !== 'approved') return r;
        const newRepaid = r.repaidWeeks + 1;
        return {
          ...r,
          repaidWeeks: newRepaid,
          status: newRepaid >= r.installmentWeeks ? 'completed' : 'approved',
        };
      });

      // 실지급액 = 주간 용돈 - 할부금 (최소 0원)
      const netAllowance = Math.max(0, state.weeklyAllowance - weeklyDeduction);

      const txs = [];
      if (weeklyDeduction > 0) {
        txs.push({
          id: `t-${Date.now()}-repay`,
          type: 'deduction',
          description: `[${nextWeek}주차] 할부금 자동 상환`,
          amount: -weeklyDeduction,
          date: Date.now(),
        });
      }
      txs.push({
        id: `t-${Date.now()}-allow`,
        type: 'allowance',
        description: `[${nextWeek}주차] 주간 용돈 입금${weeklyDeduction > 0 ? ' (할부 차감 후)' : ''}`,
        amount: netAllowance,
        date: Date.now(),
      });

      // 완료된 건들 알림
      updatedRequests.forEach(r => {
        if (r.status === 'completed') {
          const prev = state.requests.find(o => o.id === r.id);
          if (prev && prev.status === 'approved') {
            txs.push({
              id: `t-${Date.now()}-done-${r.id}`,
              type: 'info',
              description: `✅ [상환 완료] ${r.name}`,
              amount: 0,
              date: Date.now(),
            });
          }
        }
      });

      return {
        ...state,
        currentWeek: nextWeek,
        balance: state.balance + netAllowance,
        requests: updatedRequests,
        transactions: [...txs, ...state.transactions],
      };
    }

    // ─── 용돈 직접 입금 (부모) ───
    case 'ADD_ALLOWANCE': {
      const tx = {
        id: `t-${Date.now()}`,
        type: 'allowance',
        description: '용돈 입금',
        amount: action.payload,
        date: Date.now(),
      };
      return {
        ...state,
        balance: state.balance + action.payload,
        transactions: [tx, ...state.transactions],
      };
    }

    // ─── 주간 용돈 금액 변경 ───
    case 'SET_WEEKLY_ALLOWANCE':
      return { ...state, weeklyAllowance: action.payload };

    // ─── 초기화 ───
    case 'RESET_DATA':
      return { ...defaultState };

    default:
      return state;
  }
}

// ────────────────────────────────────────
// Provider
// ────────────────────────────────────────
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, null, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  // 파생 데이터를 계산해서 함께 전달
  const creditLimit = getCreditLimit(state.weeklyAllowance);
  const futureDeductions = calcFutureDeductions(state.requests);
  const currentWeeklyRepayment = getCurrentWeeklyRepayment(state.requests);

  return (
    <AppContext.Provider value={{
      state: { ...state, futureDeductions, creditLimit },
      dispatch,
      creditLimit,
      futureDeductions,
      currentWeeklyRepayment,
    }}>
      {children}
    </AppContext.Provider>
  );
}

// 커스텀 훅
export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
